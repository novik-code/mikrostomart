-- ============================================
-- Migration 035: Push Notification Config
-- ============================================
-- Purpose: Store configurable groups for automatic (cron) push notifications.
-- Admin can change which groups receive each type of notification from the UI.

CREATE TABLE IF NOT EXISTS push_notification_config (
    key         TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    description TEXT NOT NULL,
    groups      TEXT[] NOT NULL DEFAULT '{}',
    enabled     BOOLEAN NOT NULL DEFAULT true,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with existing cron-driven notifications
INSERT INTO push_notification_config (key, label, description, groups, enabled) VALUES
(
    'task-no-date',
    'Zadania bez terminu',
    'Codzienne przypomnienie (9:30) o zadaniach które nie mają ustawionej daty realizacji.',
    ARRAY['doctors', 'hygienists', 'reception', 'assistant', 'admin'],
    true
),
(
    'task-deposit',
    'Niewpłacony zadatek',
    'Codzienne przypomnienie (9:30) o zadaniach z checklista zadatek/wpłacony zadatek, który nie jest jeszcze odznaczony.',
    ARRAY['doctors', 'hygienists', 'reception', 'assistant', 'admin'],
    true
)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE push_notification_config IS
    'Configurable push notification routing. Admin sets which employee groups receive each cron notification.';
