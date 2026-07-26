-- Migracja 181: CareFlow mobile — status 'proposed', brakujące indeksy, wygasanie linku pacjenta
--
-- Kontekst: port CareFlow (opieka pozabiegowa) do natywnej aplikacji Expo.
-- Zmiany wymagane przez decyzje produktowe:
--   D1 — auto-kwalifikacja NIE zapisuje już pacjenta automatycznie, tylko tworzy
--        PROPOZYCJĘ (status 'proposed', zero care_tasks, zero powiadomień); dopiero
--        akceptacja lekarza w apce generuje zadania i uruchamia protokół,
--   D6 — pacjent może wyciszyć przypomnienia CareFlow (klucz `careflow_reminders`
--        w patients.notification_preferences); wyciszenie ucisza TAKŻE SMS fallback.
-- Plus higiena bazy, której brakowało od mig 110: indeksy pod nowe ścieżki odczytu,
-- unikalność nazwy protokołu i jawna data wygaśnięcia bezhasłowego tokenu pacjenta.
--
-- ADDITIVE / IDEMPOTENTNA — można puścić dwa razy pod rząd bez błędu:
--   - CHECK statusu: DROP CO NAJWYŻEJ JEDNEGO constraintu dopasowanego po wąskiej
--     sygnaturze (tylko kolumna status + wyliczone wartości), nie po nazwie + ADD,
--   - ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS,
--   - UNIQUE na nazwie protokołu zakładany tylko, gdy nie ma duplikatów i nie ma już
--     równoważnego indeksu (pod dowolną nazwą),
--   - jedyna zmiana danych to backfill access_token_expires_at i obejmuje WYŁĄCZNIE
--     wiersze z NULL-em — przy drugim uruchomieniu nie rusza już żadnego wiersza.
--     Backfill ma podłogę „teraz + 30 dni" (okres przejściowy), żeby wgranie migracji
--     nie unieważniło działających dziś linków pacjentów — szczegóły w sekcji 4.
--   UWAGA: backfill przechodzi przez trigger care_enrollments_updated (mig 110),
--   więc podnosi updated_at objętym wierszom. Statusu ani widoczności nie zmienia.
--
-- Bezpieczne na żywej bazie: tabele care_* są mikroskopijne (na produkcji 1 szablon,
-- 1 zapis, ~10 zadań), więc CREATE INDEX bez CONCURRENTLY nie blokuje nikogo mierzalnie.
--
-- 🚨 WGRAĆ NA OBU Supabase (produkcja + demo) PRZED deployem kodu.
--    Bez niej cron careflow-auto-qualify dostaje przy KAŻDYM insercie check_violation
--    (23514) na starym CHECK-u statusu i nie powstaje ŻADNA propozycja.
--    Kolumnę access_token_expires_at EGZEKWUJE JUŻ KOD (404 dla wygasłego tokenu),
--    dlatego backfill w sekcji 4 ma 30-dniowy okres przejściowy — inaczej wgranie migracji
--    odcięłoby pacjentów od instrukcji dawkowania w tej samej sekundzie.
--
-- Po wgraniu uruchom blok WERYFIKACJA z końca pliku (osobne wklejenie, po COMMIT).

BEGIN;

-- ============================================================
-- 1. care_enrollments.status: dokładamy 'proposed'
-- ============================================================
-- Mig 110 zdefiniowała CHECK inline przy kolumnie, więc nazwę nadał Postgres
-- (najpewniej `care_enrollments_status_check`). NIE polegamy na tej nazwie: szukamy go
-- w pg_constraint po SYGNATURZE, ale WĄSKO — dopasowanie musi spełnić RAZEM trzy warunki:
--   a) CHECK dotyczy WYŁĄCZNIE kolumny `status` (conkey = dokładnie {attnum(status)}),
--   b) definicja wymienia kolumnę `status`,
--   c) definicja wylicza znane wartości — musi zawierać literał 'active'.
-- Dzięki temu nie ruszamy cudzych CHECK-ów, które tylko WSPOMINAJĄ status (np.
-- `CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL)` albo wielokolumnowy CHECK
-- z przyszłej migracji). Zdejmujemy CO NAJWYŻEJ JEDEN constraint i logujemy jego nazwę.
-- Zero dopasowań = nic nie kasujemy, po prostu zakładamy nowy CHECK.
-- Więcej niż jedno dopasowanie = przerywamy migrację (człowiek musi zdecydować, który
-- constraint jest ten właściwy — cichy DROP dwóch CHECK-ów to nie jest nasza decyzja).
DO $$
DECLARE
    v_rel     OID;
    v_attnum  SMALLINT;
    v_total   BIGINT;
    v_report  TEXT;
    v_conname TEXT;
    v_bad     TEXT;
    v_clash   TEXT;
