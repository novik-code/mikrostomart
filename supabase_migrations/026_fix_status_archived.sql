-- ============================================
-- Migration: Fix status CHECK constraint for archived status
-- ============================================
-- Date: 2026-02-15
-- Purpose: Ensure the status column on employee_tasks allows 'archived' value.
--          The original table may have a CHECK constraint that only permits
--          'todo', 'in_progress', 'done'.

-- Drop any existing CHECK constraint on the status column
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'employee_tasks'
      AND att.attname = 'status'
      AND con.contype = 'c';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE employee_tasks DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END IF;
END $$;

-- Re-add CHECK constraint with 'archived' included
ALTER TABLE employee_tasks
ADD CONSTRAINT employee_tasks_status_check
CHECK (status IN ('todo', 'in_progress', 'done', 'archived'));

COMMENT ON COLUMN employee_tasks.status IS 'Task status: todo, in_progress, done, or archived';
