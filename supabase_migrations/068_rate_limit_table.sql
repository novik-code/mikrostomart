-- Migration 068: Persistent rate limiting table
-- Replaces in-memory Map that resets on Vercel cold starts

CREATE TABLE IF NOT EXISTS rate_limit_entries (
    key TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    reset_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (key)
);

-- Auto-cleanup old entries (runs on every INSERT via trigger)
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    DELETE FROM rate_limit_entries WHERE reset_at < NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_rate_limits ON rate_limit_entries;
CREATE TRIGGER trg_cleanup_rate_limits
    AFTER INSERT ON rate_limit_entries
    EXECUTE FUNCTION cleanup_expired_rate_limits();

-- RLS: service_role only (all access is server-side)
ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'rate_limit_entries' AND policyname = 'service_only'
    ) THEN
        CREATE POLICY service_only ON rate_limit_entries FOR ALL USING (false);
    END IF;
END $$;

-- Index for fast cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limit_reset_at ON rate_limit_entries (reset_at);
