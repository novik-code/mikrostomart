-- Migration 130: Application-layer encryption columns for Art. 9 RODO PII fields (S8-7)
--
-- Adds *_encrypted TEXT columns (base64 AES-256-GCM ciphertext, encrypted app-side
-- with node:crypto in src/lib/fieldEncryption.ts) + pesel_hash TEXT (HMAC-SHA256
-- for deterministic search) alongside existing plaintext columns.
--
-- Strategy: dual-column transition.
--   Step 1 (this migration): ADD encrypted columns, keep plaintext columns.
--   Step 2 (S8-7 deploy): write paths populate BOTH columns; read paths prefer
--                          encrypted, fallback to plaintext.
--   Step 3 (backfill script): encrypt existing rows in-place.
--   Step 4 (separate migration ~2 weeks later): DROP plaintext columns once
--                                                 backfill verified.
--
-- CRITICAL: do NOT drop plaintext columns in this migration. Loss of
-- ENCRYPTION_KEY env var = unrecoverable loss of all encrypted data.

BEGIN;

-- ============================================================================
-- patient_intake_submissions (mig 054 + 060)
-- ============================================================================

ALTER TABLE patient_intake_submissions
    ADD COLUMN IF NOT EXISTS pesel_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS pesel_hash TEXT,
    ADD COLUMN IF NOT EXISTS medical_survey_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS medical_notes_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS signature_data_encrypted TEXT;

COMMENT ON COLUMN patient_intake_submissions.pesel_encrypted IS 'base64(AES-256-GCM ciphertext) of pesel — app-side encrypted in src/lib/fieldEncryption.ts (S8-7). Plain pesel column kept for transition; drop after backfill verified.';
COMMENT ON COLUMN patient_intake_submissions.pesel_hash IS 'HMAC-SHA256(pesel, ENCRYPTION_HMAC_SALT) hex — deterministic, used for future search/dedup. Currently 0 callers but future-proof.';
COMMENT ON COLUMN patient_intake_submissions.medical_survey_encrypted IS 'base64(AES-256-GCM ciphertext) of JSON.stringify(medical_survey) — Art. 9 RODO.';
COMMENT ON COLUMN patient_intake_submissions.medical_notes_encrypted IS 'base64(AES-256-GCM ciphertext) of medical_notes formatted text sent to Prodentis — Art. 9 RODO.';
COMMENT ON COLUMN patient_intake_submissions.signature_data_encrypted IS 'base64(AES-256-GCM ciphertext) of signature_data (base64 canvas image) — Art. 9 RODO biometric.';

CREATE INDEX IF NOT EXISTS idx_patient_intake_pesel_hash
    ON patient_intake_submissions(pesel_hash)
    WHERE pesel_hash IS NOT NULL;

-- ============================================================================
-- patient_consents (mig 058 + 065)
-- ============================================================================

ALTER TABLE patient_consents
    ADD COLUMN IF NOT EXISTS signature_data_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS biometric_data_encrypted TEXT;

COMMENT ON COLUMN patient_consents.signature_data_encrypted IS 'base64(AES-256-GCM ciphertext) of signature_data (base64 PNG) — Art. 9 RODO biometric.';
COMMENT ON COLUMN patient_consents.biometric_data_encrypted IS 'base64(AES-256-GCM ciphertext) of JSON.stringify(biometric_data) — pressure/strokes/pointerType, Art. 9 RODO biometric.';

-- ============================================================================
-- Verification query (run manually post-migration to confirm column add):
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('patient_intake_submissions', 'patient_consents')
--   AND column_name LIKE '%_encrypted%' OR column_name = 'pesel_hash';
--
-- Expected: 7 rows (5 in intake_submissions, 2 in patient_consents).
-- ============================================================================

COMMIT;
