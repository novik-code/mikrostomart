-- Migration: Add display_name to user_roles
-- Run this in Supabase SQL Editor

ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS display_name text;

-- Set initial display names from emails (extract part before @, capitalize)
-- You can update these manually afterwards, e.g.:
-- UPDATE user_roles SET display_name = 'Jan Kowalski' WHERE email = 'jan@example.com';

COMMENT ON COLUMN user_roles.display_name IS 'Imię i nazwisko pracownika wyświetlane w systemie';
