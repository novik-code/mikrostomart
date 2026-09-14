/**
 * Tests for the thin POST /api/smile route (src/app/api/smile/route.ts):
 * multipart validation (bad_input) and pipeline-result → HTTP mapping.
 * The pipeline itself is covered in src/lib/smile/__tests__/pipeline.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import sharp from 'sharp';

const runSmilePipelineMock = vi.fn();
vi.mock('@/lib/smile/pipeline', () => ({
    runSmilePipeline: (...args: unknown[]) => runSmilePipelineMock(...args),
}));

// Trasa przeszła na `verifyPatientSession` (migracja 197) — sprawdza też, czy sesja
// nie została unieważniona, i jest ASYNC. Mock musi mieć tę samą nazwę i kształt,
// inaczej test mockuje funkcję, której nikt już nie woła.
const verifyTokenFromRequestMock = vi.fn();
vi.mock('@/lib/jwt', () => ({
    verifyPatientSession: async (...args: unknown[]) => verifyTokenFromRequestMock(...args),
}));

vi.mock('@/lib/rateLimit', () => ({
    getClientIP: () => '198.51.100.7',
    checkRateLimit: vi.fn(),
}));

const DEVICE_UUID = 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE';

/**
 * Plik z nagłówkiem JPEG (FF D8 FF) — od 2026-09-14 trasa sniffuje magic bytes,
 * więc sam wypełniacz bez nagłówka to „nie obraz" i kończy się 400.
 */
function photoFile(bytes = 1000, type = 'image/jpeg'): File {
    const buf = Buffer.alloc(bytes, 7);
    buf[0] = 0xff; buf[1] = 0xd8; buf[2] = 0xff;
    return new File([buf], 'photo.jpg', { type });
}

function makeRequest(form: FormData, headers: Record<string, string> = {}): NextRequest {
    return new NextRequest('http://localhost/api/smile', { method: 'POST', body: form, headers });
}

beforeEach(() => {
    vi.clearAllMocks();
    verifyTokenFromRequestMock.mockReturnValue(null);
});

describe('POST /api/smile — input validation', () => {
    it('returns 400 bad_input when photo is missing', async () => {
        const { POST } = await import('@/app/api/smile/route');
        const response = await POST(makeRequest(new FormData()));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ ok: false, reason: 'bad_input' });
        expect(runSmilePipelineMock).not.toHaveBeenCalled();
    });

    it('returns 400 bad_input when photo exceeds 4MB', async () => {
        const form = new FormData();
        form.set('photo', photoFile(4 * 1024 * 1024 + 1));

        const { POST } = await import('@/app/api/smile/route');
        const response = await POST(makeRequest(form));

        expect(response.status).toBe(400);
        expect(runSmilePipelineMock).not.toHaveBeenCalled();
    });

    it('returns 400 bad_input for an unsupported mime type', async () => {
        const form = new FormData();
        form.set('photo', photoFile(1000, 'image/gif'));

        const { POST } = await import('@/app/api/smile/route');
        const response = await POST(makeRequest(form));

        expect(response.status).toBe(400);
        expect(runSmilePipelineMock).not.toHaveBeenCalled();
    });
});