BEGIN
    v_rel := to_regclass('public.care_enrollments')::OID;

    IF v_rel IS NULL THEN
        RAISE EXCEPTION 'Mig 181: brak tabeli public.care_enrollments — najpierw wgraj migrację 110_careflow_system.sql';
    END IF;

    SELECT a.attnum
    INTO v_attnum
    FROM pg_attribute a
    WHERE a.attrelid = v_rel
      AND a.attname = 'status'
      AND NOT a.attisdropped;

    IF v_attnum IS NULL THEN
        RAISE EXCEPTION 'Mig 181: care_enrollments nie ma kolumny status — schemat niezgodny z mig 110, przerywam.';
    END IF;

    -- Wiersz ze statusem spoza nowej listy wywróciłby ADD CONSTRAINT surowym
    -- check_violation. Sprawdzamy to wcześniej, żeby komunikat mówił, CO naprawić.
    SELECT string_agg(DISTINCT COALESCE(quote_literal(status), 'NULL'), ', ')
    INTO v_bad
    FROM care_enrollments
    WHERE status IS NULL
       OR status NOT IN ('active', 'completed', 'cancelled', 'paused', 'proposed');

    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'Mig 181: care_enrollments ma statusy spoza listy (%). Popraw dane albo dopisz wartość do CHECK-a i uruchom migrację ponownie.', v_bad;
    END IF;

    -- Najpierw czytamy katalog do zmiennych, dopiero potem DDL — żeby nie modyfikować
    -- katalogu systemowego w trakcie skanowania go kursorem.
    SELECT COUNT(*),
           MIN(m.conname),
           COALESCE(string_agg(m.conname || ' := ' || m.condef, ' ; ' ORDER BY m.conname), '(brak)')
    INTO v_total, v_conname, v_report
    FROM (
        SELECT c.conname::TEXT AS conname, pg_get_constraintdef(c.oid) AS condef
        FROM pg_constraint c
        WHERE c.conrelid = v_rel
          AND c.contype = 'c'
          AND c.conkey = ARRAY[v_attnum]                      -- (a) tylko kolumna status
          AND pg_get_constraintdef(c.oid) ILIKE '%status%'    -- (b) po nazwie kolumny
          AND pg_get_constraintdef(c.oid) ILIKE '%''active''%' -- (c) wylicza znane wartości
    ) m;

    IF v_total = 0 THEN
        RAISE NOTICE 'Mig 181: nie znalazłem CHECK-a ograniczającego care_enrollments.status do listy wartości — nic nie zdejmuję, zakładam nowy.';
    ELSIF v_total > 1 THEN
        RAISE EXCEPTION 'Mig 181: na care_enrollments jest % CHECK-ów pasujących do sygnatury statusu (%). Nie zgaduję, który zdjąć — przejrzyj je ręcznie i zostaw jeden.', v_total, v_report;
    ELSE
        EXECUTE format('ALTER TABLE public.care_enrollments DROP CONSTRAINT %I', v_conname);
        RAISE NOTICE 'Mig 181: zdjęty CHECK statusu → %', v_report;
    END IF;

    -- Docelowa nazwa musi być wolna, inaczej ADD wywali duplicate_object i cofnie całą
    -- migrację. Jeśli po zdjęciu dopasowanego CHECK-a nadal ktoś siedzi pod tą nazwą,
    -- to znaczy, że nazwy użyto do czegoś innego — NIE kasujemy tego po cichu (to była
    -- właśnie wada poprzedniej wersji), tylko przerywamy z pełną definicją w komunikacie.
    SELECT pg_get_constraintdef(c.oid)
    INTO v_clash
    FROM pg_constraint c
    WHERE c.conrelid = v_rel
      AND c.conname = 'care_enrollments_status_check';

    IF v_clash IS NOT NULL THEN
        RAISE EXCEPTION 'Mig 181: constraint care_enrollments_status_check już istnieje i ma NIEOCZEKIWANĄ definicję (%). Sprawdź go ręcznie — migracja go nie usuwa.', v_clash;
    END IF;

    ALTER TABLE public.care_enrollments
        ADD CONSTRAINT care_enrollments_status_check
        CHECK (status IN ('active', 'completed', 'cancelled', 'paused', 'proposed'));
