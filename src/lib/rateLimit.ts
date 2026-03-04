/**
 * Simple IP-based rate limiter for public API endpoints.
 * Uses in-memory Map — resets on cold start (acceptable for Vercel serverless).
 * For persistent rate limiting, use the DB-backed approach in login/reset-password.
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (entry.resetAt < now) store.delete(key);
    }
}, 60_000);

/**
 * Check rate limit for a given key (typically IP address).
 * @param key - Unique identifier (e.g., IP address)
 * @param maxRequests - Maximum requests per window (default: 20)
 * @param windowMs - Time window in milliseconds (default: 60 seconds)
 * @returns { allowed: boolean, remaining: number }
 */
export function checkRateLimit(
    key: string,
    maxRequests = 20,
    windowMs = 60_000
): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
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
