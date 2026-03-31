-- Migration 103: seed payu_settings in clinic_settings
-- Run in Supabase SQL Editor for BOTH projects (mikrostomart + densflow-demo)

INSERT INTO clinic_settings (key, value)
VALUES (
    'payu_settings',
    '{
        "pos_id": null,
        "client_id": null,
        "client_secret": null,
        "second_key": null,
        "sandbox": true,
        "enabled": false
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
