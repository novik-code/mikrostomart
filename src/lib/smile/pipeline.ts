/**
 * Smile simulator v2 pipeline (POST /api/smile).
 *
 * Flow (defense-in-depth, validated in R&D):
 *   rate limits (flood → global → user/device/ip)
 *   → sharp input normalization (EXIF rotate, ≤1280px, JPEG q85)
 *   → OpenAI vision QA gate (cheap model, booleans only — rejects unusable
 *     photos BEFORE any paid generation)
 *   → primary generation: Replicate google/nano-banana-2 (full-frame
 *     instruction edit, preserves identity)
 *   → result auto-QA (cheap vision, strict verdictPass gate) → 1 retry
 *   → fallback: mouth bbox via a stronger vision model (cheap models return
 *     wrong boxes — R&D saw it frame the EYES) → crop → flux-kontext-pro
 *     → feathered composite back onto the original → result auto-QA
 *   → watermark.
 *
 * Result auto-QA is the last line of defense: a result is returned ONLY when
 * verdictPass === true. Any QA error fails CLOSED (never show an unverified
 * image to a patient).
 *
 * Zero retention: images live only in memory. Logs carry sizes, timings and
 * codes — NEVER base64 payloads.
 */

import sharp from 'sharp';
import Replicate from 'replicate';
import OpenAI from 'openai';
import { checkRateLimit } from '@/lib/rateLimit';
import { KONTEXT_PROMPTS, SMILE_PROMPTS, SmileStyle } from './prompts';

// --- Public types ---

export type SmileProvider = 'nano-banana-2' | 'kontext-pro';

/** QA-gate rejection codes (HTTP 422). Clients map them to i18n texts. */
export type SmileRejectReason =
    | 'no_face'
    | 'multiple_faces'
    | 'closed_mouth'
    | 'blurry'
    | 'bad_pose'
    | 'mouth_too_small';

export type RateLimitScope = 'user' | 'global';

export interface SmileIdentity {
    /** Set when the request carries a valid patient JWT. */
    prodentisId?: string;
    /** Validated UUID from X-Device-Id (mobile app installation id). */
    deviceId?: string;
    ip: string;
    client: 'native' | 'web';
}

export interface SmilePipelineInput {
    photo: Buffer;
    style: SmileStyle;
    identity: SmileIdentity;
}

export type SmilePipelineResult =
    | { kind: 'success'; provider: SmileProvider; image: string; tookMs: number; remaining?: number }
    | { kind: 'rejected'; reason: SmileRejectReason }
    | { kind: 'rate_limited'; scope: RateLimitScope }
    | { kind: 'bad_input' }
    | { kind: 'generation_failed' };

// --- Tunables ---

const DAY_MS = 24 * 60 * 60 * 1000;
const FLOOD_LIMIT_PER_MINUTE = 10;
const GLOBAL_DAILY_LIMIT = 200;
const PATIENT_DAILY_LIMIT = 3;
const DEVICE_DAILY_LIMIT = 1;
const IP_DAILY_LIMIT = 3;

const MAX_EDGE_PX = 1280;
const JPEG_QUALITY = 85;

const PRIMARY_MODEL = 'google/nano-banana-2';
const FALLBACK_MODEL = 'black-forest-labs/flux-kontext-pro';
const PRIMARY_ATTEMPTS = 2; // first attempt + 1 retry

// Cheap vision model for the boolean QA gate and result auto-QA.
const QA_MODEL_DEFAULT = 'gpt-4o-mini';
// Stronger vision model for the mouth bbox — gpt-4o-mini returns wrong boxes
// (R&D round 2: it framed the eyes → whitened-eyes horror in the fallback).
const BBOX_MODEL_DEFAULT = 'gpt-4o';

// Mouth crop expansion for the fallback (validated crop→edit→composite strategy).
const CROP_EXPAND_W = 2.2;
const CROP_EXPAND_H = 2.6;
// Feathered composite edge, as a fraction of the crop width.
const FEATHER_RATIO = 0.08;

const WATERMARK_TEXT = 'Symulacja poglądowa · Mikrostomart';
const WATERMARK_FONT_RATIO = 0.026; // font size as fraction of image width
const WATERMARK_OPACITY = 0.75;

function qaModel(): string {
    return process.env.SMILE_QA_MODEL || QA_MODEL_DEFAULT;
}

