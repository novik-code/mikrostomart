-- ============================================
-- Migration: Task Labels
-- ============================================
-- Date: 2026-02-14
-- Purpose: Custom colored labels/tags for tasks

CREATE TABLE IF NOT EXISTS task_labels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#38bdf8',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Junction table for many-to-many
CREATE TABLE IF NOT EXISTS task_label_assignments (
    task_id UUID NOT NULL REFERENCES employee_tasks(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES task_labels(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, label_id)
);

CREATE INDEX idx_task_label_assignments_task_id ON task_label_assignments(task_id);
CREATE INDEX idx_task_label_assignments_label_id ON task_label_assignments(label_id);

-- Seed some default labels
INSERT INTO task_labels (name, color) VALUES
    ('Pilne', '#ef4444'),
    ('Laboratorium', '#a855f7'),
    ('Oczekuje', '#f59e0b'),
    ('Zamówienie', '#3b82f6'),
    ('Gotowe do odbioru', '#22c55e')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE task_labels IS 'Custom colored labels/tags for tasks';
COMMENT ON TABLE task_label_assignments IS 'Many-to-many junction between tasks and labels';