END $$;

COMMENT ON COLUMN care_enrollments.status IS
    'active | completed | cancelled | paused | proposed. ''proposed'' = propozycja z auto-kwalifikacji '
    'czekająca na akceptację lekarza w aplikacji: NIE ma jeszcze żadnych care_tasks i NIE wysyła '
    'żadnych powiadomień. Zadania powstają dopiero przy akceptacji (przejście proposed → active).';

-- ============================================================
-- 2. Brakujące indeksy pod nowe ścieżki odczytu
-- ============================================================

-- Strefa pacjenta w apce odpytuje po UUID pacjenta (patients.id), nie po ID z Prodentisa.
-- Partial, bo patient_db_id bywa NULL dla zapisów sprzed integracji.
CREATE INDEX IF NOT EXISTS idx_care_enrollments_patient_db_id
    ON care_enrollments(patient_db_id)
    WHERE patient_db_id IS NOT NULL;

-- care_tasks.step_id to FK bez ON DELETE — bez indeksu każde kasowanie kroku protokołu
-- robi seq scan po całej tabeli zadań (kontrola referencyjna).
CREATE INDEX IF NOT EXISTS idx_care_tasks_step
    ON care_tasks(step_id);

-- Lista dla personelu: filtr po statusie + sortowanie/zakres po dacie zabiegu.
CREATE INDEX IF NOT EXISTS idx_care_enrollments_status_date
    ON care_enrollments(status, appointment_date);

-- ============================================================
-- 3. UNIQUE na care_templates(name)
-- ============================================================
-- Mig 110 seeduje szablon 'Zabieg chirurgiczny' przez ON CONFLICT DO NOTHING, ale
-- BEZ żadnego unikalnego indeksu — czyli klauzula nigdy nic nie łapie i ponowne
-- uruchomienie mig 110 tworzy DUPLIKAT protokołu.
-- Na produkcji jest 1 szablon, więc indeks powstanie bez konfliktu. Mimo to nie
-- ufamy stanowi danych: gdyby w którymś środowisku duplikaty już były, wypisujemy je
-- i POMIJAMY indeks (scalenie szablonów = decyzja człowieka, nie skryptu), a nie
-- wywracamy całej migracji. EXCEPTION zostaje jako siatka na wyścig między
-- sprawdzeniem a CREATE INDEX.
-- UWAGA: edytor SQL w Supabase połyka RAISE NOTICE — czy indeks powstał, sprawdzasz
-- blokiem WERYFIKACJA z końca pliku (kontrole 3 i 4).
DO $$
DECLARE
    v_dups     TEXT;
    v_existing TEXT;
BEGIN
    -- CREATE INDEX IF NOT EXISTS patrzy WYŁĄCZNIE na nazwę, więc najpierw sprawdzamy,
    -- czy równoważny UNIQUE(name) nie istnieje już pod inną nazwą (ręczny indeks,
    -- constraint UNIQUE) — inaczej dorobilibyśmy drugi taki sam indeks.
    SELECT i.relname
    INTO v_existing
    FROM pg_index x
    JOIN pg_class i ON i.oid = x.indexrelid
    WHERE x.indrelid = to_regclass('public.care_templates')::OID
      AND x.indisunique
      AND x.indpred IS NULL
      AND x.indexprs IS NULL
      AND x.indnkeyatts = 1
      AND x.indkey[0] = (
            SELECT a.attnum
            FROM pg_attribute a
            WHERE a.attrelid = x.indrelid
              AND a.attname = 'name'
              AND NOT a.attisdropped
      )
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
        RAISE NOTICE 'Mig 181: UNIQUE na care_templates(name) już istnieje (%) — pomijam.', v_existing;
        RETURN;
    END IF;

    SELECT string_agg(format('%s (x%s)', d.name, d.cnt), ', ')
    INTO v_dups
    FROM (
        SELECT name, COUNT(*) AS cnt
        FROM care_templates
        GROUP BY name
        HAVING COUNT(*) > 1
    ) d;

    IF v_dups IS NOT NULL THEN
        RAISE NOTICE 'Mig 181: pomijam UNIQUE(name) na care_templates — duplikaty do ręcznego scalenia: %', v_dups;
    ELSE
        EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_care_templates_name_uniq ON care_templates(name)';
    END IF;
