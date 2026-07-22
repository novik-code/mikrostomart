/**
 * Unit tests for the smile simulator v2 pipeline (src/lib/smile/pipeline.ts).
 *
 * Replicate / OpenAI / rateLimit are mocked (no real API calls). sharp runs
 * for real on tiny generated images so the normalize/crop/composite/watermark
 * code paths are actually exercised.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import sharp from 'sharp';
import type { SmileIdentity } from '@/lib/smile/pipeline';

const replicateRunMock = vi.fn();
vi.mock('replicate', () => ({
    default: class ReplicateMock {
        run = replicateRunMock;
    },
}));

const openaiCreateMock = vi.fn();
vi.mock('openai', () => ({
    default: class OpenAIMock {
        chat = { completions: { create: openaiCreateMock } };
    },
}));

const checkRateLimitMock = vi.fn();
vi.mock('@/lib/rateLimit', () => ({
    checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
    getClientIP: () => '203.0.113.5',
}));

const telegramMock = vi.fn(async (_message: string, _channel?: string) => true);
vi.mock('@/lib/telegram', () => ({
    sendTelegramNotification: (message: string, channel?: string) => telegramMock(message, channel),
}));

// --- Helpers ---

const PATIENT_IDENTITY: SmileIdentity = { prodentisId: 'P-123', ip: '203.0.113.5', client: 'native' };

async function makeJpeg(width = 800, height = 600): Promise<Buffer> {
    return sharp({
        create: { width, height, channels: 3, background: { r: 210, g: 170, b: 150 } },
    })
        .jpeg()
        .toBuffer();
}

async function makeJpegDataUri(width = 800, height = 600): Promise<string> {
    const buf = await makeJpeg(width, height);
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

function chatJson(payload: unknown) {
    return { choices: [{ message: { content: JSON.stringify(payload) } }] };
}

function gateVerdict(overrides: Record<string, unknown> = {}) {
    return {
        faceCount: 1,
        frontal: true,
        teethVisible: true,
        sharpEnough: true,
        mouthLargeEnough: true,
        ...overrides,
    };
}

function resultVerdict(pass: boolean) {
    return {
        samePerson: pass,
        teethImproved: pass,
        eyesUnchanged: pass,
        noArtifacts: pass,
        verdictPass: pass,
        issues: pass ? '' : 'test artifacts',
    };
}

interface OpenAiMockOptions {
    gate?: Record<string, unknown>;
    /** verdictPass per successive result-QA call; last value repeats. */
    resultVerdicts?: boolean[];
    bbox?: Record<string, unknown>;
}

/** Dispatches mocked OpenAI responses by JSON-schema name. Returns per-schema call logs. */
function installOpenAiMock(options: OpenAiMockOptions = {}) {
    const gate = options.gate ?? gateVerdict();
    const resultVerdicts = options.resultVerdicts ?? [true];
    const bbox = options.bbox ?? { x: 0.4, y: 0.6, w: 0.2, h: 0.12 };
    const calls: Record<string, unknown[]> = { smile_qa_gate: [], smile_result_qa: [], smile_mouth_bbox: [] };
    let resultCall = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    openaiCreateMock.mockImplementation(async (request: any) => {
        const name = request?.response_format?.json_schema?.name;
        calls[name]?.push(request);
        if (name === 'smile_qa_gate') return chatJson(gate);
        if (name === 'smile_mouth_bbox') return chatJson(bbox);
        if (name === 'smile_result_qa') {
            const pass = resultVerdicts[Math.min(resultCall, resultVerdicts.length - 1)];
            resultCall++;
            return chatJson(resultVerdict(pass));
        }
        throw new Error(`Unexpected OpenAI schema: ${name}`);
    });

    return calls;
}

beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 2 });
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.REPLICATE_API_TOKEN = 'test-replicate-token';
    delete process.env.SMILE_QA_MODEL;
    delete process.env.SMILE_BBOX_MODEL;
});

