-- Phase 7: Create clinic_settings table for flexible key-value configuration
-- Used by PMS settings panel (and potentially other admin settings in the future)

CREATE TABLE IF NOT EXISTS clinic_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_clinic_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clinic_settings_updated_at ON clinic_settings;
CREATE TRIGGER clinic_settings_updated_at
    BEFORE UPDATE ON clinic_settings
    FOR EACH ROW EXECUTE FUNCTION update_clinic_settings_updated_at();

-- RLS: only service_role can write, anon cannot read
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for admin API routes using service key)
CREATE POLICY "service_role_all" ON clinic_settings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed initial PMS settings row (safe: ON CONFLICT DO NOTHING)
INSERT INTO clinic_settings (key, value)
VALUES ('pms_settings', '{"provider": "prodentis", "notes": "Konfiguracja wstępna — Mikrostomart"}')
ON CONFLICT (key) DO NOTHING;
