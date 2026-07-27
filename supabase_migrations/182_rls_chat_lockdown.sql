-- ============================================================================
-- 182 — ZAMKNIECIE WYCIEKU: tabele czatu czytelne dla KAZDEGO zalogowanego
-- ============================================================================
--
-- CO BYLO NIE TAK
-- Migracja 051 nadala tabelom chat_messages i chat_conversations polityke:
--     CREATE POLICY "authenticated_only" ON chat_messages USING (auth.role() = 'authenticated');
-- Brak FOR         -> polityka obejmuje SELECT, INSERT, UPDATE i DELETE,
-- brak WITH CHECK  -> ten sam (prawdziwy) warunek dla zapisow,
-- brak TO          -> dotyczy rol anon, authenticated ORAZ service_role.
--
-- Rejestracja w Supabase jest otwarta (disable_signup = false), wiec "authenticated"
-- to NIE jest personel kliniki — to dowolna osoba, ktora zalozy konto na dowolny
-- adres e-mail i potwierdzi go w swojej skrzynce.
--
-- ZWERYFIKOWANE ODTWORZENIEM ATAKU (2026-07-27, produkcja): konto bez zadnych rol,
-- zalogowane KLUCZEM PUBLICZNYM, odczytalo tresci wiadomosci i nazwiska pacjentow
-- z chat_messages oraz chat_conversations (w tym guest_token, czyli pelny dostep do
-- watkow gosci). Konto testowe usunieto natychmiast po sprawdzeniu.
-- Ta sama proba na patients, employee_tasks i care_tasks zwrocila zero wierszy —
-- tamte tabele zamknela migracja 132. Czat zostal wtedy POMINIETY, bo panel admina
-- slucha na nim Supabase Realtime kluczem publicznym.
--
-- CO ZMIENIA TA MIGRACJA
-- 1. Dostep do danych: wylacznie rola serwisowa (konwencja projektu po audycie 132).
-- 2. Wyjatek: zalogowany PRACOWNIK moze SELECT — bez tego Realtime w panelu admina
--    przestalby dostarczac zdarzenia (klient musi miec prawo odczytu wiersza).
--    Zapis z przegladarki zostaje zamkniety: zadien komponent nie pisze do tych tabel
--    bezposrednio (sprawdzone — AdminChat tylko subskrybuje kanal).
-- 3. page_templates: ten sam wzorzec z migracji 091, bez wyjatku dla odczytu —
--    tabela jest uzywana wylacznie przez trasy API z rola serwisowa.
--
-- IDEMPOTENTNA. Bezpieczna do uruchomienia dwa razy.
-- WGRAC NA OBA SRODOWISKA SUPABASE.
-- ============================================================================

-- ── 1. Sprawdzenie roli bez wpadania we wlasne RLS ─────────────────────────
-- user_roles ma polityke USING (false) (mig 051), wiec podzapytanie o role
-- wykonane w kontekscie zalogowanego uzytkownika zwrocilo by ZAWSZE falsz.
-- Dlatego funkcja SECURITY DEFINER — wykonuje sie z prawami wlasciciela.
-- STABLE, bo w obrebie jednego zapytania wynik sie nie zmienia (planer moze cache'owac).
CREATE OR REPLACE FUNCTION public.is_clinic_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'employee')
    );
$$;

COMMENT ON FUNCTION public.is_clinic_staff() IS
    'TRUE, gdy zalogowany uzytkownik ma role admin/employee. SECURITY DEFINER, bo user_roles ma RLS USING (false). Uzywane w politykach RLS czatu.';

REVOKE ALL ON FUNCTION public.is_clinic_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_clinic_staff() TO authenticated, service_role;

-- ── 2. chat_conversations ──────────────────────────────────────────────────
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_only" ON chat_conversations;
DROP POLICY IF EXISTS chat_conversations_service_only ON chat_conversations;
DROP POLICY IF EXISTS chat_conversations_staff_read ON chat_conversations;

CREATE POLICY chat_conversations_service_only ON chat_conversations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tylko odczyt i tylko personel — utrzymuje Realtime w panelu admina.
CREATE POLICY chat_conversations_staff_read ON chat_conversations
    FOR SELECT TO authenticated USING (public.is_clinic_staff());

-- ── 3. chat_messages ───────────────────────────────────────────────────────
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_only" ON chat_messages;
DROP POLICY IF EXISTS chat_messages_service_only ON chat_messages;
DROP POLICY IF EXISTS chat_messages_staff_read ON chat_messages;

CREATE POLICY chat_messages_service_only ON chat_messages
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY chat_messages_staff_read ON chat_messages
    FOR SELECT TO authenticated USING (public.is_clinic_staff());

