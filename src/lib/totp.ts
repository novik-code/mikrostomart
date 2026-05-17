import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ISSUER = 'Mikrostomart';

// Configure authenticator options lazily on first use.
let configured = false;
function getAuth() {
    if (!configured) {
        authenticator.options = { step: 30, window: 1, digits: 6 };
        configured = true;
    }
    return authenticator;
}

/**
 * Generate a new TOTP secret (base32 encoded, 32 chars).
 * Store this in employees.totp_secret.
 */
export function generateSecret(): string {
    return getAuth().generateSecret();
}

/**
 * Build the otpauth:// URL that Google Authenticator / Authy scans from a QR code.
 * Issuer = "Mikrostomart", account label = user email.
 */
export function buildOtpauthUrl(email: string, secret: string): string {
    return getAuth().keyuri(email, ISSUER, secret);
}

/**
 * Generate a QR code as a PNG data URL.
 * User scans this with their authenticator app.
 */
export async function generateQrDataUrl(email: string, secret: string): Promise<string> {
    const url = buildOtpauthUrl(email, secret);
    return QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 280,
    });
}

/**
 * Verify a 6-digit TOTP code against a secret.
 * Accepts codes from current and ±1 30s window (clock drift tolerance).
 */
export function verifyCode(code: string, secret: string): boolean {
    if (!code || !secret) return false;
    // Strip spaces — users may copy codes with formatting
    const clean = code.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(clean)) return false;
    try {
        return getAuth().verify({ token: clean, secret });
    } catch {
        return false;
    }
}

/**
 * Generate 8 backup codes (10 chars each, base32-style).
 * Returns both plain codes (to show user once) and hashed codes (to store in DB).
 *
 * Format: XXXXX-XXXXX (5+5, hyphen for readability)
 * Total entropy per code: 10 chars × log2(32) ≈ 50 bits — sufficient for one-time use
 */
export async function generateBackupCodes(): Promise<{ plain: string[]; hashed: string[] }> {
    const plain: string[] = [];
    const hashed: string[] = [];

    // Use hex (deterministic 10 chars from 5 bytes) — simpler than base64
    // and guarantees [A-Z0-9] format after uppercase.
    for (let i = 0; i < 8; i++) {
        const raw = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 hex chars
        // Format as XXXXX-XXXXX
        const formatted = `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
        plain.push(formatted);
        hashed.push(await bcrypt.hash(formatted, 10));
    }

    return { plain, hashed };
}

/**
 * Verify a backup code against the hashed list.
 * Returns the index of the matched code (so caller can remove it) or -1 if no match.
 *
 * SECURITY: backup codes are single-use. Caller MUST remove the matched code
 * from the array after this returns ≥ 0.
 */
export async function verifyBackupCode(code: string, hashedCodes: string[]): Promise<number> {
    if (!code) return -1;
    const clean = code.replace(/\s+/g, '').toUpperCase();
    // Accept with or without hyphen
    const normalized = clean.includes('-') ? clean : `${clean.slice(0, 5)}-${clean.slice(5, 10)}`;
    if (!/^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(normalized)) return -1;

    for (let i = 0; i < hashedCodes.length; i++) {
        try {
            const match = await bcrypt.compare(normalized, hashedCodes[i]);
            if (match) return i;
        } catch {
            // Skip invalid hash
        }
    }
    return -1;
}

/**
 * Remove a consumed backup code from the array.
 * Returns a new array (immutable).
 */
export function consumeBackupCode(hashedCodes: string[], indexToRemove: number): string[] {
    return hashedCodes.filter((_, i) => i !== indexToRemove);
}