EXCEPTION
    -- wyścig / duplikat wstawiony między SELECT-em a CREATE INDEX
    WHEN unique_violation THEN
        RAISE NOTICE 'Mig 181: UNIQUE(name) na care_templates NIEutworzony (duplikaty nazw) — wymaga ręcznego scalenia szablonów.';
END $$;

-- ============================================================
-- 4. Wygaszanie linku pacjenta (access_token)
-- ============================================================
ALTER TABLE care_enrollments
    ADD COLUMN IF NOT EXISTS access_token_expires_at TIMESTAMPTZ;

-- Backfill istniejących zapisów Z OKRESEM PRZEJŚCIOWYM.
-- Wygasanie jest już EGZEKWOWANE W KODZIE (GET /api/careflow/[token] i POST
-- /api/careflow/[token]/complete zwracają 404 dla wygasłego tokenu), więc samo
-- `enrolled_at + 180 dni` unieważniłoby W SEKUNDZIE WGRANIA MIGRACJI każdy link
-- starszy niż 180 dni — pacjent w trakcie protokołu straciłby dostęp do dawek leków
-- bez ostrzeżenia i bez swojej wiedzy. Dlatego wartość to PÓŹNIEJSZA Z DWÓCH:
--   • enrolled_at + 180 dni  (docelowa reguła, taka sama jak w kodzie),
--   • NOW() + 30 dni         (podłoga: nikt nie traci dostępu z dnia na dzień).
-- Efekt: linki świeższe niż 150 dni dostają swoje normalne 180 dni od zapisu, a każdy
-- starszy — 30 dni na dokończenie protokołu / poproszenie o nowy link. NOWE zapisy i tak
-- dostają pełne 180 dni z kodu (ACCESS_TOKEN_TTL_MS w enroll/ i enrollments/[id]/accept).
-- Dla NOWYCH zapisów wartość ustawia aplikacja jawnie (świadomie BEZ DEFAULT,
-- żeby termin ważności był decyzją kodu, a nie niewidocznym efektem ubocznym schematu).
-- WHERE IS NULL = nie nadpisujemy niczego, co już ma termin (także przy drugim
-- uruchomieniu migracji — wtedy UPDATE nie obejmuje już ani jednego wiersza; w
-- szczególności NIE reanimujemy tokenów wygaszonych ręcznie przez anonimizację
-- w careflowLifecycle, bo one mają już swoją datę).
UPDATE care_enrollments
SET access_token_expires_at = GREATEST(
        COALESCE(enrolled_at, created_at, NOW()) + INTERVAL '180 days',
        NOW() + INTERVAL '30 days'
    )
WHERE access_token_expires_at IS NULL;

COMMENT ON COLUMN care_enrollments.access_token IS
    'Bezhasłowy token dostępu do /opieka/[token]. UWAGA: to PEŁNE uwierzytelnienie do danych '
    'medycznych pacjenta (protokół, leki, dawki, historia potwierdzeń) — kto ma link, ten ma dane. '
    'Do dziś token NIE WYGASA NIGDY; wygaszanie wprowadza access_token_expires_at.';

COMMENT ON COLUMN care_enrollments.access_token_expires_at IS
    'Termin ważności access_token. NULL = brak terminu (zachowanie sprzed mig 181). '
    'Backfill mig 181: GREATEST(enrolled_at + 180 dni, moment migracji + 30 dni) — ta druga '
    'wartość to okres przejściowy, żeby wgranie migracji nie unieważniło z dnia na dzień linków '
    'starszych niż 180 dni. Dla nowych zapisów ustawia aplikacja jawnie (180 dni). '
    'Egzekwowanie wygaśnięcia dzieje się w warstwie aplikacji (walidacja tokenu), nie w bazie.';

