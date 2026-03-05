-- Migration 069: Cron heartbeat table for monitoring
-- Each cron logs its last run time and status here.
-- Health check endpoint reads this to report stale crons.

CREATE TABLE IF NOT EXISTS cron_heartbeats (
    cron_name TEXT PRIMARY KEY,
    last_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'ok',        -- 'ok' | 'error'
    message TEXT,                              -- optional error message or summary
    duration_ms INTEGER                        -- execution time
);

-- RLS: service_role only (crons run server-side)
ALTER TABLE cron_heartbeats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'cron_heartbeats' AND policyname = 'service_only'
    ) THEN
        CREATE POLICY service_only ON cron_heartbeats FOR ALL USING (false);
    END IF;
END $$;

-- Seed expected crons so health check can detect missing ones
INSERT INTO cron_heartbeats (cron_name, last_run_at, status, message) VALUES
    ('daily-article',            NOW() - INTERVAL '2 days', 'unknown', 'Awaiting first monitored run'),
    ('appointment-reminders',    NOW() - INTERVAL '2 days', 'unknown', 'Awaiting first monitored run'),
    ('sms-auto-send',            NOW() - INTERVAL '2 days', 'unknown', 'Awaiting first monitored run'),
    ('task-reminders',           NOW() - INTERVAL '2 days', 'unknown', 'Awaiting first monitored run'),
    ('push-appointment-1h',      NOW() - INTERVAL '2 days', 'unknown', 'Awaiting first monitored run'),
    ('post-visit-sms',           NOW() - INTERVAL '2 days', 'unknown', 'Awaiting first monitored run'),
    ('post-visit-auto-send',     NOW() - INTERVAL '2 days', 'unknown', 'Awaiting first monitored run'),
    ('week-after-visit-sms',     NOW() - INTERVAL '2 days', 'unknown', 'Awaiting first monitored run'),
    ('online-booking-digest',    NOW() - INTERVAL '2 days', 'unknown', 'Awaiting first monitored run'),
    ('push-cleanup',             NOW() - INTERVAL '2 days', 'unknown', 'Awaiting first monitored run'),
    ('birthday-wishes',          NOW() - INTERVAL '2 days', 'unknown', 'Awaiting first monitored run')
ON CONFLICT (cron_name) DO NOTHING;
