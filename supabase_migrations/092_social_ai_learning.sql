-- Migration 092: AI Learning from Post Edits
-- Adds columns to track original AI text and edit feedback,
-- plus a style notes table for persistent AI preferences.

-- ============================================================
-- 1. Add learning columns to social_posts
-- ============================================================
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS original_ai_text TEXT;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS edit_feedback TEXT;

-- ============================================================
-- 2. Style notes table — persistent AI preferences from edits
-- ============================================================
CREATE TABLE IF NOT EXISTS social_ai_style_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note TEXT NOT NULL,
    category TEXT DEFAULT 'ogólne',
    source_post_id UUID REFERENCES social_posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE social_ai_style_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_ai_style_notes' AND policyname = 'service_only') THEN
        CREATE POLICY service_only ON social_ai_style_notes USING (false);
    END IF;
END $$;
