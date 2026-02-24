-- Migration: SMS Post-Visit system
-- Purpose: Add post-visit SMS type tracking and templates
-- Date: 2026-02-24

-- 1. Add sms_type column to sms_reminders
ALTER TABLE sms_reminders
    ADD COLUMN IF NOT EXISTS sms_type TEXT DEFAULT 'reminder';

-- 2. Add flag: was patient already a Google reviewer at time of send?
ALTER TABLE sms_reminders
    ADD COLUMN IF NOT EXISTS already_reviewed BOOLEAN DEFAULT FALSE;

-- 3. Index for fast post-visit queries
CREATE INDEX IF NOT EXISTS idx_sms_reminders_type
    ON sms_reminders(sms_type, status, created_at DESC);

-- 4. Index for duplicate prevention: one post-visit SMS per visit per type
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_reminders_post_visit_unique
    ON sms_reminders(prodentis_id, sms_type)
    WHERE sms_type = 'post_visit' AND status != 'cancelled';

-- 5. Seed post-visit templates into sms_templates
-- These will be merged with existing templates — insert only if keys don't exist
INSERT INTO sms_templates (key, label, template, updated_at)
VALUES
    (
        'post_visit_review',
        'Po wizycie — prośba o recenzję',
        'Dziękujemy za wizytę, {patientFirstName}! 😊 Zależy nam na Twojej opinii — wypełnij krótką ankietę: {surveyUrl} Jeśli możesz, zostaw nam też gwiazdki w Google — bardzo nam to pomoże!',
        NOW()
    ),
    (
        'post_visit_reviewed',
        'Po wizycie — pacjent z recenzją',
        'Dziękujemy za wizytę, {patientFirstName}! 😊 {funFact} Do zobaczenia! — Zespół Mikrostomart',
        NOW()
    )
ON CONFLICT (key) DO NOTHING;

COMMENT ON COLUMN sms_reminders.sms_type IS 'SMS type: reminder (pre-visit 24h) | post_visit (after-visit thank you)';
COMMENT ON COLUMN sms_reminders.already_reviewed IS 'Was patient found in google_reviews at time of post-visit SMS generation?';
