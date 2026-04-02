-- ============================================
-- Migration 105: Deduplicate Employee Accounts
-- ============================================
-- Problem: The Prodentis schedule sync creates employees with auto-generated
-- emails (prodentis-XXX@auto.mikrostomart.pl), while the role promotion
-- flow creates entries with real emails. Same person → two rows.
--
-- Fix: Merge auto-generated rows into real ones. For employees only known
-- via Prodentis, keep the auto-generated row but prevent future duplicates.

-- ============================================
-- 1. Merge auto-generated into real accounts
-- ============================================
-- For each pair where:
--   - One row has a real email (from promote)
--   - One row has auto email (from Prodentis sync)
--   - Names fuzzy-match
-- Transfer prodentis_id to the real account and delete the auto row.

DO $$
DECLARE
    r RECORD;
    v_real_id UUID;
    v_auto_id UUID;
BEGIN
    FOR r IN
        SELECT
            real_emp.id AS real_id,
            real_emp.name AS real_name,
            real_emp.email AS real_email,
            real_emp.user_id AS real_user_id,
            auto_emp.id AS auto_id,
            auto_emp.name AS auto_name,
            auto_emp.email AS auto_email,
            auto_emp.prodentis_id AS auto_prodentis_id
        FROM employees real_emp
        JOIN employees auto_emp ON (
            auto_emp.email LIKE '%@auto.mikrostomart.pl'
            AND real_emp.email NOT LIKE '%@auto.mikrostomart.pl'
            AND real_emp.id != auto_emp.id
            AND LOWER(REGEXP_REPLACE(real_emp.name, '\s+', ' ', 'g'))
                = LOWER(REGEXP_REPLACE(auto_emp.name, '\s+', ' ', 'g'))
        )
        WHERE real_emp.is_active = true
    LOOP
        v_real_id := r.real_id;
        v_auto_id := r.auto_id;

        RAISE NOTICE 'MERGE: "%" (%) ← auto "%" (%)',
            r.real_name, r.real_email, r.auto_name, r.auto_email;

        -- Transfer prodentis_id if real doesn't have one
        IF r.auto_prodentis_id IS NOT NULL THEN
            UPDATE employees
            SET prodentis_id = r.auto_prodentis_id, updated_at = NOW()
            WHERE id = v_real_id AND prodentis_id IS NULL;
        END IF;

        -- Transfer any push-related records
        UPDATE push_subscriptions SET user_id = r.real_user_id::text
        WHERE user_id IN (
            SELECT CAST(user_id AS text) FROM employees WHERE id = v_auto_id AND user_id IS NOT NULL
        );

        UPDATE push_notifications_log SET user_id = r.real_user_id::text
        WHERE user_id IN (
            SELECT CAST(user_id AS text) FROM employees WHERE id = v_auto_id AND user_id IS NOT NULL
        );

        -- Delete the auto-generated row
        DELETE FROM employees WHERE id = v_auto_id;
        RAISE NOTICE '  → Deleted auto row %', v_auto_id;
    END LOOP;
END $$;


-- ============================================
-- 2. Deactivate orphaned auto-accounts
-- ============================================
-- Auto-generated accounts with no user_id and no prodentis_id are orphans
-- from Prodentis operators who were not matched to real accounts.
-- Mark them as inactive so they don't show in the Push tab.

UPDATE employees
SET is_active = false, updated_at = NOW()
WHERE email LIKE '%@auto.mikrostomart.pl'
  AND user_id IS NULL
  AND is_active = true;

-- ============================================
-- 3. Verification
-- ============================================
SELECT 'REMAINING ACTIVE' AS check_type,
    id, name, email, user_id, prodentis_id, is_active,
    CASE WHEN email LIKE '%@auto.mikrostomart.pl' THEN 'auto' ELSE 'real' END AS email_type
FROM employees
WHERE is_active = true
ORDER BY name;

-- Check for remaining duplicate names
SELECT 'DUPLICATE NAMES' AS check_type,
    LOWER(REGEXP_REPLACE(name, '\s+', ' ', 'g')) AS normalized_name,
    COUNT(*) AS count,
    STRING_AGG(email, ', ') AS emails
FROM employees
WHERE is_active = true
GROUP BY LOWER(REGEXP_REPLACE(name, '\s+', ' ', 'g'))
HAVING COUNT(*) > 1;
