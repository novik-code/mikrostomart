-- Push notification subscriptions
-- Stores Web Push API subscription metadata for patients, employees, and admins.

CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type TEXT NOT NULL CHECK (user_type IN ('patient', 'employee', 'admin')),
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    locale TEXT DEFAULT 'pl',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(endpoint)
);

-- Index for fast lookup when sending push to a specific user
CREATE INDEX idx_push_subs_user ON push_subscriptions (user_type, user_id);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON push_subscriptions
    FOR ALL USING (true) WITH CHECK (true);
