-- Migration: Fix sms_reminders unique constraint + nullable columns for multi-type SMS
-- Purpose: 
--   1. Original UNIQUE(prodentis_id, appointment_date) from migration 007 blocks inserting
--      post_visit AND week_after_visit SMS for the same appointment (same date).
--   2. patient_id NOT NULL fails when a Prodentis patient is not in the local patients table.
--   3. doctor_id NOT NULL fails when doctor.id is missing from the API response.
-- Date: 2026-02-24

-- 1. Drop the old broadly-scoped unique constraint that blocks multi-type SMS
ALTER TABLE sms_reminders
    DROP CONSTRAINT IF EXISTS sms_reminders_prodentis_id_appointment_date_key;

-- 2. Make patient_id nullable — not all Prodentis patients are in the local DB
--    (walk-in patients, external referrals, etc.)
ALTER TABLE sms_reminders
    ALTER COLUMN patient_id DROP NOT NULL;

-- 3. Make doctor_id nullable — post-visit/week-after crons may not have doctor.id
ALTER TABLE sms_reminders
    ALTER COLUMN doctor_id DROP NOT NULL;

-- 4. Add proper unique index: one active SMS per (prodentis_id, sms_type)
--    Same appointment can have: reminder + post_visit + week_after_visit
--    But NOT two post_visit SMSes for the same appointment
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_reminders_prodentis_type_unique
    ON sms_reminders(prodentis_id, sms_type)
    WHERE status != 'cancelled';

-- 5. Add index for week_after_visit queries
CREATE INDEX IF NOT EXISTS idx_sms_reminders_week_after
    ON sms_reminders(sms_type, status, appointment_date)
    WHERE sms_type = 'week_after_visit';

COMMENT ON INDEX idx_sms_reminders_prodentis_type_unique IS
    'One active SMS per appointment per type. Allows reminder + post_visit + week_after_visit for same appointment.';
