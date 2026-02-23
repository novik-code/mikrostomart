-- ============================================================
-- Migration 028: Private tasks + due_time + task_reminders
-- ============================================================

-- 1. Private tasks support
ALTER TABLE employee_tasks
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_user_id UUID;

-- Index for fast private-task lookups
CREATE INDEX IF NOT EXISTS idx_employee_tasks_owner
  ON employee_tasks(owner_user_id)
  WHERE is_private = true;

-- 2. Time-of-day for tasks (tasks can have a specific time, not just a date)
ALTER TABLE employee_tasks
  ADD COLUMN IF NOT EXISTS due_time TIME;

-- 3. Task reminders table (push notification scheduler)
CREATE TABLE IF NOT EXISTS task_reminders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES employee_tasks(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL,
  remind_at    TIMESTAMPTZ NOT NULL,
  reminded     BOOLEAN DEFAULT false,
  remind_type  TEXT DEFAULT 'push'  -- 'push' only for now
);

CREATE INDEX IF NOT EXISTS idx_task_reminders_pending
  ON task_reminders(remind_at)
  WHERE NOT reminded;

CREATE INDEX IF NOT EXISTS idx_task_reminders_task
  ON task_reminders(task_id);
