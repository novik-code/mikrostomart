-- Migration 101: seed stripe_settings in clinic_settings
-- Run in Supabase SQL Editor for BOTH projects (mikrostomart + densflow-demo)

INSERT INTO clinic_settings (key, value)
VALUES (
    'stripe_settings',
    '{"publishable_key": null, "secret_key": null, "enabled": false}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
