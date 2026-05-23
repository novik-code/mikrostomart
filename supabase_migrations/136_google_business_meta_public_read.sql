-- 136 (2026-05-23): hotfix mig 135 — public read policy dla google_business_meta
--
-- Problem znaleziony po deploy mig 135:
-- `getAggregateRating()` w src/lib/seo.ts używa `supabase` client z
-- src/lib/supabaseClient.ts który ma ANON KEY (NEXT_PUBLIC_SUPABASE_ANON_KEY).
-- Mig 135 ustawiła policy `FOR ALL TO service_role` → anon nie ma SELECT.
-- Skutek: query zwraca null → schema bez aggregateRating mimo że row 278/4.5
-- siedzi w tabeli.
--
-- Fix: dodać public_read policy (FOR SELECT USING true) — same pattern co
-- google_reviews (mig 052/053). To safe bo:
-- - Dane public-by-design (i tak są w Google Business Profile + na homepage UI)
-- - Tylko 2 liczby (count + avg), brak PII
-- - Service_role nadal exclusive na writes (cron ze service key)
--
-- Idempotent: DROP IF EXISTS + CREATE.

DROP POLICY IF EXISTS google_business_meta_public_read ON google_business_meta;
CREATE POLICY google_business_meta_public_read ON google_business_meta
    FOR SELECT
    USING (true);
