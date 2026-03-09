-- Migration: email_label_overrides table
-- Allows manual label reassignment for emails (overrides classifyEmail algorithm)

CREATE TABLE IF NOT EXISTS email_label_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_uid integer NOT NULL,
  email_folder text NOT NULL DEFAULT 'INBOX',
  label text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(email_uid, email_folder)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_email_label_overrides_uid ON email_label_overrides(email_uid, email_folder);

-- RLS
ALTER TABLE email_label_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_label_overrides_all" ON email_label_overrides
  FOR ALL USING (true) WITH CHECK (true);
