-- Migration 058: Patient consent signing system
-- Tables for consent tokens (tablet access) and signed consent records

-- Table: consent_tokens — one-time links for tablet consent signing
CREATE TABLE IF NOT EXISTS consent_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    patient_name TEXT NOT NULL,
    prodentis_patient_id TEXT,
    consent_types TEXT[] NOT NULL,
    created_by TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: patient_consents — signed consent records
CREATE TABLE IF NOT EXISTS patient_consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_name TEXT NOT NULL,
    prodentis_patient_id TEXT,
    consent_type TEXT NOT NULL,
    consent_label TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    signature_data TEXT,
    signed_at TIMESTAMPTZ DEFAULT now(),
    created_by TEXT,
    prodentis_synced BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consent_tokens_token ON consent_tokens(token);
CREATE INDEX IF NOT EXISTS idx_consent_tokens_expires ON consent_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_patient_consents_patient ON patient_consents(prodentis_patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_type ON patient_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_patient_consents_signed ON patient_consents(signed_at);

-- RLS
ALTER TABLE consent_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on consent_tokens"
    ON consent_tokens FOR ALL
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on patient_consents"
    ON patient_consents FOR ALL
    USING (true) WITH CHECK (true);
