import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'passkey_challenge';
const TTL_SECONDS = 5 * 60; // 5 min — czas między begin i finish flow

function getSecret(): string {
    const secret = process.env.MFA_SESSION_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error(
            '[Passkey] MFA_SESSION_SECRET env var must be set (min 32 hex chars). ' +
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

export type ChallengeType = 'register' | 'authenticate';

export type ChallengePayload = {
    userId: string;
    challenge: string;
    type: ChallengeType;
};

/**
 * Set short-lived cookie with WebAuthn challenge data, signed (HMAC) + httpOnly.
 *
 * Flow:
 *  1. /api/auth/passkeys/{register,authenticate}/begin: server generuje challenge,
 *     wywołuje setChallengeCookie() → klient dostaje cookie + opcje WebAuthn API.
 *  2. Browser woła navigator.credentials.create/get z opcjami.
 *  3. /api/auth/passkeys/{register,authenticate}/finish: server czyta challenge
 *     cookie, weryfikuje że klientowa odpowiedź matchuje + claruje cookie.
 *
 * 5-min TTL bo flow ma być szybki (user prompt biometric → odpowiedź). Dłuższy
 * TTL → window dla replay attacks (mniej ważne bo challenge jest jednorazowy,
 * ale shorter window = better). Krótszy TTL → user może nie zdążyć (np. szuka
 * fingerprint sensora na nieznanym urządzeniu).
 */
export async function setChallengeCookie(payload: ChallengePayload): Promise<void> {
    const fullPayload = { ...payload, expiresAt: Date.now() + TTL_SECONDS * 1000 };
    const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = sign(encoded);
    const token = `${encoded}.${signature}`;

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
 * Read + verify challenge cookie. Returns payload jeśli valid, null inaczej.
 *
 * Validates:
 *  1. Cookie present
 *  2. Format <encoded>.<signature>
 *  3. HMAC signature (timing-safe compare)
 *  4. Not expired
 *  5. Type matches expected (register vs authenticate)
 */
export async function getChallengeCookie(expectedType: ChallengeType): Promise<ChallengePayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, signature] = parts;

    // Verify HMAC signature
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
    let parsed: { userId?: string; challenge?: string; type?: string; expiresAt?: number };
    try {
        const decoded = Buffer.from(encoded, 'base64url').toString('utf8');
        parsed = JSON.parse(decoded);
    } catch {
        return null;
    }

    if (!parsed.userId || typeof parsed.userId !== 'string') return null;
    if (!parsed.challenge || typeof parsed.challenge !== 'string') return null;
    if (parsed.type !== expectedType) return null;
    if (!parsed.expiresAt || typeof parsed.expiresAt !== 'number') return null;
    if (parsed.expiresAt < Date.now()) return null;

    return {
        userId: parsed.userId,
        challenge: parsed.challenge,
        type: parsed.type as ChallengeType,
    };
}

/**
 * Clear challenge cookie. Call after finish (success lub failure) — challenge
 * jest jednorazowy, nie reusable.
 */
export async function clearChallengeCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
}
