-- Add captions_video_id column for Captions/Mirage API integration
ALTER TABLE social_video_queue ADD COLUMN IF NOT EXISTS captions_video_id text;
