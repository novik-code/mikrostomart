-- ============================================
-- Migration: Task Edit History
-- ============================================
-- Date: 2026-02-14
-- Purpose: Track who changed what in tasks

CREATE TABLE IF NOT EXISTS task_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES employee_tasks(id) ON DELETE CASCADE,
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT now(),
    change_type TEXT NOT NULL,   -- 'edit' | 'status' | 'checklist'
    changes JSONB NOT NULL       -- { field: { old, new } } or { item: "label", done: bool }
);

CREATE INDEX idx_task_history_task_id ON task_history(task_id);

COMMENT ON TABLE task_history IS 'Audit log for task edits, status changes, and checklist toggles';
