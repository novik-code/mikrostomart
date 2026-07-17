import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenFromRequest } from '@/lib/jwt';
import { getClientIP } from '@/lib/rateLimit';
import { runSmilePipeline } from '@/lib/smile/pipeline';
import { SMILE_STYLES, SmileStyle } from '@/lib/smile/prompts';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * POST /api/smile — smile simulator v2 (replaces the legacy /api/simulate).
 *
 * multipart/form-data:
 *   - photo: File (JPEG/PNG/WebP, max 4MB)
 *   - style: 'natural' | 'brighter' | 'hollywood' (default 'natural')
 * Headers (all optional):
 *   - Authorization: Bearer <patient JWT> → per-patient daily quota
 *   - X-Device-Id: installation UUID (mobile guests) → per-device daily quota
 *   - X-Client: 'native' | 'web' (telemetry only)
 *
 * Responses (JSON, no user-facing texts — clients map reason codes to i18n):
 *   200 { ok: true, provider, image: dataUri, tookMs, remaining? }
 *   400 { ok: false, reason: 'bad_input' }
 *   422 { ok: false, reason: <qa reject code> }
 *   429 { ok: false, reason: 'rate_limited', scope: 'user'|'global' }
 *   502 { ok: false, reason: 'generation_failed' }
 *
 * The heavy lifting lives in src/lib/smile/pipeline.ts (testable module).
 */

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function badInput(): NextResponse {
    return NextResponse.json({ ok: false, reason: 'bad_input' }, { status: 400 });
}

export async function POST(req: NextRequest) {
    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return badInput();
    }

    const photo = formData.get('photo');
    if (
        !(photo instanceof File) ||
        photo.size === 0 ||
        photo.size > MAX_PHOTO_BYTES ||
        !ALLOWED_MIME_TYPES.includes(photo.type)
    ) {
        return badInput();
    }

    const styleRaw = formData.get('style');
    const style: SmileStyle =
        typeof styleRaw === 'string' && (SMILE_STYLES as readonly string[]).includes(styleRaw)
            ? (styleRaw as SmileStyle)
            : 'natural';

    // Optional patient JWT (Bearer) → per-patient quota; guests fall back to device/IP.
    const payload = verifyTokenFromRequest(req);
    const deviceIdRaw = req.headers.get('x-device-id') || '';
    const deviceId = UUID_REGEX.test(deviceIdRaw) ? deviceIdRaw.toLowerCase() : undefined;
    const client = req.headers.get('x-client') === 'native' ? 'native' : 'web';

    const photoBuffer = Buffer.from(await photo.arrayBuffer());

    const result = await runSmilePipeline({
        photo: photoBuffer,
        style,
        identity: {
            prodentisId: payload?.prodentisId,
            deviceId,
            ip: getClientIP(req),
            client,
        },
    });

    switch (result.kind) {
        case 'success':
            return NextResponse.json({
                ok: true,
                provider: result.provider,
                image: result.image,
                tookMs: result.tookMs,
                ...(result.remaining !== undefined ? { remaining: result.remaining } : {}),
            });
        case 'rejected':
            return NextResponse.json({ ok: false, reason: result.reason }, { status: 422 });
        case 'rate_limited':
            return NextResponse.json({ ok: false, reason: 'rate_limited', scope: result.scope }, { status: 429 });
        case 'bad_input':
            return badInput();
        case 'generation_failed':
        default:
            return NextResponse.json({ ok: false, reason: 'generation_failed' }, { status: 502 });
    }
}
