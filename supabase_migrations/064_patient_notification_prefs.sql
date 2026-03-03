-- Migration 064: Patient notification preferences
-- Adds a JSONB column with default toggles for each notification type

ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB 
DEFAULT '{"sms_reminders": true, "email_reminders": true, "birthday_wishes": true, "push_1h_before": true, "post_visit_sms": true}'::jsonb;

COMMENT ON COLUMN patients.notification_preferences IS 'Patient notification preferences: sms_reminders, email_reminders, birthday_wishes, push_1h_before, post_visit_sms. All default to true.';
