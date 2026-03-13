-- ============================================
-- Migration 082: Merge Duplicate Employee Accounts
-- ============================================
-- Date: 2026-03-13
-- Purpose: Merge 4 sets of duplicate employee records.
--
-- For each merge:
--   1. Identify keeper (by email) and duplicate
--   2. Transfer all dependent records from duplicate → keeper
--   3. Update keeper with correct data
--   4. Delete duplicate
--
-- Tables affected:
--   - employees (primary)
--   - user_roles
--   - push_subscriptions
--   - push_notifications_log
--   - employee_tasks (owner_user_id, created_by, assigned_to JSONB)
--   - task_history (changed_by email)
--   - task_comments (author_email)
--   - employee_notification_preferences
--   - employee_audit_log
--   - employee_calendar_tokens
--
-- ⚠️ Run in Supabase SQL Editor. Backup recommended before executing.

-- ============================================
-- HELPER: Generic merge function
-- ============================================
-- We'll use DO $$ blocks for each merge to keep things safe
-- and use RAISE NOTICE for progress tracking.

-- ============================================
-- 1. MERGE: Admin + Administracja Mikrostomart
--    Keep: gabinet@mikrostomart.pl
--    Final name: Administrator
-- ============================================
DO $$
DECLARE
    v_keeper_id UUID;
    v_keeper_user_id UUID;
    v_dup_id UUID;
    v_dup_user_id UUID;
    v_dup_prodentis_id TEXT;
