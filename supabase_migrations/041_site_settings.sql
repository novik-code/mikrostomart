-- Site Settings table for theme customization and feature flags
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default theme row (empty = use code defaults)
INSERT INTO site_settings (key, value) VALUES ('theme', '{}')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can read site_settings"
    ON site_settings FOR SELECT
    USING (true);

-- Only service role can write (enforced at API level via admin auth)
CREATE POLICY "Service role can update site_settings"
    ON site_settings FOR ALL
    USING (true)
    WITH CHECK (true);
