-- Migration 051: RLS Security Fixes
-- Addresses Supabase Security Advisor warnings (22 errors, 16 warnings)
-- Received security alert on 2026-02-25.
--
-- Strategy:
--   - Tables accessed ONLY via server-side API routes (service_role key):
--       ENABLE RLS + POLICY "service_only" USING (false)
--       service_role BYPASSES RLS so server API routes continue working normally.
--   - Tables accessed via browser client (AdminChat.tsx uses createBrowserClient):
--       ENABLE RLS + POLICY "authenticated_only" USING (auth.role() = 'authenticated')
--
-- NO application code changes required.

-- ============================================================
-- PRIORITY 1: Security-critical tables
-- ============================================================

-- Token tables — NEVER accessible from browser, only via server API
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'email_verification_tokens' AND policyname = 'service_only'
  ) THEN
    CREATE POLICY "service_only" ON email_verification_tokens USING (false);
  END IF;
END $$;

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'password_reset_tokens' AND policyname = 'service_only'
  ) THEN
    CREATE POLICY "service_only" ON password_reset_tokens USING (false);
  END IF;
END $$;

-- Chat tables — AdminChat.tsx uses createBrowserClient (anon key after login)
-- Must allow authenticated users (admin is always authenticated)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_messages' AND policyname = 'authenticated_only'
  ) THEN
    CREATE POLICY "authenticated_only" ON chat_messages USING (auth.role() = 'authenticated');
  END IF;
END $$;

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_conversations' AND policyname = 'authenticated_only'
  ) THEN
    CREATE POLICY "authenticated_only" ON chat_conversations USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================
-- PRIORITY 2: Remaining tables (all server-only, service_role)
-- ============================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON user_roles USING (false);
  END IF;
END $$;

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON employees USING (false);
  END IF;
END $$;

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patients' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON patients USING (false);
  END IF;
END $$;

ALTER TABLE appointment_actions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointment_actions' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON appointment_actions USING (false);
  END IF;
END $$;

ALTER TABLE appointment_instructions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'appointment_instructions' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON appointment_instructions USING (false);
  END IF;
END $$;

ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_history' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON task_history USING (false);
  END IF;
END $$;

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_comments' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON task_comments USING (false);
  END IF;
END $$;

ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_labels' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON task_labels USING (false);
  END IF;
END $$;

ALTER TABLE task_label_assignments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_label_assignments' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON task_label_assignments USING (false);
  END IF;
END $$;

ALTER TABLE task_type_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_type_templates' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON task_type_templates USING (false);
  END IF;
END $$;

ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_reminders' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON task_reminders USING (false);
  END IF;
END $$;

ALTER TABLE push_notification_config ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_notification_config' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON push_notification_config USING (false);
  END IF;
END $$;

ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'short_links' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON short_links USING (false);
  END IF;
END $$;

-- ============================================================
-- PRIORITY 3: Fix mutable search_path in trigger functions
-- These functions only update updated_at timestamps — safe to fix
-- ============================================================

CREATE OR REPLACE FUNCTION update_appointment_actions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_sms_reminders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_appointment_instructions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_short_links_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