BEGIN
    -- Find keeper by email
    SELECT id, user_id INTO v_keeper_id, v_keeper_user_id
    FROM employees WHERE email = 'gabinet@mikrostomart.pl' LIMIT 1;

    IF v_keeper_id IS NULL THEN
        RAISE NOTICE 'SKIP: No employee with email gabinet@mikrostomart.pl found';
        RETURN;
    END IF;

    -- Find duplicate: any other employee whose name contains 'administr' (case insensitive)
    -- that is NOT the keeper
    SELECT id, user_id, prodentis_id INTO v_dup_id, v_dup_user_id, v_dup_prodentis_id
    FROM employees
    WHERE id != v_keeper_id
      AND (LOWER(name) LIKE '%administr%' OR LOWER(email) LIKE '%administr%')
    LIMIT 1;

    IF v_dup_id IS NULL THEN
        RAISE NOTICE 'SKIP: No duplicate "Administracja" employee found';
        -- Still update the name
        UPDATE employees SET name = 'Administrator', updated_at = NOW() WHERE id = v_keeper_id;
        RETURN;
    END IF;

    RAISE NOTICE 'MERGE 1: Admin — keeper=% dup=%', v_keeper_id, v_dup_id;

    -- Transfer prodentis_id if keeper doesn't have one
    IF v_dup_prodentis_id IS NOT NULL THEN
        UPDATE employees SET prodentis_id = v_dup_prodentis_id, updated_at = NOW()
        WHERE id = v_keeper_id AND prodentis_id IS NULL;
    END IF;

    -- Transfer user_id if keeper doesn't have one
    IF v_dup_user_id IS NOT NULL AND v_keeper_user_id IS NULL THEN
        UPDATE employees SET user_id = v_dup_user_id, updated_at = NOW()
        WHERE id = v_keeper_id;
    END IF;

    -- Transfer dependent records (by employee UUID)
    UPDATE push_subscriptions SET user_id = v_keeper_user_id::text WHERE user_id = v_dup_user_id::text AND v_dup_user_id IS NOT NULL;
    UPDATE push_notifications_log SET user_id = v_keeper_user_id::text WHERE user_id = v_dup_user_id::text AND v_dup_user_id IS NOT NULL;
    UPDATE employee_tasks SET owner_user_id = v_keeper_user_id WHERE owner_user_id = v_dup_user_id AND v_dup_user_id IS NOT NULL;
    UPDATE employee_tasks SET created_by = v_keeper_user_id::text WHERE created_by = v_dup_user_id::text AND v_dup_user_id IS NOT NULL;
    UPDATE employee_notification_preferences SET user_id = v_keeper_user_id::text WHERE user_id = v_dup_user_id::text AND v_dup_user_id IS NOT NULL;
    UPDATE employee_audit_log SET user_id = v_keeper_user_id::text WHERE user_id = v_dup_user_id::text AND v_dup_user_id IS NOT NULL;
    UPDATE employee_calendar_tokens SET user_id = v_keeper_user_id WHERE user_id = v_dup_user_id AND v_dup_user_id IS NOT NULL;

    -- JSONB: Update assigned_to arrays in employee_tasks
    -- Replace dup's user_id with keeper's user_id in the JSONB array
    UPDATE employee_tasks
    SET assigned_to = (
        SELECT jsonb_agg(
            CASE
                WHEN elem->>'id' = v_dup_user_id::text
                THEN jsonb_set(elem, '{id}', to_jsonb(v_keeper_user_id::text))
                ELSE elem
            END
        )
        FROM jsonb_array_elements(assigned_to) AS elem
    )
    WHERE assigned_to::text LIKE '%' || v_dup_user_id::text || '%'
      AND v_dup_user_id IS NOT NULL;

    -- Delete duplicate user_roles (keep keeper's)
    DELETE FROM user_roles WHERE user_id = v_dup_user_id AND v_dup_user_id IS NOT NULL
      AND role IN (SELECT role FROM user_roles WHERE user_id = v_keeper_user_id);

    -- Transfer remaining roles
    UPDATE user_roles SET user_id = v_keeper_user_id, email = 'gabinet@mikrostomart.pl'
    WHERE user_id = v_dup_user_id AND v_dup_user_id IS NOT NULL;

    -- Update keeper name
    UPDATE employees SET name = 'Administrator', updated_at = NOW() WHERE id = v_keeper_id;

    -- Delete duplicate
    DELETE FROM employees WHERE id = v_dup_id;

    RAISE NOTICE 'MERGE 1 DONE: Admin merged, duplicate deleted';
END $$;


-- ============================================
-- 2. MERGE: Ela Nowosielska + Elżbieta Nowosielska
--    Keep: elizabethhh1@o2.pl
--    Final name: Elżbieta Nowosielska
-- ============================================
DO $$
DECLARE
    v_keeper_id UUID;
    v_keeper_user_id UUID;
    v_dup_id UUID;
    v_dup_user_id UUID;
    v_dup_prodentis_id TEXT;
    v_dup_email TEXT;
BEGIN
    SELECT id, user_id INTO v_keeper_id, v_keeper_user_id
    FROM employees WHERE email = 'elizabethhh1@o2.pl' LIMIT 1;

    IF v_keeper_id IS NULL THEN
        RAISE NOTICE 'SKIP: No employee with email elizabethhh1@o2.pl found';
        RETURN;
    END IF;

    -- Find duplicate: another employee with 'nowosielska' in name (case-insensitive)
    SELECT id, user_id, prodentis_id, email INTO v_dup_id, v_dup_user_id, v_dup_prodentis_id, v_dup_email
    FROM employees
    WHERE id != v_keeper_id
      AND LOWER(name) LIKE '%nowosielska%'
    LIMIT 1;

    IF v_dup_id IS NULL THEN
        RAISE NOTICE 'SKIP: No duplicate Nowosielska employee found';
        UPDATE employees SET name = 'Elżbieta Nowosielska', updated_at = NOW() WHERE id = v_keeper_id;
        RETURN;
    END IF;

    RAISE NOTICE 'MERGE 2: Nowosielska — keeper=% dup=% dup_email=%', v_keeper_id, v_dup_id, v_dup_email;

    IF v_dup_prodentis_id IS NOT NULL THEN
        UPDATE employees SET prodentis_id = v_dup_prodentis_id, updated_at = NOW()
        WHERE id = v_keeper_id AND prodentis_id IS NULL;
    END IF;

    IF v_dup_user_id IS NOT NULL AND v_keeper_user_id IS NULL THEN
        UPDATE employees SET user_id = v_dup_user_id, updated_at = NOW()
        WHERE id = v_keeper_id;
        v_keeper_user_id := v_dup_user_id; -- use this for further updates
    END IF;

    -- Transfer dependent records
    IF v_dup_user_id IS NOT NULL THEN
        UPDATE push_subscriptions SET user_id = v_keeper_user_id::text WHERE user_id = v_dup_user_id::text;
        UPDATE push_notifications_log SET user_id = v_keeper_user_id::text WHERE user_id = v_dup_user_id::text;
        UPDATE employee_tasks SET owner_user_id = v_keeper_user_id WHERE owner_user_id = v_dup_user_id;
        UPDATE employee_tasks SET created_by = v_keeper_user_id::text WHERE created_by = v_dup_user_id::text;
        UPDATE employee_notification_preferences SET user_id = v_keeper_user_id::text WHERE user_id = v_dup_user_id::text;
        UPDATE employee_audit_log SET user_id = v_keeper_user_id::text WHERE user_id = v_dup_user_id::text;
        UPDATE employee_calendar_tokens SET user_id = v_keeper_user_id WHERE user_id = v_dup_user_id;

        -- JSONB assigned_to
        UPDATE employee_tasks
        SET assigned_to = (
            SELECT jsonb_agg(
                CASE
                    WHEN elem->>'id' = v_dup_user_id::text
                    THEN jsonb_set(elem, '{id}', to_jsonb(v_keeper_user_id::text))
                    ELSE elem
                END
            )
            FROM jsonb_array_elements(assigned_to) AS elem
        )
        WHERE assigned_to::text LIKE '%' || v_dup_user_id::text || '%';

        -- user_roles: delete duplicates, transfer the rest
        DELETE FROM user_roles WHERE user_id = v_dup_user_id
          AND role IN (SELECT role FROM user_roles WHERE user_id = v_keeper_user_id);
        UPDATE user_roles SET user_id = v_keeper_user_id, email = 'elizabethhh1@o2.pl'
        WHERE user_id = v_dup_user_id;
    END IF;

    -- Transfer by email references
    IF v_dup_email IS NOT NULL THEN
        UPDATE task_history SET changed_by = 'elizabethhh1@o2.pl' WHERE changed_by = v_dup_email;
        UPDATE employee_tasks SET created_by_email = 'elizabethhh1@o2.pl' WHERE created_by_email = v_dup_email;
    END IF;

    UPDATE employees SET name = 'Elżbieta Nowosielska', updated_at = NOW() WHERE id = v_keeper_id;

    DELETE FROM employees WHERE id = v_dup_id;
    RAISE NOTICE 'MERGE 2 DONE: Nowosielska merged';
END $$;


-- ============================================
-- 3. MERGE: Marcin Nowosielski + Marcin (II) Nowosielski
--    Keep: dr.nowosielski@gmail.com
--    Final name: Marcin Nowosielski
-- ============================================
DO $$
DECLARE
    v_keeper_id UUID;
    v_keeper_user_id UUID;
    v_dup_id UUID;
    v_dup_user_id UUID;
    v_dup_prodentis_id TEXT;
    v_dup_email TEXT;
BEGIN
    SELECT id, user_id INTO v_keeper_id, v_keeper_user_id
    FROM employees WHERE email = 'dr.nowosielski@gmail.com' LIMIT 1;

    IF v_keeper_id IS NULL THEN
        RAISE NOTICE 'SKIP: No employee with email dr.nowosielski@gmail.com found';
        RETURN;
    END IF;

    -- Find duplicate: name contains 'nowosielski' and NOT the keeper
    SELECT id, user_id, prodentis_id, email INTO v_dup_id, v_dup_user_id, v_dup_prodentis_id, v_dup_email
    FROM employees
    WHERE id != v_keeper_id
      AND LOWER(name) LIKE '%nowosielski%'
    LIMIT 1;

    IF v_dup_id IS NULL THEN
        RAISE NOTICE 'SKIP: No duplicate Nowosielski employee found';
        UPDATE employees SET name = 'Marcin Nowosielski', updated_at = NOW() WHERE id = v_keeper_id;
        RETURN;
    END IF;

    RAISE NOTICE 'MERGE 3: Nowosielski — keeper=% dup=% dup_email=%', v_keeper_id, v_dup_id, v_dup_email;

    IF v_dup_prodentis_id IS NOT NULL THEN
        UPDATE employees SET prodentis_id = v_dup_prodentis_id, updated_at = NOW()
        WHERE id = v_keeper_id AND prodentis_id IS NULL;
    END IF;

    IF v_dup_user_id IS NOT NULL AND v_keeper_user_id IS NULL THEN
        UPDATE employees SET user_id = v_dup_user_id, updated_at = NOW()
        WHERE id = v_keeper_id;
        v_keeper_user_id := v_dup_user_id;
    END IF;

    IF v_dup_user_id IS NOT NULL THEN
        UPDATE push_subscriptions SET user_id = v_keeper_user_id::text WHERE user_id = v_dup_user_id::text;
        UPDATE push_notifications_log SET user_id = v_keeper_user_id::text WHERE user_id = v_dup_user_id::text;
        UPDATE employee_tasks SET owner_user_id = v_keeper_user_id WHERE owner_user_id = v_dup_user_id;
        UPDATE employee_tasks SET created_by = v_keeper_user_id::text WHERE created_by = v_dup_user_id::text;
        UPDATE employee_notification_preferences SET user_id = v_keeper_user_id::text WHERE user_id = v_dup_user_id::text;
        UPDATE employee_audit_log SET user_id = v_keeper_user_id::text WHERE user_id = v_dup_user_id::text;
        UPDATE employee_calendar_tokens SET user_id = v_keeper_user_id WHERE user_id = v_dup_user_id;

        UPDATE employee_tasks
        SET assigned_to = (
            SELECT jsonb_agg(
                CASE
                    WHEN elem->>'id' = v_dup_user_id::text
                    THEN jsonb_set(elem, '{id}', to_jsonb(v_keeper_user_id::text))
                    ELSE elem
                END
            )
            FROM jsonb_array_elements(assigned_to) AS elem
        )
        WHERE assigned_to::text LIKE '%' || v_dup_user_id::text || '%';

        DELETE FROM user_roles WHERE user_id = v_dup_user_id
          AND role IN (SELECT role FROM user_roles WHERE user_id = v_keeper_user_id);
        UPDATE user_roles SET user_id = v_keeper_user_id, email = 'dr.nowosielski@gmail.com'
        WHERE user_id = v_dup_user_id;
    END IF;

    IF v_dup_email IS NOT NULL THEN
        UPDATE task_history SET changed_by = 'dr.nowosielski@gmail.com' WHERE changed_by = v_dup_email;
        UPDATE employee_tasks SET created_by_email = 'dr.nowosielski@gmail.com' WHERE created_by_email = v_dup_email;
    END IF;

    UPDATE employees SET name = 'Marcin Nowosielski', updated_at = NOW() WHERE id = v_keeper_id;

    DELETE FROM employees WHERE id = v_dup_id;
    RAISE NOTICE 'MERGE 3 DONE: Nowosielski merged';
END $$;


-- ============================================
-- 4. MERGE: Two Małgorzata Maćków-Hurac accounts
--    Keep: gosiaaem@gmail.com
--    Final name: Małgorzata Maćków-Hurac
-- ============================================
DO $$
DECLARE
    v_keeper_id UUID;
    v_keeper_user_id UUID;
    v_dup_id UUID;
    v_dup_user_id UUID;
    v_dup_prodentis_id TEXT;
    v_dup_email TEXT;
BEGIN
    SELECT id, user_id INTO v_keeper_id, v_keeper_user_id
    FROM employees WHERE email = 'gosiaaem@gmail.com' LIMIT 1;

    IF v_keeper_id IS NULL THEN
        RAISE NOTICE 'SKIP: No employee with email gosiaaem@gmail.com found';
        RETURN;
    END IF;

    -- Find duplicate: name contains 'mack' (for maćków / macków) and NOT the keeper
    SELECT id, user_id, prodentis_id, email INTO v_dup_id, v_dup_user_id, v_dup_prodentis_id, v_dup_email
    FROM employees
    WHERE id != v_keeper_id
      AND (LOWER(name) LIKE '%mack%' OR LOWER(name) LIKE '%małgorzata%mac%')
    LIMIT 1;

    IF v_dup_id IS NULL THEN
        RAISE NOTICE 'SKIP: No duplicate Maćków-Hurac employee found';
        UPDATE employees SET name = 'Małgorzata Maćków-Hurac', updated_at = NOW() WHERE id = v_keeper_id;
        RETURN;
    END IF;

    RAISE NOTICE 'MERGE 4: Maćków-Hurac — keeper=% dup=% dup_email=%', v_keeper_id, v_dup_id, v_dup_email;

    IF v_dup_prodentis_id IS NOT NULL THEN
        UPDATE employees SET prodentis_id = v_dup_prodentis_id, updated_at = NOW()
        WHERE id = v_keeper_id AND prodentis_id IS NULL;
    END IF;

    IF v_dup_user_id IS NOT NULL AND v_keeper_user_id IS NULL THEN
        UPDATE employees SET user_id = v_dup_user_id, updated_at = NOW()
        WHERE id = v_keeper_id;
        v_keeper_user_id := v_dup_user_id;
    END IF;

    IF v_dup_user_id IS NOT NULL THEN
        UPDATE push_subscriptions SET user_id = v_keeper_user_id::text WHERE user_id = v_dup_user_id::text;
        UPDATE push_notifications_log SET user_id = v_keeper_user_id::text WHERE user_id = v_dup_user_id::text;
        UPDATE employee_tasks SET owner_user_id = v_keeper_user_id WHERE owner_user_id = v_dup_user_id;
        UPDATE employee_tasks SET created_by = v_keeper_user_id::text WHERE created_by = v_dup_user_id::text;
        UPDATE employee_notification_preferences SET user_id = v_keeper_user_id::text WHERE user_id = v_dup_user_id::text;
        UPDATE employee_audit_log SET user_id = v_keeper_user_id::text WHERE user_id = v_dup_user_id::text;
        UPDATE employee_calendar_tokens SET user_id = v_keeper_user_id WHERE user_id = v_dup_user_id;

        UPDATE employee_tasks
        SET assigned_to = (
            SELECT jsonb_agg(
                CASE
                    WHEN elem->>'id' = v_dup_user_id::text
                    THEN jsonb_set(elem, '{id}', to_jsonb(v_keeper_user_id::text))
                    ELSE elem
                END
            )
            FROM jsonb_array_elements(assigned_to) AS elem
        )
        WHERE assigned_to::text LIKE '%' || v_dup_user_id::text || '%';

        DELETE FROM user_roles WHERE user_id = v_dup_user_id
          AND role IN (SELECT role FROM user_roles WHERE user_id = v_keeper_user_id);
        UPDATE user_roles SET user_id = v_keeper_user_id, email = 'gosiaaem@gmail.com'
        WHERE user_id = v_dup_user_id;
    END IF;

    IF v_dup_email IS NOT NULL THEN
        UPDATE task_history SET changed_by = 'gosiaaem@gmail.com' WHERE changed_by = v_dup_email;
        UPDATE employee_tasks SET created_by_email = 'gosiaaem@gmail.com' WHERE created_by_email = v_dup_email;
    END IF;

    UPDATE employees SET name = 'Małgorzata Maćków-Hurac', updated_at = NOW() WHERE id = v_keeper_id;

    DELETE FROM employees WHERE id = v_dup_id;
    RAISE NOTICE 'MERGE 4 DONE: Maćków-Hurac merged';
END $$;


-- ============================================
-- VERIFICATION: Check that merges succeeded
-- ============================================

-- 1. No duplicates should remain
SELECT 'REMAINING EMPLOYEES' AS check_type, id, name, email, user_id, prodentis_id, is_active
FROM employees
WHERE is_active = true
ORDER BY name;

-- 2. Check for any remaining "Administracja" references
SELECT 'ADMIN CHECK' AS check_type, COUNT(*) AS count
FROM employees
WHERE LOWER(name) LIKE '%administracja%';

-- 3. Check for any remaining duplicate patterns
SELECT 'DUPLICATE NAME CHECK' AS check_type,
       LOWER(REGEXP_REPLACE(name, '\s+', ' ', 'g')) AS normalized_name,
       COUNT(*) AS count
FROM employees
WHERE is_active = true
GROUP BY LOWER(REGEXP_REPLACE(name, '\s+', ' ', 'g'))
HAVING COUNT(*) > 1;
