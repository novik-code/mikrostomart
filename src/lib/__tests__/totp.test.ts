import { describe, it, expect } from 'vitest';
import { authenticator } from 'otplib';
import {
    generateSecret,
    buildOtpauthUrl,
    verifyCode,
    generateBackupCodes,
    verifyBackupCode,
    consumeBackupCode,
} from '../totp';

describe('totp', () => {
    describe('generateSecret', () => {
        it('returns a base32 string', () => {
            const s = generateSecret();
            expect(s).toBeTruthy();
            expect(s.length).toBeGreaterThanOrEqual(16);
            expect(/^[A-Z2-7]+$/.test(s)).toBe(true);
        });

        it('generates different secrets each call', () => {
            const a = generateSecret();
            const b = generateSecret();
            expect(a).not.toBe(b);
        });
    });

    describe('buildOtpauthUrl', () => {
        it('builds an otpauth:// URL with issuer and email', () => {
            const url = buildOtpauthUrl('test@example.com', 'JBSWY3DPEHPK3PXP');
            expect(url).toContain('otpauth://totp/');
            expect(url).toContain('Mikrostomart');
            expect(url).toContain('test%40example.com');
            expect(url).toContain('secret=JBSWY3DPEHPK3PXP');
        });
    });

    describe('verifyCode', () => {
        it('verifies a correct current code', () => {
            const secret = generateSecret();
            const code = authenticator.generate(secret);
            expect(verifyCode(code, secret)).toBe(true);
        });

        it('rejects a wrong code', () => {
            const secret = generateSecret();
            expect(verifyCode('000000', secret)).toBe(false);
        });

        it('rejects malformed input', () => {
            const secret = generateSecret();
            expect(verifyCode('abc', secret)).toBe(false);
            expect(verifyCode('12345', secret)).toBe(false); // 5 digits
            expect(verifyCode('1234567', secret)).toBe(false); // 7 digits
            expect(verifyCode('', secret)).toBe(false);
        });

        it('strips whitespace from code', () => {
            const secret = generateSecret();
            const code = authenticator.generate(secret);
            // Insert space in the middle
            const spaced = code.slice(0, 3) + ' ' + code.slice(3);
            expect(verifyCode(spaced, secret)).toBe(true);
        });

        it('rejects when secret is empty', () => {
            expect(verifyCode('123456', '')).toBe(false);
        });
    });

    describe('generateBackupCodes', () => {
        it('generates 8 codes with plain + hashed pairs', async () => {
            const { plain, hashed } = await generateBackupCodes();
            expect(plain).toHaveLength(8);
            expect(hashed).toHaveLength(8);
        });

        it('formats codes as XXXXX-XXXXX', async () => {
            const { plain } = await generateBackupCodes();
            for (const code of plain) {
                expect(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(code)).toBe(true);
            }
        });

        it('generates unique codes', async () => {
            const { plain } = await generateBackupCodes();
            const set = new Set(plain);
            expect(set.size).toBe(8);
        });

        it('hashed codes differ from plain codes', async () => {
            const { plain, hashed } = await generateBackupCodes();
            for (let i = 0; i < 8; i++) {
                expect(plain[i]).not.toBe(hashed[i]);
                expect(hashed[i]).toMatch(/^\$2[aby]\$/); // bcrypt format ($2a$, $2b$, or $2y$)
            }
        });
    });

    describe('verifyBackupCode', () => {
        it('matches a plain code against its hash', async () => {
            const { plain, hashed } = await generateBackupCodes();
            const index = await verifyBackupCode(plain[3], hashed);
            expect(index).toBe(3);
        });

        it('rejects an unknown code', async () => {
            const { hashed } = await generateBackupCodes();
            const index = await verifyBackupCode('AAAAA-BBBBB', hashed);
            expect(index).toBe(-1);
        });

        it('accepts code without hyphen', async () => {
            const { plain, hashed } = await generateBackupCodes();
            const noHyphen = plain[0].replace('-', '');
            const index = await verifyBackupCode(noHyphen, hashed);
            expect(index).toBe(0);
        });

        it('rejects malformed input', async () => {
            const { hashed } = await generateBackupCodes();
            expect(await verifyBackupCode('', hashed)).toBe(-1);
            expect(await verifyBackupCode('123', hashed)).toBe(-1);
        });
    });

    describe('consumeBackupCode', () => {
        it('removes the matching index from the array', () => {
            const codes = ['a', 'b', 'c', 'd'];
            const result = consumeBackupCode(codes, 2);
            expect(result).toEqual(['a', 'b', 'd']);
        });

        it('returns new array (immutable)', () => {
            const codes = ['a', 'b', 'c'];
            const result = consumeBackupCode(codes, 0);
            expect(result).not.toBe(codes);
            expect(codes).toEqual(['a', 'b', 'c']);
        });
    });
});
