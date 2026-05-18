/**
 * Application-layer encryption for Art. 9 RODO PII fields (S8-7).
 *
 * Threat model: protect against Supabase DB dump leaks (RLS bypass, SQL injection,
 * admin error). Supabase encrypts at-rest (AES-256) — this adds a second layer
 * where ciphertext is useless without our ENCRYPTION_KEY (never stored in DB).
 *
 * Algorithm: AES-256-GCM (authenticated encryption, IV per call, no nonce reuse).
 * Hash: HMAC-SHA256 with separate salt key (for deterministic search columns like pesel_hash).
 *
 * Storage format: base64-encoded `[iv:12][tag:16][ciphertext:N]` in TEXT column.
 * (We use TEXT not BYTEA to avoid Supabase JS client encoding ambiguity.)
 *
 * CRITICAL: losing ENCRYPTION_KEY = unrecoverable data loss. Backup in 1Password + paper.
 */

import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256-bit

let cachedKey: Buffer | null = null;
let cachedSalt: Buffer | null = null;

function getKey(): Buffer {
    if (cachedKey) return cachedKey;
    const hex = process.env.ENCRYPTION_KEY;
    if (!hex) {
        throw new Error('ENCRYPTION_KEY env var missing — cannot encrypt/decrypt PII');
    }
    const buf = Buffer.from(hex, 'hex');
    if (buf.length !== KEY_LENGTH) {
        throw new Error(
            `ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex chars (got ${hex.length}). Generate with: openssl rand -hex 32`
        );
    }
    cachedKey = buf;
    return buf;
}

function getHmacSalt(): Buffer {
    if (cachedSalt) return cachedSalt;
    const hex = process.env.ENCRYPTION_HMAC_SALT;
    if (!hex) {
        throw new Error('ENCRYPTION_HMAC_SALT env var missing — cannot hash PESEL');
    }
    const buf = Buffer.from(hex, 'hex');
    if (buf.length !== KEY_LENGTH) {
        throw new Error(
            `ENCRYPTION_HMAC_SALT must be ${KEY_LENGTH * 2} hex chars. Generate with: openssl rand -hex 32`
        );
    }
    cachedSalt = buf;
    return buf;
}

/** Reset cached keys — test-only escape hatch. */
export function _resetKeyCacheForTests(): void {
    cachedKey = null;
    cachedSalt = null;
}

/**
 * Encrypt a string to base64 ciphertext.
 * Returns base64-encoded `[iv:12][tag:16][ciphertext:N]`.
 */
export function encryptStringToBase64(plaintext: string): string {
    if (typeof plaintext !== 'string') {
        throw new Error('encryptStringToBase64 requires string input');
    }
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

/**
 * Decrypt base64 ciphertext to string. Throws on tamper / wrong key / malformed input.
 */
export function decryptStringFromBase64(base64: string): string {
    if (typeof base64 !== 'string' || base64.length === 0) {
        throw new Error('decryptStringFromBase64 requires non-empty string');
    }
    const buf = Buffer.from(base64, 'base64');
    if (buf.length < IV_LENGTH + TAG_LENGTH) {
        throw new Error('Ciphertext too short — likely malformed');
    }
    const key = getKey();
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
}

/**
 * Encrypt a JSON-serializable value to base64 ciphertext.
 */
export function encryptJsonToBase64(value: unknown): string {
    return encryptStringToBase64(JSON.stringify(value));
}

/**
 * Decrypt base64 ciphertext to JSON value.
 */
export function decryptJsonFromBase64<T = unknown>(base64: string): T {
    return JSON.parse(decryptStringFromBase64(base64)) as T;
}

/**
 * Deterministic HMAC-SHA256 hash for search columns (e.g. pesel_hash).
 * Normalizes whitespace before hashing for stable lookup.
 */
export function hashPesel(pesel: string): string {
    if (typeof pesel !== 'string' || pesel.trim().length === 0) {
        throw new Error('hashPesel requires non-empty string');
    }
    const salt = getHmacSalt();
    const hmac = crypto.createHmac('sha256', salt);
    hmac.update(pesel.trim());
    return hmac.digest('hex');
}

/**
 * Check if encryption is configured. Useful for early bailout in write paths.
 */
export function isEncryptionConfigured(): boolean {
    return !!(process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_HMAC_SALT);
}

/**
 * Try-decrypt with graceful fallback. Used during transition when some rows
 * may have plain `signature_data` and no `signature_data_encrypted` yet.
 * Returns null on any error (caller falls back to plain column).
 */
export function tryDecryptString(base64: string | null | undefined): string | null {
    if (!base64) return null;
    try {
        return decryptStringFromBase64(base64);
    } catch (e) {
        console.error('[fieldEncryption] tryDecryptString failed:', (e as Error).message);
        return null;
    }
}

export function tryDecryptJson<T = unknown>(base64: string | null | undefined): T | null {
    if (!base64) return null;
    try {
        return decryptJsonFromBase64<T>(base64);
    } catch (e) {
        console.error('[fieldEncryption] tryDecryptJson failed:', (e as Error).message);
        return null;
    }
}
