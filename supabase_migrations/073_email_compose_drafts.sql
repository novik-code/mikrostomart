-- Migration: email_compose_drafts table
-- Stores draft messages being composed by users

CREATE TABLE IF NOT EXISTS email_compose_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  to_address text DEFAULT '',
  cc_address text DEFAULT '',
  subject text DEFAULT '',
  body text DEFAULT '',
  in_reply_to text DEFAULT '',
  "references" text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_email_compose_drafts_user ON email_compose_drafts(user_id);

-- RLS
ALTER TABLE email_compose_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_compose_drafts_all" ON email_compose_drafts
  FOR ALL USING (true) WITH CHECK (true);
