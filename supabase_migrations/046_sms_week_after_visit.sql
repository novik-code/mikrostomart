-- Migration: Week-After-Visit SMS + App Promotion
-- Purpose: Add week_after_visit sms_type + app promotion template
-- Date: 2026-02-24

-- 1. Seed the app promotion template
-- (sms_type='week_after_visit' works automatically via existing sms_type TEXT column)
INSERT INTO sms_templates (key, label, template, updated_at)
VALUES
    (
        'week_after_visit',
        'Tydzień po wizycie — aplikacja',
        'Dziekujemy, ze jestes naszym pacjentem! 😊 Miej Mikrostomart zawsze przy sobie - pobierz aplikacje na telefon: {appUrl}',
        NOW()
    )
ON CONFLICT (key) DO NOTHING;

COMMENT ON COLUMN sms_reminders.sms_type IS 'SMS type: reminder (pre-visit 24h) | post_visit (after-visit thank you) | week_after_visit (app promo 7 days later)';
