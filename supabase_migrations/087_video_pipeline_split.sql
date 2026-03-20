-- Add compressed_video_url column and new pipeline statuses
-- Migration 087: Video pipeline split for Vercel timeout handling

ALTER TABLE social_video_queue 
ADD COLUMN IF NOT EXISTS compressed_video_url text;

COMMENT ON COLUMN social_video_queue.compressed_video_url IS 'URL of compressed video in Supabase Storage (used as intermediate step before Captions API submission)';
