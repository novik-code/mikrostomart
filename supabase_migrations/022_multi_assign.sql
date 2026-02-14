-- ============================================
-- Migration: Multi-employee assignment
-- ============================================
-- Date: 2026-02-14
-- Purpose: Allow assigning tasks to multiple employees
-- Also: extend checklist items with checked_by info (handled in JSONB)

-- Add assigned_to JSONB column
ALTER TABLE employee_tasks
ADD COLUMN IF NOT EXISTS assigned_to JSONB DEFAULT '[]'::jsonb;

-- Migrate existing single assignments to the new array format
UPDATE employee_tasks
SET assigned_to = jsonb_build_array(
    jsonb_build_object('id', assigned_to_doctor_id, 'name', assigned_to_doctor_name)
)
WHERE assigned_to_doctor_id IS NOT NULL
  AND (assigned_to IS NULL OR assigned_to = '[]'::jsonb);

COMMENT ON COLUMN employee_tasks.assigned_to IS 'Array of {id, name} objects for multi-employee assignment';
