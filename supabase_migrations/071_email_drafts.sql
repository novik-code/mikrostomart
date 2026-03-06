-- 071: AI Email Draft System
-- Stores AI-generated reply drafts for admin review

CREATE TABLE IF NOT EXISTS email_ai_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_uid INTEGER NOT NULL,
    email_folder TEXT DEFAULT 'INBOX',
    email_subject TEXT,
    email_from_address TEXT,
    email_from_name TEXT,
    email_date TIMESTAMPTZ,
    email_snippet TEXT,
    draft_subject TEXT NOT NULL,
    draft_html TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sent', 'rejected')),
    admin_notes TEXT,
    ai_reasoning TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    reviewed_by TEXT
);

ALTER TABLE email_ai_drafts ENABLE ROW LEVEL SECURITY;

-- Service-role only (no anon/authenticated access)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_ai_drafts' AND policyname = 'service_only') THEN
        CREATE POLICY service_only ON email_ai_drafts FOR ALL USING (false);
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_drafts_status ON email_ai_drafts(status);
CREATE INDEX IF NOT EXISTS idx_email_drafts_email_uid ON email_ai_drafts(email_uid);
CREATE INDEX IF NOT EXISTS idx_email_drafts_created ON email_ai_drafts(created_at DESC);
