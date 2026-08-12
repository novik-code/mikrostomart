-- ============================================================================
-- Migracja 192 — ścieżki obiektów Storage (etap A zamykania publicznych bucketów)
-- Data: 2026-08-12
-- Wejście: plan napraw bezpieczeństwa, pozycja 2 · `~/Desktop/bałagan/PLAN_BUCKETY_2026-08-12.md`
--
-- ⚠️ NUMERACJA: 191 zajęte (`mfa_epoch`). Ta migracja bierze 192.
--
-- ============================================================================
-- PO CO
-- ============================================================================
--
-- Buckety `consents`, `consent-pdfs` i `task-images` są PUBLICZNE: kto zna albo
-- zgadnie adres, pobiera plik bez klucza, bez logowania i bez śladu w audycie.
-- W `consents` leżą e-Karty (PESEL, wywiad, podpis), a ścieżka jest przewidywalna:
-- `<numer_kartoteki>/<plik>.pdf`, gdzie numer kartoteki jest kolejny.
--
-- Docelowo pliki wydajemy podpisanym adresem z trasy-pośrednika. Do tego trzeba
-- w bazie trzymać KLUCZ OBIEKTU, a nie gotowy adres publiczny. Ta migracja
-- dokłada kolumny `*_path`, umie wyliczyć klucz ze starego adresu i przepina
-- dane — ale WYŁĄCZNIE wtedy, gdy nie zgubi ani jednego wiersza.
--
-- Sama migracja NIC NIE ZAMYKA i nic nie psuje: kolumny są dodatkowe, stare
-- adresy zostają nietknięte. Zamykanie bucketów to etapy B i C.
--
-- ============================================================================
-- CO ZMIERZONO NA PRODUKCJI PRZED NAPISANIEM TEGO PLIKU (2026-08-12)
-- ============================================================================
--
--   patient_consents.file_url            2545 wierszy, 2545 adresów, WSZYSTKIE
--                                        w kształcie /object/public/consents/<2 segmenty>
--   patient_intake_submissions.pdf_url    314 wierszy, 300 adresów (14 NULL), ten sam kształt
--   employee_tasks.image_urls             299 wierszy, 202 elementy: 199 adresów
--                                        /object/public/task-images/tasks/<plik>, 3 PUSTE STRINGI
--   employee_tasks.image_url               85 niepustych — WSZYSTKIE obecne takze w image_urls
--                                        (czyli zero nowych plikow, ale kolumna jest zywa w kodzie)
--   consent_field_mappings.pdf_file        35 wierszy: 25 adresow do bucketa consent-pdfs
--                                        (14 aktywnych + 11 nieaktywnych) i 10 golych nazw plikow
--                                        ze statyku public/zgody — te ostatnie NIE sa strata
--
-- 🔴 WSZYSTKIE 14 AKTYWNYCH typow zgod ma adres do bucketa `consent-pdfs`. Zamkniecie go
--    bez etapu B wylacza 100% zgod mozliwych do podpisania na tablecie, nie 71% jak
--    zakladal plan (tamta liczba braa pod uwage takze wiersze nieaktywne).
--
-- Symulacja backfillu wykonana na tych danych PRZED napisaniem migracji:
--    STRATA 0 we wszystkich pieciu wierszach, a kazdy wyliczony klucz ma swoj obiekt
--    w buckecie (przejrzane 892 foldery `consents`, 252 obiekty `task-images/tasks`,
--    22 obiekty `consent-pdfs/consent-templates`). Kontrola negatywna: klucz z doklejonym
--    `.bak` nie zostal znaleziony.
--
-- 🔑 Kształt jest JEDEN, nie cztery — plan zakładał cztery „na wszelki wypadek".
--    Funkcja i tak obsługuje cztery, bo w okresie przejściowym mogą pojawić się
--    adresy podpisane, a defensywność nic tu nie kosztuje.
--
-- 🪤 **DWA adresy w `patient_consents` mają `%20` w nazwie pliku.** Naiwne ucięcie
--    prefiksu daje klucz, którego W BUCKECIE NIE MA (sprawdzone `storage.list`:
--    surowy klucz nie pasuje, zdekodowany pasuje). Bez dekodowania procentowego
--    te dwie zgody dostałyby podpisany adres do nieistniejącego obiektu i zniknęłyby
--    po cichu — z kodem 200 na liście i błędem dopiero przy otwarciu. Stąd
--    `url_decode_component`.
--
-- 🪤 Pomiar był POWTÓRZONY: pierwszy przebieg zwrócił „1000 wierszy" dla
--    `patient_consents`, bo PostgREST tnie odpowiedź do 1000. Prawdziwa liczba to
--    2545. Ta sama pułapka urwała kiedyś pamięć crona propozycji AI.
--
-- ============================================================================
-- KOLEJNOŚĆ UŻYCIA (nie odwracać)
-- ============================================================================
--   1. Wgraj tę migrację  → powstają kolumny i funkcje, DANE BEZ ZMIAN.
--   2. `SELECT * FROM storage_backfill_report();`  → kolumna `strata` MUSI być 0.
--   3. `SELECT * FROM storage_backfill_apply();`   → dopiero teraz UPDATE.
--      Funkcja SAMA odmawia pracy, gdy `strata > 0` — nie da się przeskoczyć kroku 2.
--   4. Powtórz raport: `do_przepiecia` = 0.
-- ============================================================================