-- ============================================================
-- 5. Preferencja pacjenta: careflow_reminders
-- ============================================================
-- Preferencje pacjenta to JSONB (patients.notification_preferences, mig 064), a nie
-- osobna tabela konfiguracji — dlatego ZERO migracji danych: brak klucza = włączone.
-- Aktualizujemy wyłącznie dokumentację kolumny.
-- (DO + EXCEPTION, bo na starszych środowiskach kolumna mogła nie istnieć —
--  ten sam defensywny wariant co w /api/patients/export-data.)
DO $$
BEGIN
    EXECUTE $c$
        COMMENT ON COLUMN patients.notification_preferences IS
            'Preferencje powiadomień pacjenta (JSONB). Klucze: sms_reminders, email_reminders, birthday_wishes, push_1h_before, post_visit_sms, careflow_reminders. Brak klucza = funkcja WŁĄCZONA (domyślnie true). careflow_reminders (mig 181) = przypomnienia CareFlow o zadaniach opieki pozabiegowej; wartość false wycisza ZARÓWNO push, JAK I SMS fallback — opt-out z pusha nie może przełączać pacjenta na SMS-y.'
    $c$;
EXCEPTION
    WHEN undefined_column OR undefined_table THEN
        RAISE NOTICE 'Mig 181: patients.notification_preferences nie istnieje w tym środowisku — pomijam komentarz.';
END $$;

-- ============================================================
-- 6. care_tasks.skipped_at — SPRAWDZONE, ŻADNEGO DDL NIE TRZEBA
-- ============================================================
-- SPRAWDZONE w supabase_migrations/110_careflow_system.sql: kolumna `skipped_at TIMESTAMPTZ`
-- istnieje w care_tasks od mig 110 (definicja tabeli), razem z indeksem częściowym
--   idx_care_tasks_pending ON care_tasks(scheduled_at) WHERE completed_at IS NULL AND skipped_at IS NULL
-- czyli dokładnie pod zapytanie crona o zadania do wysłania. Mig 181 NIE dodaje tu nic.
--
-- Dlaczego to w ogóle sprawdzamy: generator zadań (src/lib/careflowSchedule.ts, buildTasks)
-- zaczął tę kolumnę WYPEŁNIAĆ przy tworzeniu zadań — krok, którego termin minął wcześniej
-- niż PAST_GRACE_HOURS (2 h) przed momentem akceptacji protokołu, powstaje OD RAZU jako
-- pominięty (`skipped_at = now`). Bez tego akceptacja protokołu tuż po zabiegu tworzyła kroki
-- „-24 h / -16 h / -8 h" z terminem w przeszłości, a najbliższy przebieg crona wysyłał je
-- wszystkie naraz — pacjent dostawał serię przypomnień o dawkach leków w jednej minucie.
-- Cron je pomija (filtr `.is('skipped_at', null)`), a personel nadal widzi, że krok wypadł.
-- Kontrola 8 w bloku WERYFIKACJA potwierdza obecność kolumny na danym środowisku — gdyby
-- jej nie było (niepełna mig 110), INSERT-y generatora leciałyby błędem 42703.

COMMIT;

