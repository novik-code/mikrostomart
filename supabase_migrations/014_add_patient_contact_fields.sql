-- Migration 014: Add patient contact fields to appointment_actions
-- Purpose: Store patient name and phone for complete notification content
-- Date: 2026-02-07

-- Add patient contact fields
ALTER TABLE appointment_actions ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255);
ALTER TABLE appointment_actions ADD COLUMN IF NOT EXISTS patient_phone VARCHAR(20);

-- Add comments
COMMENT ON COLUMN appointment_actions.patient_name IS 'Patient full name from Prodentis (for notifications)';
COMMENT ON COLUMN appointment_actions.patient_phone IS 'Patient phone number from Prodentis (for notifications)';
