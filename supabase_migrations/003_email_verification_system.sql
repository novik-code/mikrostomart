-- ============================================
-- Migration: Advanced Registration Verification
-- ============================================
-- Date: 2026-02-04
-- Purpose: Add email verification and admin approval

-- ============================================
-- 1. Add columns to patients table
-- ============================================

ALTER TABLE patients ADD COLUMN IF NOT EXISTS 
    account_status VARCHAR(50) DEFAULT 'pending_email_verification';
    -- Options: 
    -- 'pending_email_verification' - waiting for email click
    -- 'pending_admin_approval' - email verified, waiting for admin
    -- 'active' - fully approved and active
    -- 'rejected' - rejected by admin

COMMENT ON COLUMN patients.account_status IS 
    'Current status of patient account in verification workflow';

ALTER TABLE patients ADD COLUMN IF NOT EXISTS 
    email_verified BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN patients.email_verified IS 
    'True if patient clicked email verification link';

ALTER TABLE patients ADD COLUMN IF NOT EXISTS 
    email_verified_at TIMESTAMPTZ NULL;

ALTER TABLE patients ADD COLUMN IF NOT EXISTS 
    admin_approved BOOLEAN DEFAULT FALSE;

ALTER TABLE patients ADD COLUMN IF NOT EXISTS 
    admin_approved_at TIMESTAMPTZ NULL;

ALTER TABLE patients ADD COLUMN IF NOT EXISTS 
    admin_approved_by VARCHAR(255) NULL;

COMMENT ON COLUMN patients.admin_approved_by IS 
    'Email of admin who approved/rejected account';

ALTER TABLE patients ADD COLUMN IF NOT EXISTS 
    admin_rejection_reason TEXT NULL;

COMMENT ON COLUMN patients.admin_rejection_reason IS 
    'Reason for rejection if account_status=rejected';

-- ============================================
-- 2. Create email_verification_tokens table
-- ============================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Patient Reference
    prodentis_id VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    
    -- Registration Data (stored until verified)
    password_hash TEXT NOT NULL,
    
    -- Token
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_verification_token 
    ON email_verification_tokens(token);

CREATE INDEX IF NOT EXISTS idx_email_verification_prodentis 
    ON email_verification_tokens(prodentis_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_expires 
    ON email_verification_tokens(expires_at);

-- Comments
COMMENT ON TABLE email_verification_tokens IS 
    'Temporary tokens for email verification during registration';

COMMENT ON COLUMN email_verification_tokens.token IS 
    'UUID token sent in verification email';

COMMENT ON COLUMN email_verification_tokens.expires_at IS 
    'Token valid for 24 hours from creation';

COMMENT ON COLUMN email_verification_tokens.password_hash IS 
    'Stores password hash until email verified, then moved to patients table';

-- ============================================
-- 3. Update existing patients (optional)
-- ============================================
-- Set existing patients to 'active' status
-- (so they don't get locked out)

UPDATE patients 
SET 
    account_status = 'active',
    email_verified = TRUE,
    admin_approved = TRUE
WHERE account_status IS NULL OR account_status = '';

-- ============================================
-- 4. Create function to clean expired tokens
-- ============================================

CREATE OR REPLACE FUNCTION clean_expired_verification_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM email_verification_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clean_expired_verification_tokens() IS 
    'Delete verification tokens older than 7 days (run periodically)';

-- ============================================
-- Verification Queries
-- ============================================

-- Check new columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'patients' 
AND column_name IN ('account_status', 'email_verified', 'admin_approved');

-- Check new table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'email_verification_tokens';

-- Count pending accounts
SELECT 
    account_status, 
    COUNT(*) as count 
FROM patients 
GROUP BY account_status;
