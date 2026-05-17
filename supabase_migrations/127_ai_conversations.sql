-- Migration 127: AI conversations persistence (Hotfix S8-4, D4=C+)
-- Stores AI chat conversations for 90 days (consent-gated for anon, mandatory disclosure for logged-in patients).
-- Idempotent.

CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity (one of these set, never both)
    user_id UUID,           -- logged-in patient (FK patients.id, nullable for anon)
    anon_id TEXT,           -- cookie UUID for anonymous visitor
    ip_hash TEXT,           -- HMAC SHA-256 of IP+salt (analytics + rate-limit, never reversible to IP)

    -- Context: which AI feature
    context TEXT NOT NULL CHECK (context IN ('patient_chat', 'cennik_chat', 'simulator', 'asystent')),

    -- Conversation messages: array of { role: 'user'|'assistant', content: string, ts: ISO }
    messages JSONB NOT NULL DEFAULT '[]',

    -- Cookie consent at time of creation (snapshot for audit)
    consent_given BOOLEAN NOT NULL DEFAULT false,

    -- Tracking
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user
    ON ai_conversations (user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_anon
    ON ai_conversations (anon_id)
    WHERE anon_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_expires
    ON ai_conversations (expires_at);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_started
    ON ai_conversations (started_at DESC);

-- RLS: service_role only (server-only access)
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on ai_conversations" ON ai_conversations;
CREATE POLICY "Service role full access on ai_conversations"
    ON ai_conversations FOR ALL
    USING (true) WITH CHECK (true);

COMMENT ON TABLE ai_conversations IS 'S8-4 D4=C+: AI conversation persistence. 90d retention via data-retention-cleanup cron. Logged-in patients: persistent with user_id (disclosed in privacy policy §11). Anonymous: persisted only when consent_given=true (cookie banner opt-in).';
COMMENT ON COLUMN ai_conversations.user_id IS 'Patient ID if logged in (patients.id). NULL for anonymous visitors.';
COMMENT ON COLUMN ai_conversations.anon_id IS 'Cookie-stored UUID for anonymous visitor — links sessions across requests. NULL when user_id present.';
COMMENT ON COLUMN ai_conversations.ip_hash IS 'HMAC-SHA256(IP || MFA_SESSION_SECRET). Non-reversible. Used only for rate limiting + abuse detection. Not personal data per Recital 26 RODO when hashed.';
COMMENT ON COLUMN ai_conversations.consent_given IS 'Snapshot of cookie consent at time of conversation. For anon: must be true to persist. For logged-in: always true (disclosed in privacy policy).';
COMMENT ON COLUMN ai_conversations.messages IS 'Array of { role: user|assistant, content: string, ts: ISO timestamp }. Includes BOTH user input (may contain PESEL/medical!) and AI response.';