describe('POST /api/smile — pipeline mapping', () => {
    it('maps success to 200 and passes style + identity to the pipeline', async () => {
        verifyTokenFromRequestMock.mockReturnValue({ prodentisId: 'P-9', phone: '', userId: 'u1' });
        runSmilePipelineMock.mockResolvedValue({
            kind: 'success',
            provider: 'nano-banana-2',
            image: 'data:image/jpeg;base64,QUJD',
            tookMs: 1234,
            remaining: 2,
        });

        const form = new FormData();
        form.set('photo', photoFile(2048));
        form.set('style', 'brighter');

        const { POST } = await import('@/app/api/smile/route');
        const response = await POST(
            makeRequest(form, { 'X-Device-Id': DEVICE_UUID, 'X-Client': 'native' }),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            ok: true,
            provider: 'nano-banana-2',
            image: 'data:image/jpeg;base64,QUJD',
            tookMs: 1234,
            remaining: 2,
        });

        expect(runSmilePipelineMock).toHaveBeenCalledTimes(1);
        const call = runSmilePipelineMock.mock.calls[0][0];
        expect(call.style).toBe('brighter');
        expect(call.photo).toBeInstanceOf(Buffer);
        expect(call.photo.length).toBe(2048);
        expect(call.identity).toEqual({
            prodentisId: 'P-9',
            deviceId: DEVICE_UUID.toLowerCase(),
            ip: '198.51.100.7',
            client: 'native',
        });
    });

    it('defaults unknown style to natural and ignores a malformed device id', async () => {
        runSmilePipelineMock.mockResolvedValue({ kind: 'generation_failed' });

        const form = new FormData();
        form.set('photo', photoFile());
        form.set('style', 'sparkling');

        const { POST } = await import('@/app/api/smile/route');
        await POST(makeRequest(form, { 'X-Device-Id': 'not-a-uuid' }));

        const call = runSmilePipelineMock.mock.calls[0][0];
        expect(call.style).toBe('natural');
        expect(call.identity.deviceId).toBeUndefined();
        expect(call.identity.client).toBe('web');
    });

    it('maps QA rejection to 422 with the reason code', async () => {
        runSmilePipelineMock.mockResolvedValue({ kind: 'rejected', reason: 'no_face' });

        const form = new FormData();
        form.set('photo', photoFile());

        const { POST } = await import('@/app/api/smile/route');
        const response = await POST(makeRequest(form));

        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ ok: false, reason: 'no_face' });
    });

    it('maps a daily-quota rate_limited to 429 with scope + window + Retry-After', async () => {
        runSmilePipelineMock.mockResolvedValue({ kind: 'rate_limited', scope: 'global', window: 'day' });

        const form = new FormData();
        form.set('photo', photoFile());

        const { POST } = await import('@/app/api/smile/route');
        const response = await POST(makeRequest(form));

        expect(response.status).toBe(429);
        expect(await response.json()).toEqual({
            ok: false, reason: 'rate_limited', scope: 'global', window: 'day',
        });
        // Daily quota resets at UTC midnight → Retry-After is a positive seconds value.
        const retryAfter = Number(response.headers.get('Retry-After'));
        expect(retryAfter).toBeGreaterThan(0);
        expect(retryAfter).toBeLessThanOrEqual(24 * 60 * 60);
    });

    it('maps a flood rate_limited to a 60s per-minute window', async () => {
        runSmilePipelineMock.mockResolvedValue({ kind: 'rate_limited', scope: 'user', window: 'minute' });

        const form = new FormData();
        form.set('photo', photoFile());

        const { POST } = await import('@/app/api/smile/route');
        const response = await POST(makeRequest(form));

        expect(response.status).toBe(429);
        expect(await response.json()).toEqual({
            ok: false, reason: 'rate_limited', scope: 'user', window: 'minute',
        });
        expect(response.headers.get('Retry-After')).toBe('60');
    });

    it('maps generation_failed to 502', async () => {
        runSmilePipelineMock.mockResolvedValue({ kind: 'generation_failed' });

        const form = new FormData();
        form.set('photo', photoFile());

        const { POST } = await import('@/app/api/smile/route');
        const response = await POST(makeRequest(form));

        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({ ok: false, reason: 'generation_failed' });
    });

    it('maps pipeline-level bad_input (undecodable image) to 400', async () => {
        runSmilePipelineMock.mockResolvedValue({ kind: 'bad_input' });

        const form = new FormData();
        form.set('photo', photoFile());

        const { POST } = await import('@/app/api/smile/route');
        const response = await POST(makeRequest(form));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ ok: false, reason: 'bad_input' });
    });
});

/**
 * STRAŻNIK (2026-09-14): o typie zdjęcia decydują BAJTY, nie etykieta.
 *
 * 🔴 CO BYŁO ZEPSUTE. Trasa sprawdzała tylko `photo.type` — typ zadeklarowany przez
 * klienta — i oddawała bajty do `sharp`, który dekoduje po ZAWARTOŚCI. Plik AVIF
 * z etykietą `image/jpeg` szedł więc do libheif, a dla sharp < 0.35.4 to znana
 * możliwość wykonania kodu (GHSA-rgj7-g3m4-5g8c). Trasa jest publiczna: gość bez
 * logowania. Obrazy do testów robi PRAWDZIWY sharp, nie ręcznie klejone nagłówki.
 *
 * DOWÓD, ŻE GRYZIE (cofka): usuń sniff z trasy → padają przypadki 🔴.
 */
