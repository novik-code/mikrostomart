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
});
