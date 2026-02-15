-- ============================================
-- Migration: Task Comments
-- ============================================
-- Date: 2026-02-14
-- Purpose: Allow team members to leave comments on tasks

CREATE TABLE IF NOT EXISTS task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES employee_tasks(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_name TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);

COMMENT ON TABLE task_comments IS 'Comments/discussion on employee tasks';
