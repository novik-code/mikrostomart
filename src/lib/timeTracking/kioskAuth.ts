// Kiosk-mode auth dla strony /qr-display.
// Pozwala admnowi włączyć "tryb kiosk" raz, po czym ekran QR autoryzuje się
// własnym tokenem (HMAC-SHA256 + expiry) niezależnym od sesji Supabase.
// Po wygaśnięciu Supabase JWT admina, kiosk-token nadal działa do swojego TTL.
//
// Format tokenu: <expires_ms_b64u>.<nonce_b64u>.<hmac_b64u>
//   hmac = HMAC-SHA256(KIOSK_TOKEN_SECRET, "<expires_ms_b64u>.<nonce_b64u>")
//
// Rewokacja: zmiana env var KIOSK_TOKEN_SECRET unieważnia wszystkie wydane
// tokeny (poprzedni HMAC nie zgodzi się z nowym sekretem).

import crypto from 'crypto';

export const KIOSK_COOKIE_NAME = 'kiosk_token';
export const ALLOWED_TTL_DAYS = [7, 30, 90] as const;
export type KioskTtlDays = (typeof ALLOWED_TTL_DAYS)[number];

export function isAllowedTtl(value: unknown): value is KioskTtlDays {
    return (
        typeof value === 'number' &&
        (ALLOWED_TTL_DAYS as readonly number[]).includes(value)
    );
}

function getSecret(): string {
    const secret = process.env.KIOSK_TOKEN_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error(
            'KIOSK_TOKEN_SECRET env var missing or too short (min 32 chars)'
        );
    }
    return secret;
}

function b64u(buf: Buffer): string {
    return buf.toString('base64url');
}

function b64uDecode(s: string): Buffer {
    return Buffer.from(s, 'base64url');
}

export interface KioskToken {
    expiresMs: number;
    raw: string;
}

export function generateKioskToken(ttlDays: KioskTtlDays): KioskToken {
    const secret = getSecret();
    const expiresMs = Date.now() + ttlDays * 24 * 60 * 60 * 1000;
    const nonce = b64u(crypto.randomBytes(16));
    const expB64 = b64u(Buffer.from(String(expiresMs), 'utf-8'));
    const payload = `${expB64}.${nonce}`;
    const hmac = b64u(
        crypto.createHmac('sha256', secret).update(payload).digest()
    );
    return {
        expiresMs,
        raw: `${payload}.${hmac}`,
    };
}

export interface KioskVerifyResult {
    valid: boolean;
    expiresMs?: number;
    reason?:
        | 'missing'
        | 'format'
        | 'expired'
        | 'invalid_signature'
        | 'no_secret';
}

export function verifyKioskToken(
    token: string | undefined | null
): KioskVerifyResult {
    if (!token || typeof token !== 'string') {
        return { valid: false, reason: 'missing' };
    }
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, reason: 'format' };
    const [expB64, nonce, hmacB64] = parts;

    let expiresMs: number;
    try {
        expiresMs = Number.parseInt(b64uDecode(expB64).toString('utf-8'), 10);
        if (!Number.isFinite(expiresMs)) throw new Error('bad expires');
    } catch {
        return { valid: false, reason: 'format' };
    }

    if (expiresMs <= Date.now()) {
        return { valid: false, reason: 'expired', expiresMs };
    }

    let secret: string;
    try {
        secret = getSecret();
    } catch {
        return { valid: false, reason: 'no_secret' };
    }

    const payload = `${expB64}.${nonce}`;
    const expected = b64u(
        crypto.createHmac('sha256', secret).update(payload).digest()
    );

    try {
        const a = b64uDecode(hmacB64);
        const b = b64uDecode(expected);
        if (a.length !== b.length) {
            return { valid: false, reason: 'invalid_signature' };
        }
        if (!crypto.timingSafeEqual(a, b)) {
            return { valid: false, reason: 'invalid_signature' };
        }
    } catch {
        return { valid: false, reason: 'invalid_signature' };
    }

    return { valid: true, expiresMs };
}
