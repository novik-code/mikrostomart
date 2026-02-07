-- Migration 012: Add appointment_type column to appointment_actions
-- Purpose: Store appointment type for landing page routing and analytics
-- Date: 2026-02-07

-- Add appointment_type column
ALTER TABLE appointment_actions 
ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(100);

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_appointment_actions_type 
    ON appointment_actions(appointment_type);

-- Add comment
COMMENT ON COLUMN appointment_actions.appointment_type IS 'Type of appointment (e.g. chirurgia, pierwsza-wizyta, protetyka) - for landing page routing';
