-- Migration 132: RLS lockdown for tables leaking to anon REST
-- =============================================================
-- Audyt bezpieczeństwa 2026-05-18 (P0): anon REST zwracał rekordy
-- z care_enrollments, care_tasks, care_audit_log, fcm_tokens, ai_conversations
-- przez `FOR ALL USING (true) WITH CHECK (true)` bez `TO service_role`.
--
-- Fix: drop wadliwe policies, recreate jako `TO service_role`.
-- Service role bypassuje RLS przez `BYPASSRLS` atrybut roli — wszystkie
-- callsite'y w app używają SUPABASE_SERVICE_ROLE_KEY (zweryfikowane S10-1).
--
-- Po wgraniu: anon REST dla tych tabel musi zwracać 401/403/0 rows.
-- Idempotentne (DROP IF EXISTS + CREATE).

BEGIN;

-- ============================================================
-- 1. care_* tables (migracja 110)
-- ============================================================

DROP POLICY IF EXISTS care_templates_service ON care_templates;
CREATE POLICY care_templates_service_only ON care_templates
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS care_template_steps_service ON care_template_steps;
CREATE POLICY care_template_steps_service_only ON care_template_steps
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS care_enrollments_service ON care_enrollments;
CREATE POLICY care_enrollments_service_only ON care_enrollments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS care_tasks_service ON care_tasks;
CREATE POLICY care_tasks_service_only ON care_tasks
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS care_audit_log_service ON care_audit_log;
CREATE POLICY care_audit_log_service_only ON care_audit_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 2. fcm_tokens (migracja 104)
-- ============================================================

DROP POLICY IF EXISTS fcm_tokens_service_all ON fcm_tokens;
CREATE POLICY fcm_tokens_service_only ON fcm_tokens
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- push_notifications_log: insert policy też była dziurawa (WITH CHECK (true) bez TO service_role)
DROP POLICY IF EXISTS push_log_insert_service ON push_notifications_log;
CREATE POLICY push_log_insert_service_only ON push_notifications_log
    FOR INSERT TO service_role WITH CHECK (true);
-- push_log_select_own (FOR SELECT USING user_id = auth.uid()::text) zostaje — to poprawny pattern (filtering by auth.uid())

-- ============================================================
-- 3. ai_conversations (migracja 127)
-- ============================================================

DROP POLICY IF EXISTS "Service role full access on ai_conversations" ON ai_conversations;
CREATE POLICY ai_conversations_service_only
    ON ai_conversations FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ============================================================
-- 4. Verify RLS is enabled on all affected tables
-- ============================================================
ALTER TABLE care_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================
-- Post-deploy verification (manual)
-- ============================================================
-- Run from local machine z anon key (NIE service role):
--   curl "$SUPABASE_URL/rest/v1/care_enrollments?select=id&limit=1" \
--        -H "apikey: $SUPABASE_ANON_KEY" \
--        -H "Authorization: Bearer $SUPABASE_ANON_KEY"
-- Expected: [] (pusta tablica) lub 401/403.
-- Repeat dla: care_tasks, care_audit_log, fcm_tokens, ai_conversations.
--
-- App callers używają SUPABASE_SERVICE_ROLE_KEY → BYPASSRLS → działa bez zmian.
