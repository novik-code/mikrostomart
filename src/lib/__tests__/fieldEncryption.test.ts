import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import {
    encryptStringToBase64,
    decryptStringFromBase64,
    encryptJsonToBase64,
    decryptJsonFromBase64,
    hashPesel,
    isEncryptionConfigured,
    tryDecryptString,
    tryDecryptJson,
    _resetKeyCacheForTests,
} from '../fieldEncryption';

const TEST_KEY = crypto.randomBytes(32).toString('hex');
const TEST_SALT = crypto.randomBytes(32).toString('hex');

describe('fieldEncryption', () => {
    beforeEach(() => {
        process.env.ENCRYPTION_KEY = TEST_KEY;
        process.env.ENCRYPTION_HMAC_SALT = TEST_SALT;
        _resetKeyCacheForTests();
    });

    afterEach(() => {
        delete process.env.ENCRYPTION_KEY;
        delete process.env.ENCRYPTION_HMAC_SALT;
        _resetKeyCacheForTests();
    });

    describe('encryptStringToBase64 + decryptStringFromBase64', () => {
        it('round-trips ASCII string', () => {
            const plain = 'Hello, world!';
            const ct = encryptStringToBase64(plain);
            expect(decryptStringFromBase64(ct)).toBe(plain);
        });

        it('round-trips Polish diacritics', () => {
            const plain = 'Marcin Nowosielski, ul. Centralna 33a, Opole — żółć';
            const ct = encryptStringToBase64(plain);
            expect(decryptStringFromBase64(ct)).toBe(plain);
        });

        it('round-trips PESEL', () => {
            const plain = '85120512345';
            const ct = encryptStringToBase64(plain);
            expect(decryptStringFromBase64(ct)).toBe(plain);
        });

        it('round-trips large signature data URL (base64 image, ~50KB)', () => {
            const plain = 'data:image/png;base64,' + crypto.randomBytes(40000).toString('base64');
            const ct = encryptStringToBase64(plain);
            expect(decryptStringFromBase64(ct)).toBe(plain);
        });

        it('produces different ciphertext for same plaintext (random IV)', () => {
            const plain = 'same input';
            const ct1 = encryptStringToBase64(plain);
            const ct2 = encryptStringToBase64(plain);
            expect(ct1).not.toBe(ct2);
            expect(decryptStringFromBase64(ct1)).toBe(plain);
            expect(decryptStringFromBase64(ct2)).toBe(plain);
        });

        it('rejects non-string input', () => {
            // @ts-expect-error testing runtime guard
            expect(() => encryptStringToBase64(123)).toThrow(/string input/);
            // @ts-expect-error testing runtime guard
            expect(() => encryptStringToBase64(null)).toThrow(/string input/);
        });

        it('decrypt throws on empty input', () => {
            expect(() => decryptStringFromBase64('')).toThrow();
        });

        it('decrypt throws on tampered ciphertext', () => {
            const ct = encryptStringToBase64('secret data');
            const buf = Buffer.from(ct, 'base64');
            buf[buf.length - 1] ^= 0xff; // flip last byte
            const tampered = buf.toString('base64');
            expect(() => decryptStringFromBase64(tampered)).toThrow();
        });

        it('decrypt throws with wrong key', () => {
            const ct = encryptStringToBase64('secret');
            process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
            _resetKeyCacheForTests();
            expect(() => decryptStringFromBase64(ct)).toThrow();
        });

        it('decrypt throws on too-short ciphertext', () => {
            const tooShort = Buffer.alloc(10).toString('base64');
            expect(() => decryptStringFromBase64(tooShort)).toThrow(/too short/i);
        });
    });

    describe('encryptJsonToBase64 + decryptJsonFromBase64', () => {
        it('round-trips medical survey object', () => {
            const survey = {
                feelsHealthy: true,
                heartDiseases: false,
                allergies: 'penicillin',
                hospitalLast2Years: false,
                medications: null,
                bleedingTendency: false,
            };
            const ct = encryptJsonToBase64(survey);
            expect(decryptJsonFromBase64(ct)).toEqual(survey);
        });

        it('round-trips biometric data with nested arrays', () => {
            const bio = {
                deviceInfo: { pointerType: 'pen', tilt: 12 },
                strokes: [
                    [{ x: 1, y: 2, pressure: 0.5, t: 100 }],
                    [{ x: 3, y: 4, pressure: 0.7, t: 200 }],
                ],
                avgPressure: 0.6,
                pointCount: 2,
            };
            const ct = encryptJsonToBase64(bio);
            expect(decryptJsonFromBase64(ct)).toEqual(bio);
        });

        it('round-trips null', () => {
            const ct = encryptJsonToBase64(null);
            expect(decryptJsonFromBase64(ct)).toBeNull();
        });
    });

    describe('hashPesel', () => {
        it('produces 64-char hex (SHA-256)', () => {
            const h = hashPesel('85120512345');
            expect(h).toMatch(/^[0-9a-f]{64}$/);
        });

        it('is deterministic for same input', () => {
            const a = hashPesel('85120512345');
            const b = hashPesel('85120512345');
            expect(a).toBe(b);
        });

        it('produces different hash for different input', () => {
            const a = hashPesel('85120512345');
            const b = hashPesel('85120512346');
            expect(a).not.toBe(b);
        });

        it('trims whitespace before hashing', () => {
            const a = hashPesel('85120512345');
            const b = hashPesel(' 85120512345 ');
            expect(a).toBe(b);
        });

        it('rejects empty string', () => {
            expect(() => hashPesel('')).toThrow();
            expect(() => hashPesel('   ')).toThrow();
        });

        it('different HMAC salt produces different hash', () => {
            const a = hashPesel('85120512345');
            process.env.ENCRYPTION_HMAC_SALT = crypto.randomBytes(32).toString('hex');
            _resetKeyCacheForTests();
            const b = hashPesel('85120512345');
            expect(a).not.toBe(b);
        });
    });

    describe('env var validation', () => {
        it('encrypt throws when ENCRYPTION_KEY missing', () => {
            delete process.env.ENCRYPTION_KEY;
            _resetKeyCacheForTests();
            expect(() => encryptStringToBase64('x')).toThrow(/ENCRYPTION_KEY env var missing/);
        });

        it('encrypt throws when ENCRYPTION_KEY wrong length', () => {
            process.env.ENCRYPTION_KEY = 'tooshort';
            _resetKeyCacheForTests();
            expect(() => encryptStringToBase64('x')).toThrow(/64 hex chars/);
        });

        it('hashPesel throws when ENCRYPTION_HMAC_SALT missing', () => {
            delete process.env.ENCRYPTION_HMAC_SALT;
            _resetKeyCacheForTests();
            expect(() => hashPesel('85120512345')).toThrow(/ENCRYPTION_HMAC_SALT env var missing/);
        });

        it('hashPesel throws when ENCRYPTION_HMAC_SALT wrong length', () => {
            process.env.ENCRYPTION_HMAC_SALT = 'abcd';
            _resetKeyCacheForTests();
            expect(() => hashPesel('85120512345')).toThrow(/64 hex chars/);
        });
    });

    describe('isEncryptionConfigured', () => {
        it('returns true when both env vars set', () => {
            expect(isEncryptionConfigured()).toBe(true);
        });

        it('returns false when ENCRYPTION_KEY missing', () => {
            delete process.env.ENCRYPTION_KEY;
            expect(isEncryptionConfigured()).toBe(false);
        });

        it('returns false when ENCRYPTION_HMAC_SALT missing', () => {
            delete process.env.ENCRYPTION_HMAC_SALT;
            expect(isEncryptionConfigured()).toBe(false);
        });
    });

    describe('tryDecryptString / tryDecryptJson', () => {
        it('tryDecryptString returns null for null/undefined input', () => {
            expect(tryDecryptString(null)).toBeNull();
            expect(tryDecryptString(undefined)).toBeNull();
            expect(tryDecryptString('')).toBeNull();
        });

        it('tryDecryptString returns null for malformed ciphertext (no throw)', () => {
            expect(tryDecryptString('not-valid-base64-ciphertext')).toBeNull();
        });

        it('tryDecryptString returns plaintext for valid ciphertext', () => {
            const ct = encryptStringToBase64('hello');
            expect(tryDecryptString(ct)).toBe('hello');
        });

        it('tryDecryptJson returns null on malformed input (no throw)', () => {
            expect(tryDecryptJson(null)).toBeNull();
            expect(tryDecryptJson('garbage')).toBeNull();
        });

        it('tryDecryptJson returns object for valid ciphertext', () => {
            const ct = encryptJsonToBase64({ a: 1, b: [2, 3] });
            expect(tryDecryptJson(ct)).toEqual({ a: 1, b: [2, 3] });
        });
    });

    describe('integration: realistic E-karta record', () => {
        it('encrypts/decrypts full intake submission fields', () => {
            const intake = {
                pesel: '85120512345',
                medical_survey: {
                    feelsHealthy: true,
                    medications: 'metoprolol 50mg',
                    allergies: 'penicillin, lateks',
                    heartDiseases: true,
                    isPregnant: false,
                },
                medical_notes: '=== E-KARTA ===\nStan ogólny: OK\nLeki: metoprolol\n',
                signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
            };

            const peselCt = encryptStringToBase64(intake.pesel);
            const peselHash = hashPesel(intake.pesel);
            const surveyCt = encryptJsonToBase64(intake.medical_survey);
            const notesCt = encryptStringToBase64(intake.medical_notes);
            const sigCt = encryptStringToBase64(intake.signature_data);

            expect(decryptStringFromBase64(peselCt)).toBe(intake.pesel);
            expect(peselHash).toMatch(/^[0-9a-f]{64}$/);
            expect(decryptJsonFromBase64(surveyCt)).toEqual(intake.medical_survey);
            expect(decryptStringFromBase64(notesCt)).toBe(intake.medical_notes);
            expect(decryptStringFromBase64(sigCt)).toBe(intake.signature_data);
        });
    });
});
