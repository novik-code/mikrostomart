import crypto from 'crypto';

/**
 * Registration verification token (S10-2).
 *
 * Po Prodentis match w /api/patients/verify wystawiamy HMAC-podpisany token,
 * który /api/patients/register weryfikuje przed utworzeniem konta.
 *
 * Bez tokenu atakujący mógłby POST'ować dowolny prodentisId do /register
 * (audyt P0 #2: register przyjmował goły prodentisId/phone z body).
 *
 * Token bound do prodentisId + phone — sprawdzamy match w register, żeby
 * uniemożliwić podstawienie phone do innego prodentisId po wygenerowaniu
 * tokenu.
 *
 * Format: <base64url(payload)>.<base64url(hmac)>
 * Payload: { prodentisId, phone, firstName, lastName, expiresAt }
 * TTL: 10 min (rejestracja powinna zająć 1-3 min od verify do submit).
 */

const TTL_SECONDS = 10 * 60; // 10 min

function getSecret(): string {
    const secret = process.env.MFA_SESSION_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error(
            '[RegistrationToken] MFA_SESSION_SECRET env var must be set (min 32 hex chars). ' +
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

export interface RegistrationTokenPayload {
    prodentisId: string;
    phone: string;
    firstName: string;
    lastName: string;
}

interface SignedPayload extends RegistrationTokenPayload {
    expiresAt: number;
}

/**
 * Sign a registration token after successful Prodentis match.
 * Returned to client in /api/patients/verify response.
 */
export function signRegistrationToken(payload: RegistrationTokenPayload): string {
    const signed: SignedPayload = {
        ...payload,
        expiresAt: Date.now() + TTL_SECONDS * 1000,
    };
    const encoded = Buffer.from(JSON.stringify(signed)).toString('base64url');
    const signature = sign(encoded);
    return `${encoded}.${signature}`;
}

/**
 * Verify a registration token. Returns payload or null on any failure.
 * Used by /api/patients/register before creating verification record.
 *
 * Outer try/catch zapewnia że żaden parsing/crypto error nie propaguje do
 * route handler (gdzie skończyłby się 500). Każda anomalia → null → 403.
 */
export function verifyRegistrationToken(token: string | undefined): RegistrationTokenPayload | null {
    if (!token || typeof token !== 'string') return null;

    try {
        const parts = token.split('.');
        if (parts.length !== 2) return null;
        const [encoded, signature] = parts;

        // Verify signature first (timing-safe)
        const expectedSig = sign(encoded);
        if (signature.length !== expectedSig.length) return null;

        const a = Buffer.from(signature, 'base64url');
        const b = Buffer.from(expectedSig, 'base64url');
        if (a.length !== b.length) return null;
        if (!crypto.timingSafeEqual(a, b)) return null;

        // Parse payload
        const decoded = Buffer.from(encoded, 'base64url').toString('utf8');
        const payload: Partial<SignedPayload> = JSON.parse(decoded);

        if (!payload.prodentisId || typeof payload.prodentisId !== 'string') return null;
        if (!payload.phone || typeof payload.phone !== 'string') return null;
        if (!payload.firstName || typeof payload.firstName !== 'string') return null;
        if (!payload.lastName || typeof payload.lastName !== 'string') return null;
        if (!payload.expiresAt || typeof payload.expiresAt !== 'number') return null;
        if (payload.expiresAt < Date.now()) return null;

        return {
            prodentisId: payload.prodentisId,
            phone: payload.phone,
            firstName: payload.firstName,
            lastName: payload.lastName,
        };
    } catch {
        return null;
    }
}
