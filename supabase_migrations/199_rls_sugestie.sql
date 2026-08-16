-- ============================================================================
-- Migracja 199 — RLS SUGESTII: koniec „TO authenticated USING (true)"
-- Data: 2026-08-16
-- Wejście: dług techniczny z CONTEXT (poz. 11) — „mig 055 ma RLS
--          TO authenticated USING (true), pracownik może zmienić status wprost
--          przez Supabase, omijając bramkę «tylko admin»"
--
-- ============================================================================
-- PROBLEM
-- ============================================================================
-- Migracja 055 nadała `feature_suggestions` i `feature_suggestion_comments`
-- polityki `FOR SELECT/INSERT/UPDATE TO authenticated USING (true)`.
--
-- „authenticated" w Supabase NIE ZNACZY „pracownik". Znaczy: ktokolwiek, kto ma
-- ważny token z tego projektu. Skutki, w kolejności rosnącej niemiłości:
--
--   • KAŻDY pracownik może przez klucz publiczny zmienić status dowolnej sugestii,
--     omijając bramkę „tylko admin", którą trzyma warstwa API;
--   • UPDATE bez `WITH CHECK` zawężającego pozwala też PRZEPISAĆ autora i treść;
--   • dopóki rejestracja w Supabase była otwarta, „authenticated" obejmowało
--     dowolną osobę z internetu. Rejestracja jest dziś WYŁĄCZONA (zweryfikowane
--     2026-07-28, `disable_signup: true`), więc to już nie jest dziura na zewnątrz —
--     ale opieranie bezpieczeństwa na jednym przełączniku w konsoli to nie model.
--
-- To ten sam wzorzec, który migracja 182 wycięła w czacie (`chat_messages`
-- i `chat_conversations`) i w `page_templates`. Sugestie wtedy pominięto.
--
-- ============================================================================
-- MECHANIZM
-- ============================================================================
-- Wracamy do zasady z `reference_supabase_rls_service_role`: dostęp ma WYŁĄCZNIE
-- rola serwisowa, czyli nasze API, które zna reguły biznesowe.
--
-- 🔑 Zakres wyszedł OSTRZEJSZY, niż zakładał plan, bo pomiar obalił moje własne
-- założenie. Chciałem zostawić odczyt personelowi przez `is_clinic_staff()`
-- (tak zrobiła migracja 182 dla czatu) — ale tam powodem był Realtime w panelu,
-- który respektuje RLS. Sprawdzone: sugestie **NIE MAJĄ Realtime**
-- (`SuggestionsTab.tsx` nie woła `channel()` ani `postgres_changes`, a tabela nie
-- jest w publikacji realtime). Skoro nikt nie czyta ich klientem, otwieranie
-- odczytu byłoby dziurą bez odbiorcy.
--
-- ⚠️ DOSTĘP KLIENCKI przestaje działać CAŁKOWICIE. ZWERYFIKOWANE, że nikt go nie
-- używa — sprawdzone w OBU repozytoriach, nie założone:
--   • panel `SuggestionsTab.tsx` → `fetch('/api/employee/suggestions')`,
--   • `lib/assistantActions.ts` → klient z **SUPABASE_SERVICE_ROLE_KEY**,
--   • apka → REST weba z Bearerem (`lib/suggestions.ts`, zero supabase-js).
--
-- ============================================================================
-- ODWRACALNOŚĆ
-- ============================================================================
-- Wycofanie = przywrócenie polityk z migracji 055 (na dole, zakomentowane).
-- ============================================================================

-- ── feature_suggestions ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "feature_suggestions_select" ON public.feature_suggestions;
DROP POLICY IF EXISTS "feature_suggestions_insert" ON public.feature_suggestions;
DROP POLICY IF EXISTS "feature_suggestions_update" ON public.feature_suggestions;

CREATE POLICY "feature_suggestions_service_all"
    ON public.feature_suggestions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ── feature_suggestion_comments ─────────────────────────────────────────────
DROP POLICY IF EXISTS "feature_suggestion_comments_select" ON public.feature_suggestion_comments;
DROP POLICY IF EXISTS "feature_suggestion_comments_insert" ON public.feature_suggestion_comments;
DROP POLICY IF EXISTS "feature_suggestion_comments_update" ON public.feature_suggestion_comments;

CREATE POLICY "feature_suggestion_comments_service_all"
    ON public.feature_suggestion_comments
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- KONTROLA PO WGRANIU
-- ============================================================================
-- 1) Zadna polityka nie jest juz otwarta dla samego „authenticated":
--    SELECT tablename, policyname, cmd, roles, qual
--    FROM pg_policies
--    WHERE tablename IN ('feature_suggestions','feature_suggestion_comments')
--    ORDER BY tablename, policyname;
--    -- oczekiwane: WYLACZNIE *_service_all (ALL, {service_role}); zero polityk
--    --             dla roli authenticated
--
-- 2) KONTROLA POZYTYWNA (aplikacja dziala): otworzyc ekran „Sugestie" w apce
--    i w panelu — lista sie laduje, zmiana statusu przez admina przechodzi.
--
-- 3) KONTROLA NEGATYWNA (dziura zamknieta): kontem pracownika, kluczem PUBLICZNYM
--    (anon), sprobowac SELECT i UPDATE statusu wprost przez PostgREST.
--    PRZED migracja: 204 i status realnie zmieniony.
--    PO migracji:    0 wierszy / 403.
--    🪤 Sam brak wyniku NIE WYSTARCZA — pusta odpowiedz wyglada tak samo przy
--    zamknietej tabeli i przy zlym zapytaniu. Dobic sprawdzeniem, ze ten sam
--    UPDATE rola serwisowa NADAL przechodzi.
--
-- ============================================================================
-- WYCOFANIE (stan sprzed migracji, z mig 055)
-- ============================================================================
-- CREATE POLICY "feature_suggestions_select" ON feature_suggestions FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "feature_suggestions_insert" ON feature_suggestions FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY "feature_suggestions_update" ON feature_suggestions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "feature_suggestion_comments_select" ON feature_suggestion_comments FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "feature_suggestion_comments_insert" ON feature_suggestion_comments FOR INSERT TO authenticated WITH CHECK (true);
