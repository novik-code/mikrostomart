-- CareFlow: Add report_generated_at to track when reports were generated
-- Migration 112: Extends care_enrollments for report tracking

-- Add report_generated_at column
ALTER TABLE care_enrollments
ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMPTZ;

-- Index for finding enrollments without reports (used by cron)
CREATE INDEX IF NOT EXISTS idx_care_enrollments_no_report
    ON care_enrollments(status)
    WHERE report_pdf_url IS NULL AND status = 'completed';
