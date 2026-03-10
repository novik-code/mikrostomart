-- ============================================================
-- Migration 079: Employee notification preferences (opt-out)
-- ============================================================
-- Stores per-employee muted push notification types.
-- Default '{}' = nothing muted = user receives everything their groups allow.
-- Uses opt-out pattern so new notification types are auto-enabled.

CREATE TABLE IF NOT EXISTS employee_notification_preferences (
    user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    muted_keys  TEXT[] NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS — accessed only via service role from API routes
ALTER TABLE employee_notification_preferences ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE employee_notification_preferences IS
    'Per-employee notification opt-out preferences. muted_keys contains push_notification_config.key values the user has disabled.';
COMMENT ON COLUMN employee_notification_preferences.muted_keys IS
    'Array of push_notification_config.key values the employee has muted. Empty = all enabled.';
