import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import {
    prepareIntakeSubmissionInsert,
    readIntakeSubmissionPii,
    prepareConsentInsert,
    readPatientConsentPii,
} from '../encryptedPiiFields';
import { _resetKeyCacheForTests, hashPesel } from '../fieldEncryption';

const TEST_KEY = crypto.randomBytes(32).toString('hex');
const TEST_SALT = crypto.randomBytes(32).toString('hex');

describe('encryptedPiiFields', () => {
    describe('with encryption configured', () => {
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

        it('prepareIntakeSubmissionInsert writes both plaintext and encrypted', () => {
            const payload = prepareIntakeSubmissionInsert({
                pesel: '85120512345',
                medical_survey: { feelsHealthy: true, allergies: 'penicillin' },
                medical_notes: 'medical text',
                signature_data: 'data:image/png;base64,xyz',
            });

            expect(payload.pesel).toBe('85120512345');
            expect(payload.medical_survey).toEqual({ feelsHealthy: true, allergies: 'penicillin' });
            expect(payload.medical_notes).toBe('medical text');
            expect(payload.signature_data).toBe('data:image/png;base64,xyz');

            expect(payload.pesel_encrypted).toBeTruthy();
            expect(payload.pesel_hash).toBe(hashPesel('85120512345'));
            expect(payload.medical_survey_encrypted).toBeTruthy();
            expect(payload.medical_notes_encrypted).toBeTruthy();
            expect(payload.signature_data_encrypted).toBeTruthy();
        });

        it('prepareIntakeSubmissionInsert handles null values', () => {
            const payload = prepareIntakeSubmissionInsert({
                pesel: null,
                medical_survey: null,
                medical_notes: null,
                signature_data: null,
            });

            expect(payload.pesel).toBeNull();
            expect(payload.pesel_encrypted).toBeUndefined();
            expect(payload.pesel_hash).toBeUndefined();
            expect(payload.medical_survey_encrypted).toBeUndefined();
            expect(payload.medical_notes_encrypted).toBeUndefined();
            expect(payload.signature_data_encrypted).toBeUndefined();
        });

        it('readIntakeSubmissionPii prefers encrypted column', () => {
            const payload = prepareIntakeSubmissionInsert({
                pesel: '85120512345',
                medical_survey: { allergies: 'lateks' },
                medical_notes: 'foo',
                signature_data: 'bar',
            });
            // Simulate that plaintext was wiped (post-drop-columns scenario)
            const row = {
                pesel: null,
                pesel_encrypted: payload.pesel_encrypted!,
                medical_survey: null,
                medical_survey_encrypted: payload.medical_survey_encrypted!,
                medical_notes: null,
                medical_notes_encrypted: payload.medical_notes_encrypted!,
                signature_data: null,
                signature_data_encrypted: payload.signature_data_encrypted!,
            };

            const result = readIntakeSubmissionPii(row);
            expect(result.pesel).toBe('85120512345');
            expect(result.medical_survey).toEqual({ allergies: 'lateks' });
            expect(result.medical_notes).toBe('foo');
            expect(result.signature_data).toBe('bar');
        });

        it('readIntakeSubmissionPii falls back to plaintext when encrypted absent', () => {
            // Pre-backfill row: only plaintext columns populated
            const row = {
                pesel: '85120512345',
                pesel_encrypted: null,
                medical_survey: { foo: 'bar' },
                medical_survey_encrypted: null,
                medical_notes: 'plain',
                medical_notes_encrypted: null,
                signature_data: 'sig',
                signature_data_encrypted: null,
            };

            const result = readIntakeSubmissionPii(row);
            expect(result.pesel).toBe('85120512345');
            expect(result.medical_survey).toEqual({ foo: 'bar' });
            expect(result.medical_notes).toBe('plain');
            expect(result.signature_data).toBe('sig');
        });

        it('prepareConsentInsert + readPatientConsentPii round-trip', () => {
            const bio = {
                deviceInfo: { pointerType: 'pen' },
                strokes: [[{ x: 1, y: 2, pressure: 0.5, t: 100 }]],
                pointCount: 1,
            };
            const payload = prepareConsentInsert({
                signature_data: 'data:image/png;base64,iVBORw',
                biometric_data: bio,
            });

            expect(payload.signature_data).toBe('data:image/png;base64,iVBORw');
            expect(payload.biometric_data).toEqual(bio);
            expect(payload.signature_data_encrypted).toBeTruthy();
            expect(payload.biometric_data_encrypted).toBeTruthy();

            // Read with plaintext wiped
            const result = readPatientConsentPii({
                signature_data: null,
                signature_data_encrypted: payload.signature_data_encrypted!,
                biometric_data: null,
                biometric_data_encrypted: payload.biometric_data_encrypted!,
            });
            expect(result.signature_data).toBe('data:image/png;base64,iVBORw');
            expect(result.biometric_data).toEqual(bio);
        });
    });

    describe('without encryption configured (env vars missing)', () => {
        beforeEach(() => {
            delete process.env.ENCRYPTION_KEY;
            delete process.env.ENCRYPTION_HMAC_SALT;
            _resetKeyCacheForTests();
        });

        it('prepareIntakeSubmissionInsert still writes plaintext (fail-soft)', () => {
            const payload = prepareIntakeSubmissionInsert({
                pesel: '85120512345',
                medical_survey: { x: 1 },
                medical_notes: 'foo',
                signature_data: 'bar',
            });

            expect(payload.pesel).toBe('85120512345');
            expect(payload.medical_survey).toEqual({ x: 1 });
            expect(payload.medical_notes).toBe('foo');
            expect(payload.signature_data).toBe('bar');
            expect(payload.pesel_encrypted).toBeUndefined();
            expect(payload.pesel_hash).toBeUndefined();
            expect(payload.medical_survey_encrypted).toBeUndefined();
            expect(payload.medical_notes_encrypted).toBeUndefined();
            expect(payload.signature_data_encrypted).toBeUndefined();
        });

        it('readIntakeSubmissionPii returns plaintext when no encrypted columns set', () => {
            const result = readIntakeSubmissionPii({
                pesel: '85120512345',
                medical_survey: { allergies: 'penicillin' },
                medical_notes: 'plain text',
                signature_data: 'data:image/png;base64,x',
            });
            expect(result.pesel).toBe('85120512345');
            expect(result.medical_survey).toEqual({ allergies: 'penicillin' });
            expect(result.medical_notes).toBe('plain text');
            expect(result.signature_data).toBe('data:image/png;base64,x');
        });

        it('prepareConsentInsert writes plaintext only', () => {
            const payload = prepareConsentInsert({
                signature_data: 'sig',
                biometric_data: { x: 1 },
            });
            expect(payload.signature_data).toBe('sig');
            expect(payload.biometric_data).toEqual({ x: 1 });
            expect(payload.signature_data_encrypted).toBeUndefined();
            expect(payload.biometric_data_encrypted).toBeUndefined();
        });
    });
});
