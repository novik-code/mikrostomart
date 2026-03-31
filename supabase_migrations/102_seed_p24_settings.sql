-- Migration 102: seed p24_settings in clinic_settings
-- Run in Supabase SQL Editor for BOTH projects (mikrostomart + densflow-demo)

INSERT INTO clinic_settings (key, value)
VALUES (
    'p24_settings',
    '{
        "merchant_id": null,
        "pos_id": null,
        "crc_key": null,
        "api_key": null,
        "sandbox": true,
        "enabled": false
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
