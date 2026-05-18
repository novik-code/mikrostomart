import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'mfa_session';
const TTL_DEFAULT_SECONDS = 8 * 60 * 60; // 8h — typical workday session
const TTL_REMEMBER_SECONDS = 30 * 24 * 60 * 60; // 30d — "Zaufaj urządzeniu" opt-in dłuższa sesja

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
 *
 * `remember=true` wydłuża TTL z 8h na 30 dni — używane gdy user zaznaczył
 * "Zaufaj temu urządzeniu" na ekranie 2FA challenge. Trade-off: jeśli ktoś
 * fizycznie przejmie urządzenie, dostęp 30 dni bez ponownego 2FA. Mitigacja:
 * user może w każdej chwili wymusić logout (akcja Wyloguj czyści cookie),
 * admin może zresetować 2FA pracownika (clearuje wszystkie sesje przy
 * następnym middleware check).
 */
export function createMfaSessionToken(userId: string, remember: boolean = false): string {
    const ttlSeconds = remember ? TTL_REMEMBER_SECONDS : TTL_DEFAULT_SECONDS;
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const payload = JSON.stringify({ userId, expiresAt });
    const encoded = Buffer.from(payload).toString('base64url');
    const signature = sign(encoded);
    return `${encoded}.${signature}`;
}

/**
 * Set the MFA session cookie. Call after successful 2FA verification.
 * `remember=true` ustawia cookie z TTL 30 dni zamiast standardowych 8h.
 */
export async function setMfaSessionCookie(userId: string, remember: boolean = false): Promise<void> {
    const token = createMfaSessionToken(userId, remember);
    const ttlSeconds = remember ? TTL_REMEMBER_SECONDS : TTL_DEFAULT_SECONDS;
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ttlSeconds,
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
