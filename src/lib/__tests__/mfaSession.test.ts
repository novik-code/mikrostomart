import { describe, it, expect, beforeAll } from 'vitest';
import { createMfaSessionToken, verifyMfaSessionToken } from '../mfaSession';

beforeAll(() => {
    process.env.MFA_SESSION_SECRET = 'a'.repeat(64); // test secret
});

describe('mfaSession', () => {
    describe('createMfaSessionToken + verifyMfaSessionToken', () => {
        it('round-trips a valid token', () => {
            const token = createMfaSessionToken('user-abc-123');
            const result = verifyMfaSessionToken(token);
            expect(result).not.toBeNull();
            expect(result?.userId).toBe('user-abc-123');
        });

        it('rejects an undefined token', () => {
            expect(verifyMfaSessionToken(undefined)).toBeNull();
        });

        it('rejects an empty token', () => {
            expect(verifyMfaSessionToken('')).toBeNull();
        });

        it('rejects a malformed token (no separator)', () => {
            expect(verifyMfaSessionToken('garbage')).toBeNull();
        });

        it('rejects a token with tampered payload', () => {
            const token = createMfaSessionToken('user-1');
            const [encoded, sig] = token.split('.');
            // Substitute different encoded payload with same signature
            const fakePayload = Buffer.from(JSON.stringify({ userId: 'attacker', expiresAt: Date.now() + 1000000 })).toString('base64url');
            const tampered = `${fakePayload}.${sig}`;
            expect(verifyMfaSessionToken(tampered)).toBeNull();
            // sanity: original still works
            expect(verifyMfaSessionToken(token)?.userId).toBe('user-1');
            // suppress unused var warning
            void encoded;
        });

        it('rejects a token with tampered signature', () => {
            const token = createMfaSessionToken('user-1');
            const [encoded] = token.split('.');
            const tampered = `${encoded}.AAAAAAAAAAAAAAAAAAAAAA`;
            expect(verifyMfaSessionToken(tampered)).toBeNull();
        });

        it('rejects a token signed with a different secret', () => {
            const token = createMfaSessionToken('user-1');
            const oldSecret = process.env.MFA_SESSION_SECRET;
            process.env.MFA_SESSION_SECRET = 'b'.repeat(64);
            expect(verifyMfaSessionToken(token)).toBeNull();
            process.env.MFA_SESSION_SECRET = oldSecret;
        });

        it('rejects an expired token', () => {
            // Create a token manually with past expiry
            const crypto = require('crypto');
            const payload = JSON.stringify({ userId: 'user-1', expiresAt: Date.now() - 1000 });
            const encoded = Buffer.from(payload).toString('base64url');
            const sig = crypto
                .createHmac('sha256', process.env.MFA_SESSION_SECRET)
                .update(encoded)
                .digest('base64url');
            const expired = `${encoded}.${sig}`;
            expect(verifyMfaSessionToken(expired)).toBeNull();
        });
    });

    /**
     * 🔒 `mfa_epoch` — pozycja 1 planu napraw bezpieczeństwa (migracja 191).
     *
     * Reset 2FA po kradzieży telefonu MUSI odbierać dostęp. Do 2026-08-12 nie
     * odbierał: weryfikacja patrzyła na podpis, `userId` i termin, a token
     * „zaufanego urządzenia" żyje 30 dni.
     *
     * Cofka dowodowa: usunięcie linii `if (typeof expectedEpoch === 'number' &&
     * tokenEpoch < expectedEpoch) return null;` w mfaSession.ts wywala testy
     * „odrzuca token sprzed inkrementacji" i „legacy token … po inkrementacji".
     */
    describe('epoka unieważnień (mfa_epoch)', () => {
        it('odrzuca token sprzed inkrementacji epoki (reset 2FA odbiera dostęp)', () => {
            const stary = createMfaSessionToken('user-1', true, 0);
            // Admin zresetował 2FA → employees.mfa_epoch = 1
            expect(verifyMfaSessionToken(stary, 1)).toBeNull();
        });

        it('przepuszcza token wystawiony PO inkrementacji', () => {
            const swiezy = createMfaSessionToken('user-1', true, 1);
            expect(verifyMfaSessionToken(swiezy, 1)?.userId).toBe('user-1');
        });

        it('bez podanej epoki sprawdza tyle, co przed migracją (zgodność wsteczna)', () => {
            const token = createMfaSessionToken('user-1', false, 7);
            expect(verifyMfaSessionToken(token)?.epoch).toBe(7);
        });

        it('token SPRZED migracji (bez pola epoch) liczy się jako epoka 0', () => {
            // Wgranie migracji nie może wylogować całego zespołu naraz.
            const crypto = require('crypto');
            const payload = JSON.stringify({ userId: 'user-1', expiresAt: Date.now() + 3_600_000 });
            const encoded = Buffer.from(payload).toString('base64url');
            const sig = crypto
                .createHmac('sha256', process.env.MFA_SESSION_SECRET)
                .update(encoded)
                .digest('base64url');
            const legacy = `${encoded}.${sig}`;

            expect(verifyMfaSessionToken(legacy, 0)?.userId).toBe('user-1');
            // …ale po pierwszym unieważnieniu ma paść jak każdy inny.
            expect(verifyMfaSessionToken(legacy, 1)).toBeNull();
        });

        it('epoka jest podpisana — podmiana w ładunku nie przechodzi', () => {
            const token = createMfaSessionToken('user-1', false, 0);
            const [, sig] = token.split('.');
            const fake = Buffer.from(
                JSON.stringify({ userId: 'user-1', expiresAt: Date.now() + 3_600_000, epoch: 99 }),
            ).toString('base64url');
            expect(verifyMfaSessionToken(`${fake}.${sig}`, 1)).toBeNull();
        });
    });
});
