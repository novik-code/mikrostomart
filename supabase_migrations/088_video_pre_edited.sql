-- Migration 088: Add pre-edited flag for fast-track auto-publish workflow
-- When is_pre_edited = true, pipeline skips compress/caption/review and auto-publishes

ALTER TABLE social_video_queue
ADD COLUMN IF NOT EXISTS is_pre_edited BOOLEAN DEFAULT false;

COMMENT ON COLUMN social_video_queue.is_pre_edited IS 'When true, video is already edited (e.g. from Captions mobile app). Pipeline skips compression, captioning, and review — auto-publishes after transcription + AI analysis.';
