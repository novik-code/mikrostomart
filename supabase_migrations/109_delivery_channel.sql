-- Migration 109: Add delivery channel tracking to sms_reminders
-- Supports push-first patient communication with SMS fallback

-- 1. Add delivery_channel column
ALTER TABLE sms_reminders ADD COLUMN IF NOT EXISTS delivery_channel TEXT DEFAULT 'sms';

-- 2. Add push tracking columns
ALTER TABLE sms_reminders ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE sms_reminders ADD COLUMN IF NOT EXISTS push_error TEXT;
ALTER TABLE sms_reminders ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ;
ALTER TABLE sms_reminders ADD COLUMN IF NOT EXISTS patient_has_account BOOLEAN DEFAULT FALSE;
ALTER TABLE sms_reminders ADD COLUMN IF NOT EXISTS patient_has_push BOOLEAN DEFAULT FALSE;

-- 3. Index for escalation cron (find push-sent items needing SMS escalation)
CREATE INDEX IF NOT EXISTS idx_sms_reminders_push_escalation
    ON sms_reminders(delivery_channel, push_sent, status)
    WHERE delivery_channel = 'push' AND status = 'push_sent';

-- 4. Comments
COMMENT ON COLUMN sms_reminders.delivery_channel IS 'Channel used: sms | push | push+sms | pending';
COMMENT ON COLUMN sms_reminders.push_sent IS 'Whether push notification was successfully sent';
COMMENT ON COLUMN sms_reminders.push_error IS 'Push error message if push failed';
COMMENT ON COLUMN sms_reminders.push_sent_at IS 'Timestamp when push was sent';
COMMENT ON COLUMN sms_reminders.patient_has_account IS 'Whether patient had a portal account at time of sending';
COMMENT ON COLUMN sms_reminders.patient_has_push IS 'Whether patient had active FCM token at time of sending';
