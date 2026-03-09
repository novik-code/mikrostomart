-- 076: Add ai_original_text to compose drafts
-- Preserves the original AI-generated text so that
-- AI learning options remain available after reloading a draft.

ALTER TABLE email_compose_drafts ADD COLUMN IF NOT EXISTS ai_original_text TEXT DEFAULT '';
