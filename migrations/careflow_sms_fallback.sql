-- CareFlow Phase 2.5: SMS fallback + auto-complete
-- Run in Supabase SQL Editor

-- 1. Add sms_sent flag to care_tasks (prevents duplicate SMS)
ALTER TABLE care_tasks ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT FALSE;

-- 2. Add completed_at to care_enrollments (for auto-complete tracking)
ALTER TABLE care_enrollments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 3. Add push_message to care_tasks (from template step)
ALTER TABLE care_tasks ADD COLUMN IF NOT EXISTS push_message TEXT;

-- 4. Update existing enrollments: populate push_message from template steps
UPDATE care_tasks ct
SET push_message = cts.push_message
FROM care_template_steps cts
WHERE ct.step_id = cts.id
AND ct.push_message IS NULL;

-- Done!
SELECT 'Migration complete: sms_sent, completed_at, push_message columns added' AS result;
