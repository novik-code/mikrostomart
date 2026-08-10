-- ============================================================================
-- Migracja 190 — domknięcie RLS: sms_reminders + rozbrojenie min z 055 i 096
-- Data: 2026-08-06
-- Wejście: audyt bezpieczeństwa 2026-08-05 (pozycje „miny w repo" i „jedyna
--          polityka bez klauzuli TO"), sesja 8 planu napraw.
--
-- ⚠️ NUMERACJA: plan napraw powstawał w ośmiu niezależnych grupach i numer 190
-- zaproponowały CZTERY z nich, każda na co innego. Ta migracja zajmuje 190;
-- pozostałe dostaną kolejne numery przy wdrażaniu swoich sesji.
--
-- ============================================================================
-- CO NAPRAWIAMY I DLACZEGO
-- ============================================================================
--
-- (1) `sms_reminders` — JEDYNA tabela z polityką BEZ klauzuli `TO`.
--     Migracja 007 utworzyła:
--         CREATE POLICY admin_all_access ON sms_reminders FOR ALL
--         USING (auth.uid() IN (SELECT id FROM auth.users WHERE email LIKE '%@mikrostomart.pl'));
--     Polityka bez `TO` dotyczy roli `public`, czyli anon + authenticated + service_role.
--     Nie ma też `WITH CHECK`, więc `FOR ALL` dopuszcza zapis i kasowanie.
--     Tabela trzyma imię i nazwisko pacjenta, numer telefonu i PEŁNĄ TREŚĆ SMS-a
--     (przypomnienia o wizytach razem z nazwiskiem lekarza i typem zabiegu).
--
--     🔑 DLACZEGO NIE WYKRYŁO TEGO SPRZĄTANIE Z MIGRACJI 182: blok kontrolny tamtej
--     migracji szukał wzorca `auth.role()`, a ta polityka używa `auth.uid()` i podzapytania
--     do `auth.users`. Przeżyła więc wszystkie dotychczasowe przeglądy.
--
--     ⚠️ Dziś tabela jest zamknięta PRZYPADKIEM, nie projektem: rola `anon`/`authenticated`
--     nie ma uprawnień do `auth.users`, więc podzapytanie kończy się błędem uprawnień
--     zamiast dopasowaniem. Wystarczy jedna zmiana grantów w schemacie `auth` albo widok
--     odsłaniający `auth.users`, żeby polityka zaczęła działać tak, jak ją napisano:
--     KAŻDE konto z adresem @mikrostomart.pl dostaje pełen dostęp kluczem publicznym.
--
-- (2) Polityki `TO authenticated USING (true)` z migracji 096 (employee_tasks)
--     i 055 (feature_suggestions). „authenticated" to KAŻDE konto Supabase, nie personel.
--     Rejestracja publiczna jest dziś wyłączona (`disable_signup: true`), więc to nie jest
--     otwarte drzwi — ale bezpieczeństwo nie może wisieć na jednym przełączniku w panelu.
--     `employee_tasks` niesie nazwiska pacjentów i opisy zabiegów.
--
-- ============================================================================
-- CZEGO TA MIGRACJA NIE ROBI
-- ============================================================================
-- Nie rusza kodu aplikacji. Wszystkie trasy chodzą przez `service_role` (klucz serwisowy
-- omija RLS), więc zamknięcie polityk dla `authenticated` jest dla nich niewidoczne.
-- Nie ma tu żadnego DROP TABLE ani zmiany kolumn — wyłącznie polityki dostępu.
--
-- 🪤 PLIKI 055/096 W REPO ZOSTAJĄ NIETKNIĘTE CELOWO — ta migracja naprawia BAZĘ.
-- Rozbrojenie samych plików (żeby nowe środowisko nie rodziło się otwarte) to osobne
-- zadanie: te same cztery polityki leżą TAKŻE w drugim katalogu `supabase/migrations/
-- 20260214_employee_tasks.sql`, więc poprawka jednego katalogu dałaby złudzenie porządku.
-- ============================================================================

-- 🪤 KASUJEMY PO STANIE FAKTYCZNYM, NIE PO ZGADYWANYCH NAZWACH.
-- Pierwsza wersja tej migracji wypisywała `DROP POLICY IF EXISTS employee_tasks_select`
-- itd. — a migracja 096 nazwała swoje polityki `"Authenticated users can read tasks"`.
-- Z `IF EXISTS` całość wykonałaby się ZIELONO i nie usunęła ani jednej otwartej polityki:
-- migracja wyglądająca na wykonaną, nienaprawiająca niczego. Pętla po `pg_policies`
-- jest odporna na nazwy i na to, co dołożono po drodze ręcznie w panelu.

DO $$
DECLARE
    tabela text;
    polityka text;
BEGIN
    FOREACH tabela IN ARRAY ARRAY[
        'sms_reminders',
        'employee_tasks',
        'feature_suggestions',
        'feature_suggestion_comments'
    ] LOOP
        -- Tabela może nie istnieć na świeżym środowisku — wtedy pomijamy bez błędu.
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tabela
        ) THEN
            RAISE NOTICE 'Pomijam % — tabela nie istnieje', tabela;
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabela);

        -- Kasujemy KAŻDĄ istniejącą politykę tej tabeli, niezależnie od nazwy.
        FOR polityka IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = tabela
        LOOP
            EXECUTE format('DROP POLICY %I ON public.%I', polityka, tabela);
            RAISE NOTICE 'Usunięto politykę %.%', tabela, polityka;
        END LOOP;

        -- Jedyny dostęp: rola serwisowa (klucz serwerowy). Wszystkie trasy API
        -- używają właśnie jej, więc aplikacja nie zauważy różnicy.
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
            tabela || '_service_only', tabela
        );
        RAISE NOTICE 'Zamknięto % — dostęp wyłącznie service_role', tabela;
    END LOOP;
