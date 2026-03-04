-- Migration 066: Employee Audit Log
-- Tracks sensitive data access by employees for GDPR compliance

CREATE TABLE IF NOT EXISTS employee_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,               -- 'view_patient_data', 'view_consents', 'export_biometric', 'create_consent_token', 'view_intake'
    resource_type TEXT NOT NULL,         -- 'patient', 'consent', 'biometric', 'intake', 'consent_token'
    resource_id TEXT,                    -- patient prodentis_id, consent id, etc.
    patient_name TEXT,                   -- for quick audit display
    metadata JSONB DEFAULT '{}',        -- additional context (e.g. consent type, export results)
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common audit queries
CREATE INDEX idx_audit_log_user ON employee_audit_log(user_id);
CREATE INDEX idx_audit_log_action ON employee_audit_log(action);
CREATE INDEX idx_audit_log_resource ON employee_audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON employee_audit_log(created_at DESC);
CREATE INDEX idx_audit_log_patient ON employee_audit_log(patient_name) WHERE patient_name IS NOT NULL;

-- Auto-cleanup: keep 90 days of audit data
-- (run via cron or manual cleanup)
