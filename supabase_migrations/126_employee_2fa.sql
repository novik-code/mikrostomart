-- Migration 126: 2FA TOTP for staff (Hotfix S8-2)
-- Adds TOTP secret + enabled flag + hashed backup codes per employee
-- Idempotent: safe to re-run

-- Add 2FA columns to employees
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS totp_secret TEXT,
    ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS totp_setup_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS totp_last_used_at TIMESTAMPTZ;

-- Index for fast lookup of users with 2FA enabled (small subset of all employees)
CREATE INDEX IF NOT EXISTS idx_employees_totp_enabled
    ON employees (totp_enabled)
    WHERE totp_enabled = true;

-- Documentation
COMMENT ON COLUMN employees.totp_secret IS 'Base32 TOTP secret. Plain text — Supabase encrypts at rest. Pending column-level encryption in S8-7 (pgcrypto).';
COMMENT ON COLUMN employees.totp_enabled IS 'true after successful initial setup verification. false until then.';
COMMENT ON COLUMN employees.totp_backup_codes IS '8 single-use backup codes (bcrypt hashed). Codes consumed by being removed from array on use.';
COMMENT ON COLUMN employees.totp_setup_at IS 'When user first generated TOTP secret (may or may not have verified yet).';
COMMENT ON COLUMN employees.totp_verified_at IS 'When user successfully verified TOTP at initial setup (totp_enabled became true).';
COMMENT ON COLUMN employees.totp_last_used_at IS 'When user most recently authenticated with TOTP (any successful challenge).';
