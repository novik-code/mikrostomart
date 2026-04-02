-- ============================================
-- Migration 106: Fix employee deactivation & name
-- ============================================
-- Fix 1: Reactivate Małgorzata Maćków auto-account that was
--   incorrectly deactivated by migration 105 (she only has a
--   Prodentis auto-account, no real-email account).
--
-- Fix 2: Correct name typo: "Hurac" → "Huras" (if present)

-- Reactivate: any auto-account with name containing 'Małgorzata' 
-- and 'Maćków' that was deactivated
UPDATE employees
SET is_active = true, updated_at = NOW()
WHERE email LIKE '%@auto.mikrostomart.pl'
  AND is_active = false
  AND (
    name ILIKE '%Małgorzata%Maćków%'
    OR name ILIKE '%Malgorzata%Mackow%'
  );

-- Fix name typo: replace 'Hurac' with 'Huras' in all employee names
UPDATE employees
SET name = REPLACE(name, 'Hurac', 'Huras'), updated_at = NOW()
WHERE name LIKE '%Hurac%';

-- Also fix any other common misspelling patterns
UPDATE employees
SET name = REPLACE(name, 'Mackow', 'Maćków'), updated_at = NOW()
WHERE name LIKE '%Mackow%' AND name NOT LIKE '%Maćków%';

-- Verification
SELECT 'REACTIVATED' AS check_type, id, name, email, is_active, prodentis_id
FROM employees
WHERE name ILIKE '%Małgorzata%Maćków%'
   OR name ILIKE '%Malgorzata%Mackow%';
