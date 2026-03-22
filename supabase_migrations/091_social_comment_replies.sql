-- Migration 091: Social Comment Replies — AI auto-reply to social media comments
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS social_comment_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('facebook','instagram','youtube')),
    platform_post_id TEXT,                -- platform-specific post ID (from social_posts.platform_post_ids)
    comment_id TEXT NOT NULL,             -- platform-native comment ID
    comment_text TEXT,                    -- original comment text
    comment_author TEXT,                  -- commenter display name
    comment_date TIMESTAMPTZ,             -- when the comment was posted
    reply_text TEXT,                      -- AI-generated reply
    reply_id TEXT,                        -- platform-native reply ID (after publishing)
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','approved','published','rejected','skipped')),
    ai_model TEXT,                        -- e.g. 'gpt-4o'
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE social_comment_replies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_comment_replies' AND policyname = 'service_only') THEN
        CREATE POLICY service_only ON social_comment_replies USING (false);
    END IF;
END $$;

-- Prevent duplicate replies to the same comment
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_comment_replies_unique
    ON social_comment_replies(platform, comment_id);

CREATE INDEX IF NOT EXISTS idx_social_comment_replies_post
    ON social_comment_replies(post_id);

CREATE INDEX IF NOT EXISTS idx_social_comment_replies_status
    ON social_comment_replies(status);
