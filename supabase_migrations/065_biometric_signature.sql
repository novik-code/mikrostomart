-- Migration 065: Add biometric signature data to patient_consents
-- iPad + Apple Pencil biometric data (pressure, tilt, timestamps, speed)
-- for legal compliance with Polish medical documentation requirements

ALTER TABLE patient_consents
  ADD COLUMN IF NOT EXISTS biometric_data JSONB DEFAULT NULL;

COMMENT ON COLUMN patient_consents.biometric_data IS 
  'Biometric signature data: strokes (x, y, pressure, tilt, timestamps), device info, duration, pressure stats';
