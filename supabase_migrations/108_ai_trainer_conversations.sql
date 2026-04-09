-- 108: AI Trainer Persistent Conversation
-- Stores the never-ending education chat between admin and AI Trainer.
-- Each message is preserved with type metadata for style learning, KB proposals, etc.

CREATE TABLE IF NOT EXISTS ai_trainer_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'general' CHECK (message_type IN (
        'general',           -- regular instruction/question
        'style_example',     -- pair: AI draft + user correction
        'style_analysis',    -- AI's analysis of style differences
        'kb_proposal',       -- proposed KB changes (metadata has details)
        'kb_applied',        -- confirmed KB changes
        'kb_rejected'        -- rejected KB changes
    )),
    metadata JSONB DEFAULT '{}',   -- proposed_changes, style_diff, original_draft, corrected_version, etc.
    created_by TEXT,                -- admin email
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_trainer_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_trainer_messages' AND policyname = 'service_only_trainer') THEN
        CREATE POLICY service_only_trainer ON ai_trainer_messages FOR ALL USING (false);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trainer_messages_created ON ai_trainer_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_trainer_messages_type ON ai_trainer_messages(message_type);
