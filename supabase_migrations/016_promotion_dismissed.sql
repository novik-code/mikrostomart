-- Add promotion_dismissed flag to patients table
-- Allows admins to dismiss patient candidates from the promotion section
ALTER TABLE patients ADD COLUMN IF NOT EXISTS promotion_dismissed BOOLEAN DEFAULT FALSE;