describe('smile pipeline — happy path', () => {
    it('returns a watermarked nano-banana-2 result for style natural', async () => {
        installOpenAiMock();
        replicateRunMock.mockResolvedValue(await makeJpegDataUri(1024, 768));

        const { runSmilePipeline } = await import('@/lib/smile/pipeline');
        const { SMILE_PROMPTS } = await import('@/lib/smile/prompts');

        const result = await runSmilePipeline({
            photo: await makeJpeg(),
            style: 'natural',
            identity: PATIENT_IDENTITY,
        });

        expect(result.kind).toBe('success');
        if (result.kind !== 'success') return;
        expect(result.provider).toBe('nano-banana-2');
        expect(result.image.startsWith('data:image/jpeg;base64,')).toBe(true);
        expect(result.remaining).toBe(2);
        expect(result.tookMs).toBeTypeOf('number');

        // Output must decode — proves the watermark composite ran on a real image.
        const outputBuffer = Buffer.from(result.image.split(',')[1], 'base64');
        const meta = await sharp(outputBuffer).metadata();
        expect(meta.format).toBe('jpeg');
        expect(meta.width).toBe(1024);

        // Exactly one paid generation with the validated prompt and params.
        expect(replicateRunMock).toHaveBeenCalledTimes(1);
        const [model, options] = replicateRunMock.mock.calls[0];
        expect(model).toBe('google/nano-banana-2');
        expect(options.input.prompt).toBe(SMILE_PROMPTS.natural);
        expect(options.input.resolution).toBe('1K');
        expect(options.input.aspect_ratio).toBe('match_input_image');
        expect(options.input.output_format).toBe('jpg');
        expect(Array.isArray(options.input.image_input)).toBe(true);

        // Rate-limit keys: flood → global → patient. Matched by prefix rather
        // than by call index, because the budget alarm may insert an extra
        // `smile:alert:` call between them once the global cap is nearly spent.
        const keys = checkRateLimitMock.mock.calls.map((call) => String(call[0]));
        expect(keys.find((k) => k.startsWith('smile:flood:'))).toMatch(/^smile:flood:203\.0\.113\.5$/);
        expect(keys.find((k) => k.startsWith('smile:global:'))).toMatch(/^smile:global:\d{4}-\d{2}-\d{2}$/);
        expect(keys.find((k) => k.startsWith('smile:patient:'))).toMatch(/^smile:patient:P-123:\d{4}-\d{2}-\d{2}$/);

        // Every paid-path limit check must be fail-closed: a DB outage must not
        // silently turn the cost cap off while Replicate keeps being billed.
        for (const call of checkRateLimitMock.mock.calls) {
            const key = String(call[0]);
            if (key.startsWith('smile:alert:')) continue; // alarm latch, not a cost gate
            expect(call[3]).toEqual({ failClosed: true });
        }
    });
});

describe('smile pipeline — QA gate', () => {
    it('rejects closed mouth BEFORE any paid generation', async () => {
        installOpenAiMock({ gate: gateVerdict({ teethVisible: false }) });

        const { runSmilePipeline } = await import('@/lib/smile/pipeline');
        const result = await runSmilePipeline({
            photo: await makeJpeg(),
            style: 'natural',
            identity: PATIENT_IDENTITY,
        });

        expect(result).toEqual({ kind: 'rejected', reason: 'closed_mouth' });
        expect(replicateRunMock).not.toHaveBeenCalled();
    });

    it('maps the remaining gate verdicts to reason codes', async () => {
        const cases: Array<[Record<string, unknown>, string]> = [
            [{ faceCount: 0 }, 'no_face'],
            [{ faceCount: 2 }, 'multiple_faces'],
            [{ sharpEnough: false }, 'blurry'],
            [{ frontal: false }, 'bad_pose'],
            [{ mouthLargeEnough: false }, 'mouth_too_small'],
        ];
        const { runSmilePipeline } = await import('@/lib/smile/pipeline');

        for (const [overrides, reason] of cases) {
            installOpenAiMock({ gate: gateVerdict(overrides) });
            const result = await runSmilePipeline({
                photo: await makeJpeg(),
                style: 'natural',
                identity: PATIENT_IDENTITY,
            });
            expect(result).toEqual({ kind: 'rejected', reason });
        }
        expect(replicateRunMock).not.toHaveBeenCalled();
    });

    it('fails with generation_failed when the QA gate itself errors', async () => {
        openaiCreateMock.mockRejectedValue(new Error('OpenAI down'));

        const { runSmilePipeline } = await import('@/lib/smile/pipeline');
        const result = await runSmilePipeline({
            photo: await makeJpeg(),
            style: 'natural',
            identity: PATIENT_IDENTITY,
        });

        expect(result).toEqual({ kind: 'generation_failed' });
        expect(replicateRunMock).not.toHaveBeenCalled();
    });
});

