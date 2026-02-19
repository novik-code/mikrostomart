-- Migration 042: Employee Google Calendar OAuth2 tokens
-- Stores refresh tokens per employee for Google Calendar integration

CREATE TABLE IF NOT EXISTS employee_calendar_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMPTZ NOT NULL,
    calendar_email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- RLS: Only the owner can read/write their own tokens
ALTER TABLE employee_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by API routes)
CREATE POLICY "service_role_all" ON employee_calendar_tokens
    FOR ALL USING (true) WITH CHECK (true);

-- Index for fast lookup by user_id
CREATE INDEX idx_calendar_tokens_user ON employee_calendar_tokens(user_id);
