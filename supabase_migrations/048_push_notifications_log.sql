-- Migration 048: Push notifications log table
-- Stores the last 7 days of push notifications per employee
-- Used for the "Powiadomienia" history tab in the employee panel

CREATE TABLE IF NOT EXISTS push_notifications_log (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT        NOT NULL,
    user_type   TEXT        NOT NULL DEFAULT 'employee',
    title       TEXT        NOT NULL,
    body        TEXT        NOT NULL,
    url         TEXT,
    tag         TEXT,
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Efficient lookup: user's notifications ordered newest first
CREATE INDEX IF NOT EXISTS push_notifications_log_user_sent
    ON push_notifications_log (user_id, sent_at DESC);

-- RLS: employees can read only their own notifications
ALTER TABLE push_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_read_own_notifications"
    ON push_notifications_log
    FOR SELECT
    USING (user_id = auth.uid()::text);

-- Service role can INSERT (called server-side from webpush.ts)
-- No RLS needed for service_role — it bypasses RLS by default.

COMMENT ON TABLE push_notifications_log IS
    'Audit log of push notifications sent to employees. Entries older than 7 days are purged by the daily push-cleanup cron job.';
