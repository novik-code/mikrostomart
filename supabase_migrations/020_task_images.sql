-- ============================================
-- Migration: Task Images
-- ============================================
-- Date: 2026-02-14
-- Purpose: Add image_url column to employee_tasks

ALTER TABLE employee_tasks 
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Note: Also create a Supabase Storage bucket 'task-images' 
-- with public access via the Supabase Dashboard:
-- Storage → New Bucket → Name: task-images → Public: ON