-- ── 4. page_templates (ten sam wzorzec z mig 091) ──────────────────────────
-- Dowolne zalogowane konto moglo dotad tworzyc, zmieniac i kasowac szablony stron.
-- Zadien komponent przegladarki tej tabeli nie dotyka — wylacznie /api/admin/templates.
ALTER TABLE page_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS page_templates_select ON page_templates;
DROP POLICY IF EXISTS page_templates_insert ON page_templates;
DROP POLICY IF EXISTS page_templates_update ON page_templates;
DROP POLICY IF EXISTS page_templates_delete ON page_templates;
DROP POLICY IF EXISTS page_templates_service_only ON page_templates;

CREATE POLICY page_templates_service_only ON page_templates
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- WERYFIKACJA — uruchom PO wgraniu. Oczekiwany wynik opisany przy kazdym zapytaniu.
-- ============================================================================

-- 1) Polityki na tabelach czatu.
--    OCZEKIWANE: po dwa wiersze na tabele — *_service_role (ALL, role {service_role})
--    i *_staff_read (SELECT, role {authenticated}). ZADNEGO wiersza "authenticated_only".
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('chat_conversations', 'chat_messages', 'page_templates')
ORDER BY tablename, policyname;

-- 2) Czy gdziekolwiek indziej zostal ten sam wzorzec.
--    UWAGA: polityka utworzona BEZ klauzuli TO (czyli dokladnie ta wadliwa) ma w
--    pg_policies.roles wartosc {public}, a NIE {authenticated} — warunek na
--    'authenticated' = ANY(roles) ODFILTROWALBY ja i dal falszywe "czysto".
--    Dlatego pytamy o KAZDA polityke, ktora wpuszcza role inne niz service_role.
--    OCZEKIWANE: wylacznie tabele z trescia publiczna (blog_posts, news, products,
--    google_reviews, polish_holidays, site_settings, booking_settings,
--    consent_field_mappings, google_business_meta). Cokolwiek z danymi pacjenta,
--    personelu albo konfiguracja = do zamkniecia.
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND NOT (roles = ARRAY['service_role']::name[])
ORDER BY tablename, policyname;

-- 2b) Waski podzbior: polityki oparte o sama role zalogowania (wzorzec z mig 051).
--     OCZEKIWANE: 0 wierszy.
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%auth.role()%' OR with_check LIKE '%auth.role()%')
ORDER BY tablename;

-- 2c) Miny w repozytorium (NIE w bazie): migracje 055 i 096 tworza polityki
--     TO authenticated USING (true) na feature_suggestions, feature_suggestion_comments
--     i employee_tasks. Na produkcji NIE obowiazuja (zweryfikowane: tabele maja
--     odpowiednio 25/12/265 wierszy, a konto bez rol widzi zero i dostaje 403 przy
--     zapisie) — ale ponowne uruchomienie tamtych plikow otworzyloby te tabele.
--     To zapytanie potwierdza stan faktyczny. OCZEKIWANE: 0 wierszy.
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('feature_suggestions', 'feature_suggestion_comments', 'employee_tasks')
  AND 'authenticated' = ANY (roles);

-- 3) Funkcja pomocnicza istnieje i jest SECURITY DEFINER.
--    OCZEKIWANE: 1 wiersz, prosecdef = true.
SELECT proname, prosecdef
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'is_clinic_staff';

-- 4) RLS wlaczone na wszystkich trzech tabelach.
--    OCZEKIWANE: 3 wiersze, rowsecurity = true.
SELECT relname, relrowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('chat_conversations', 'chat_messages', 'page_templates');

-- 5) TEST ZACHOWANIA, nie struktury. Sama obecnosc polityki nie dowodzi, ze dziala:
--    is_clinic_staff() omija RLS na user_roles tylko dlatego, ze wlascicielem funkcji
--    jest wlasciciel tabeli. Gdyby bylo inaczej, funkcja zwracalaby ZAWSZE false i
--    Realtime w panelu admina cicho by umarl (dane pozostalyby bezpieczne).
--    OCZEKIWANE: pierwsza kolumna true dla konta pracownika, false dla konta bez rol.
SELECT
    public.is_clinic_staff()                                        AS czy_personel,
    (SELECT count(*) FROM public.user_roles)                        AS widocznych_rol,
    auth.uid()                                                      AS moje_uid;
-- W SQL Editorze zapytanie wykonuje sie jako rola serwisowa, wiec zwroci false/0 —
-- to NIE jest blad. Realny dowod dziala od strony klienta i zostal wykonany:
-- konto bez rol => 0 wierszy i 403 przy zapisie; konto pracownika => odczyt dziala,
-- zapis 403 (czyli Realtime zyje, a pisac mozna wylacznie przez API).

