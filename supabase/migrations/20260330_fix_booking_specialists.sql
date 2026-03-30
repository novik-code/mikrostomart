-- Phase 6a fix: correct bookable specialists scope
-- Removes doctors that appear in Prodentis but should NOT be in reservation form

-- Remove Wiktoria Leja, Aleksandra Modelska-Kępa, Elżbieta Nowosielska
-- (they are in DOCTOR_MAPPING for SMS purposes but NOT in the booking form)
UPDATE employees SET show_in_booking = false
WHERE prodentis_id IN (
    '0100000002',  -- Elżbieta Nowosielska
    '0100000028',  -- Aleksandra Modelska-Kępa
    '0100000037'   -- Wiktoria Leja
);

-- Keep only these 5 as bookable (matching original PROD_SPECIALISTS):
-- 0100000001 - Marcin Nowosielski      (doctor, 30min)
-- 0100000024 - Ilona Piechaczek        (doctor, 30min)
-- 0100000031 - Katarzyna Hałupczok     (doctor, 30min)
-- 0100000036 - Dominika Milicz         (doctor, 30min)
-- 0100000030 - Małgorzata Maćków-Huras (hygienist, 60min)

-- Verify result (run this SELECT after UPDATE to confirm):
-- SELECT name, prodentis_id, show_in_booking, booking_role, booking_duration_minutes
-- FROM employees WHERE prodentis_id IS NOT NULL ORDER BY name;
