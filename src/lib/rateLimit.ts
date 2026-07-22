/**
 * Persistent rate limiter using Supabase.
 * Survives Vercel cold starts — entries stored in rate_limit_entries table.
 *
 * Counting is ATOMIC via the increment_rate_limit() RPC (migration 174).
 * The old select-then-update path is kept as a transparent fallback so that
 * deploy order vs. migration order cannot break anything.
 *
 * Degradation when the DB is unreachable:
 *   - default          → per-lambda in-memory counter (availability first)
 *   - { failClosed }   → deny (budget first; see note below)
 *
 * Migrations required: 068_rate_limit_table.sql, 174_rate_limit_atomic.sql
 */

import { createClient } from '@supabase/supabase-js';

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
}

export interface RateLimitOptions {
    /**
     * Deny instead of degrading to the in-memory counter when the DB is
     * unreachable.
     *
     * The in-memory fallback is per-lambda, and Vercel runs many lambdas, so
     * under a DB outage it effectively removes the limit while the protected
     * resource keeps costing money. For paid pipelines (smile simulator →
     * Replicate) an outage must not become an open bar.
     */
    failClosed?: boolean;
}

/** Log the "RPC not deployed yet" notice once per process, not per request. */
let rpcMissingLogged = false;

// In-memory fallback (used only when DB is unreachable)
interface RateLimitEntry {
    count: number;
    resetAt: number;
}
const memoryStore = new Map<string, RateLimitEntry>();

// Supabase client (service role — bypasses RLS)
let supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
    if (!supabase) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (url && key) {
            supabase = createClient(url, key);
        }
    }
    return supabase;
}

/**
 * Check rate limit for a given key (typically "prefix:IP").
 * Uses Supabase for persistence; falls back to in-memory if DB unavailable.
 *
 * @param key - Unique identifier (e.g., "chat:192.168.1.1")
 * @param maxRequests - Maximum requests per window (default: 20)
 * @param windowMs - Time window in milliseconds (default: 60 seconds)
 * @param options - See RateLimitOptions (failClosed)
 */
export async function checkRateLimit(
    key: string,
    maxRequests = 20,
    windowMs = 60_000,
    options: RateLimitOptions = {}
): Promise<RateLimitResult> {
    const db = getSupabase();
    if (!db) {
        return degrade(key, maxRequests, windowMs, options, 'no Supabase credentials');
    }

    // --- Preferred path: one atomic INSERT ... ON CONFLICT DO UPDATE (mig 174).
    // Two concurrent lambdas can no longer both read the same count and each
    // write count+1, which previously let daily caps be exceeded under load.
    try {
        const { data, error } = await (db as any).rpc('increment_rate_limit', {
            p_key: key,
            p_window_ms: windowMs,
        });

        if (!error) {
            const row = Array.isArray(data) ? data[0] : data;
            const count = Number(row?.out_count);
            if (Number.isFinite(count)) {
                return { allowed: count <= maxRequests, remaining: Math.max(0, maxRequests - count) };
            }
        }

        // RPC missing (migration not applied yet) → fall through to legacy path.
        if (error && !rpcMissingLogged) {
            rpcMissingLogged = true;
            console.warn('[RateLimit] increment_rate_limit RPC unavailable, using legacy path:', error.message);
        }
    } catch (err) {
        if (!rpcMissingLogged) {
            rpcMissingLogged = true;
            console.warn('[RateLimit] increment_rate_limit RPC threw, using legacy path:', err);
        }
    }

    // --- Legacy fallback: select-then-update (NOT atomic, but better than memory).
    //
    // CRITICAL: supabase-js does NOT throw on DB/network failure by default — it
    // resolves to { data: null, error }. So a try/catch alone never sees an
    // outage, and the old code silently treated "DB down" as "no entry yet" →
    // allowed. Every query's `error` must be inspected and routed to degrade(),
    // otherwise failClosed is dead and the paid path becomes an open bar.
    //
    // maybeSingle() returns { data: null, error: null } for zero rows (the
    // normal "no entry yet" case), reserving `error` for real failures.
    try {
        const now = new Date();
        const resetAt = new Date(now.getTime() + windowMs);

        const { data: existing, error: selErr } = await db
            .from('rate_limit_entries')
            .select('count, reset_at')
            .eq('key', key)
            .maybeSingle() as { data: { count: number; reset_at: string } | null; error: unknown };

        if (selErr) {
            return degrade(key, maxRequests, windowMs, options, `select: ${errText(selErr)}`);
        }

        if (!existing || new Date(existing.reset_at) < now) {
            // No entry or expired — create/reset.
            const { error: upErr } = await db
                .from('rate_limit_entries')
                .upsert({ key, count: 1, reset_at: resetAt.toISOString() } as any, { onConflict: 'key' });
            if (upErr) {
                return degrade(key, maxRequests, windowMs, options, `upsert: ${errText(upErr)}`);
            }
            return { allowed: true, remaining: maxRequests - 1 };
        }

        // Increment count.
        const newCount = existing.count + 1;
        const { error: updErr } = await (db
            .from('rate_limit_entries') as any)
            .update({ count: newCount })
            .eq('key', key);
        if (updErr) {
            return degrade(key, maxRequests, windowMs, options, `update: ${errText(updErr)}`);
        }

        const remaining = Math.max(0, maxRequests - newCount);
        return { allowed: newCount <= maxRequests, remaining };
    } catch (err) {
        // Only reached if a client-side throw slips past supabase-js.
        return degrade(key, maxRequests, windowMs, options, String(err));
    }
}

function errText(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err) {
        return String((err as { message: unknown }).message);
    }
    return String(err);
}

/**
 * DB unreachable: either deny (failClosed) or fall back to the per-lambda
 * in-memory counter.
 */
function degrade(
    key: string,
    maxRequests: number,
    windowMs: number,
    options: RateLimitOptions,
    reason: string
): RateLimitResult {
    if (options.failClosed) {
        console.error(`[RateLimit] DB unavailable and failClosed set — denying "${key}":`, reason);
        return { allowed: false, remaining: 0 };
    }
    console.error('[RateLimit] DB error, using memory fallback:', reason);
    return checkRateLimitMemory(key, maxRequests, windowMs);
}

/**
 * Synchronous in-memory fallback (same logic as before).
 */
function checkRateLimitMemory(
    key: string,
    maxRequests: number,
    windowMs: number
): RateLimitResult {
    const now = Date.now();
    const entry = memoryStore.get(key);

    if (!entry || entry.resetAt < now) {
        memoryStore.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1 };
    }

    entry.count++;
    const remaining = Math.max(0, maxRequests - entry.count);
    return { allowed: entry.count <= maxRequests, remaining };
}

/**
 * Get IP from request headers (Vercel sets x-forwarded-for).
 */
export function getClientIP(request: Request): string {
    return (
        (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
    );
}
