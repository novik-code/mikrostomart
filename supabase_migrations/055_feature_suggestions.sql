-- Migration 055: Feature Suggestions
-- Allows employees to post feature suggestions/improvements visible to all staff

CREATE TABLE IF NOT EXISTS feature_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_email TEXT NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'funkcja', -- 'funkcja' | 'poprawka' | 'pomysł' | 'inny'
    status TEXT NOT NULL DEFAULT 'nowa', -- 'nowa' | 'w_dyskusji' | 'zaplanowana' | 'wdrożona' | 'odrzucona'
    upvotes TEXT[] DEFAULT '{}', -- array of emails that upvoted
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments on suggestions
CREATE TABLE IF NOT EXISTS feature_suggestion_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_id UUID NOT NULL REFERENCES feature_suggestions(id) ON DELETE CASCADE,
    author_email TEXT NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE feature_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_suggestion_comments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "feature_suggestions_select" ON feature_suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "feature_suggestions_insert" ON feature_suggestions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "feature_suggestions_update" ON feature_suggestions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "feature_suggestion_comments_select" ON feature_suggestion_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "feature_suggestion_comments_insert" ON feature_suggestion_comments FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX idx_feature_suggestions_created ON feature_suggestions(created_at DESC);
CREATE INDEX idx_feature_suggestion_comments_suggestion ON feature_suggestion_comments(suggestion_id, created_at);
