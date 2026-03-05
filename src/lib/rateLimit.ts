/**
 * Persistent rate limiter using Supabase.
 * Survives Vercel cold starts — entries stored in rate_limit_entries table.
 * Falls back to in-memory Map if DB is unreachable (graceful degradation).
 *
 * Migration required: 068_rate_limit_table.sql
 */

import { createClient } from '@supabase/supabase-js';

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
}

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
 */
export async function checkRateLimit(
    key: string,
    maxRequests = 20,
    windowMs = 60_000
): Promise<RateLimitResult> {
    const db = getSupabase();
    if (!db) {
        return checkRateLimitMemory(key, maxRequests, windowMs);
    }

    try {
        const now = new Date();
        const resetAt = new Date(now.getTime() + windowMs);

        // Try to get existing entry
        const { data: existing } = await db
            .from('rate_limit_entries')
            .select('count, reset_at')
            .eq('key', key)
            .single() as { data: { count: number; reset_at: string } | null };

        if (!existing || new Date(existing.reset_at) < now) {
            // No entry or expired — create/reset
            await db
                .from('rate_limit_entries')
                .upsert({ key, count: 1, reset_at: resetAt.toISOString() } as any, { onConflict: 'key' });
            return { allowed: true, remaining: maxRequests - 1 };
        }

        // Increment count
        const newCount = existing.count + 1;
        await (db
            .from('rate_limit_entries') as any)
            .update({ count: newCount })
            .eq('key', key);

        const remaining = Math.max(0, maxRequests - newCount);
        return { allowed: newCount <= maxRequests, remaining };
    } catch (err) {
        // DB error — fall back to memory
        console.error('[RateLimit] DB error, using memory fallback:', err);
        return checkRateLimitMemory(key, maxRequests, windowMs);
    }
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