function bboxModel(): string {
    return process.env.SMILE_BBOX_MODEL || BBOX_MODEL_DEFAULT;
}

// --- Logging (sizes/timings/codes only — never image payloads) ---

function logInfo(message: string, extra?: Record<string, unknown>) {
    console.log(`[Smile] ${message}`, extra ?? '');
}

function logError(message: string, err?: unknown) {
    const detail = err instanceof Error ? err.message : err !== undefined ? String(err) : '';
    console.error(`[Smile] ${message}`, detail);
}

// --- Step 1: rate limits ---

type LimitOutcome =
    | { allowed: true; remaining: number }
    | { allowed: false; scope: RateLimitScope };

/**
 * Cheap flood guard, checked BEFORE any vision/QA spend.
 * Daily quotas are consumed later (checkSmileQuotas), only once the photo has
 * passed the QA gate — a rejected photo must not burn the user's daily try.
 */
async function checkSmileFlood(identity: SmileIdentity): Promise<boolean> {
    const flood = await checkRateLimit(`smile:flood:${identity.ip}`, FLOOD_LIMIT_PER_MINUTE, 60_000);
    return flood.allowed;
}

/** Daily quotas (global cost cap + per-user), consumed only for actual generations. */
async function checkSmileQuotas(identity: SmileIdentity): Promise<LimitOutcome> {
    const day = new Date().toISOString().slice(0, 10); // UTC day bucket

    // 1. Global daily budget (cost guard across all clients).
    const global = await checkRateLimit(`smile:global:${day}`, GLOBAL_DAILY_LIMIT, DAY_MS);
    if (!global.allowed) return { allowed: false, scope: 'global' };

    // 2. Per-user / per-device / per-IP daily quota.
    let user;
    if (identity.prodentisId) {
        user = await checkRateLimit(`smile:patient:${identity.prodentisId}:${day}`, PATIENT_DAILY_LIMIT, DAY_MS);
    } else if (identity.deviceId) {
        user = await checkRateLimit(`smile:device:${identity.deviceId}:${day}`, DEVICE_DAILY_LIMIT, DAY_MS);
    } else {
        user = await checkRateLimit(`smile:ip:${identity.ip}:${day}`, IP_DAILY_LIMIT, DAY_MS);
    }
    if (!user.allowed) return { allowed: false, scope: 'user' };

    return { allowed: true, remaining: user.remaining };
}

// --- Step 2: input normalization ---

interface NormalizedImage {
    data: Buffer;
    width: number;
    height: number;
}

async function normalizeInput(photo: Buffer): Promise<NormalizedImage | null> {
    try {
        const { data, info } = await sharp(photo)
            .rotate() // apply EXIF orientation
            .resize(MAX_EDGE_PX, MAX_EDGE_PX, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: JPEG_QUALITY })
            .toBuffer({ resolveWithObject: true });
        if (!info.width || !info.height) return null;
        return { data, width: info.width, height: info.height };
    } catch {
        return null; // undecodable → bad_input
    }
}

