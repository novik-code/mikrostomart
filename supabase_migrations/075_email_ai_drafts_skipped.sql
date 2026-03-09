-- 075: Allow skipped emails in AI drafts
-- Emails AI analyzed and determined "not important" are now recorded
-- with status 'skipped' to prevent re-processing on subsequent runs.

-- 1. Make draft_subject and draft_html nullable (skipped emails have no draft)
ALTER TABLE email_ai_drafts ALTER COLUMN draft_subject DROP NOT NULL;
ALTER TABLE email_ai_drafts ALTER COLUMN draft_html DROP NOT NULL;

-- 2. Update status constraint to include 'skipped'
ALTER TABLE email_ai_drafts DROP CONSTRAINT IF EXISTS email_ai_drafts_status_check;
ALTER TABLE email_ai_drafts ADD CONSTRAINT email_ai_drafts_status_check
    CHECK (status IN ('pending', 'approved', 'sent', 'rejected', 'learned', 'skipped'));
