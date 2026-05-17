import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'mfa_session';
const TTL_SECONDS = 8 * 60 * 60; // 8 hours (typical workday session)

function getSecret(): string {
    const secret = process.env.MFA_SESSION_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error(
            '[MFA] MFA_SESSION_SECRET env var must be set (min 32 hex chars). ' +
            'Generate with: openssl rand -hex 32'
        );
    }
    return secret;
}

function sign(payload: string): string {
    return crypto
        .createHmac('sha256', getSecret())
        .update(payload)
        .digest('base64url');
}

/**
 * Create an MFA session token after successful TOTP/backup code verification.
 * Token format: <base64url(payload)>.<base64url(hmac)>
 * Payload: {userId, expiresAt}
 *
 * Stored in httpOnly cookie. Middleware checks this on each admin/employee request.
 */
export function createMfaSessionToken(userId: string): string {
    const expiresAt = Date.now() + TTL_SECONDS * 1000;
    const payload = JSON.stringify({ userId, expiresAt });
    const encoded = Buffer.from(payload).toString('base64url');
    const signature = sign(encoded);
    return `${encoded}.${signature}`;
}

/**
 * Set the MFA session cookie. Call after successful 2FA verification.
 */
export async function setMfaSessionCookie(userId: string): Promise<void> {
    const token = createMfaSessionToken(userId);
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: TTL_SECONDS,
    });
}

/**
 * Clear the MFA session cookie. Call on logout or 2FA disable.
 */
export async function clearMfaSessionCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
}

/**
 * Verify an MFA session token. Used by middleware.
 * Returns the userId if valid, null otherwise.
 *
 * Validates:
 *  1. Format (<encoded>.<signature>)
 *  2. HMAC signature (timing-safe compare)
 *  3. Expiry (must be in the future)
 *  4. Token's userId matches the request's userId (caller checks this)
 */
export function verifyMfaSessionToken(token: string | undefined): { userId: string } | null {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, signature] = parts;

    // Verify signature first (timing-safe)
    const expectedSig = sign(encoded);
    if (signature.length !== expectedSig.length) return null;
    try {
        const a = Buffer.from(signature, 'base64url');
        const b = Buffer.from(expectedSig, 'base64url');
        if (a.length !== b.length) return null;
        if (!crypto.timingSafeEqual(a, b)) return null;
    } catch {
        return null;
    }

    // Parse payload
    let payload: { userId?: string; expiresAt?: number };
    try {
        const decoded = Buffer.from(encoded, 'base64url').toString('utf8');
        payload = JSON.parse(decoded);
    } catch {
        return null;
    }

    if (!payload.userId || typeof payload.userId !== 'string') return null;
    if (!payload.expiresAt || typeof payload.expiresAt !== 'number') return null;
    if (payload.expiresAt < Date.now()) return null;

    return { userId: payload.userId };
}

export const MFA_COOKIE_NAME = COOKIE_NAME;