function toJpegDataUri(buffer: Buffer): string {
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

// --- OpenAI helpers ---

type ChatContentPart = OpenAI.Chat.Completions.ChatCompletionContentPart;

function imagePart(dataUri: string, detail: 'low' | 'high'): ChatContentPart {
    return { type: 'image_url', image_url: { url: dataUri, detail } };
}

function parseJsonContent<T>(content: string | null | undefined): T {
    if (!content) throw new Error('Empty vision QA response');
    return JSON.parse(content) as T;
}

// --- Step 3: QA gate (cheap model, booleans only — no bbox here) ---

interface QaGateVerdict {
    faceCount: number;
    frontal: boolean;
    teethVisible: boolean;
    sharpEnough: boolean;
    mouthLargeEnough: boolean;
}

const QA_GATE_SYSTEM_PROMPT = `You are a strict quality gate for a dental smile simulation service. You receive one photo of a person. Answer with JSON only, exactly matching the schema.
- faceCount: number of clearly visible human faces in the photo.
- frontal: true if the main face looks roughly straight at the camera (head yaw and pitch both within about 15 degrees).
- teethVisible: true if the mouth is open in a smile with upper teeth clearly visible.
- sharpEnough: true if the mouth region is sharp enough to distinguish individual teeth (not blurry, not too dark).
- mouthLargeEnough: true if the mouth is large enough in the frame to edit (roughly at least 8% of the image width).`;

const QA_GATE_RESPONSE_FORMAT = {
    type: 'json_schema' as const,
    json_schema: {
        name: 'smile_qa_gate',
        strict: true,
        schema: {
            type: 'object',
            additionalProperties: false,
            required: ['faceCount', 'frontal', 'teethVisible', 'sharpEnough', 'mouthLargeEnough'],
            properties: {
                faceCount: { type: 'integer' },
                frontal: { type: 'boolean' },
                teethVisible: { type: 'boolean' },
                sharpEnough: { type: 'boolean' },
                mouthLargeEnough: { type: 'boolean' },
            },
        },
    },
};

/**
 * Runs the QA gate. Returns a rejection reason, or null when the photo is usable.
 * Throws on QA-service failure (caller maps it to generation_failed).
 */
async function runQaGate(openai: OpenAI, imageDataUri: string): Promise<SmileRejectReason | null> {
    const completion = await openai.chat.completions.create({
        model: qaModel(),
        temperature: 0,
        max_tokens: 200,
        response_format: QA_GATE_RESPONSE_FORMAT,
        messages: [
            { role: 'system', content: QA_GATE_SYSTEM_PROMPT },
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'Quality-check this photo for a smile simulation. JSON only.' },
                    imagePart(imageDataUri, 'high'),
                ],
            },
        ],
    });

    const verdict = parseJsonContent<QaGateVerdict>(completion.choices[0]?.message?.content);

    if (typeof verdict.faceCount !== 'number' || verdict.faceCount < 1) return 'no_face';
    if (verdict.faceCount > 1) return 'multiple_faces';
    if (verdict.teethVisible !== true) return 'closed_mouth';
    if (verdict.sharpEnough !== true) return 'blurry';
    if (verdict.frontal !== true) return 'bad_pose';
    if (verdict.mouthLargeEnough !== true) return 'mouth_too_small';
    return null;
}

// --- Result auto-QA (validated schema — the last line of defense) ---

interface ResultQaVerdict {
    samePerson: boolean;
    teethImproved: boolean;
    eyesUnchanged: boolean;
    noArtifacts: boolean;
    verdictPass: boolean;
    issues: string;
}

const RESULT_QA_SYSTEM_PROMPT = `You are a strict quality inspector for AI dental smile simulations. You receive two photos: the original (BEFORE) and an AI-edited result (AFTER). Answer with JSON only, exactly matching the schema.
- samePerson: true if the AFTER image shows the SAME person as the BEFORE image.
- teethImproved: true if the teeth in the AFTER image look improved (aligned, clean, healthy).
- eyesUnchanged: true if the eyes look natural and unmodified.
- noArtifacts: true if there are no horror artifacts: wrong tooth count, merged teeth, teeth outside the mouth, whited-out eyes, warped facial features.
- verdictPass: true only if the AFTER image is safe and good to show to a dental patient.
- issues: short description of any problems, or an empty string.`;

const RESULT_QA_RESPONSE_FORMAT = {
    type: 'json_schema' as const,
    json_schema: {
        name: 'smile_result_qa',
        strict: true,
        schema: {
            type: 'object',
            additionalProperties: false,
            required: ['samePerson', 'teethImproved', 'eyesUnchanged', 'noArtifacts', 'verdictPass', 'issues'],
            properties: {
                samePerson: { type: 'boolean' },
                teethImproved: { type: 'boolean' },
                eyesUnchanged: { type: 'boolean' },
                noArtifacts: { type: 'boolean' },
                verdictPass: { type: 'boolean' },
                issues: { type: 'string' },
            },
        },
    },
};

/**
 * Verifies a generated result. Returns true ONLY for verdictPass === true.
 * Fails CLOSED: any error counts as a failed check — an unverified image is
 * never shown to a patient.
 */
