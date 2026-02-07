-- Migration 013: Make patient_id nullable in appointment_actions
-- Purpose: Allow appointment_actions for patients without portal accounts
-- Date: 2026-02-07

-- Drop NOT NULL constraint from patient_id
ALTER TABLE appointment_actions 
ALTER COLUMN patient_id DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN appointment_actions.patient_id IS 'Link to patient account (nullable - some patients do not have portal accounts)';
