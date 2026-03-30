-- Migration 100: Seed SMS settings row in clinic_settings
-- clinic_settings table already exists (migration 099)
-- RLS already configured: only service_role can write

INSERT INTO clinic_settings (key, value)
VALUES ('sms_settings', '{
  "provider": "smsapi",
  "token": "",
  "sender_name": "",
  "test_phone": ""
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
