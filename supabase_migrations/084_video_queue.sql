-- Migration 084: Video processing queue for social media automation
-- Run in Supabase SQL Editor

-- ============================================================
-- social_video_queue — tracks video upload → process → publish pipeline
-- ============================================================
CREATE TABLE IF NOT EXISTS social_video_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Source video
    raw_video_url TEXT NOT NULL,
    raw_video_size INTEGER,               -- bytes
    raw_duration_seconds NUMERIC,         -- duration in seconds
    
    -- Processing status
    status TEXT NOT NULL DEFAULT 'uploaded'
        CHECK (status IN (
            'uploaded',       -- just uploaded, waiting for processing
            'transcribing',   -- Whisper is transcribing audio
            'analyzing',      -- GPT-4o Vision analyzing frames
            'generating',     -- GPT-4o generating title/desc/hashtags
            'rendering',      -- Shotstack rendering edited video
            'ready',          -- ready to publish (or manual review)
            'publishing',     -- publishing to platforms
            'done',           -- successfully published
            'failed'          -- something went wrong
        )),
    
    -- Transcription (Whisper)
    transcript TEXT,                      -- plain text transcript
    transcript_srt TEXT,                  -- SRT format with timestamps
    transcript_language TEXT DEFAULT 'pl',
    
    -- AI Analysis (GPT-4o Vision)
    ai_analysis JSONB,                    -- { topic, procedures, context, suggestions }
    frame_urls TEXT[],                    -- URLs of extracted frames
    
    -- Generated metadata
    title TEXT,                           -- catchy title/hook
    descriptions JSONB DEFAULT '{}',      -- { youtube: "...", tiktok: "...", instagram: "...", facebook: "..." }
    hashtags TEXT[],
    
    -- Shotstack rendering
    shotstack_render_id TEXT,
    processed_video_url TEXT,             -- final edited video URL
    shotstack_config JSONB,              -- saved timeline config
    
    -- Publishing
    social_post_id UUID REFERENCES social_posts(id) ON DELETE SET NULL,
    target_platform_ids UUID[],           -- which platforms to publish to
    publish_results JSONB,                -- { youtube: { success, post_id }, ... }
    
    -- Error tracking
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ
);

ALTER TABLE social_video_queue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_video_queue' AND policyname = 'service_only') THEN
        CREATE POLICY service_only ON social_video_queue USING (false);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_video_queue_status ON social_video_queue(status);
CREATE INDEX IF NOT EXISTS idx_video_queue_created ON social_video_queue(created_at DESC);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_video_queue_updated_at ON social_video_queue;
CREATE TRIGGER trg_video_queue_updated_at
    BEFORE UPDATE ON social_video_queue
    FOR EACH ROW EXECUTE FUNCTION update_social_updated_at();