-- ============================================================
-- WERYFIKACJA PO WGRANIU — skopiuj CAŁY blok poniżej i uruchom jednym wklejeniem
-- ============================================================
-- Edytor SQL w Supabase pokazuje wynik tylko OSTATNIEGO zapytania i połyka RAISE NOTICE,
-- dlatego cała weryfikacja to JEDNO zapytanie zwracające tabelkę kontroli.
--
-- OCZEKIWANY WYNIK: 12 wierszy (kontrola nr 2 to trzy wiersze — po jednym na indeks),
-- w kolumnie „ocena" wszędzie OK (jedyny dopuszczalny wyjątek: „DO SPRZĄTNIĘCIA" w 10).
--   1 — definicja CHECK-a statusu zawiera 'proposed' (i pozostałe 4 wartości),
--   2 — trzy nowe indeksy: patient_db_id, care_tasks(step_id), (status, appointment_date),
--   3 — UNIQUE idx_care_templates_name_uniq istnieje,
--   4 — brak duplikatów nazw szablonów,
--   5 — kolumna access_token_expires_at jest typu timestamp with time zone,
--   6 — ZERO zapisów bez terminu ważności tokenu — backfill z sekcji 4 objął wszystkie
--       wiersze; „SPRAWDZ" (>0) znaczy, że UPDATE nie doszedł i część linków została
--       bezterminowa,
--   7 — komentarz patients.notification_preferences wspomina careflow_reminders,
--   8 — care_tasks.skipped_at istnieje (kolumna z mig 110, wypełniana przez generator
--       dla kroków po terminie); „BRAK" = niepełna mig 110, NIE deployuj kodu,
--   9 — rozkład zapisów wg statusu. Oczekiwane: wyłącznie wartości z CHECK-a. Wiersz jest
--       informacyjny — 'proposed' może mieć 0 (auto-kwalifikacja jeszcze nie chodziła) i to
--       jest OK; „SPRAWDZ" pojawi się tylko przy statusie spoza listy albo NULL-u,
--  10 — zadania OTWARTE (bez completed_at i bez skipped_at) z terminem starszym niż 12 h.
--       Oczekiwane docelowo 0. Zaraz po wgraniu może być >0 (zaległości sprzed migracji) —
--       wtedy „DO SPRZĄTNIĘCIA": domknie je sweep w cronie careflow-push (chodzi co 5 min),
--       powtórz kontrolę po ~15 min. Jeśli liczba NIE spada — sweep nie działa i pacjent
--       może dostać przypomnienie o dawce sprzed pół doby; to jest powód do reakcji.
-- „DO DECYZJI" w wierszach 3/4 = w tym środowisku SĄ duplikaty nazw szablonów; migracja
-- świadomie NIE założyła indeksu, szablony trzeba scalić ręcznie i puścić migrację ponownie.
-- Jakiekolwiek „SPRAWDZ" = coś nie powstało — szczegół w kolumnie „wynik".

