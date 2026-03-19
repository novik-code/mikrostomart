-- Migration 083: Social Media Automation — 4 new tables
-- Run in Supabase SQL Editor

-- ============================================================
-- 1. social_platforms — connected social media accounts + tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS social_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL CHECK (platform IN ('facebook','instagram','tiktok','youtube')),
    account_name TEXT,
    account_id TEXT,                    -- page_id / channel_id / user_id
    account_url TEXT,                   -- direct link to profile
    content_type TEXT DEFAULT 'all' CHECK (content_type IN ('all','video','posts')),
    access_token TEXT,                  -- encrypted / raw token
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',         -- platform-specific settings
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE social_platforms ENABLE ROW LEVEL SECURITY;

-- Service-role only (all access via API routes)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_platforms' AND policyname = 'service_only') THEN
        CREATE POLICY service_only ON social_platforms USING (false);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_social_platforms_platform ON social_platforms(platform);

-- ============================================================
-- 2. social_schedules — automated posting schedules
-- ============================================================
CREATE TABLE IF NOT EXISTS social_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                 -- e.g. "Dzienny post FB"
    platform_ids UUID[] NOT NULL,      -- references social_platforms.id
    content_type TEXT NOT NULL CHECK (content_type IN ('post_text_image','video_short','carousel')),
    ai_prompt TEXT,                     -- system prompt for AI generation
    frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','custom')),
    cron_expression TEXT,               -- e.g. "0 10 * * *"
    preferred_hour INTEGER DEFAULT 10,  -- hour of day to publish
    preferred_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}', -- days of week
    is_active BOOLEAN DEFAULT true,
    auto_publish BOOLEAN DEFAULT false, -- true = publish without manual approval
    last_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE social_schedules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_schedules' AND policyname = 'service_only') THEN
        CREATE POLICY service_only ON social_schedules USING (false);
    END IF;
END $$;

-- ============================================================
-- 3. social_posts — generated / scheduled posts
-- ============================================================
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES social_schedules(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('generating','draft','approved','publishing','published','failed','rejected')),
    platform_ids UUID[],               -- target platforms
    content_type TEXT NOT NULL,
    -- Content
    text_content TEXT,                  -- generated text body
    hashtags TEXT[],
    image_url TEXT,                     -- Supabase Storage URL
    video_url TEXT,                     -- Supabase Storage URL
    thumbnail_url TEXT,
    -- AI metadata
    ai_model TEXT,
    ai_prompt_used TEXT,
    -- Publishing
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    platform_post_ids JSONB DEFAULT '{}',  -- { "facebook": "123", "instagram": "456" }
    publish_errors JSONB DEFAULT '[]',
    -- Admin
    edited_by TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'service_only') THEN
        CREATE POLICY service_only ON social_posts USING (false);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(scheduled_for) WHERE status IN ('approved','publishing');

-- ============================================================
-- 4. social_media_library — uploaded media assets
-- ============================================================
CREATE TABLE IF NOT EXISTS social_media_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('image','video')),
    file_name TEXT,
    file_size INTEGER,
    duration_seconds INTEGER,           -- for video files
    tags TEXT[],
    description TEXT,
    is_used BOOLEAN DEFAULT false,
    used_in_post_id UUID REFERENCES social_posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE social_media_library ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_media_library' AND policyname = 'service_only') THEN
        CREATE POLICY service_only ON social_media_library USING (false);
    END IF;
END $$;

-- ============================================================
-- Updated_at trigger for tables that need it
-- ============================================================
CREATE OR REPLACE FUNCTION update_social_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_social_platforms_updated_at ON social_platforms;
CREATE TRIGGER trg_social_platforms_updated_at
    BEFORE UPDATE ON social_platforms
    FOR EACH ROW EXECUTE FUNCTION update_social_updated_at();

DROP TRIGGER IF EXISTS trg_social_posts_updated_at ON social_posts;
CREATE TRIGGER trg_social_posts_updated_at
    BEFORE UPDATE ON social_posts
    FOR EACH ROW EXECUTE FUNCTION update_social_updated_at();