-- ── 1. Dekodowanie procentowe ───────────────────────────────────────────────
-- Postgres nie ma wbudowanego dekodera URL. Składamy bajty: każde %XX to jeden
-- bajt szesnastkowy, każdy inny znak zamieniamy na jego bajty UTF-8, całość
-- dekodujemy jako tekst. WITH ORDINALITY, bo bez jawnego porządku `string_agg`
-- nie gwarantuje kolejności i nazwa pliku wyszłaby przestawiona.
CREATE OR REPLACE FUNCTION url_decode_component(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT CASE
        WHEN p_text IS NULL THEN NULL
        WHEN position('%' IN p_text) = 0 THEN p_text   -- 2543 z 2545 przypadków
        ELSE (
            SELECT convert_from(decode(string_agg(czesc, '' ORDER BY ord), 'hex'), 'utf8')
            FROM (
                SELECT ord,
                       CASE WHEN m[1] IS NOT NULL
                            THEN m[1]
                            ELSE encode(convert_to(m[2], 'utf8'), 'hex')
                       END AS czesc
                FROM regexp_matches(p_text, '%([0-9a-fA-F]{2})|(.)', 'g')
                     WITH ORDINALITY AS t(m, ord)
            ) x
        )
    END
$$;

COMMENT ON FUNCTION url_decode_component(TEXT) IS
    'Dekodowanie procentowe adresu. Potrzebne, bo klucz obiektu w Storage jest ZDEKODOWANY '
    '(zmierzone: 2 zgody z %20 w nazwie nie pasowaly do klucza bez dekodowania).';

-- ── 2. Klucz obiektu z adresu ───────────────────────────────────────────────
-- Zwraca NULL dla wszystkiego, czego NIE UMIE rozpoznać jako adresu tego bucketa.
-- To celowe: NULL jest sygnałem STRATY w raporcie, a nie cichym „jakoś to będzie".
CREATE OR REPLACE FUNCTION resolve_object_path(p_url TEXT, p_bucket TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    v_url      TEXT := btrim(coalesce(p_url, ''));
    v_reszta   TEXT;
    v_pozycja  INT;
    v_znacznik TEXT;
BEGIN
    IF v_url = '' THEN
        RETURN NULL;
    END IF;

    -- Kształt 1: /storage/v1/object/public/<bucket>/…   (jedyny występujący w danych)
    -- Kształt 2: /storage/v1/object/sign/<bucket>/…?token=…   (adres podpisany)
    -- Kształt 3: /storage/v1/object/<bucket>/…                (wariant bez public/sign)
    FOREACH v_znacznik IN ARRAY ARRAY[
        '/storage/v1/object/public/' || p_bucket || '/',
        '/storage/v1/object/sign/'   || p_bucket || '/',
        '/storage/v1/object/'        || p_bucket || '/'
    ] LOOP
        v_pozycja := position(v_znacznik IN v_url);
        IF v_pozycja > 0 THEN
            v_reszta := substring(v_url FROM v_pozycja + length(v_znacznik));
            v_reszta := split_part(v_reszta, '?', 1);          -- token/cache-buster precz
            v_reszta := split_part(v_reszta, '#', 1);
            v_reszta := url_decode_component(v_reszta);
            IF btrim(coalesce(v_reszta, '')) = '' THEN
                RETURN NULL;
            END IF;
            RETURN v_reszta;
        END IF;
    END LOOP;

    -- Kształt 4: to już goły klucz obiektu (tak zapisują NOWI pisarze).
    -- Wymagamy braku „http" i obecności ukośnika — inaczej sama nazwa pliku
    -- (np. statyk z public/zgody/) zostałaby wzięta za obiekt, którego w buckecie NIE MA.
    IF v_url NOT LIKE 'http%' AND position('/' IN v_url) > 0 THEN
        RETURN url_decode_component(ltrim(v_url, '/'));
    END IF;

    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION resolve_object_path(TEXT, TEXT) IS
    'Klucz obiektu Storage wyliczony z adresu. NULL = nie rozpoznano (sygnal STRATY w raporcie). '
    'Sama nazwa pliku bez ukosnika swiadomie daje NULL — to statyk z public/zgody, nie obiekt bucketa.';

-- ── 2b. Wariant wsadowy dla tras zapisu ─────────────────────────────────────
--
-- 🔑 PO CO OSOBNA FUNKCJA, A NIE PARSER W TYPESCRIPCIE. Trasy zapisu zadan
-- (`employee/tasks` POST i PATCH) dostaja od klienta GOTOWE ADRESY — apka 1.2.0
-- ze sklepu inaczej nie umie i juz tego nie zmienimy. Klucz musi wiec wyliczyc
-- serwer. Gdyby robil to wlasny parser w TS, mielibysmy DWIE implementacje tej samej
-- reguly, ktore rozjada sie przy pierwszej korekcie (fork planisty CareFlow kosztowal
-- juz te lekcje). Jedna implementacja, dwa wywolania: SQL dla backfillu i RPC dla tras.
--
-- Kolejnosc wejscia jest zachowana; element nierozpoznany daje NULL na swojej pozycji.
CREATE OR REPLACE FUNCTION resolve_object_paths(p_urls TEXT[], p_bucket TEXT)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT coalesce(
        (SELECT array_agg(resolve_object_path(u.val, p_bucket) ORDER BY u.ord)
           FROM unnest(coalesce(p_urls, ARRAY[]::TEXT[])) WITH ORDINALITY AS u(val, ord)
          WHERE btrim(coalesce(u.val,'')) <> ''),
        ARRAY[]::TEXT[]
    )
$$;

COMMENT ON FUNCTION resolve_object_paths(TEXT[], TEXT) IS
    'Wsadowy wariant resolve_object_path dla tras zapisu. Jedna implementacja reguly, '
    'wolana i przez backfill, i przez API — zeby nie powstal drugi parser w TypeScripcie.';

-- ── 3. Kolumny na klucze ────────────────────────────────────────────────────
--
-- 🪤 `employee_tasks.image_urls` MA INNY TYP W KAZDYM SRODOWISKU — zmierzone
-- w `information_schema.columns`, nie zalozone:
--     produkcja (Mikrostomart)  -> ARRAY / _text  (TEXT[], zgodnie z migracja 047)
--     demo      (densflow-demo) -> jsonb
-- Pierwsza wersja tego pliku uzywala `jsonb_typeof`, druga `unnest` — KAZDA dzialala
-- tylko w jednym srodowisku. `unnest` wywalil sie na demo bledem 42804 (COALESCE types
-- jsonb and text[] cannot be matched) i cala migracja sie wycofala.
-- 🔑 Pomiar przez PostgREST TEGO NIE ROZSTRZYGA — TEXT[] i jsonb wracaja po drodze
-- identycznie, jako tablica JSON. Typ czytac z katalogu bazy, per srodowisko.
-- Rozwiazanie: `to_jsonb(...)` normalizuje oba warianty przed iteracja.
-- `image_paths` jest TEXT[] w OBU srodowiskach — nowa kolumna ma byc wreszcie taka sama.
ALTER TABLE patient_consents            ADD COLUMN IF NOT EXISTS file_path   TEXT;
ALTER TABLE patient_intake_submissions  ADD COLUMN IF NOT EXISTS pdf_path    TEXT;
ALTER TABLE employee_tasks              ADD COLUMN IF NOT EXISTS image_paths TEXT[];
ALTER TABLE employee_tasks              ADD COLUMN IF NOT EXISTS image_path  TEXT;
ALTER TABLE consent_field_mappings      ADD COLUMN IF NOT EXISTS pdf_path    TEXT;

COMMENT ON COLUMN patient_consents.file_path IS
    'Klucz obiektu w buckecie consents (bez adresu). Zrodlo prawdy po zamknieciu bucketa; '
    'file_url zostaje na okres przejsciowy i dla wstecznej zgodnosci odczytow.';
COMMENT ON COLUMN patient_intake_submissions.pdf_path IS
    'Klucz obiektu e-Karty w buckecie consents (bez adresu).';
COMMENT ON COLUMN employee_tasks.image_paths IS
    'Klucze obiektow w buckecie task-images, w kolejnosci jak image_urls, bez pustych wpisow.';
COMMENT ON COLUMN employee_tasks.image_path IS
    'Klucz dla starej kolumny image_url. Zmierzone 2026-08-12: wszystkie 85 niepustych image_url '
    'wystepuja tez w image_urls, wiec ta kolumna nie wnosi nowych plikow — istnieje wylacznie po to, '
    'zeby stary tor renderu (TasksTab, apka) mial czym zastapic image_url bez szukania po indeksie.';
COMMENT ON COLUMN consent_field_mappings.pdf_path IS
    'Klucz szablonu w buckecie consent-pdfs. NULL dla 10 wierszy trzymajacych sama nazwe pliku — '
    'to statyki z public/zgody, ktorych w buckecie NIE MA (patrz raport, kolumna poza_storage).';

-- ── 3b. Rejestr dostępu pacjenta do własnego dokumentu ──────────────────────
--
-- 🔑 DLACZEGO NOWA TABELA, A NIE `employee_audit_log`. Tamta ma `user_id UUID NOT NULL`
-- z Supabase Auth, a pacjent loguje się WŁASNYM JWT i nie ma tam konta — wpis
-- fizycznie by nie przeszedł. Tożsamością pacjenta jest numer kartoteki Prodentisa.
--
-- Rejestr odpowiada na pytanie „czy i kiedy ten dokument był otwierany". Bez niego
-- publiczny bucket nie zostawiał ŻADNEGO śladu pobrania — a to e-Karty z PESEL-em.
-- Świadomie BEZ nazwiska i bez ścieżki: sama ścieżka w `consents` jest daną osobową
-- (zawiera imię i nazwisko), więc rejestr trzyma wyłącznie identyfikatory.
CREATE TABLE IF NOT EXISTS patient_document_access_log (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prodentis_patient_id TEXT NOT NULL,
    document_type        TEXT NOT NULL,   -- 'consent' | 'ekarta'
    document_id          TEXT NOT NULL,
    ip_address           TEXT,
    user_agent           TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pdal_patient ON patient_document_access_log(prodentis_patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdal_document ON patient_document_access_log(document_type, document_id);

-- RLS: wyłącznie rola serwisowa. Brak klauzuli `TO` znaczylby dostep takze dla `anon`
-- przez klucz publiczny — dokladnie ten blad zamykala migracja 182 na czacie.
ALTER TABLE patient_document_access_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pdal_service_role ON patient_document_access_log;
CREATE POLICY pdal_service_role ON patient_document_access_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE patient_document_access_log IS
    'Slad otwarcia dokumentu przez PACJENTA (trasa-posrednik). Bez nazwiska i bez sciezki — '
    'sciezka w buckecie consents sama w sobie zawiera imie i nazwisko.';

-- ── 4. Raport PRZED backfillem ──────────────────────────────────────────────
-- Rygor z pamieci projektu: zmiany dopasowania danych TYLKO poszerzaja, STRATA musi wynosic 0.
CREATE OR REPLACE FUNCTION storage_backfill_report()
RETURNS TABLE (
    tabela        TEXT,
    kolumna       TEXT,
    wierszy       BIGINT,
    do_przepiecia BIGINT,
    rozwiazane    BIGINT,
    strata        BIGINT,
    -- Wiersze SWIADOMIE poza zakresem: `consent_field_mappings.pdf_file` trzyma dla
    -- 10 pozycji sama nazwe pliku ze statyku `public/zgody/`, ktorego w buckecie NIE MA.
    -- Liczone osobno, a NIE jako strata — inaczej bramka `apply` blokowalaby backfill
    -- na zawsze, bo tych wierszy nie da sie rozwiazac i nie taki jest cel.
    poza_storage  BIGINT
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT 'patient_consents'::TEXT, 'file_url'::TEXT,
           count(*)::BIGINT,
           count(*) FILTER (WHERE btrim(coalesce(file_url,'')) <> '' AND file_path IS NULL)::BIGINT,
           count(*) FILTER (WHERE btrim(coalesce(file_url,'')) <> '' AND file_path IS NULL
                              AND resolve_object_path(file_url, 'consents') IS NOT NULL)::BIGINT,
           count(*) FILTER (WHERE btrim(coalesce(file_url,'')) <> '' AND file_path IS NULL
                              AND resolve_object_path(file_url, 'consents') IS NULL)::BIGINT,
           0::BIGINT
      FROM patient_consents

    UNION ALL
    SELECT 'patient_intake_submissions'::TEXT, 'pdf_url'::TEXT,
           count(*)::BIGINT,
           count(*) FILTER (WHERE btrim(coalesce(pdf_url,'')) <> '' AND pdf_path IS NULL)::BIGINT,
           count(*) FILTER (WHERE btrim(coalesce(pdf_url,'')) <> '' AND pdf_path IS NULL
                              AND resolve_object_path(pdf_url, 'consents') IS NOT NULL)::BIGINT,
           count(*) FILTER (WHERE btrim(coalesce(pdf_url,'')) <> '' AND pdf_path IS NULL
                              AND resolve_object_path(pdf_url, 'consents') IS NULL)::BIGINT,
           0::BIGINT
      FROM patient_intake_submissions

    UNION ALL
    -- Zadania liczymy per ELEMENT tablicy, nie per wiersz — inaczej jeden zly adres
    -- w tablicy piecioelementowej schowalby sie za czterema dobrymi.
    -- 🪤 `image_urls` to TEXT[], wiec `unnest`, NIE `jsonb_array_elements_text`.
    SELECT 'employee_tasks'::TEXT, 'image_urls'::TEXT,
           (SELECT count(*) FROM employee_tasks)::BIGINT,
           count(*) FILTER (WHERE btrim(el.val) <> '')::BIGINT,
           count(*) FILTER (WHERE btrim(el.val) <> ''
                              AND resolve_object_path(el.val, 'task-images') IS NOT NULL)::BIGINT,
           count(*) FILTER (WHERE btrim(el.val) <> ''
                              AND resolve_object_path(el.val, 'task-images') IS NULL)::BIGINT,
           0::BIGINT
      FROM employee_tasks t
      -- 🪤 TYP TEJ KOLUMNY ROZNI SIE MIEDZY SRODOWISKAMI: produkcja ma TEXT[], demo jsonb
      -- (zmierzone w information_schema, nie zalozone). `to_jsonb` normalizuje OBA warianty:
      -- dla tablicy tekstowej robi tablice jsonb, dla jsonb jest tozsamoscia.
      CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(to_jsonb(t.image_urls), '[]'::JSONB)) AS el(val)
     WHERE t.image_paths IS NULL

    UNION ALL
    -- Stara kolumna pojedyncza. Zmierzone: 85 niepustych, wszystkie obecne takze
    -- w image_urls — ale pisze do niej `employee/tasks` POST i renderuje TasksTab,
    -- wiec zostawienie jej bez klucza znaczyloby martwa miniature po zamknieciu bucketa.
    SELECT 'employee_tasks'::TEXT, 'image_url'::TEXT,
           count(*)::BIGINT,
           count(*) FILTER (WHERE btrim(coalesce(image_url,'')) <> '' AND image_path IS NULL)::BIGINT,
           count(*) FILTER (WHERE btrim(coalesce(image_url,'')) <> '' AND image_path IS NULL
                              AND resolve_object_path(image_url, 'task-images') IS NOT NULL)::BIGINT,
           count(*) FILTER (WHERE btrim(coalesce(image_url,'')) <> '' AND image_path IS NULL
                              AND resolve_object_path(image_url, 'task-images') IS NULL)::BIGINT,
           0::BIGINT
      FROM employee_tasks

    UNION ALL
    -- Szablony zgod. `pdf_file` trzyma TRZY semantyki naraz: pelny adres, klucz
    -- `consent-templates/<plik>` i SAMA NAZWE pliku ze statyku `public/zgody/`.
    -- Ta ostatnia nie jest strata — tam po prostu nie ma czego przepinac.
    SELECT 'consent_field_mappings'::TEXT, 'pdf_file'::TEXT,
           count(*)::BIGINT,
           count(*) FILTER (WHERE pdf_file LIKE '%/%' AND pdf_path IS NULL)::BIGINT,
           count(*) FILTER (WHERE pdf_file LIKE '%/%' AND pdf_path IS NULL
                              AND resolve_object_path(pdf_file, 'consent-pdfs') IS NOT NULL)::BIGINT,
           count(*) FILTER (WHERE pdf_file LIKE '%/%' AND pdf_path IS NULL
                              AND resolve_object_path(pdf_file, 'consent-pdfs') IS NULL)::BIGINT,
           count(*) FILTER (WHERE btrim(coalesce(pdf_file,'')) <> '' AND pdf_file NOT LIKE '%/%')::BIGINT
      FROM consent_field_mappings
$$;

COMMENT ON FUNCTION storage_backfill_report() IS
    'Pomiar PRZED backfillem. Kolumna strata musi wynosic 0 — inaczej storage_backfill_apply odmowi pracy.';

-- ── 5. Backfill z bramką ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION storage_backfill_apply()
RETURNS TABLE (tabela TEXT, zaktualizowane BIGINT)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_strata BIGINT;
    v_n      BIGINT;
BEGIN
    -- 🔒 BRAMKA. Nie da sie uruchomic backfillu z niezerowa strata — pomiar nie jest
    -- uprzejma sugestia, tylko warunkiem. Gdyby kiedys pojawil sie adres w nieznanym
    -- ksztalcie, ta funkcja ma stanac, a nie zapisac NULL i pojsc dalej.
    SELECT coalesce(sum(r.strata), 0) INTO v_strata FROM storage_backfill_report() r;
    IF v_strata > 0 THEN
        RAISE EXCEPTION
            'BACKFILL WSTRZYMANY: % adresow nierozpoznanych. Uruchom SELECT * FROM storage_backfill_report() i napraw ksztalt, zanim sprobujesz ponownie.',
            v_strata;
    END IF;

    UPDATE patient_consents
       SET file_path = resolve_object_path(file_url, 'consents')
     WHERE file_path IS NULL AND btrim(coalesce(file_url,'')) <> '';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    tabela := 'patient_consents'; zaktualizowane := v_n; RETURN NEXT;

    UPDATE patient_intake_submissions
       SET pdf_path = resolve_object_path(pdf_url, 'consents')
     WHERE pdf_path IS NULL AND btrim(coalesce(pdf_url,'')) <> '';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    tabela := 'patient_intake_submissions'; zaktualizowane := v_n; RETURN NEXT;

    -- Kolejnosc elementow zachowana (ORDER BY ord), puste wpisy odsiane.
    -- coalesce(..., pusta tablica) zamyka temat wierszy bez zdjec — inaczej
    -- kazde kolejne uruchomienie liczyloby je od nowa.
    -- 🪤 `image_urls` to TEXT[] → `unnest` i `array_agg`, nie warianty jsonb.
    UPDATE employee_tasks t
       SET image_paths = coalesce((
               SELECT array_agg(resolve_object_path(x.val, 'task-images') ORDER BY x.ord)
                 FROM jsonb_array_elements_text(coalesce(to_jsonb(t.image_urls), '[]'::JSONB))
                      WITH ORDINALITY AS x(val, ord)
                WHERE btrim(x.val) <> ''
           ), ARRAY[]::TEXT[])
     WHERE t.image_paths IS NULL;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    tabela := 'employee_tasks.image_urls'; zaktualizowane := v_n; RETURN NEXT;

    UPDATE employee_tasks
       SET image_path = resolve_object_path(image_url, 'task-images')
     WHERE image_path IS NULL AND btrim(coalesce(image_url,'')) <> '';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    tabela := 'employee_tasks.image_url'; zaktualizowane := v_n; RETURN NEXT;

    -- Szablony: TYLKO te, ktore realnie leza w buckecie (maja ukosnik w pdf_file).
    -- Sama nazwa pliku = statyk z public/zgody → zostaje bez klucza, swiadomie.
    UPDATE consent_field_mappings
       SET pdf_path = resolve_object_path(pdf_file, 'consent-pdfs')
     WHERE pdf_path IS NULL AND pdf_file LIKE '%/%';
    GET DIAGNOSTICS v_n = ROW_COUNT;
    tabela := 'consent_field_mappings'; zaktualizowane := v_n; RETURN NEXT;

    RETURN;
END;
$$;

COMMENT ON FUNCTION storage_backfill_apply() IS
    'Przepina adresy na klucze obiektow. Odmawia pracy, gdy raport pokazuje strate > 0.';

-- ── 6. Dostęp: wyłącznie tor serwerowy ──────────────────────────────────────
REVOKE ALL ON FUNCTION url_decode_component(TEXT)          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION resolve_object_path(TEXT, TEXT)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION resolve_object_paths(TEXT[], TEXT)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION storage_backfill_report()           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION storage_backfill_apply()            FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION url_decode_component(TEXT)         TO service_role;
GRANT EXECUTE ON FUNCTION resolve_object_path(TEXT, TEXT)    TO service_role;
GRANT EXECUTE ON FUNCTION resolve_object_paths(TEXT[], TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION storage_backfill_report()          TO service_role;
GRANT EXECUTE ON FUNCTION storage_backfill_apply()           TO service_role;

-- ============================================================================
-- WERYFIKACJA (skopiuj do SQL Editora — kolejno, nie hurtem)
-- ============================================================================
--
-- (a) kontrola samej funkcji, bez dotykania danych — oczekiwane wartosci w komentarzach:
--     SELECT resolve_object_path('https://x.supabase.co/storage/v1/object/public/consents/0100000001/a.pdf','consents');
--            -- '0100000001/a.pdf'
--     SELECT resolve_object_path('https://x.supabase.co/storage/v1/object/public/consents/010/zgoda%20na%20rtg.pdf','consents');
--            -- '010/zgoda na rtg.pdf'   <-- zdekodowane
--     SELECT resolve_object_path('https://x.supabase.co/storage/v1/object/sign/consents/010/a.pdf?token=abc','consents');
--            -- '010/a.pdf'
--     SELECT resolve_object_path('https://x.supabase.co/storage/v1/object/public/INNY/010/a.pdf','consents');
--            -- NULL  (kontrola negatywna: cudzy bucket)
--     SELECT resolve_object_path('zgoda_na_rtg.pdf','consent-pdfs');
--            -- NULL  (kontrola negatywna: statyk z public/zgody, nie obiekt bucketa)
--
-- (b) raport — kolumna `strata` MUSI byc 0 we WSZYSTKICH PIECIU wierszach:
--     SELECT * FROM storage_backfill_report();
--     -- oczekiwane 2026-08-12 (do_przepiecia / rozwiazane / strata / poza_storage):
--     --   patient_consents.file_url             2545 / 2545 / 0 / 0
--     --   patient_intake_submissions.pdf_url     300 /  300 / 0 / 0
--     --   employee_tasks.image_urls              199 /  199 / 0 / 0
--     --   employee_tasks.image_url                85 /   85 / 0 / 0
--     --   consent_field_mappings.pdf_file         25 /   25 / 0 / 10
--     -- Rozbieznosc z tymi liczbami znaczy, ze dane zmienily sie od pomiaru —
--     -- wtedy NIE uruchamiac apply, tylko zglosic.
--
-- (c) dopiero teraz backfill:
--     SELECT * FROM storage_backfill_apply();
--
-- (d) kontrola po: `do_przepiecia` = 0 w kazdym wierszu
--     SELECT * FROM storage_backfill_report();
-- ============================================================================
