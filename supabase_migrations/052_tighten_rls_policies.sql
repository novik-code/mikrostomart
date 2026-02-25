-- Migration 052: Tighten Always-True RLS Policies
-- Addresses remaining 12 Supabase Security Advisor warnings:
--   "auth-users-exposed" / "rls-enabled-no-policy-true"
--
-- All tables in this migration are accessed ONLY by server-side API routes
-- using SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS entirely).
-- Therefore: drop USING(true) → replace with USING(false).
--
-- Exception: booking_settings.read kept public by design (booking form needs it).
-- Exception: google_reviews.read kept public (public cache, displayed on homepage).
-- Exception: site_settings.read kept public (ThemeEditor reads it client-side too).

-- ============================================================
-- employee_tasks — server API only (/api/employee/tasks/*)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_tasks' AND policyname = 'Allow all operations') THEN
    DROP POLICY "Allow all operations" ON employee_tasks;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_tasks' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON employee_tasks USING (false);
  END IF;
END $$;

-- ============================================================
-- push_subscriptions — server API only (/api/push/subscribe, /api/push/resubscribe)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Allow all') THEN
    DROP POLICY "Allow all" ON push_subscriptions;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Allow all operations') THEN
    DROP POLICY "Allow all operations" ON push_subscriptions;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON push_subscriptions USING (false);
  END IF;
END $$;

-- ============================================================
-- article_ideas — server API only (/api/cron/daily-article, /api/ask-expert)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'article_ideas' AND policyname = 'Allow all') THEN
    DROP POLICY "Allow all" ON article_ideas;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'article_ideas' AND policyname = 'Allow all operations') THEN
    DROP POLICY "Allow all operations" ON article_ideas;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'article_ideas' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON article_ideas USING (false);
  END IF;
END $$;

-- ============================================================
-- employee_calendar_tokens — server API only (/src/lib/googleCalendar.ts)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_calendar_tokens' AND policyname = 'Allow all') THEN
    DROP POLICY "Allow all" ON employee_calendar_tokens;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_calendar_tokens' AND policyname = 'Allow all operations') THEN
    DROP POLICY "Allow all operations" ON employee_calendar_tokens;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_calendar_tokens' AND policyname = 'service_only') THEN
    CREATE POLICY "service_only" ON employee_calendar_tokens USING (false);
  END IF;
END $$;

-- ============================================================
-- google_reviews — public read (shown on homepage), write server-only
-- Keep SELECT open (public cache), lock down everything else
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'google_reviews' AND policyname = 'Allow all') THEN
    DROP POLICY "Allow all" ON google_reviews;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'google_reviews' AND policyname = 'Allow all operations') THEN
    DROP POLICY "Allow all operations" ON google_reviews;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'google_reviews' AND policyname = 'public_read') THEN
    CREATE POLICY "public_read" ON google_reviews FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'google_reviews' AND policyname = 'service_write') THEN
    CREATE POLICY "service_write" ON google_reviews FOR INSERT WITH CHECK (false);
  END IF;
END $$;

-- ============================================================
-- site_settings — public read (ThemeEditor, theme CSS vars), write server-only
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_settings' AND policyname = 'Allow all') THEN
    DROP POLICY "Allow all" ON site_settings;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_settings' AND policyname = 'Allow all operations') THEN
    DROP POLICY "Allow all operations" ON site_settings;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_settings' AND policyname = 'public_read') THEN
    CREATE POLICY "public_read" ON site_settings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_settings' AND policyname = 'service_write') THEN
    CREATE POLICY "service_write" ON site_settings FOR INSERT WITH CHECK (false);
  END IF;
END $$;

-- ============================================================
-- booking_settings — public read (booking form), write admin API only
-- Already has policies from migration 050 — refresh just in case
-- ============================================================
DO $$ BEGIN
  -- Drop the overly-broad policy from migration 050 if it exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking_settings' AND policyname = 'booking_settings_read_public') THEN
    DROP POLICY "booking_settings_read_public" ON booking_settings;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking_settings' AND policyname = 'booking_settings_write_service') THEN
    DROP POLICY "booking_settings_write_service" ON booking_settings;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking_settings' AND policyname = 'public_read') THEN
    CREATE POLICY "public_read" ON booking_settings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking_settings' AND policyname = 'service_write') THEN
    CREATE POLICY "service_write" ON booking_settings FOR UPDATE WITH CHECK (false);
  END IF;
END $$;
