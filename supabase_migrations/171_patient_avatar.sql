-- 171_patient_avatar.sql
-- Avatar pacjenta: id wybranego presetu (wygenerowany avatar w apce mobilnej).
-- Wygląd presetów żyje w apce; backend trzyma tylko mały string-id.
-- Walidacja w /api/patients/me PATCH: ^[a-z0-9_-]{1,40}$ (NULL = domyślny „aurum").

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS avatar VARCHAR(40);

COMMENT ON COLUMN patients.avatar IS
  'Id presetu wygenerowanego avatara wybranego przez pacjenta w apce mobilnej (np. aurum, gold, emerald). NULL = domyślny złoty monogram.';
