-- ============================================
-- Migration: Task Types + Checklist Items
-- ============================================
-- Date: 2026-02-14
-- Purpose: Add task_type and checklist_items columns to employee_tasks.

-- 1. Add columns
ALTER TABLE employee_tasks 
  ADD COLUMN IF NOT EXISTS task_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS checklist_items JSONB DEFAULT '[]';

-- 2. Fix assigned_to_doctor_name: replace emails with real names from employees table
UPDATE employee_tasks t
SET assigned_to_doctor_name = e.name
FROM employees e
WHERE t.assigned_to_doctor_name = e.email
  AND e.name != e.email;

-- 3. Verification
SELECT id, title, task_type, checklist_items, assigned_to_doctor_name
FROM employee_tasks
ORDER BY created_at DESC
LIMIT 10;