async function runResultQa(openai: OpenAI, beforeDataUri: string, afterDataUri: string): Promise<boolean> {
    try {
        const completion = await openai.chat.completions.create({
            model: qaModel(),
            temperature: 0,
            max_tokens: 300,
            response_format: RESULT_QA_RESPONSE_FORMAT,
            messages: [
                { role: 'system', content: RESULT_QA_SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Image 1 = BEFORE (original photo). Image 2 = AFTER (AI smile simulation). Quality-check the AFTER image. JSON only.',
                        },
                        imagePart(beforeDataUri, 'low'),
                        imagePart(afterDataUri, 'low'),
                    ],
                },
            ],
        });

        const verdict = parseJsonContent<ResultQaVerdict>(completion.choices[0]?.message?.content);
        if (verdict.verdictPass !== true) {
            logInfo('result QA rejected', { issues: verdict.issues });
            return false;
        }
        return true;
    } catch (err) {
        logError('result QA error (failing closed)', err);
        return false;
    }
}

// --- Replicate helpers ---

/** Normalizes replicate.run() output (FileOutput | URL | data URI | bytes | array) to a Buffer. */
async function replicateOutputToBuffer(output: unknown): Promise<Buffer> {
    const item = Array.isArray(output) ? output[0] : output;
    if (!item) throw new Error('Empty Replicate output');

    if (typeof item === 'string') {
        if (item.startsWith('data:')) {
            return Buffer.from(item.slice(item.indexOf(',') + 1), 'base64');
        }
        const res = await fetch(item);
        if (!res.ok) throw new Error(`Failed to download Replicate output (HTTP ${res.status})`);
        return Buffer.from(await res.arrayBuffer());
    }
    if (item instanceof Uint8Array) return Buffer.from(item);

    // replicate@1.x FileOutput exposes blob() and url()
    const fileLike = item as { blob?: () => Promise<Blob>; url?: () => URL | string };
    if (typeof fileLike.blob === 'function') {
        const blob = await fileLike.blob();
        return Buffer.from(await blob.arrayBuffer());
    }
    if (typeof fileLike.url === 'function') {
        const res = await fetch(String(fileLike.url()));
        if (!res.ok) throw new Error(`Failed to download Replicate output (HTTP ${res.status})`);
        return Buffer.from(await res.arrayBuffer());
    }
    throw new Error('Unsupported Replicate output type');
}

// --- Step 4: primary generation (nano-banana-2, full frame) ---

async function generatePrimary(replicate: Replicate, style: SmileStyle, imageDataUri: string): Promise<Buffer> {
    const output = await replicate.run(PRIMARY_MODEL, {
        input: {
            prompt: SMILE_PROMPTS[style],
            image_input: [imageDataUri],
            resolution: '1K',
            aspect_ratio: 'match_input_image',
            output_format: 'jpg',
        },
    });
    return replicateOutputToBuffer(output);
}

// --- Step 6: fallback (bbox → crop → kontext-pro → feathered composite) ---

interface MouthBbox {
    x: number;
    y: number;
    w: number;
    h: number;
}

const BBOX_RESPONSE_FORMAT = {
    type: 'json_schema' as const,
    json_schema: {
        name: 'smile_mouth_bbox',
        strict: true,
        schema: {
            type: 'object',
            additionalProperties: false,
            required: ['x', 'y', 'w', 'h'],
            properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                w: { type: 'number' },
                h: { type: 'number' },
            },
        },
    },
};

/**
 * Fetches the mouth bounding box lazily — only when the pipeline actually
 * enters the Kontext fallback. Uses the stronger vision model (see BBOX_MODEL_DEFAULT).
 * Returns null when the box is missing or degenerate.
 */
async function fetchMouthBbox(openai: OpenAI, imageDataUri: string): Promise<MouthBbox | null> {
    try {
        const completion = await openai.chat.completions.create({
            model: bboxModel(),
            temperature: 0,
            max_tokens: 100,
            response_format: BBOX_RESPONSE_FORMAT,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: "Return the tight bounding box of the person's LIPS/MOUTH (not eyes, not nose). Normalized 0-1: x,y = top-left, w,h relative to image dimensions.",
                        },
                        imagePart(imageDataUri, 'high'),
                    ],
                },
            ],
        });

        const bbox = parseJsonContent<MouthBbox>(completion.choices[0]?.message?.content);
        const values = [bbox.x, bbox.y, bbox.w, bbox.h];
        if (values.some((v) => typeof v !== 'number' || !Number.isFinite(v))) return null;

        const clamped: MouthBbox = {
            x: Math.min(Math.max(bbox.x, 0), 1),
            y: Math.min(Math.max(bbox.y, 0), 1),
            w: Math.min(Math.max(bbox.w, 0), 1),
            h: Math.min(Math.max(bbox.h, 0), 1),
        };
        if (clamped.w < 0.01 || clamped.h < 0.01) return null;
        return clamped;
    } catch (err) {
        logError('mouth bbox lookup failed', err);
        return null;
    }
}

