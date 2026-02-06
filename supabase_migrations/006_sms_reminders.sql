-- Migration: Add SMS reminder tracking to appointment_actions
-- Purpose: Track automated SMS reminder sends to prevent duplicates
-- Date: 2026-02-06
-- API Integration: Prodentis API 3.2

-- Add SMS tracking columns
ALTER TABLE appointment_actions ADD COLUMN IF NOT EXISTS reminder_sms_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE appointment_actions ADD COLUMN IF NOT EXISTS reminder_sms_sent_at TIMESTAMPTZ;
ALTER TABLE appointment_actions ADD COLUMN IF NOT EXISTS reminder_sms_message_id VARCHAR(255);
ALTER TABLE appointment_actions ADD COLUMN IF NOT EXISTS reminder_sms_error TEXT;

-- Create composite index for efficient querying
-- Used by cron job to find appointments that need reminders
CREATE INDEX IF NOT EXISTS idx_appointment_actions_reminder 
    ON appointment_actions(reminder_sms_sent, appointment_date)
    WHERE reminder_sms_sent = FALSE;

-- Add helpful comments
COMMENT ON COLUMN appointment_actions.reminder_sms_sent IS 'Whether automated 24h reminder SMS was sent';
COMMENT ON COLUMN appointment_actions.reminder_sms_sent_at IS 'Timestamp when reminder SMS was sent';
COMMENT ON COLUMN appointment_actions.reminder_sms_message_id IS 'SMS provider message ID for tracking';
COMMENT ON COLUMN appointment_actions.reminder_sms_error IS 'Error message if SMS send failed';
