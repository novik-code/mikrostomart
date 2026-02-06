-- Migration: Add patient_name to sms_reminders for better admin UX
-- Purpose: Display patient name in admin panel (not just phone number)
-- Date: 2026-02-06

-- Add patient_name column
ALTER TABLE sms_reminders 
  ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255);

-- Update comment
COMMENT ON COLUMN sms_reminders.patient_name IS 'Patient full name from Prodentis (for admin display)';
