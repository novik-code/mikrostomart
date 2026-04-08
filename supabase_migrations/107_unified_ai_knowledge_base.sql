-- ============================================================
-- 107: Unified AI Knowledge Base
-- Structured, editable AI knowledge base for the unified assistant.
-- Each section covers a domain and is tagged with relevant contexts.
-- ============================================================

-- Main KB table
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    context_tags TEXT[] DEFAULT '{}',
    priority INT DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- History / audit trail
CREATE TABLE IF NOT EXISTS ai_knowledge_base_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section TEXT NOT NULL,
    old_content TEXT,
    new_content TEXT NOT NULL,
    change_reason TEXT,
    changed_by TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_base_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_kb" ON ai_knowledge_base FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_kb_history" ON ai_knowledge_base_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_section ON ai_knowledge_base(section);
CREATE INDEX IF NOT EXISTS idx_kb_active ON ai_knowledge_base(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_kb_history_section ON ai_knowledge_base_history(section);
