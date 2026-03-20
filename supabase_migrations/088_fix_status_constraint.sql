-- Migration 088: Update status check constraint for new pipeline statuses
-- Must be run IMMEDIATELY — the new pipeline code uses these statuses

ALTER TABLE social_video_queue DROP CONSTRAINT IF EXISTS social_video_queue_status_check;

ALTER TABLE social_video_queue ADD CONSTRAINT social_video_queue_status_check 
CHECK (status IN (
    'uploaded',
    'transcribing',
    'transcribed',
    'analyzing',
    'analyzed',
    'generating',
    'compressed',
    'captioning',
    'review',
    'ready',
    'publishing',
    'done',
    'failed',
    'rendering'
));
