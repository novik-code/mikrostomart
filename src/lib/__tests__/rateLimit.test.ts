/**
 * Regression tests for the fail-closed guarantee of checkRateLimit.
 *
 * The bug this guards against: supabase-js does NOT throw on a DB/network
 * failure — it resolves to { data: null, error }. The old legacy path read only
 * `data`, so an outage looked identical to "no entry yet" and returned
 * allowed:true, silently disabling the cost cap on the paid smile path.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Supabase client mock: every query is scripted per-test. ---
const rpcMock = vi.fn();
const selectSingleMock = vi.fn();
const upsertMock = vi.fn();
const updateMock = vi.fn();

function makeClient() {
    return {
        rpc: (...a: unknown[]) => rpcMock(...a),
        from: () => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: () => selectSingleMock(),
                }),
            }),
            upsert: (...a: unknown[]) => upsertMock(...a),
            update: () => ({
                eq: (...a: unknown[]) => updateMock(...a),
            }),
        }),
    };
}

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => makeClient(),
}));

const DB_ERROR = { message: 'fetch failed: ECONNREFUSED', code: '' };

beforeEach(() => {
    vi.resetModules();
    rpcMock.mockReset();
    selectSingleMock.mockReset();
    upsertMock.mockReset();
    updateMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
});

describe('checkRateLimit — fail-closed on DB outage', () => {
    it('DENIES when RPC and legacy select both return an error object (failClosed)', async () => {
        rpcMock.mockResolvedValue({ data: null, error: DB_ERROR });        // atomic path down
        selectSingleMock.mockResolvedValue({ data: null, error: DB_ERROR }); // legacy path down

        const { checkRateLimit } = await import('@/lib/rateLimit');
        const res = await checkRateLimit('smile:global:2026-07-22', 200, 86_400_000, { failClosed: true });

        expect(res.allowed).toBe(false);
        // Must NOT have silently created an entry as if it were a fresh limit.
        expect(upsertMock).not.toHaveBeenCalled();
    });

    it('DENIES when the legacy upsert itself fails (failClosed)', async () => {
        rpcMock.mockResolvedValue({ data: null, error: { message: 'function not found' } }); // RPC missing
        selectSingleMock.mockResolvedValue({ data: null, error: null }); // no row yet (normal)
        upsertMock.mockResolvedValue({ error: DB_ERROR });               // but the write fails

        const { checkRateLimit } = await import('@/lib/rateLimit');
        const res = await checkRateLimit('smile:global:2026-07-22', 200, 86_400_000, { failClosed: true });

        expect(res.allowed).toBe(false);
    });

    it('uses the atomic RPC result when available (no legacy fallthrough)', async () => {
        rpcMock.mockResolvedValue({ data: [{ out_count: 5, out_reset_at: '2026-07-23T00:00:00Z' }], error: null });

        const { checkRateLimit } = await import('@/lib/rateLimit');
        const res = await checkRateLimit('smile:global:2026-07-22', 200, 86_400_000, { failClosed: true });

        expect(res).toEqual({ allowed: true, remaining: 195 });
        expect(selectSingleMock).not.toHaveBeenCalled(); // legacy path never touched
    });

    it('denies once the RPC count exceeds the limit', async () => {
        rpcMock.mockResolvedValue({ data: [{ out_count: 201, out_reset_at: '2026-07-23T00:00:00Z' }], error: null });

        const { checkRateLimit } = await import('@/lib/rateLimit');
        const res = await checkRateLimit('smile:global:2026-07-22', 200, 86_400_000, { failClosed: true });

        expect(res).toEqual({ allowed: false, remaining: 0 });
    });

    it('falls back to the legacy path when the RPC is missing (migration not applied)', async () => {
        rpcMock.mockResolvedValue({ data: null, error: { message: 'could not find function increment_rate_limit' } });
        selectSingleMock.mockResolvedValue({ data: null, error: null }); // no row yet
        upsertMock.mockResolvedValue({ error: null });

        const { checkRateLimit } = await import('@/lib/rateLimit');
        const res = await checkRateLimit('chat:1.2.3.4', 20, 60_000);

        expect(res).toEqual({ allowed: true, remaining: 19 });
        expect(upsertMock).toHaveBeenCalled();
    });
});
