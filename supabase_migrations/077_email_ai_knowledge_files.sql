-- 077: AI Knowledge Files
-- Stores parsed text from uploaded PDF/text files for AI knowledge base expansion

CREATE TABLE IF NOT EXISTS email_ai_knowledge_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    content_text TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_ai_knowledge_files ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_ai_knowledge_files' AND policyname = 'service_only_knowledge') THEN
        CREATE POLICY service_only_knowledge ON email_ai_knowledge_files FOR ALL USING (false);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_files_created ON email_ai_knowledge_files(created_at DESC);
