-- ============================================
-- Migration 104: FCM Push Notification Rebuild
-- ============================================
-- Replaces broken VAPID web-push with Firebase Cloud Messaging (FCM).
-- Creates new fcm_tokens table while keeping push_subscriptions as deprecated.

-- 1. New table: fcm_tokens
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('employee', 'admin', 'patient')),
    fcm_token TEXT NOT NULL UNIQUE,
    device_label TEXT,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user ON fcm_tokens(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_type ON fcm_tokens(user_type);

-- 2. Improve push_notifications_log (fix silent failures)
ALTER TABLE push_notifications_log
    ALTER COLUMN user_id SET NOT NULL,
    ALTER COLUMN title SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_push_log_user_date
    ON push_notifications_log(user_id, sent_at DESC);

-- 3. RLS for fcm_tokens
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY fcm_tokens_service_all ON fcm_tokens
    FOR ALL USING (true) WITH CHECK (true);

-- 4. RLS for push_notifications_log (ensure employees can read their own)
-- Drop and recreate to ensure clean state
DROP POLICY IF EXISTS push_log_select_own ON push_notifications_log;
CREATE POLICY push_log_select_own ON push_notifications_log
    FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS push_log_insert_service ON push_notifications_log;
CREATE POLICY push_log_insert_service ON push_notifications_log
    FOR INSERT WITH CHECK (true);
