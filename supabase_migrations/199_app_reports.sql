-- ============================================================================
-- 199 — ZGŁOSZENIA Z APLIKACJI: usterki, pomysły i uwagi od użytkowników
-- ============================================================================
--
-- 🚨 WGRAĆ NA OBA ŚRODOWISKA SUPABASE (produkcja + demo) PRZED deployem kodu.
--    Trasy `/api/patients/reports` i `/api/employee/reports/*` odwołują się do tej
--    tabeli; deploy przed migracją da surowy błąd PostgREST zamiast pustej listy.
--
-- CO TO JEST
-- Kanał zwrotny z aplikacji mobilnej: pacjent (albo pracownik korzystający z apki)
-- zgłasza, że coś nie działa, albo podrzuca pomysł. Do dziś takiego kanału NIE BYŁO —
-- jedyną drogą był czat z recepcją, czyli mieszanie usterek oprogramowania
-- z pytaniami o leczenie w skrzynce, która ma zupełnie inny czas reakcji.
--
-- DLACZEGO OSOBNA TABELA
-- `incidents` (mig 187) to usterki SPRZĘTU w gabinecie, zgłaszane przez personel,
-- z cyklem życia serwisowym i zdjęciami. `feature_suggestions` (mig 055) to
-- wewnętrzna tablica pomysłów zespołu — i ma znany dług RLS (`TO authenticated
-- USING (true)`), więc wpuszczenie tam treści od pacjentów POWIĘKSZYŁOBY istniejącą
-- dziurę zamiast ją zmniejszyć. Trzeci najemca zepsułby obie listy naraz.
--
-- DECYZJE WŁAŚCICIELA (2026-08-17), odwzorowane w schemacie:
--  D1. ZGŁASZA ZALOGOWANY **I GOŚĆ** (`patient_id` NULL = gość). Powód jest
--      praktyczny: człowiek, któremu psuje się logowanie albo rejestracja, NIE
--      zgłosi tego jako zalogowany — a to jest dokładnie ta klasa usterki, o której
--      trzeba wiedzieć najbardziej. Cena: spam. Płacimy ją limitem w trasie
--      (3/godz. na IP dla gościa, `failClosed`), nie zamknięciem kanału.
--  D2. PĘTLA ZWROTNA JEST OBOWIĄZKOWA: `status` + `reply`, widoczne dla
--      zgłaszającego. Zgłoszenie bez odzewu uczy ludzi, że zgłaszanie nie ma sensu,
--      i drugi raz nikt nie pisze. Gość odpowiedzi nie zobaczy (nie ma tożsamości) —
--      dlatego może zostawić kontakt, patrz `contact`.
--  D3. TRZY RODZAJE, nie więcej (`kind`): usterka / pomysł / inne. Przy dłuższej
--      liście ludzie i tak wybierają pierwszą pozycję, a kategoria przestaje nieść
--      informację.
--  D4. DIAGNOSTYKA ZBIERANA AUTOMATYCZNIE. Wersja apki, platforma, wersja systemu,
--      model urządzenia, język i ostatni ekran. To jest różnica między zgłoszeniem
--      „nie działa" a zgłoszeniem naprawialnym. Żadne z tych pól nie jest daną
--      wrażliwą ani nie identyfikuje osoby — patrz komentarze przy kolumnach.
--  D5. BEZ ZAŁĄCZNIKÓW W PIERWSZEJ WERSJI — świadomie. Zrzut ekranu z apki pacjenta
--      niemal zawsze zawiera jego dane zdrowotne (art. 9 RODO), a apka od 1.3.0
--      celowo BLOKUJE zrzuty na ekranach z danymi (`expo-screen-capture`). Dokładanie
--      bucketa, do którego użytkownik sam wgrywa taki materiał, otwiera nową
--      powierzchnię RODO dla wygody, która nie jest jeszcze udowodniona.
--  D6. PUSH TYLKO PRZY `kind='bug'`, i to do grupy `admin`. Precedens z awarii
--      (D2 migracji 187): powiadomienie o każdym pomyśle zamienia kanał w hałas.
--      🔴 Treść zgłoszenia NIE JEDZIE w powiadomieniu — tylko sygnał i link.
--      Zgłoszenie potrafi zawierać zdanie o własnym leczeniu („nie widzę wizyty
--      u ortodonty"), a push ląduje na ekranie blokady cudzego telefonu.
--
-- Idempotentna: CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS + ON CONFLICT.
-- Po wgraniu uruchom blok WERYFIKACJA z końca pliku (osobne wklejenie).
-- ============================================================================

BEGIN;

-- ── 1. Tabela zgłoszeń ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_reports (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- D3. Trzy rodzaje. `other` istnieje po to, żeby nikt nie rezygnował
    -- ze zgłoszenia dlatego, że nie umie go zaszufladkować.
    kind             TEXT NOT NULL DEFAULT 'bug'
                     CHECK (kind IN ('bug', 'idea', 'other')),

    -- Sama treść. Bez tytułu: dwa pola tekstowe w formularzu na telefonie to
    -- najprostsza droga do tego, żeby zgłoszenie nigdy nie zostało wysłane.
    message          TEXT NOT NULL CHECK (length(btrim(message)) >= 3),

    -- ── Zgłaszający ──
    -- D1. NULL = gość. FK celowo BEZ kaskady: usunięcie konta (RODO) nie może
    -- skasować historii usterki, ale nie może też zostawić wiszącego wskaźnika.
    -- ON DELETE SET NULL zamienia zgłoszenie w anonimowe i to jest właściwe
    -- zachowanie — treść techniczna zostaje, tożsamość znika.
    patient_id       UUID REFERENCES patients(id) ON DELETE SET NULL,
    -- Migawka nazwiska z chwili zgłoszenia; po usunięciu konta czyszczona razem
    -- z `patient_id` przez trasę RODO (patrz UWAGA na końcu pliku).
    reporter_name    TEXT,
    -- Dobrowolny kontakt zwrotny dla GOŚCIA (e-mail albo telefon). Zalogowany go
    -- nie podaje — jego odpowiedź trafia na ekran „Moje zgłoszenia".
    -- ⚠️ To jest dana osobowa od niezweryfikowanego źródła: limit długości + brak
    -- jakiegokolwiek automatycznego użycia (nic z tego pola nie wysyła maila).
    contact          TEXT,

    -- ── D4. Diagnostyka (automat) ──
    -- Wszystkie poniższe pochodzą z `expo-constants` / `expo-device` i opisują
    -- URZĄDZENIE, nie osobę. `device_model` to nazwa handlowa („iPhone 15"),
    -- nie żaden identyfikator sprzętowy — świadomie NIE zbieramy IDFV/ANDROID_ID.
    app_version      TEXT,
    platform         TEXT CHECK (platform IS NULL OR platform IN ('ios', 'android', 'web')),
    os_version       TEXT,
    device_model     TEXT,
    locale           TEXT,
    -- Ostatnia trasa przed otwarciem formularza, np. `/(patient)/panel`. Sama
    -- ścieżka, NIGDY parametry — `/(staff)/pacjenci/[id]` niesie id pacjenta.
    screen           TEXT,

    -- ── D2. Obsługa ──
    status           TEXT NOT NULL DEFAULT 'new'
                     CHECK (status IN ('new', 'in_progress', 'done', 'declined')),
    reply            TEXT,
    replied_by       UUID,
    replied_name     TEXT,
    replied_at       TIMESTAMPTZ,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- D2 na poziomie bazy, nie tylko UI: „załatwione" i „odrzucone" BEZ odpowiedzi
-- jest niemożliwe. Bramka w kodzie da się ominąć (skrypt, panel, przyszła trasa) —
-- CHECK nie. To jest ta sama zasada co `incidents_resolution_requires_note`.
-- 🔑 `in_progress` odpowiedzi NIE wymaga: „zajmujemy się tym" to stan pośredni.
ALTER TABLE app_reports DROP CONSTRAINT IF EXISTS app_reports_closing_requires_reply;
ALTER TABLE app_reports ADD CONSTRAINT app_reports_closing_requires_reply
    CHECK (
        status NOT IN ('done', 'declined')
        OR (reply IS NOT NULL AND length(btrim(reply)) >= 3)
    );

-- Lista personelu: domyślnie nowe na górze.
CREATE INDEX IF NOT EXISTS idx_app_reports_status_created
    ON app_reports (status, created_at DESC);
-- Ekran „Moje zgłoszenia": wszystko jednego pacjenta, najnowsze pierwsze.
-- Częściowy, bo zgłoszenia gości (NULL) nigdy nie są tak odpytywane.
CREATE INDEX IF NOT EXISTS idx_app_reports_patient_created
    ON app_reports (patient_id, created_at DESC)
    WHERE patient_id IS NOT NULL;

-- `updated_at` pilnowane triggerem, nie kodem: trasa PATCH to nie jedyna droga
-- zapisu (panel, skrypt naprawczy), a data ostatniej zmiany ma być prawdziwa.
CREATE OR REPLACE FUNCTION app_reports_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_reports_updated_at ON app_reports;
CREATE TRIGGER trg_app_reports_updated_at
    BEFORE UPDATE ON app_reports
    FOR EACH ROW EXECUTE FUNCTION app_reports_touch_updated_at();

-- ── 2. RLS: wyłącznie rola serwisowa ────────────────────────────────────────
-- 🔑 `TO service_role` jest OBOWIĄZKOWE. Polityka bez klauzuli TO ma roles={public},
-- czyli otwiera tabelę dla anon i authenticated przez klucz publiczny — dokładnie
-- tak powstał wyciek zamknięty migracją 182, i dokładnie taki dług nosi do dziś
-- tabela `feature_suggestions` (mig 055).
-- 🔴 Tutaj stawka jest wyższa niż zwykle: bez tej klauzuli KAŻDY z kluczem anon
-- czytałby cudze zgłoszenia razem z ich treścią i kontaktem zwrotnym.
-- Apka czyta i pisze WYŁĄCZNIE przez REST weba.
ALTER TABLE app_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_reports_service_only ON app_reports;
CREATE POLICY app_reports_service_only ON app_reports
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 3. Rejestr zdrowia ścieżki push ─────────────────────────────────────────
-- `max_silence_minutes = NULL` — ścieżka ZDARZENIOWA. Cisza znaczy „nikt nie
-- zgłosił usterki", nie awarię kanału. Alarm o niej nauczyłby zespół ignorować
-- alerty (ten sam powód co przy `incident_blocking` w migracji 187).
INSERT INTO push_path_health (path_key, label, max_silence_minutes) VALUES
    ('app_report_bug', 'Zgłoszenia usterek z aplikacji', NULL)
ON CONFLICT (path_key) DO NOTHING;

COMMIT;

-- ============================================================================
-- UWAGA DLA ŚCIEŻKI RODO (nie jest częścią tej migracji)
-- `ON DELETE SET NULL` zeruje `patient_id`, ale NIE tyka `reporter_name`
-- ani `contact` — Postgres nie ma na to składni. Trasa usunięcia konta powinna
-- przy okazji wykonać:
--     UPDATE app_reports SET reporter_name = NULL, contact = NULL
--      WHERE patient_id = <id>;
-- PRZED usunięciem wiersza pacjenta. Zapisane tutaj, żeby nie zginęło.
-- ============================================================================

-- ============================================================================
-- WERYFIKACJA PO WGRANIU — skopiuj CAŁY blok poniżej i uruchom jednym wklejeniem.
-- Oczekiwane: 6 wierszy, wszędzie 'OK'.
-- ============================================================================
-- WITH checks AS (
--     SELECT '1. tabela app_reports istnieje' AS kontrola,
--            CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
--                              WHERE table_name = 'app_reports') THEN 'OK' ELSE 'BLAD' END AS wynik
--     UNION ALL
--     SELECT '2. RLS wlaczone i TYLKO service_role',
--            CASE WHEN EXISTS (
--                SELECT 1 FROM pg_policies
--                WHERE tablename = 'app_reports' AND roles = '{service_role}'
--            ) AND NOT EXISTS (
--                SELECT 1 FROM pg_policies
--                WHERE tablename = 'app_reports' AND roles <> '{service_role}'
--            ) THEN 'OK' ELSE 'BLAD' END
--     UNION ALL
--     SELECT '3. CHECK wymusza odpowiedz przy zamknieciu',
--            CASE WHEN EXISTS (
--                SELECT 1 FROM pg_constraint
--                WHERE conname = 'app_reports_closing_requires_reply'
--            ) THEN 'OK' ELSE 'BLAD' END
--     UNION ALL
--     SELECT '4. trigger updated_at zamontowany',
--            CASE WHEN EXISTS (
--                SELECT 1 FROM pg_trigger WHERE tgname = 'trg_app_reports_updated_at'
--            ) THEN 'OK' ELSE 'BLAD' END
--     UNION ALL
--     SELECT '5. oba indeksy istnieja',
--            CASE WHEN (SELECT count(*) FROM pg_indexes
--                       WHERE tablename = 'app_reports'
--                         AND indexname IN ('idx_app_reports_status_created',
--                                           'idx_app_reports_patient_created')) = 2
--                 THEN 'OK' ELSE 'BLAD' END
--     UNION ALL
--     SELECT '6. sciezka push zasiana jako ZDARZENIOWA (NULL)',
--            CASE WHEN EXISTS (
--                SELECT 1 FROM push_path_health
--                WHERE path_key = 'app_report_bug' AND max_silence_minutes IS NULL
--            ) THEN 'OK' ELSE 'BLAD' END
-- )
-- SELECT * FROM checks ORDER BY kontrola;
--
-- ── KONTROLE NEGATYWNE (obie MUSZĄ ZAWIEŚĆ — to jest dowód, że CHECK działa) ──
--
-- (a) zamkniecie bez odpowiedzi:
-- INSERT INTO app_reports (message, status) VALUES ('test', 'done');
-- -- oczekiwane: ERROR  new row violates check constraint
-- --             "app_reports_closing_requires_reply"
--
-- (b) pusta tresc:
-- INSERT INTO app_reports (message) VALUES ('  ');
-- -- oczekiwane: ERROR  new row violates check constraint "app_reports_message_check"
--
-- ── KONTROLA POZYTYWNA (ma PRZEJSC, potem posprzataj) ──
-- INSERT INTO app_reports (kind, message, platform, app_version)
-- VALUES ('bug', 'kontrola migracji 199', 'ios', '1.3.1') RETURNING id, status, created_at;
-- -- oczekiwane: jeden wiersz, status='new'
-- DELETE FROM app_reports WHERE message = 'kontrola migracji 199';
