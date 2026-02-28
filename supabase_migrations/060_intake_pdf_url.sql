-- Migration 060: Add pdf_url to patient_intake_submissions
ALTER TABLE patient_intake_submissions ADD COLUMN IF NOT EXISTS pdf_url TEXT;