interface CropRegion {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** Expands the mouth bbox (×2.2 / ×2.6), clamps to image bounds, converts to pixels. */
function computeCropRegion(bbox: MouthBbox, imgWidth: number, imgHeight: number): CropRegion {
    const centerX = bbox.x + bbox.w / 2;
    const centerY = bbox.y + bbox.h / 2;
    const w = Math.min(1, bbox.w * CROP_EXPAND_W);
    const h = Math.min(1, bbox.h * CROP_EXPAND_H);
    const left = Math.min(Math.max(0, centerX - w / 2), 1 - w);
    const top = Math.min(Math.max(0, centerY - h / 2), 1 - h);

    const region: CropRegion = {
        left: Math.round(left * imgWidth),
        top: Math.round(top * imgHeight),
        width: Math.max(16, Math.round(w * imgWidth)),
        height: Math.max(16, Math.round(h * imgHeight)),
    };
    region.width = Math.min(region.width, imgWidth - region.left);
    region.height = Math.min(region.height, imgHeight - region.top);
    return region;
}

/** Grayscale alpha mask: white rectangle with feathered (blurred) edges on black. */
async function buildFeatherMask(width: number, height: number): Promise<Buffer> {
    const feather = Math.max(2, Math.round(width * FEATHER_RATIO));
    const innerW = Math.max(1, width - 2 * feather);
    const innerH = Math.max(1, height - 2 * feather);
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${width}" height="${height}" fill="black"/><rect x="${feather}" y="${feather}" width="${innerW}" height="${innerH}" fill="white"/></svg>`;
    return sharp(Buffer.from(svg))
        .flatten({ background: '#000000' })
        .blur(Math.max(1, feather / 2))
        .toColourspace('b-w')
        .png()
        .toBuffer();
}

/**
 * Fallback generation: crop the lower-face region, edit it with
 * flux-kontext-pro, paste the result back with a feathered alpha mask.
 * Returns the full composited frame, or null when the bbox is unavailable.
 */
async function generateFallbackComposite(
    replicate: Replicate,
    openai: OpenAI,
    style: SmileStyle,
    normalized: NormalizedImage,
): Promise<Buffer | null> {
    const bbox = await fetchMouthBbox(openai, toJpegDataUri(normalized.data));
    if (!bbox) return null;

    const region = computeCropRegion(bbox, normalized.width, normalized.height);
    logInfo('fallback crop', { ...region, imgW: normalized.width, imgH: normalized.height });

    const cropBuffer = await sharp(normalized.data).extract(region).jpeg({ quality: JPEG_QUALITY }).toBuffer();

    const output = await replicate.run(FALLBACK_MODEL, {
        input: {
            prompt: KONTEXT_PROMPTS[style],
            input_image: toJpegDataUri(cropBuffer),
            aspect_ratio: 'match_input_image',
            output_format: 'jpg',
            safety_tolerance: 2,
        },
    });
    const editedRaw = await replicateOutputToBuffer(output);

    // Scale the edited crop back to the EXACT crop dimensions...
    const editedResized = await sharp(editedRaw)
        .resize(region.width, region.height, { fit: 'fill' })
        .removeAlpha()
        .toBuffer();

    // ...attach the feathered mask as its alpha channel...
    const mask = await buildFeatherMask(region.width, region.height);
    const editedMasked = await sharp(editedResized).joinChannel(mask).png().toBuffer();

    // ...and paste it onto the original at the same coordinates.
    return sharp(normalized.data)
        .composite([{ input: editedMasked, left: region.left, top: region.top }])
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
}

// --- Step 7: watermark ---

function escapeXml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Semi-transparent "Symulacja poglądowa · Mikrostomart" in the bottom-right corner. */
async function applyWatermark(image: Buffer): Promise<Buffer> {
    const meta = await sharp(image).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (!width || !height) return image;

    const fontSize = Math.max(12, Math.round(width * WATERMARK_FONT_RATIO));
    const margin = Math.round(fontSize * 0.9);
    const shadowOffset = Math.max(1, Math.round(fontSize / 14));
    const text = escapeXml(WATERMARK_TEXT);
    const fontFamily = "Helvetica, Arial, 'DejaVu Sans', sans-serif";

    // Text drawn twice: dark offset copy as a shadow, white copy on top.
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
<text x="${width - margin + shadowOffset}" y="${height - margin + shadowOffset}" text-anchor="end" font-family="${fontFamily}" font-size="${fontSize}" fill="#000000" fill-opacity="0.45">${text}</text>
<text x="${width - margin}" y="${height - margin}" text-anchor="end" font-family="${fontFamily}" font-size="${fontSize}" fill="#ffffff" fill-opacity="${WATERMARK_OPACITY}">${text}</text>
</svg>`;

    return sharp(image)
        .composite([{ input: Buffer.from(svg) }])
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
}

// --- Main pipeline ---

export async function runSmilePipeline(input: SmilePipelineInput): Promise<SmilePipelineResult> {
    const startedAt = Date.now();
    const { photo, style, identity } = input;

    // 1. Flood guard only — daily quotas are consumed after the QA gate, so a
    //    rejected photo never burns the user's daily try.
    if (!(await checkSmileFlood(identity))) {
        logInfo('rate limited', { scope: 'user', flood: true, client: identity.client });
        return { kind: 'rate_limited', scope: 'user' };
    }

    // 2. Input normalization.
    const normalized = await normalizeInput(photo);
    if (!normalized) {
        logInfo('undecodable input', { inputBytes: photo.length });
        return { kind: 'bad_input' };
    }
    const beforeUri = toJpegDataUri(normalized.data);
    logInfo('input normalized', {
        inputBytes: photo.length,
        normalizedBytes: normalized.data.length,
        width: normalized.width,
        height: normalized.height,
        style,
        client: identity.client,
    });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // 3. QA gate — must reject unusable photos BEFORE any paid generation.
    let gateReason: SmileRejectReason | null;
    try {
        gateReason = await runQaGate(openai, beforeUri);
    } catch (err) {
        logError('QA gate error', err);
        return { kind: 'generation_failed' };
    }
    if (gateReason) {
        logInfo('QA gate rejected', { reason: gateReason, tookMs: Date.now() - startedAt });
        return { kind: 'rejected', reason: gateReason };
    }

    // 3b. Daily quotas (global cost cap + per-user) — consumed only now that
    //     the photo is usable and a paid generation will actually run.
    const limits = await checkSmileQuotas(identity);
    if (!limits.allowed) {
        logInfo('rate limited', { scope: limits.scope, client: identity.client });
        return { kind: 'rate_limited', scope: limits.scope };
    }

    const finish = async (provider: SmileProvider, result: Buffer): Promise<SmilePipelineResult> => {
        const watermarked = await applyWatermark(result);
        const tookMs = Date.now() - startedAt;
        logInfo('success', { provider, outputBytes: watermarked.length, tookMs });
        return {
            kind: 'success',
            provider,
            image: toJpegDataUri(watermarked),
            tookMs,
            remaining: limits.remaining,
        };
    };

    // 4+5. Primary generation with 1 retry, each attempt verified by result auto-QA.
    for (let attempt = 1; attempt <= PRIMARY_ATTEMPTS; attempt++) {
        try {
            const result = await generatePrimary(replicate, style, beforeUri);
            if (await runResultQa(openai, beforeUri, toJpegDataUri(result))) {
                return finish('nano-banana-2', result);
            }
            logInfo('primary attempt rejected by result QA', { attempt });
        } catch (err) {
            logError(`primary attempt ${attempt} failed`, err);
        }
    }

    // 6. Fallback: mouth bbox → crop → flux-kontext-pro → feathered composite.
    try {
        const composited = await generateFallbackComposite(replicate, openai, style, normalized);
        if (composited && (await runResultQa(openai, beforeUri, toJpegDataUri(composited)))) {
            return finish('kontext-pro', composited);
        }
        if (composited) logInfo('fallback rejected by result QA', {});
    } catch (err) {
        logError('fallback failed', err);
    }

    logInfo('generation failed', { tookMs: Date.now() - startedAt });
    return { kind: 'generation_failed' };
}
