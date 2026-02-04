-- ============================================
-- Supabase Schema for Patient Portal
-- ============================================
-- Version: 1.0
-- Date: 2026-02-04
-- Purpose: Patient authentication and account management

-- ============================================
-- Table: patients
-- ============================================
-- Stores patient accounts for the patient portal
-- Links to Prodentis via prodentis_id

CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Prodentis Integration
    prodentis_id VARCHAR(50) UNIQUE NOT NULL,
    
    -- Authentication
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    
    -- Optional Overrides (if patient updates their info)
    email VARCHAR(255),
    street VARCHAR(255),
    house_number VARCHAR(20),
    apartment_number VARCHAR(20),
    city VARCHAR(100),
    zip_code VARCHAR(10),
    
    -- Timestamps
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_prodentis_id ON patients(prodentis_id);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC);

-- Comments
COMMENT ON TABLE patients IS 'Patient portal accounts linked to Prodentis system';
COMMENT ON COLUMN patients.prodentis_id IS 'ID from Prodentis database (e.g., 0100005679)';
COMMENT ON COLUMN patients.phone IS 'Primary login identifier (normalized without spaces/dashes)';
COMMENT ON COLUMN patients.password_hash IS 'Bcrypt hashed password (12 rounds)';
COMMENT ON COLUMN patients.email IS 'Email override (if different from Prodentis)';

-- ============================================
-- Table: password_reset_tokens
-- ============================================
-- Stores one-time tokens for password reset

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Patient Reference
    prodentis_id VARCHAR(50) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    
    -- Token
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_prodentis ON password_reset_tokens(prodentis_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens(expires_at);

-- Comments
COMMENT ON TABLE password_reset_tokens IS 'Temporary tokens for password reset via email';
COMMENT ON COLUMN password_reset_tokens.token IS 'Random UUID token sent in reset email';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token valid for 1 hour from creation';
COMMENT ON COLUMN password_reset_tokens.used IS 'True if token was already used to reset password';

-- ============================================
-- Function: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for patients table
DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Function: Clean expired tokens (optional)
-- ============================================
-- Run this periodically to clean up old tokens
CREATE OR REPLACE FUNCTION clean_expired_reset_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM password_reset_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- Disable RLS for now (we'll handle auth in Next.js)
-- Can be enabled later for additional security

ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Test Data (Optional - for development)
-- ============================================
-- Uncomment to insert test patient
-- Password: test123 (hashed with bcrypt rounds=12)

/*
INSERT INTO patients (prodentis_id, phone, password_hash, email)
VALUES (
    '0100005679',
    '792060718',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYPEdavCzJO',
    'test@example.com'
) ON CONFLICT (prodentis_id) DO NOTHING;
*/

-- ============================================
-- Verification Queries
-- ============================================
-- Run these to verify setup:

-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('patients', 'password_reset_tokens');

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('patients', 'password_reset_tokens');

-- Count records
SELECT 
    (SELECT COUNT(*) FROM patients) as patient_count,
    (SELECT COUNT(*) FROM password_reset_tokens) as token_count;
