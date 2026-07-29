-- ============================================================================
-- 187 — AWARIE: usterki, braki i problemy widoczne dla całego zespołu
-- ============================================================================
--
-- 🚨 WGRAĆ NA OBA ŚRODOWISKA SUPABASE (produkcja + demo) PRZED deployem kodu.
--    Trasy `/api/employee/incidents/*` odwołują się do tabeli i do bucketa; deploy
--    przed migracją da surowe błędy Storage/PostgREST zamiast pustej listy.
--
-- CO TO JEST
-- Pracownik zgłasza, że coś nie działa („kompresor w gabinecie 2 hałasuje", „brak
-- rękawiczek S"), a reszta zespołu to widzi — żeby nikt nie tracił czasu na
-- diagnozowanie problemu, o którym trzy osoby już wiedzą.
--
-- DECYZJE WŁAŚCICIELA (2026-07-29), odwzorowane w schemacie:
--  D1. CYKL ŻYCIA: zgłoszona → w naprawie → naprawiona (`status`), plus WAGA
--      (`severity`: minor / hinders / blocking). Dwustan odrzucony, bo nie odróżnia
--      „nikt nie tknął" od „trwa naprawa".
--  D2. PUSH ZALEŻY OD WAGI: `blocking` → powiadomienie do całego zespołu; niższe wagi
--      → wyłącznie licznik w apce. Precedens z czatu zespołu (D1 tamtej decyzji):
--      ogłoszenie z automatycznym pushem do kilkunastu osób zamienia się w hałas,
--      ludzie wyciszają kanał i prawdziwe alarmy przestają docierać.
--  D3. ZAMYKA KAŻDY PRACOWNIK, ale `resolution_note` jest WYMAGANA (CHECK niżej).
--      Bez notatki po pół roku nikt nie wie, czy usterka wróciła, czy to nowa —
--      a historia usterek jednego unitu ma realną wartość serwisową.
--  D4. ZDJĘCIE: tak, z galerii i z aparatu. Stąd osobny prywatny bucket.
--
-- DLACZEGO OSOBNA TABELA, A NIE TYP W `employee_tasks`
-- Awaria to OGŁOSZENIE („wszyscy mają wiedzieć"), a zadanie to PRZYPISANA PRACA.
-- Zmieszanie ich zaśmieciłoby aktywnie używaną listę zadań wpisami typu „brak papieru
-- w gabinecie 2" i zepsuło odpowiedź na pytanie „co mam dziś do zrobienia". Powiązanie
-- idzie w drugą stronę: `linked_task_id` pozwala PROMOWAĆ awarię do zadania, gdy ktoś
-- ma się nią realnie zająć.
--
-- DLACZEGO OSOBNY BUCKET, A NIE `chat-attachments`
-- Tamten bucket ma w migracji 184 jasno opisanego właściciela („magazyn plików dla OBU
-- torów czatu") i własną regułę retencji. Dokładanie trzeciego najemcy rozmywa i jedno,
-- i drugie. `task-images` (mig 020) odpada całkowicie — jest PUBLICZNY, bez wygasania
-- i bez strip EXIF.
--
-- ZERO POLITYK NA `storage.objects`
-- Dostęp wyłącznie przez rolę serwisową + signed URL 300 s wybijany przez trasę, żeby
-- każdy odczyt zostawiał ślad w audycie.
-- ⚠️ NIE dodawać polityki `TO authenticated` „żeby apka mogła pobierać".
--
-- Idempotentna: CREATE TABLE IF NOT EXISTS + ON CONFLICT + DROP POLICY IF EXISTS.
-- Po wgraniu uruchom blok WERYFIKACJA z końca pliku (osobne wklejenie).
-- ============================================================================

BEGIN;

-- ── 1. Tabela awarii ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title            TEXT NOT NULL,
    description      TEXT,
    -- Wolny tekst, nie słownik. Słownik dałby filtry i statystyki, ale wymaga
    -- utrzymania listy gabinetów i sprzętu; przy pierwszej wersji ważniejsze jest,
    -- żeby zgłoszenie dało się wypełnić w kilkanaście sekund.
    location         TEXT,

    severity         TEXT NOT NULL DEFAULT 'hinders'
                     CHECK (severity IN ('minor', 'hinders', 'blocking')),
    status           TEXT NOT NULL DEFAULT 'reported'
                     CHECK (status IN ('reported', 'in_progress', 'resolved')),

    -- Ścieżki w buckecie `incident-photos`. Tablica, nie tabela łącząca: zdjęcia
    -- jadą ZAWSZE razem z awarią (zero N+1), a liczba jest z natury jednocyfrowa.
    photo_paths      TEXT[] NOT NULL DEFAULT '{}',

    reported_by      UUID NOT NULL,
    -- Migawka nazwiska w chwili zgłoszenia. `user_roles` może stracić wiersz przy
    -- odejściu pracownika, a wtedy historia usterki zostaje bez autora.
    reporter_name    TEXT NOT NULL,

    taken_by         UUID,
    taken_name       TEXT,
    taken_at         TIMESTAMPTZ,

    resolved_by      UUID,
    resolver_name    TEXT,
    resolved_at      TIMESTAMPTZ,
    resolution_note  TEXT,

    -- Promocja do zadania: awaria zostaje ogłoszeniem, a robota dostaje właściciela
    -- i termin tam, gdzie zespół już ich szuka.
    linked_task_id   UUID,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- D3: zamknięcie BEZ notatki jest niemożliwe na poziomie bazy, nie tylko w UI.
-- Bramka w kodzie da się ominąć (skrypt, panel, przyszła trasa) — CHECK nie.
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_resolution_requires_note;
ALTER TABLE incidents ADD CONSTRAINT incidents_resolution_requires_note
    CHECK (
        status <> 'resolved'
        OR (resolution_note IS NOT NULL AND length(btrim(resolution_note)) >= 3)
    );

-- Lista domyślnie pokazuje otwarte, najpilniejsze na górze.
CREATE INDEX IF NOT EXISTS idx_incidents_status_created
    ON incidents (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_created
    ON incidents (created_at DESC);

-- ── 2. RLS: wyłącznie rola serwisowa ────────────────────────────────────────
-- 🔑 `TO service_role` jest OBOWIĄZKOWE. Polityka bez klauzuli TO ma roles={public},
-- czyli otwiera tabelę dla anon i authenticated — dokładnie tak powstał wyciek
-- zamknięty migracją 182. Apka czyta i pisze WYŁĄCZNIE przez REST weba z Bearerem.
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS incidents_service_only ON incidents;
CREATE POLICY incidents_service_only ON incidents
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 3. Bucket na zdjęcia usterek ────────────────────────────────────────────
-- 10 MB: górna granica dla zdjęcia z telefonu. Serwer i tak re-enkoduje przez sharp,
-- więc realne pliki są o rząd wielkości mniejsze — limit jest zabezpieczeniem.
-- image/jpeg, bo każdy plik wychodzi z normalizacji jako JPEG. To NIE zastępuje
-- walidacji magic bytes w trasie: `allowed_mime_types` sprawdza MIME DEKLAROWANY.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('incident-photos', 'incident-photos', false, 10485760, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE
    SET public             = false,          -- ⚠️ NIGDY true
        file_size_limit    = 10485760,
        allowed_mime_types = ARRAY['image/jpeg'];

-- Defensywnie: kreator bucketów w dashboardzie potrafi dołożyć politykę odczytu.
DROP POLICY IF EXISTS "Allow public read incident-photos"    ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads incident-photos"        ON storage.objects;
DROP POLICY IF EXISTS "Allow service delete incident-photos" ON storage.objects;

-- ── 4. Rejestr zdrowia ścieżki push ─────────────────────────────────────────
-- `max_silence_minutes = NULL` — ścieżka ZDARZENIOWA. Cisza znaczy „nikt nic nie
-- zepsuł", nie awarię kanału. Alarm o niej nauczyłby zespół ignorować alerty
-- (dokładnie ten skutek, przed którym ostrzega komentarz w cronie push-health-alert).
INSERT INTO push_path_health (path_key, label, max_silence_minutes) VALUES
    ('incident_blocking', 'Awarie blokujące gabinet', NULL)
ON CONFLICT (path_key) DO NOTHING;

COMMIT;

-- ============================================================================
-- WERYFIKACJA PO WGRANIU — skopiuj CAŁY blok poniżej i uruchom jednym wklejeniem.
-- Oczekiwane: 6 wierszy, wszędzie 'OK'.
-- ============================================================================
-- WITH checks AS (
--     SELECT '1. tabela incidents istnieje' AS kontrola,
--            CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
--                              WHERE table_name = 'incidents') THEN 'OK' ELSE 'BLAD' END AS wynik
--     UNION ALL
--     SELECT '2. RLS wlaczone i TYLKO service_role',
--            CASE WHEN EXISTS (
--                SELECT 1 FROM pg_policies
--                WHERE tablename = 'incidents' AND roles = '{service_role}'
--            ) AND NOT EXISTS (
--                SELECT 1 FROM pg_policies
--                WHERE tablename = 'incidents' AND roles <> '{service_role}'
--            ) THEN 'OK' ELSE 'BLAD' END
--     UNION ALL
--     SELECT '3. CHECK wymusza notatke przy zamknieciu',
--            CASE WHEN EXISTS (
--                SELECT 1 FROM pg_constraint
--                WHERE conname = 'incidents_resolution_requires_note'
--            ) THEN 'OK' ELSE 'BLAD' END
--     UNION ALL
--     SELECT '4. bucket incident-photos istnieje i jest PRYWATNY',
--            CASE WHEN EXISTS (
--                SELECT 1 FROM storage.buckets
--                WHERE id = 'incident-photos' AND public = false
--                  AND file_size_limit = 10485760
--                  AND allowed_mime_types = ARRAY['image/jpeg']
--            ) THEN 'OK' ELSE 'BLAD' END
--     UNION ALL
--     SELECT '5. brak polityk storage.objects dla bucketa',
--            CASE WHEN NOT EXISTS (
--                SELECT 1 FROM pg_policies
--                WHERE schemaname = 'storage' AND tablename = 'objects'
--                  AND (qual ILIKE '%incident-photos%' OR with_check ILIKE '%incident-photos%')
--            ) THEN 'OK' ELSE 'BLAD' END
--     UNION ALL
--     SELECT '6. sciezka push zasiana jako ZDARZENIOWA (NULL)',
--            CASE WHEN EXISTS (
--                SELECT 1 FROM push_path_health
--                WHERE path_key = 'incident_blocking' AND max_silence_minutes IS NULL
--            ) THEN 'OK' ELSE 'BLAD' END
-- )
-- SELECT * FROM checks ORDER BY kontrola;
--
-- Kontrola NEGATYWNA (musi ZAWIESC — dowod, ze CHECK dziala):
-- INSERT INTO incidents (title, status, reported_by, reporter_name)
-- VALUES ('test', 'resolved', gen_random_uuid(), 'test');
-- -- oczekiwane: ERROR  new row violates check constraint
-- --             "incidents_resolution_requires_note"