WITH kontrola AS (
    SELECT 1 AS lp,
           'CHECK-i na care_enrollments (musi być ''proposed'')'::TEXT AS kontrola,
           COALESCE((
               SELECT string_agg(pg_get_constraintdef(c.oid), ' | ' ORDER BY c.conname)
               FROM pg_constraint c
               WHERE c.conrelid = to_regclass('public.care_enrollments')::OID
                 AND c.contype = 'c'
           ), '(BRAK CHECK-ów)')::TEXT AS wynik,
           'CHECK ((status = ANY (ARRAY[''active''::text, ''completed''::text, ''cancelled''::text, ''paused''::text, ''proposed''::text])))'::TEXT AS oczekiwane,
           CASE WHEN EXISTS (
               SELECT 1 FROM pg_constraint c
               WHERE c.conrelid = to_regclass('public.care_enrollments')::OID
                 AND c.contype = 'c'
                 AND pg_get_constraintdef(c.oid) ILIKE '%proposed%'
           ) THEN 'OK' ELSE 'SPRAWDZ' END::TEXT AS ocena

    UNION ALL
    SELECT 2,
           ('Indeks ' || v.idx)::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM pg_indexes i WHERE i.schemaname = 'public' AND i.indexname::TEXT = v.idx)
                THEN 'jest' ELSE 'BRAK' END::TEXT,
           'jest'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM pg_indexes i WHERE i.schemaname = 'public' AND i.indexname::TEXT = v.idx)
                THEN 'OK' ELSE 'SPRAWDZ' END::TEXT
    FROM (VALUES
        ('idx_care_enrollments_patient_db_id'),
        ('idx_care_tasks_step'),
        ('idx_care_enrollments_status_date')
    ) AS v(idx)

    UNION ALL
    SELECT 3,
           'UNIQUE idx_care_templates_name_uniq'::TEXT,
           CASE
               WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_care_templates_name_uniq') THEN 'jest'
               WHEN EXISTS (SELECT 1 FROM care_templates GROUP BY name HAVING COUNT(*) > 1) THEN 'BRAK — migracja pominęła indeks, bo są duplikaty nazw'
               ELSE 'BRAK'
           END::TEXT,
           'jest'::TEXT,
           CASE
               WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_care_templates_name_uniq') THEN 'OK'
               WHEN EXISTS (SELECT 1 FROM care_templates GROUP BY name HAVING COUNT(*) > 1) THEN 'DO DECYZJI'
               ELSE 'SPRAWDZ'
           END::TEXT

    UNION ALL
    SELECT 4,
           'Duplikaty nazw w care_templates'::TEXT,
           COALESCE((
               SELECT string_agg(d.name || ' (x' || d.cnt || ')', ', ')
               FROM (SELECT name, COUNT(*) AS cnt FROM care_templates GROUP BY name HAVING COUNT(*) > 1) d
           ), 'brak')::TEXT,
           'brak'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM care_templates GROUP BY name HAVING COUNT(*) > 1)
                THEN 'DO DECYZJI' ELSE 'OK' END::TEXT

    UNION ALL
    SELECT 5,
           'Kolumna care_enrollments.access_token_expires_at'::TEXT,
           COALESCE((
               SELECT data_type::TEXT FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'care_enrollments'
                 AND column_name = 'access_token_expires_at'
           ), 'BRAK')::TEXT,
           'timestamp with time zone'::TEXT,
           CASE WHEN EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'care_enrollments'
                 AND column_name = 'access_token_expires_at'
           ) THEN 'OK' ELSE 'SPRAWDZ' END::TEXT

    UNION ALL
    -- to_jsonb(e) zamiast e.access_token_expires_at, żeby ten blok dało się uruchomić
    -- także PRZED migracją (odwołanie do nieistniejącej kolumny nie przeszłoby parsera).
    SELECT 6,
           'Zapisy bez terminu ważności tokenu'::TEXT,
           (SELECT COUNT(*)::TEXT FROM care_enrollments e
             WHERE (to_jsonb(e) ->> 'access_token_expires_at') IS NULL),
           '0'::TEXT,
           CASE WHEN (SELECT COUNT(*) FROM care_enrollments e
                       WHERE (to_jsonb(e) ->> 'access_token_expires_at') IS NULL) = 0
                THEN 'OK' ELSE 'SPRAWDZ' END::TEXT

    UNION ALL
    SELECT 7,
           'Komentarz patients.notification_preferences'::TEXT,
           CASE WHEN COALESCE((
                    SELECT col_description(a.attrelid, a.attnum)
                    FROM pg_attribute a
                    WHERE a.attrelid = to_regclass('public.patients')::OID
                      AND a.attname = 'notification_preferences'
                      AND NOT a.attisdropped
                ), '') LIKE '%careflow_reminders%'
                THEN 'zawiera careflow_reminders' ELSE 'BRAK wzmianki o careflow_reminders' END::TEXT,
           'zawiera careflow_reminders'::TEXT,
           CASE WHEN COALESCE((
                    SELECT col_description(a.attrelid, a.attnum)
                    FROM pg_attribute a
                    WHERE a.attrelid = to_regclass('public.patients')::OID
                      AND a.attname = 'notification_preferences'
                      AND NOT a.attisdropped
                ), '') LIKE '%careflow_reminders%'
                THEN 'OK' ELSE 'SPRAWDZ' END::TEXT

    UNION ALL
    -- Kolumna z mig 110 — generator wypełnia ją dla kroków, których termin już minął.
    SELECT 8,
           'Kolumna care_tasks.skipped_at (z mig 110)'::TEXT,
           COALESCE((
               SELECT data_type::TEXT FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'care_tasks'
                 AND column_name = 'skipped_at'
           ), 'BRAK')::TEXT,
           'timestamp with time zone'::TEXT,
           CASE WHEN EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'care_tasks'
                 AND column_name = 'skipped_at'
           ) THEN 'OK' ELSE 'SPRAWDZ' END::TEXT

    UNION ALL
    -- Rozkład statusów: pokazuje, czy 'proposed' w ogóle wchodzi do bazy po migracji.
    SELECT 9,
           'Zapisy wg statusu (w tym ''proposed'')'::TEXT,
           COALESCE((
               SELECT string_agg(s.status || ': ' || s.cnt, ', ' ORDER BY s.status)
               FROM (
                   SELECT COALESCE(status, '(NULL)') AS status, COUNT(*) AS cnt
                   FROM care_enrollments
                   GROUP BY 1
               ) s
           ), 'brak zapisów')::TEXT,
           'tylko: active / cancelled / completed / paused / proposed (0 przy ''proposed'' jest OK)'::TEXT,
           CASE WHEN EXISTS (
               SELECT 1 FROM care_enrollments
               WHERE status IS NULL
                  OR status NOT IN ('active', 'completed', 'cancelled', 'paused', 'proposed')
           ) THEN 'SPRAWDZ' ELSE 'OK' END::TEXT

    UNION ALL
    -- Zaległości, które ma domykać sweep w cronie careflow-push (co 5 min).
    SELECT 10,
           'Zadania otwarte starsze niż 12 h'::TEXT,
           (SELECT COUNT(*)::TEXT
              FROM care_tasks t
             WHERE t.completed_at IS NULL
               AND t.skipped_at IS NULL
               AND t.scheduled_at < NOW() - INTERVAL '12 hours')::TEXT,
           '0 (po wgraniu może być >0 — sweep domyka je w ciągu kilkunastu minut)'::TEXT,
           CASE WHEN (SELECT COUNT(*)
                        FROM care_tasks t
                       WHERE t.completed_at IS NULL
                         AND t.skipped_at IS NULL
                         AND t.scheduled_at < NOW() - INTERVAL '12 hours') = 0
                THEN 'OK' ELSE 'DO SPRZĄTNIĘCIA' END::TEXT
)
SELECT lp, kontrola, wynik, oczekiwane, ocena
FROM kontrola
ORDER BY lp, kontrola;

