-- Phase 6a: Add booking-related columns to employees table
-- Safe to run multiple times (IF NOT EXISTS guards)

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS show_in_booking boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS booking_duration_minutes integer NOT NULL DEFAULT 30,
    ADD COLUMN IF NOT EXISTS booking_role text; -- 'doctor' | 'hygienist' | null

-- Seed: mark current Mikrostomart specialists as bookable
-- Uses prodentis_id to match; safe because prodentis_id is unique
UPDATE employees SET
    show_in_booking = true,
    booking_duration_minutes = 30,
    booking_role = 'doctor'
WHERE prodentis_id = '0100000001'; -- Marcin Nowosielski

UPDATE employees SET
    show_in_booking = true,
    booking_duration_minutes = 60,
    booking_role = 'hygienist'
WHERE prodentis_id = '0100000002'; -- Elżbieta Nowosielska

UPDATE employees SET
    show_in_booking = true,
    booking_duration_minutes = 30,
    booking_role = 'doctor'
WHERE prodentis_id = '0100000024'; -- Ilona Piechaczek

UPDATE employees SET
    show_in_booking = true,
    booking_duration_minutes = 30,
    booking_role = 'doctor'
WHERE prodentis_id = '0100000028'; -- Aleksandra Modelska-Kępa

UPDATE employees SET
    show_in_booking = true,
    booking_duration_minutes = 60,
    booking_role = 'hygienist'
WHERE prodentis_id = '0100000030'; -- Małgorzata Maćków-Huras

UPDATE employees SET
    show_in_booking = true,
    booking_duration_minutes = 30,
    booking_role = 'doctor'
WHERE prodentis_id = '0100000031'; -- Katarzyna Hałupczok

UPDATE employees SET
    show_in_booking = true,
    booking_duration_minutes = 30,
    booking_role = 'doctor'
WHERE prodentis_id = '0100000036'; -- Dominika Milicz

UPDATE employees SET
    show_in_booking = true,
    booking_duration_minutes = 30,
    booking_role = 'doctor'
WHERE prodentis_id = '0100000037'; -- Wiktoria Leja
