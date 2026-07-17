/**
 * Tests for the thin POST /api/smile route (src/app/api/smile/route.ts):
 * multipart validation (bad_input) and pipeline-result → HTTP mapping.
 * The pipeline itself is covered in src/lib/smile/__tests__/pipeline.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const runSmilePipelineMock = vi.fn();
vi.mock('@/lib/smile/pipeline', () => ({
    runSmilePipeline: (...args: unknown[]) => runSmilePipelineMock(...args),
}));

const verifyTokenFromRequestMock = vi.fn();
vi.mock('@/lib/jwt', () => ({
    verifyTokenFromRequest: (...args: unknown[]) => verifyTokenFromRequestMock(...args),
}));

vi.mock('@/lib/rateLimit', () => ({
    getClientIP: () => '198.51.100.7',
    checkRateLimit: vi.fn(),
}));

const DEVICE_UUID = 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE';

function photoFile(bytes = 1000, type = 'image/jpeg'): File {
    return new File([Buffer.alloc(bytes, 7)], 'photo.jpg', { type });
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

    it('maps rate_limited to 429 with the scope', async () => {
        runSmilePipelineMock.mockResolvedValue({ kind: 'rate_limited', scope: 'global' });

        const form = new FormData();
        form.set('photo', photoFile());

        const { POST } = await import('@/app/api/smile/route');
        const response = await POST(makeRequest(form));

        expect(response.status).toBe(429);
        expect(await response.json()).toEqual({ ok: false, reason: 'rate_limited', scope: 'global' });
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
