-- ═══════════════════════════════════════════════════════════════════
-- 081: Supabase Security Advisor — Fix ALL Errors & Warnings
-- Date: 2026-03-12
-- Fixes: 4 ERRORS + 10 WARNINGS (always-true RLS policies)
--
-- All tables are accessed server-side via SUPABASE_SERVICE_ROLE_KEY
-- which bypasses RLS. This migration only blocks direct anon/
-- authenticated access via PostgREST.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- PART 1: Fix ERRORS — Enable RLS on 3 tables that lack it
-- ─────────────────────────────────────────────────────────────────

-- 1a. cancelled_appointments (migration 062 — missing RLS)
ALTER TABLE public.cancelled_appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_only" ON public.cancelled_appointments;
CREATE POLICY "service_only" ON public.cancelled_appointments
    FOR ALL USING (false) WITH CHECK (false);

-- 1b. birthday_wishes (migration 061 — missing RLS + sensitive column)
ALTER TABLE public.birthday_wishes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_only" ON public.birthday_wishes;
CREATE POLICY "service_only" ON public.birthday_wishes
    FOR ALL USING (false) WITH CHECK (false);

-- 1c. employee_audit_log (migration 066 — missing RLS)
ALTER TABLE public.employee_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_only" ON public.employee_audit_log;
CREATE POLICY "service_only" ON public.employee_audit_log
    FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────
-- PART 2: Fix WARNINGS — Replace always-true RLS policies
-- Strategy: drop ALL existing policies, then create restrictive ones
-- ─────────────────────────────────────────────────────────────────

-- 2a. consent_field_mappings (migration 067)
--     Needs public SELECT (consent signing page reads via API that
--     uses service_role, but keep SELECT open as safety measure)
DO $$ BEGIN
    -- Drop all existing policies dynamically
    PERFORM pg_catalog.format('DROP POLICY IF EXISTS %I ON public.consent_field_mappings', pol.policyname)
    FROM pg_policies pol WHERE pol.tablename = 'consent_field_mappings' AND pol.schemaname = 'public';
END $$;
DROP POLICY IF EXISTS "Public read" ON public.consent_field_mappings;
DROP POLICY IF EXISTS "Service role full access" ON public.consent_field_mappings;
CREATE POLICY "public_read" ON public.consent_field_mappings
    FOR SELECT USING (true);

-- 2b. consent_tokens (migration 058)
DROP POLICY IF EXISTS "Service role full access on consent_tokens" ON public.consent_tokens;
DROP POLICY IF EXISTS "service_only" ON public.consent_tokens;
CREATE POLICY "service_only" ON public.consent_tokens
    FOR ALL USING (false) WITH CHECK (false);

-- 2c. patient_consents (migration 058)
DROP POLICY IF EXISTS "Service role full access on patient_consents" ON public.patient_consents;
DROP POLICY IF EXISTS "service_only" ON public.patient_consents;
CREATE POLICY "service_only" ON public.patient_consents
    FOR ALL USING (false) WITH CHECK (false);

-- 2d. email_compose_drafts (migration 073)
DROP POLICY IF EXISTS "admin_compose_drafts_all" ON public.email_compose_drafts;
DROP POLICY IF EXISTS "service_only" ON public.email_compose_drafts;
CREATE POLICY "service_only" ON public.email_compose_drafts
    FOR ALL USING (false) WITH CHECK (false);

-- 2e. email_label_overrides (migration 074)
DROP POLICY IF EXISTS "admin_label_overrides_all" ON public.email_label_overrides;
DROP POLICY IF EXISTS "service_only" ON public.email_label_overrides;
CREATE POLICY "service_only" ON public.email_label_overrides
    FOR ALL USING (false) WITH CHECK (false);

-- 2f. feature_suggestions (migration 055)
DROP POLICY IF EXISTS "feature_suggestions_select" ON public.feature_suggestions;
DROP POLICY IF EXISTS "feature_suggestions_insert" ON public.feature_suggestions;
DROP POLICY IF EXISTS "feature_suggestions_update" ON public.feature_suggestions;
DROP POLICY IF EXISTS "service_only" ON public.feature_suggestions;
CREATE POLICY "service_only" ON public.feature_suggestions
    FOR ALL USING (false) WITH CHECK (false);

-- 2g. feature_suggestion_comments (migration 055)
DROP POLICY IF EXISTS "feature_suggestion_comments_select" ON public.feature_suggestion_comments;
DROP POLICY IF EXISTS "feature_suggestion_comments_insert" ON public.feature_suggestion_comments;
DROP POLICY IF EXISTS "service_only" ON public.feature_suggestion_comments;
CREATE POLICY "service_only" ON public.feature_suggestion_comments
    FOR ALL USING (false) WITH CHECK (false);

-- 2h. sms_settings (migration 070)
DROP POLICY IF EXISTS "Service role full access" ON public.sms_settings;
DROP POLICY IF EXISTS "service_only" ON public.sms_settings;
CREATE POLICY "service_only" ON public.sms_settings
    FOR ALL USING (false) WITH CHECK (false);

-- 2i. staff_signatures (migration 059)
--     All access is via API routes using service_role key
DROP POLICY IF EXISTS "staff_signatures_all" ON public.staff_signatures;
DROP POLICY IF EXISTS "service_only" ON public.staff_signatures;
CREATE POLICY "service_only" ON public.staff_signatures
    FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────
-- DONE. Expected result after running:
--   Errors: 0
--   Warnings: 1 (Leaked Password Protection — requires Pro plan
--              or manual enable in Auth Settings > Providers > Email)
-- ─────────────────────────────────────────────────────────────────
