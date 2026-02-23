-- Migration 044: Assistant Memory (user knowledge base)
-- Stores per-user facts/preferences that the AI assistant learns over time
-- e.g. home address, preferred reminder times, frequently used task types

CREATE TABLE IF NOT EXISTS assistant_memory (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    facts       jsonb NOT NULL DEFAULT '{}',
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- One memory row per user
CREATE UNIQUE INDEX IF NOT EXISTS assistant_memory_user_id_idx ON assistant_memory(user_id);

-- RLS: users can only see and modify their own memory
ALTER TABLE assistant_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assistant_memory_owner"
    ON assistant_memory FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role bypasses RLS (for server-side writes with service key)
-- No additional policy needed — service_role is exempt from RLS
