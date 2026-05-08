// Rotujący QR — schemat HMAC-TOTP-style.
// Token = HMAC-SHA256(secret, "<locationId>:<period>")[:16]
// Period = floor(now / rotationSeconds)
// Walidacja akceptuje period - 1, period, period + 1 (tolerance dla rozjazdu zegarów)

import crypto from 'crypto';
import type { QrPayloadParts } from './types';

export const QR_TOLERANCE_PERIODS = 1;   // ± 1 okres (60s gdy rotacja 30s)

/**
 * Numer okresu od epoch w danym momencie. Domyślnie now.
 */
export function getPeriod(rotationSeconds: number, atMs: number = Date.now()): number {
    return Math.floor(atMs / 1000 / rotationSeconds);
}

/**
 * Generuje token HMAC-SHA256 (16 hex chars) dla danej kombinacji.
 */
export function generateToken(locationId: string, secret: string, period: number): string {
    return crypto
        .createHmac('sha256', secret)
        .update(`${locationId}:${period}`)
        .digest('hex')
        .slice(0, 16);
}

/**
 * Buduje payload QR: `mst://time/<locationId>/<period>/<token>`
 */
export function buildPayload(locationId: string, secret: string, atMs: number = Date.now(), rotationSeconds: number = 30): {
    payload: string;
    period: number;
    validUntil: number;
} {
    const period = getPeriod(rotationSeconds, atMs);
    const token = generateToken(locationId, secret, period);
    return {
        payload: `mst://time/${locationId}/${period}/${token}`,
        period,
        validUntil: (period + 1) * rotationSeconds * 1000,
    };
}

/**
 * Parsuje payload QR. Zwraca null gdy format niepoprawny.
 */
export function parsePayload(payload: string): QrPayloadParts | null {
    if (typeof payload !== 'string') return null;
    const trimmed = payload.trim();
    const match = trimmed.match(/^mst:\/\/time\/([0-9a-f-]{36})\/(\d{1,15})\/([0-9a-f]{16})$/i);
    if (!match) return null;
    return {
        locationId: match[1].toLowerCase(),
        period: Number.parseInt(match[2], 10),
        token: match[3].toLowerCase(),
    };
}

/**
 * Walidacja tokenu — timing-safe compare + tolerance window.
 */
export function validateToken(
    locationId: string,
    secret: string,
    period: number,
    token: string,
    atMs: number = Date.now(),
    rotationSeconds: number = 30
): { valid: boolean; reason?: string } {
    const currentPeriod = getPeriod(rotationSeconds, atMs);
    const drift = Math.abs(currentPeriod - period);
    if (drift > QR_TOLERANCE_PERIODS) {
        return { valid: false, reason: drift > 100 ? 'expired' : 'out_of_window' };
    }
    const expected = generateToken(locationId, secret, period);
    try {
        const a = Buffer.from(expected, 'hex');
        const b = Buffer.from(token, 'hex');
        if (a.length !== b.length) return { valid: false, reason: 'invalid_signature' };
        return { valid: crypto.timingSafeEqual(a, b), reason: undefined };
    } catch {
        return { valid: false, reason: 'invalid_signature' };
    }
}
