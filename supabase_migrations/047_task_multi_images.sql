-- Migration 047: Multi-image support for employee tasks
-- Date: 2026-02-24
-- Purpose: Add image_urls array column to support multiple photos per task.
--          Existing image_url column kept for backward compatibility.
--          Client-side compression (Canvas → JPEG <200KB) handles storage efficiency.

ALTER TABLE employee_tasks
    ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Migrate existing image_url values into image_urls array (non-destructive)
UPDATE employee_tasks
    SET image_urls = ARRAY[image_url]
    WHERE image_url IS NOT NULL
      AND (image_urls IS NULL OR image_urls = '{}');

COMMENT ON COLUMN employee_tasks.image_urls IS 'Array of image URLs uploaded to Supabase Storage. Client-side compressed to <200KB JPEG before upload.';
COMMENT ON COLUMN employee_tasks.image_url IS 'Legacy single image URL — kept for backward compat. New code uses image_urls array.';
