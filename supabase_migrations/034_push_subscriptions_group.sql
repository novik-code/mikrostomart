-- ============================================
-- Migration: Add employee_group to push_subscriptions
-- ============================================
-- Date: 2026-02-23
-- Purpose: Allow targeted push notifications by employee sub-group.
--          Groups: doctor | hygienist | reception | assistant
--          (null for patients/admin who don't have a sub-group)

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS employee_group TEXT
    CHECK (employee_group IN ('doctor', 'hygienist', 'reception', 'assistant'));

-- Index for fast group-targeting queries
CREATE INDEX IF NOT EXISTS idx_push_subs_group
    ON push_subscriptions (user_type, employee_group);

-- Also update employee_group for all existing subscriptions
-- based on the position stored in the employees table
UPDATE push_subscriptions ps
SET employee_group = CASE
    WHEN e.position ILIKE '%lekarz%' OR e.position ILIKE '%doktor%' THEN 'doctor'
    WHEN e.position ILIKE '%higienist%'                              THEN 'hygienist'
    WHEN e.position ILIKE '%recep%'                                  THEN 'reception'
    WHEN e.position ILIKE '%asysta%' OR e.position ILIKE '%asystentka%' THEN 'assistant'
    ELSE NULL
END
FROM employees e
WHERE ps.user_type = 'employee'
  AND e.user_id::text = ps.user_id;

COMMENT ON COLUMN push_subscriptions.employee_group IS
    'Employee sub-group for targeted push: doctor | hygienist | reception | assistant (null for patients/admins)';