END $$;

-- ============================================================================
-- WERYFIKACJA — uruchom PO wgraniu, na KAŻDYM środowisku osobno
-- ============================================================================
--
-- (A) Żadna z tych tabel nie ma już polityki dostępnej dla ról innych niż service_role.
--     OCZEKIWANE: zero wierszy.
--
--     SELECT tablename, policyname, roles
--     FROM pg_policies
--     WHERE schemaname = 'public'
--       AND tablename IN ('sms_reminders','employee_tasks','feature_suggestions','feature_suggestion_comments')
--       AND NOT (roles = ARRAY['service_role']::name[]);
--
-- (B) Kontrola POZYTYWNA — polityki faktycznie istnieją (a nie: tabela została bez żadnej).
--     OCZEKIWANE: po jednym wierszu na tabelę, roles = {service_role}.
--
--     SELECT tablename, policyname, roles, cmd
--     FROM pg_policies
--     WHERE schemaname = 'public'
--       AND tablename IN ('sms_reminders','employee_tasks','feature_suggestions','feature_suggestion_comments');
--
-- (C) Kontrola SZERSZA — czy gdziekolwiek indziej została polityka bez klauzuli TO.
--     🔑 Warunek szuka `roles = {public}`, NIE wzorca `auth.role()` — dokładnie ten błąd
--     w zapytaniu kontrolnym migracji 182 sprawił, że `sms_reminders` przeżyło sprzątanie.
--     Każdy wynik obejrzeć ręcznie: część może być poprawna (tabele z treścią publiczną).
--
--     SELECT tablename, policyname, roles, cmd, qual
--     FROM pg_policies
--     WHERE schemaname = 'public' AND roles = ARRAY['public']::name[];
--
-- (D) Kontrola DZIAŁANIA APLIKACJI (po wgraniu, w panelu):
--     • lista zadań w /pracownik ładuje się i da się zmienić status zadania,
--     • lista sugestii ładuje się,
--     • wysyłka przypomnień SMS w panelu admina pokazuje drafty.
--     Wszystkie trzy chodzą przez klucz serwisowy, więc MUSZĄ działać bez zmian —
--     gdyby któraś przestała, znaczy to, że jakaś ścieżka używa klucza publicznego
--     i trzeba ją znaleźć, a nie przywracać otwartą politykę.
-- ============================================================================