describe('smile pipeline — rate limits', () => {
    it('returns scope user when the patient daily quota is exhausted', async () => {
        // Daily quotas are checked AFTER the QA gate (a rejected photo must not
        // burn the daily try), so the gate call happens — but no generation.
        installOpenAiMock();
        checkRateLimitMock.mockImplementation(async (key: string) =>
            key.startsWith('smile:patient:')
                ? { allowed: false, remaining: 0 }
                : { allowed: true, remaining: 5 },
        );

        const { runSmilePipeline } = await import('@/lib/smile/pipeline');
        const result = await runSmilePipeline({
            photo: await makeJpeg(),
            style: 'natural',
            identity: PATIENT_IDENTITY,
        });

        expect(result).toEqual({ kind: 'rate_limited', scope: 'user', window: 'day' });
        expect(replicateRunMock).not.toHaveBeenCalled();
    });

    it('returns scope global when the daily global budget is exhausted', async () => {
        installOpenAiMock();
        checkRateLimitMock.mockImplementation(async (key: string) =>
            key.startsWith('smile:global:')
                ? { allowed: false, remaining: 0 }
                : { allowed: true, remaining: 5 },
        );

        const { runSmilePipeline } = await import('@/lib/smile/pipeline');
        const result = await runSmilePipeline({
            photo: await makeJpeg(),
            style: 'natural',
            identity: PATIENT_IDENTITY,
        });

        expect(result).toEqual({ kind: 'rate_limited', scope: 'global', window: 'day' });
        expect(replicateRunMock).not.toHaveBeenCalled();
    });

    it('does not consume daily quotas when the QA gate rejects the photo', async () => {
        installOpenAiMock({ gate: gateVerdict({ teethVisible: false }) });

        const { runSmilePipeline } = await import('@/lib/smile/pipeline');
        const result = await runSmilePipeline({
            photo: await makeJpeg(),
            style: 'natural',
            identity: PATIENT_IDENTITY,
        });

        expect(result).toEqual({ kind: 'rejected', reason: 'closed_mouth' });
        const limitKeys = checkRateLimitMock.mock.calls.map((c) => String(c[0]));
        expect(limitKeys).toHaveLength(1);
        expect(limitKeys[0]).toMatch(/^smile:flood:/);
        expect(replicateRunMock).not.toHaveBeenCalled();
    });

    it('uses device / ip keys for guests', async () => {
        installOpenAiMock();
        replicateRunMock.mockResolvedValue(await makeJpegDataUri(1024, 768));
        const { runSmilePipeline } = await import('@/lib/smile/pipeline');

        await runSmilePipeline({
            photo: await makeJpeg(),
            style: 'natural',
            identity: { deviceId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', ip: '203.0.113.5', client: 'native' },
        });
        const deviceCall = checkRateLimitMock.mock.calls.find((c) =>
            String(c[0]).startsWith('smile:device:'));
        expect(deviceCall?.[0]).toMatch(/^smile:device:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:/);
        expect(deviceCall?.[1]).toBe(3); // 3/day per device (raised from 1)

        checkRateLimitMock.mockClear();
        await runSmilePipeline({
            photo: await makeJpeg(),
            style: 'natural',
            identity: { ip: '203.0.113.5', client: 'web' },
        });
        const ipCall = checkRateLimitMock.mock.calls.find((c) =>
            String(c[0]).startsWith('smile:ip:'));
        expect(ipCall?.[0]).toMatch(/^smile:ip:203\.0\.113\.5:/);
        expect(ipCall?.[1]).toBe(3); // 3/day per IP
    });

    it('reports the flood guard as a per-minute window, not a spent daily quota', async () => {
        installOpenAiMock();
        checkRateLimitMock.mockImplementation(async (key: string) =>
            key.startsWith('smile:flood:')
                ? { allowed: false, remaining: 0 }
                : { allowed: true, remaining: 5 },
        );

        const { runSmilePipeline } = await import('@/lib/smile/pipeline');
        const result = await runSmilePipeline({
            photo: await makeJpeg(),
            style: 'natural',
            identity: PATIENT_IDENTITY,
        });

        // `scope` stays 'user' for app builds already in the stores (no OTA);
        // `window` is what lets new clients say "try again in a minute".
        expect(result).toEqual({ kind: 'rate_limited', scope: 'user', window: 'minute' });
        expect(replicateRunMock).not.toHaveBeenCalled();
    });

    it('whitelisted prodentisId bypasses daily + global quotas (flood guard still runs)', async () => {
        installOpenAiMock();
        replicateRunMock.mockResolvedValue(await makeJpegDataUri(1024, 768));
        // Even a fully-spent global cap must not stop a whitelisted account.
        checkRateLimitMock.mockImplementation(async (key: string) =>
            key.startsWith('smile:flood:')
                ? { allowed: true, remaining: 9 }
                : { allowed: false, remaining: 0 },
        );
        process.env.SMILE_UNLIMITED_PRODENTIS_IDS = 'P-999, P-123 ,P-777'; // spaces on purpose

        try {
            const { runSmilePipeline } = await import('@/lib/smile/pipeline');
            const result = await runSmilePipeline({
                photo: await makeJpeg(),
                style: 'natural',
                identity: PATIENT_IDENTITY, // prodentisId P-123
            });

            expect(result.kind).toBe('success');
            expect(replicateRunMock).toHaveBeenCalled();
            // Flood guard is the ONLY limit key touched — no daily/global check.
            const keys = checkRateLimitMock.mock.calls.map((c) => String(c[0]));
            expect(keys.every((k) => k.startsWith('smile:flood:'))).toBe(true);
        } finally {
            delete process.env.SMILE_UNLIMITED_PRODENTIS_IDS;
        }
    });

    it('a non-whitelisted patient is NOT bypassed', async () => {
        installOpenAiMock();
        checkRateLimitMock.mockImplementation(async (key: string) =>
            key.startsWith('smile:patient:')
                ? { allowed: false, remaining: 0 }
                : { allowed: true, remaining: 5 },
        );
        process.env.SMILE_UNLIMITED_PRODENTIS_IDS = 'P-999'; // P-123 not listed

        try {
            const { runSmilePipeline } = await import('@/lib/smile/pipeline');
            const result = await runSmilePipeline({
                photo: await makeJpeg(),
                style: 'natural',
                identity: PATIENT_IDENTITY,
            });

            expect(result).toEqual({ kind: 'rate_limited', scope: 'user', window: 'day' });
            expect(replicateRunMock).not.toHaveBeenCalled();
        } finally {
            delete process.env.SMILE_UNLIMITED_PRODENTIS_IDS;
        }
    });
});

describe('smile pipeline — global budget alarm', () => {
    it('alerts once when the global cap is ~80% spent, and not again the same day', async () => {
        installOpenAiMock();
        replicateRunMock.mockResolvedValue(await makeJpegDataUri(1024, 768));

        // remaining 30 of 200 → below the 20%-left alarm threshold.
        let alertLatchTaken = false;
        checkRateLimitMock.mockImplementation(async (key: string) => {
            if (key.startsWith('smile:alert:')) {
                const allowed = !alertLatchTaken;
                alertLatchTaken = true;
                return { allowed, remaining: 0 };
            }
            if (key.startsWith('smile:global:')) return { allowed: true, remaining: 30 };
            return { allowed: true, remaining: 5 };
        });

        const { runSmilePipeline } = await import('@/lib/smile/pipeline');

        // Two generations past the threshold — the latch must fire exactly once.
        // The alert is fire-and-forget, so wait for the pending microtasks.
        await runSmilePipeline({ photo: await makeJpeg(), style: 'natural', identity: PATIENT_IDENTITY });
        await runSmilePipeline({ photo: await makeJpeg(), style: 'natural', identity: PATIENT_IDENTITY });

        await vi.waitFor(() => expect(telegramMock).toHaveBeenCalledTimes(1));
        expect(String(telegramMock.mock.calls[0][0])).toContain('170/200');
    });

    it('stays silent while the global cap is comfortable', async () => {
        installOpenAiMock();
        replicateRunMock.mockResolvedValue(await makeJpegDataUri(1024, 768));
        checkRateLimitMock.mockImplementation(async () => ({ allowed: true, remaining: 150 }));

        const { runSmilePipeline } = await import('@/lib/smile/pipeline');
        await runSmilePipeline({ photo: await makeJpeg(), style: 'natural', identity: PATIENT_IDENTITY });

        expect(telegramMock).not.toHaveBeenCalled();
    });
});

describe('smile pipeline — fallback', () => {
    async function installReplicateMock() {
        const primaryUri = await makeJpegDataUri(1024, 768);
        const kontextUri = await makeJpegDataUri(512, 512); // pipeline must rescale to exact crop dims
        replicateRunMock.mockImplementation(async (model: string) =>
            model === 'google/nano-banana-2' ? primaryUri : kontextUri,
        );
    }

    it('falls back to kontext-pro after 2 primary attempts rejected by result QA', async () => {
        const calls = installOpenAiMock({ resultVerdicts: [false, false, true] });
        await installReplicateMock();

        const { runSmilePipeline } = await import('@/lib/smile/pipeline');
        const { KONTEXT_PROMPTS } = await import('@/lib/smile/prompts');

        const result = await runSmilePipeline({
            photo: await makeJpeg(),
            style: 'natural',
            identity: PATIENT_IDENTITY,
        });

        expect(result.kind).toBe('success');
        if (result.kind !== 'success') return;
        expect(result.provider).toBe('kontext-pro');

        // Composited output keeps the original frame dimensions.
        const outputBuffer = Buffer.from(result.image.split(',')[1], 'base64');
        const meta = await sharp(outputBuffer).metadata();
        expect(meta.width).toBe(800);
        expect(meta.height).toBe(600);

        // 2× nano-banana-2 + 1× flux-kontext-pro.
        expect(replicateRunMock).toHaveBeenCalledTimes(3);
        const models = replicateRunMock.mock.calls.map((call) => call[0]);
        expect(models).toEqual([
            'google/nano-banana-2',
            'google/nano-banana-2',
            'black-forest-labs/flux-kontext-pro',
        ]);
        const kontextInput = replicateRunMock.mock.calls[2][1].input;
        expect(kontextInput.prompt).toBe(KONTEXT_PROMPTS.natural);
        expect(kontextInput.input_image.startsWith('data:image/jpeg;base64,')).toBe(true);
        expect(kontextInput.aspect_ratio).toBe('match_input_image');
        expect(kontextInput.safety_tolerance).toBe(2);

        // Bbox fetched LAZILY (only for the fallback) on the stronger model;
        // gate + result QA stay on the cheap model.
        expect(calls.smile_mouth_bbox).toHaveLength(1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((calls.smile_mouth_bbox[0] as any).model).toBe('gpt-4o');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((calls.smile_qa_gate[0] as any).model).toBe('gpt-4o-mini');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((calls.smile_result_qa[0] as any).model).toBe('gpt-4o-mini');
    });

    it('falls back to kontext-pro when primary generation throws twice', async () => {
        const calls = installOpenAiMock({ resultVerdicts: [true] });
        const kontextUri = await makeJpegDataUri(512, 512);
        replicateRunMock.mockImplementation(async (model: string) => {
            if (model === 'google/nano-banana-2') throw new Error('Replicate 500');
            return kontextUri;
        });

        const { runSmilePipeline } = await import('@/lib/smile/pipeline');
        const result = await runSmilePipeline({
            photo: await makeJpeg(),
            style: 'natural',
            identity: PATIENT_IDENTITY,
        });

        expect(result.kind).toBe('success');
        if (result.kind !== 'success') return;
        expect(result.provider).toBe('kontext-pro');
        expect(replicateRunMock).toHaveBeenCalledTimes(3);
        expect(calls.smile_mouth_bbox).toHaveLength(1);
    });

    it('returns generation_failed when the fallback composite fails result QA (horror never reaches the client)', async () => {
        // Primary rejected twice, fallback composite gets verdictPass=false too.
        installOpenAiMock({ resultVerdicts: [false, false, false] });
        await installReplicateMock();

        const { runSmilePipeline } = await import('@/lib/smile/pipeline');
        const result = await runSmilePipeline({
            photo: await makeJpeg(),
            style: 'natural',
            identity: PATIENT_IDENTITY,
        });

        expect(result).toEqual({ kind: 'generation_failed' });
        expect(replicateRunMock).toHaveBeenCalledTimes(3);
    });

    it('returns generation_failed when everything (including fallback generation) fails', async () => {
        installOpenAiMock({ resultVerdicts: [false] });
        replicateRunMock.mockRejectedValue(new Error('Replicate down'));

        const { runSmilePipeline } = await import('@/lib/smile/pipeline');
        const result = await runSmilePipeline({
            photo: await makeJpeg(),
            style: 'natural',
            identity: PATIENT_IDENTITY,
        });

        expect(result).toEqual({ kind: 'generation_failed' });
    });
});

describe('smile pipeline — bad input', () => {
    it('rejects an undecodable photo as bad_input', async () => {
        installOpenAiMock();

        const { runSmilePipeline } = await import('@/lib/smile/pipeline');
        const result = await runSmilePipeline({
            photo: Buffer.from('definitely not an image'),
            style: 'natural',
            identity: PATIENT_IDENTITY,
        });

        expect(result).toEqual({ kind: 'bad_input' });
        expect(openaiCreateMock).not.toHaveBeenCalled();
        expect(replicateRunMock).not.toHaveBeenCalled();
    });
});
