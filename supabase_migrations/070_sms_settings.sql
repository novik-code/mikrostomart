-- SMS Settings table for toggling SMS types on/off
CREATE TABLE IF NOT EXISTS public.sms_settings (
    id TEXT PRIMARY KEY,          -- e.g. 'noshow_followup', 'post_visit', etc.
    enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by TEXT               -- email of admin who changed it
);

-- Enable RLS
ALTER TABLE public.sms_settings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by cron jobs and admin API)
CREATE POLICY "Service role full access" ON public.sms_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Insert default values (all enabled)
INSERT INTO public.sms_settings (id, enabled) VALUES
    ('noshow_followup', true),
    ('post_visit', true),
    ('week_after_visit', true),
    ('birthday', true),
    ('deposit_reminder', true)
ON CONFLICT (id) DO NOTHING;
