-- Migration 053: Fix remaining RLS warnings after 051/052
--
-- Root cause: USING(false) without explicit WITH CHECK(false) leaves INSERT
-- operations open. Also some old policy names weren't caught by DROP in 052.
--
-- Clean solution:
--   Service-only tables: DROP ALL policies → RLS enabled + no policies
--     → anon/authenticated: denied (no matching policy)
--     → service_role: ALWAYS bypasses RLS → still works
--   Public-read tables: ONE policy FOR SELECT USING(true) only
--     → anon can SELECT, cannot INSERT/UPDATE/DELETE
--     → service_role: bypasses RLS, can do everything
--
-- Also fixes 3 missing search_path functions.

-- ============================================================
-- Helper: drop ALL policies on a table cleanly
-- ============================================================

-- employee_tasks
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'employee_tasks' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.employee_tasks';
  END LOOP;
END $$;

-- push_subscriptions
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'push_subscriptions' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.push_subscriptions';
  END LOOP;
END $$;

-- article_ideas (had legacy "Enable insert for everyone" policy)
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'article_ideas' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.article_ideas';
  END LOOP;
END $$;

-- employee_calendar_tokens
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'employee_calendar_tokens' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.employee_calendar_tokens';
  END LOOP;
END $$;

-- google_reviews — service-only writes, but keep public SELECT below
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'google_reviews' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.google_reviews';
  END LOOP;
END $$;

-- site_settings — public SELECT only
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'site_settings' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.site_settings';
  END LOOP;
END $$;

-- booking_settings — public SELECT only
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'booking_settings' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.booking_settings';
  END LOOP;
END $$;

-- ============================================================
-- Service-only tables: RLS enabled, NO policies
-- (no policies = anon/authenticated denied; service_role bypasses RLS)
-- ============================================================

-- employee_tasks: no policies needed
ALTER TABLE employee_tasks ENABLE ROW LEVEL SECURITY;

-- push_subscriptions: no policies needed
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- article_ideas: no policies needed
ALTER TABLE article_ideas ENABLE ROW LEVEL SECURITY;

-- employee_calendar_tokens: no policies needed
ALTER TABLE employee_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Public-read tables: ONE policy FOR SELECT USING(true)
-- No INSERT/UPDATE/DELETE policies → only service_role can write
-- ============================================================

-- google_reviews: public read (shown on homepage), service writes cache
ALTER TABLE google_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON google_reviews FOR SELECT USING (true);

-- site_settings: public read (theme colors), service writes
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON site_settings FOR SELECT USING (true);

-- booking_settings: public read (booking form), service writes
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON booking_settings FOR SELECT USING (true);

-- ============================================================
-- Fix Function Search Path Mutable (3 remaining functions)
-- ============================================================

-- Generic updated_at trigger used by multiple tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
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

-- Cleanup function for expired password reset tokens
CREATE OR REPLACE FUNCTION clean_expired_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM password_reset_tokens WHERE expires_at < NOW();
END;
$$;

-- Cleanup function for expired email verification tokens
CREATE OR REPLACE FUNCTION clean_expired_verification_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM email_verification_tokens WHERE expires_at < NOW();
END;
$$;
