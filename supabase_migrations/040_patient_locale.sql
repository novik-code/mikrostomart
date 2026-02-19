-- Migration: Add locale column to patients and email_verification_tokens
-- Allows patient-facing notifications (email, SMS, push) to be sent in the patient's preferred language

ALTER TABLE patients ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'pl';
ALTER TABLE email_verification_tokens ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'pl';

-- Add CHECK constraint for valid locales
ALTER TABLE patients ADD CONSTRAINT patients_locale_check CHECK (locale IN ('pl', 'en', 'de', 'ua'));