-- ============================================================
-- Świadomie POZA tą migracją (wymaga decyzji, nie kodu)
-- ============================================================
-- 1. RETENCJA care_*. Tabele care_enrollments / care_tasks / care_audit_log rosną
--    bez żadnego limitu — cron data-retention-cleanup (mig S8-5) nie ma dla nich wpisu.
--    Do ustalenia: ile trzymamy zakończone protokoły (dane medyczne: art. 29 ustawy
--    o prawach pacjenta sugeruje 20 lat dla dokumentacji, ale CareFlow to raczej
--    warstwa operacyjna niż dokumentacja medyczna) oraz czy audyt (care_audit_log)
--    ma krótszy okres niż same zapisy.
--
-- 2. BUCKET `careflow-reports`. Powstaje AD HOC w runtime (createBucket w
--    /api/cron/careflow-report, /api/admin/careflow/report/[id], /api/admin/careflow/simulate) —
--    nie ma żadnej migracji, żadnych polityk storage.objects, żadnego allowed_mime_types
--    ani retencji, a leżą tam PDF-y z danymi medycznymi pacjentów. Do zrobienia osobną
--    migracją wzorem mig 125 (social-media lockdown): jawne utworzenie bucketa jako
--    prywatnego, limit rozmiaru, allowed_mime_types = application/pdf, brak polityk
--    publicznych (dostęp wyłącznie przez signed URL z endpointu za auth) + kasowanie
--    starych raportów.
--
-- 3. EGZEKWOWANIE access_token_expires_at. Sama kolumna niczego nie blokuje — walidacja
--    „token wygasł" siedzi W KODZIE i JEST JUŻ AKTYWNA: GET /api/careflow/[token] oraz
--    POST /api/careflow/[token]/complete zwracają 404 (celowo taki sam jak dla nieistniejącego
--    tokenu). Dlatego backfill w sekcji 4 ma podłogę „teraz + 30 dni" — inaczej wgranie
--    migracji zamknęłoby stare linki natychmiast. POZA migracją zostaje decyzja produktowa:
--    co pacjent ma zobaczyć po wygaśnięciu (dziś: to samo 404) i jak prosi o nowy link.
--
-- 4. D4 (domyślnie 3 przypomnienia co 45 min). Celowo NIE zmieniamy DEFAULT-ów
--    care_templates.push_settings ani care_template_steps.reminder_interval_minutes/
--    reminder_max_count z mig 110, żeby nie zmienić po cichu zachowania istniejącego
--    panelu web ani istniejącego protokołu. Nowa kadencja jest ustawiana jawnie przez
--    aplikację przy tworzeniu nowych protokołów.
