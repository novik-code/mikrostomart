-- ============================================================
-- Migration 037: Multi-group support for push_subscriptions
-- ============================================================
-- Adds employee_groups TEXT[] to allow an employee to belong
-- to multiple push groups simultaneously (e.g. reception + assistant).

ALTER TABLE push_subscriptions
    ADD COLUMN IF NOT EXISTS employee_groups TEXT[] DEFAULT NULL;

-- Backfill from existing employee_group single value
UPDATE push_subscriptions
SET employee_groups = ARRAY[employee_group]
WHERE employee_group IS NOT NULL
  AND employee_groups IS NULL;

-- Also add employee_groups to employees table so we can store this centrally
-- (push_subscriptions.employee_groups will be synced from here on subscribe)
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS push_groups TEXT[] DEFAULT NULL;

-- Backfill employees.push_groups from their existing position
UPDATE employees
SET push_groups = CASE
    WHEN lower(position) LIKE '%lekarz%' OR lower(position) LIKE '%doktor%'
        THEN ARRAY['doctor']
    WHEN lower(position) LIKE '%higienist%'
        THEN ARRAY['hygienist']
    WHEN lower(position) LIKE '%recepcj%'
        THEN ARRAY['reception']
    WHEN lower(position) LIKE '%asystent%'
        THEN ARRAY['assistant']
    ELSE NULL
END
WHERE position IS NOT NULL
  AND push_groups IS NULL;

-- Index for efficient array containment queries
CREATE INDEX IF NOT EXISTS idx_push_subs_employee_groups
    ON push_subscriptions USING GIN (employee_groups);

COMMENT ON COLUMN push_subscriptions.employee_groups IS
    'Array of push groups this employee subscription belongs to. Supports multi-group routing.';

COMMENT ON COLUMN employees.push_groups IS
    'Canonical push groups for this employee. Synced to push_subscriptions on next subscribe/update.';
