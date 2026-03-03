-- Migration 063: Login rate limiting table (replaces in-memory Map)
-- Persists across deployments and serverless cold starts

CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier TEXT NOT NULL,          -- phone number or email
    attempted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    ip_address TEXT,                    -- optional, for IP-based limiting
    success BOOLEAN DEFAULT false       -- track if login was successful
);

-- Index for fast lookups by identifier + time window
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_time 
    ON login_attempts (identifier, attempted_at DESC);

-- Index for IP-based queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time 
    ON login_attempts (ip_address, attempted_at DESC) 
    WHERE ip_address IS NOT NULL;

-- Auto-cleanup: delete attempts older than 24 hours (run via cron or trigger)
-- For now, we'll clean up in the query itself using a time window

-- Enable RLS
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access (no anon access)
CREATE POLICY "Service role only" ON login_attempts
    FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE login_attempts IS 'Tracks login attempts for rate limiting. Replaces in-memory Map that reset on each deployment.';
