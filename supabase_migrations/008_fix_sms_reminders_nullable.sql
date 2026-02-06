-- Migration: Fix sms_reminders NOT NULL constraints for API 4.0
-- Purpose: Allow NULL for patient_id and doctor_id (not all patients have portal accounts)
-- Date: 2026-02-06

-- Make patient_id nullable (most patients don't have portal accounts)
ALTER TABLE sms_reminders 
  ALTER COLUMN patient_id DROP NOT NULL;

-- Make doctor_id nullable (we don't track doctors in our DB)
ALTER TABLE sms_reminders 
  ALTER COLUMN doctor_id DROP NOT NULL;

-- Update comments
COMMENT ON COLUMN sms_reminders.patient_id IS 'Patient portal account ID (NULL if patient has no portal account)';
COMMENT ON COLUMN sms_reminders.doctor_id IS 'Doctor ID in our system (NULL if not tracked, use doctor_name instead)';
