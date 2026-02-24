-- Migration 049: Add google_event_id to employee_tasks
-- Enables bidirectional sync: deleting a task also removes its Google Calendar event

ALTER TABLE employee_tasks
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;

COMMENT ON COLUMN employee_tasks.google_event_id IS
  'Google Calendar event ID linked to this task. Set by AI assistant when creating tasks with due_date. Used to delete the calendar event when the task is deleted.';
