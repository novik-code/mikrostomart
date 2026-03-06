-- 072: AI Email Assistant Training & Configuration
-- Adds sender rules, training instructions, feedback/learning tables
-- + extra columns on email_ai_drafts for ratings and tags

-- ─── 1. Sender Rules ─────────────────────────────────────────
-- Controls which senders get AI draft generation (include/exclude)

CREATE TABLE IF NOT EXISTS email_ai_sender_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_pattern TEXT NOT NULL,          -- e.g. '*@gmail.com', 'jan@wp.pl'
    rule_type TEXT NOT NULL DEFAULT 'exclude' CHECK (rule_type IN ('include', 'exclude')),
    note TEXT,                            -- admin annotation
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_ai_sender_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_ai_sender_rules' AND policyname = 'service_only') THEN
        CREATE POLICY service_only ON email_ai_sender_rules FOR ALL USING (false);
    END IF;
END $$;

-- ─── 2. Training Instructions ────────────────────────────────
-- Free-text instructions that shape AI behavior

CREATE TABLE IF NOT EXISTS email_ai_instructions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instruction TEXT NOT NULL,
    category TEXT DEFAULT 'other' CHECK (category IN ('tone', 'content', 'rules', 'style', 'other')),
    is_active BOOLEAN DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_ai_instructions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_ai_instructions' AND policyname = 'service_only') THEN
        CREATE POLICY service_only ON email_ai_instructions FOR ALL USING (false);
    END IF;
END $$;

-- ─── 3. Feedback / Learning ─────────────────────────────────
-- Stores admin corrections with AI analysis of what changed

CREATE TABLE IF NOT EXISTS email_ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID REFERENCES email_ai_drafts(id) ON DELETE SET NULL,
    original_draft_html TEXT NOT NULL,
    corrected_draft_html TEXT NOT NULL,
    feedback_note TEXT,                   -- admin's optional note about what was wrong
    ai_analysis TEXT,                     -- GPT's analysis of corrections
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_ai_feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_ai_feedback' AND policyname = 'service_only') THEN
        CREATE POLICY service_only ON email_ai_feedback FOR ALL USING (false);
    END IF;
END $$;

-- ─── 4. Extra columns on email_ai_drafts ─────────────────────

-- Rating (1-5 stars)
DO $$ BEGIN
    ALTER TABLE email_ai_drafts ADD COLUMN admin_rating INTEGER CHECK (admin_rating >= 1 AND admin_rating <= 5);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Quick feedback tags
DO $$ BEGIN
    ALTER TABLE email_ai_drafts ADD COLUMN admin_tags TEXT[] DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Update status CHECK to include 'learned'
ALTER TABLE email_ai_drafts DROP CONSTRAINT IF EXISTS email_ai_drafts_status_check;
ALTER TABLE email_ai_drafts ADD CONSTRAINT email_ai_drafts_status_check
    CHECK (status IN ('pending', 'approved', 'sent', 'rejected', 'learned'));

-- ─── 5. Indexes ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ai_sender_rules_pattern ON email_ai_sender_rules(email_pattern);
CREATE INDEX IF NOT EXISTS idx_ai_instructions_active ON email_ai_instructions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created ON email_ai_feedback(created_at DESC);