describe('POST /api/smile — o typie decydują bajty, nie etykieta', () => {
    const plotno = () => sharp({ create: { width: 16, height: 16, channels: 3, background: '#88aacc' } });

    function formZ(bufor: Buffer, type: string): FormData {
        const form = new FormData();
        // `Uint8Array` — `Buffer` z sharpa ma typ `ArrayBufferLike`, którego `BlobPart` nie przyjmuje.
        form.set('photo', new File([new Uint8Array(bufor)], 'photo', { type }));
        return form;
    }

    it('KONTROLA MIERNIKA: sharp naprawdę rozpoznaje AVIF po zawartości (heif)', async () => {
        // Gdyby sharp nie dekodował AVIF, przypadek niżej nie chroniłby przed niczym.
        const avif = await plotno().avif().toBuffer();
        expect((await sharp(avif).metadata()).format).toBe('heif');
    });

    it('🔴 AVIF z etykietą image/jpeg → 400, NIC nie trafia do potoku', async () => {
        const avif = await plotno().avif().toBuffer();
        const { POST } = await import('@/app/api/smile/route');
        const response = await POST(makeRequest(formZ(avif, 'image/jpeg')));
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ ok: false, reason: 'bad_input' });
        expect(runSmilePipelineMock).not.toHaveBeenCalled();
    });

    it('🔴 SVG z etykietą image/png → 400', async () => {
        const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><script>1</script></svg>');
        const { POST } = await import('@/app/api/smile/route');
        const response = await POST(makeRequest(formZ(svg, 'image/png')));
        expect(response.status).toBe(400);
        expect(runSmilePipelineMock).not.toHaveBeenCalled();
    });

    it('🔴 GIF (prawdziwy, dekodowalny przez sharp) z etykietą image/webp → 400', async () => {
        const gif = await plotno().gif().toBuffer();
        const { POST } = await import('@/app/api/smile/route');
        const response = await POST(makeRequest(formZ(gif, 'image/webp')));
        expect(response.status).toBe(400);
        expect(runSmilePipelineMock).not.toHaveBeenCalled();
    });

    it('KONTROLA NEGATYWNA: prawdziwe JPEG, PNG i WebP przechodzą do potoku bajt w bajt', async () => {
        runSmilePipelineMock.mockResolvedValue({ kind: 'generation_failed' });
        const { POST } = await import('@/app/api/smile/route');
        for (const [bufor, type] of [
            [await plotno().jpeg().toBuffer(), 'image/jpeg'],
            [await plotno().png().toBuffer(), 'image/png'],
            [await plotno().webp().toBuffer(), 'image/webp'],
        ] as const) {
            runSmilePipelineMock.mockClear();
            const response = await POST(makeRequest(formZ(bufor, type)));
            expect(response.status, type).toBe(502);
            expect(runSmilePipelineMock, type).toHaveBeenCalledTimes(1);
            expect(Buffer.compare(runSmilePipelineMock.mock.calls[0][0].photo, bufor), type).toBe(0);
        }
    });

    it('🔒 zainstalowany libheif ma poprawkę (sharp ≥ 0.35.4 → libheif ≥ 1.23.2)', () => {
        // Sniff w trasie zamyka TĘ trasę; aktualizacja sharp zamyka klasę. Ten przypadek
        // pada, gdyby lockfile cofnął sharp do wersji z podatnym libheif.
        const [maj, min, pat] = (sharp.versions.heif ?? '0.0.0').split('.').map(Number);
        expect(maj * 1e6 + min * 1e3 + pat, `libheif ${sharp.versions.heif}`).toBeGreaterThanOrEqual(1 * 1e6 + 23 * 1e3 + 2);
    });
});
