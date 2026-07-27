-- ============================================================================
-- 183 — CZAT WEWNĘTRZNY ZESPOŁU: rozmowy prywatne (DM) + jeden kanał grupowy
-- ============================================================================
--
-- CO TO JEST
-- Model danych komunikacji PRACOWNIK ↔ PRACOWNIK dla aplikacji mobilnej personelu.
-- Interfejs wyłącznie w apce (decyzja D8) — web NIE dostaje ekranów czatu wewnętrznego.
--
-- CZEGO TA MIGRACJA NIE RUSZA
-- Istniejący czat PACJENT ↔ RECEPCJA (`chat_conversations`, `chat_messages`, mig 032/170/182)
-- zostaje nietknięty co do joty — jest na produkcji i obsługuje apkę w App Store.
-- Powód rozdziału: tamten model ma autora jako dwuwartościową rolę ('patient'|'reception'),
-- nazwę nadawcy jako wolny tekst bez FK, jeden GLOBALNY bool `read` na wiadomość i CHECK
-- wymuszający pacjenta albo gościa w konwersacji. Rozmowa dwóch pracowników musiałaby
-- udawać gościa i natychmiast wyciekłaby do panelu recepcji, a licznik nieprzeczytanych
-- kłamałby każdemu poza pierwszą osobą, która otworzy wątek. Stąd osobna rodzina `staff_*`.
-- JEDYNY punkt styku: wspólna tabela `chat_attachments` (polimorficzny właściciel), żeby
-- nie budować dwóch magazynów plików.
--
-- DECYZJE WŁAŚCICIELA ODWZOROWANE W SCHEMACIE
-- D1  Jeden kanał grupowy dla CAŁEGO zespołu, pisać może każdy; PUSH wychodzi tylko wtedy,
--     gdy autorem jest admin (to egzekwuje KOD wysyłki, nie baza). W schemacie zostaje po
--     tym ślad: `idx_staff_conv_single_group` pilnuje, żeby kanał grupowy był DOKŁADNIE JEDEN
--     — dwa równolegle utworzone kanały po cichu rozdzieliłyby zespół na dwie połowy,
--     z których każda uważa, że ogłoszenia docierają do wszystkich.
-- D2  DM — push zawsze (kod).
-- D3  Wzmianka o pacjencie: w bazie leży WYŁĄCZNIE identyfikator Prodentisa
--     (`staff_messages.ref_patient_prodentis_id`), NIGDY nazwisko. Nazwisko podstawia się
--     przy wyświetlaniu. Wzorzec CHECK-a `^[0-9]{6,12}$` odrzuca UUID — prodentis id to
--     ciąg cyfr (np. '0100001711'), nie identyfikator z naszej bazy.
--     Tak samo zawężony jest `ref_appointment_id` (`staff_msg_appt_id_check`): było to
--     JEDYNE tekstowe pole wiadomości bez formatu i bez szyfrowania, czyli jedyna droga,
--     żeby przemycić nazwisko pacjenta jawnym tekstem obok `content`. Uzasadnienie
--     doboru wzorca — przy samym constraincie w sekcji 3.
-- D4  RETENCJA — EGZEKWUJE JĄ KOD, NIE BAZA (patrz blok „RETENCJA" niżej).
-- D5  DM są prywatne: `content` i `last_message_preview` trzymają SZYFROGRAM
--     (src/lib/fieldEncryption.ts, AES-256-GCM, klucz serwerowy ENCRYPTION_KEY).
--     To NIE jest end-to-end i nie wolno tego tak nazywać ani w kodzie, ani w UI.
-- D6  Odejście pracownika NIE kasuje rozmów — dlatego kolumny tożsamości (`sender_user_id`,
--     `created_by`, `user_id`, `deleted_by`) są CELOWO BEZ klucza obcego do `auth.users`.
--     FK z kaskadą skasowałby przy usunięciu konta historię ustaleń drugiej strony;
--     FK bez kaskady zablokowałby usunięcie konta. Zamiast tego offboarding ANONIMIZUJE
--     `sender_name_snapshot` (wzorzec z anonimizacji konta pacjenta) i ustawia `left_at`.
-- D7  Załączniki pacjenta wyłącznie od ZALOGOWANEGO pacjenta — gość nie. Stąd
--     `chat_attachments.origin` ma dwie wartości ('staff'|'patient'), bez 'guest',
--     a CHECK wymaga dla 'patient' wypełnionego `uploaded_by_patient_id`.
--
-- RETENCJA (D4) — CZYTAJ, ZANIM ZAŁOŻYSZ, ŻE DANE ŻYJĄ WIECZNIE
-- W schemacie NIE MA tabeli archiwum ani żadnego mechanizmu wygaszania. Jedynym nośnikiem
-- czasu jest `created_at`, a całą politykę wykonuje warstwa aplikacji:
--   • KANAŁ GRUPOWY (kind='group'): wiadomości starsze niż 12 miesięcy przestają być
--     widoczne dla zwykłego pracownika — API filtruje `created_at >= now() - 12 miesięcy`
--     dla roli 'employee'. Admin widzi wszystko (to jest owo „archiwum"). Nic się NIE kasuje.
--   • DM (kind='dm'): wiadomości starsze niż 12 miesięcy kasuje cron retencyjny
--     BEZPOWROTNIE (DELETE, nie soft-delete) — nie ma archiwum, bo nie ma nikogo, kto
--     miałby prawo je później czytać. Załączniki takich wiadomości znikają kaskadą
--     (`chat_attachments.staff_message_id ON DELETE CASCADE`), ale PLIKI W STORAGE zostają
--     — sprzątanie osieroconych obiektów musi być osobnym przebiegiem crona (Storage API
--     nie ma kaskad). To jest znana luka, nie przeoczenie: patrz „ŚWIADOMIE POZA MIGRACJĄ".
-- Pod oba przebiegi jest indeks po `created_at` (retencja) oraz po `(kind, last_message_at)`
-- (wyszukanie samych wątków DM bez skanowania całości).
--
-- IDEMPOTENTNA. Bezpieczna do uruchomienia dwa razy (CREATE ... IF NOT EXISTS,
-- DROP POLICY IF EXISTS przed CREATE POLICY). Wyłącznie ADDITYWNA — zero ALTER-ów
-- i zero DROP-ów na czymkolwiek, co już istnieje.
-- 🚨 WGRAĆ NA OBA ŚRODOWISKA SUPABASE (produkcja + demo) PRZED deployem kodu.
-- Po wgraniu uruchom blok WERYFIKACJA z końca pliku (osobne wklejenie, po COMMIT).
-- ============================================================================

BEGIN;

-- ── 0. Preflight: cele kluczy obcych muszą istnieć ─────────────────────────
-- FK do employee_tasks (mig 096) i chat_messages (mig 032). Bez tego migracja
-- wywaliłaby się surowym 42P01 i człowiek zgadywałby, której migracji brakuje.
DO $$
BEGIN
    IF to_regclass('public.employee_tasks') IS NULL THEN
        RAISE EXCEPTION 'Mig 183: brak tabeli public.employee_tasks — najpierw wgraj 096_employee_tasks_update.sql';
    END IF;
    IF to_regclass('public.chat_messages') IS NULL THEN
        RAISE EXCEPTION 'Mig 183: brak tabeli public.chat_messages — najpierw wgraj 032_chat.sql';
    END IF;
END $$;

-- ── 1. staff_conversations — wątki ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_conversations (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind                   TEXT        NOT NULL,
    title                  TEXT,
    dm_key                 TEXT,
    created_by             UUID        NOT NULL,
    status                 TEXT        NOT NULL DEFAULT 'open',
    last_message_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_preview   TEXT,
    last_message_sender_id UUID,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT staff_conv_kind_check
        CHECK (kind IN ('dm', 'group')),
    CONSTRAINT staff_conv_status_check
        CHECK (status IN ('open', 'archived')),

    -- Spójność kształtu wątku. DM nie ma tytułu (nazwą jest druga osoba, rozwiązywana
    -- przy renderze), grupa nie ma `dm_key` — dzięki temu unikalny indeks na `dm_key`
    -- jest realną gwarancją „jeden wątek na parę", a nie tylko konwencją w kodzie.
    CONSTRAINT staff_conv_shape_check
        CHECK (
            (kind = 'dm'    AND dm_key IS NOT NULL AND title IS NULL)
            OR
            (kind = 'group' AND dm_key IS NULL)
        ),

    -- Kanoniczna postać klucza pary: '<mniejszy uuid>:<większy uuid>', MAŁE litery.
    -- Dwa warunki naraz:
    --   a) format — dwa UUID-y rozdzielone dwukropkiem, wyłącznie [0-9a-f],
    --   b) kolejność — pierwszy człon MUSI być mniejszy od drugiego.
    -- Bez (b) ta sama para zapisana w odwrotnej kolejności założyłaby DRUGI wątek i dwie
    -- osoby pisałyby do siebie w dwóch równoległych rozmowach, każda widząc połowę ustaleń.
    -- Porównanie bajtowe (COLLATE "C") jest deterministyczne i niezależne od locale bazy;
    -- dla małych liter hex jest tożsame z porównaniem UUID-ów.
    CONSTRAINT staff_conv_dm_key_format_check
        CHECK (
            dm_key IS NULL
            OR (
                dm_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                AND (substring(dm_key FROM 1 FOR 36)  COLLATE "C")
                  < (substring(dm_key FROM 38 FOR 36) COLLATE "C")
            )
        )
);

COMMENT ON TABLE staff_conversations IS
    'Wątki czatu wewnętrznego personelu (mig 183). ''dm'' = rozmowa prywatna dwóch osób, '
    '''group'' = jeden kanał całego zespołu. Rozłączne z chat_conversations (czat pacjenta).';

COMMENT ON COLUMN staff_conversations.kind IS
    'dm | group. ''group'' może istnieć tylko JEDEN (idx_staff_conv_single_group) — kanał całego zespołu.';

COMMENT ON COLUMN staff_conversations.dm_key IS
    'Deterministyczny klucz pary: least(uid_a,uid_b)::text || '':'' || greatest(uid_a,uid_b)::text, '
    'MAŁYMI literami (uuid::text zawsze je daje). UNIQUE dla kind=''dm'' → get-or-create wątku '
    'zwraca zawsze ten sam wiersz, niezależnie od tego, kto zaczyna rozmowę. NULL dla grupy.';

COMMENT ON COLUMN staff_conversations.created_by IS
    'auth.users.id twórcy. ŚWIADOMIE BEZ FK do auth.users — D6: usunięcie konta pracownika '
    'nie może skasować historii ustaleń drugiej strony (kaskada) ani zablokować usunięcia konta.';

COMMENT ON COLUMN staff_conversations.last_message_preview IS
    'SZYFROGRAM (base64, AES-256-GCM z src/lib/fieldEncryption.ts) skróconego podglądu ostatniej '
    'wiadomości (≤80 znaków jawnego tekstu). Denormalizacja pod listę wątków jednym zapytaniem. '
    'UWAGA: to szyfrowanie W BAZIE kluczem SERWEROWYM, NIE end-to-end — serwer widzi jawny tekst.';

COMMENT ON COLUMN staff_conversations.status IS
    'open | archived. Dotyczy CAŁEGO wątku (ręczne zarchiwizowanie). NIE mylić z retencją D4, '
    'która działa na poziomie pojedynczych wiadomości i jest egzekwowana przez kod, nie przez tę kolumnę.';

-- Jeden wątek na parę (D: „gwarantuje JEDEN watek na pare").
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_conv_dm_key
    ON staff_conversations (dm_key)
    WHERE kind = 'dm';

-- D1: kanał grupowy jest DOKŁADNIE JEDEN. Indeks po stałej wartości `kind` — dla wszystkich
-- wierszy grupowych klucz jest identyczny, więc drugi INSERT dostaje 23505 i get-or-create
-- musi przejść na SELECT. Gdyby kiedyś miało być wiele kanałów tematycznych — zdjąć ten indeks.
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_conv_single_group
    ON staff_conversations (kind)
    WHERE kind = 'group';

-- Lista wątków użytkownika: sortowanie po dacie ostatniej wiadomości.
CREATE INDEX IF NOT EXISTS idx_staff_conv_last_msg
    ON staff_conversations (last_message_at DESC);

-- Retencja D4: „znajdź wątki DM, w których nic nie napisano od 12 miesięcy".
CREATE INDEX IF NOT EXISTS idx_staff_conv_kind_last_msg
    ON staff_conversations (kind, last_message_at);

-- ── 2. staff_conversation_members — członkostwa i znaczniki przeczytania ───
CREATE TABLE IF NOT EXISTS staff_conversation_members (
    conversation_id UUID        NOT NULL REFERENCES staff_conversations(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL,
    role            TEXT        NOT NULL DEFAULT 'member',
    last_read_at    TIMESTAMPTZ,
    muted           BOOLEAN     NOT NULL DEFAULT false,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at         TIMESTAMPTZ,

    PRIMARY KEY (conversation_id, user_id),

    CONSTRAINT staff_member_role_check
        CHECK (role IN ('member', 'owner'))
);

COMMENT ON TABLE staff_conversation_members IS
    'Uczestnicy wątku + znacznik przeczytania PER OSOBA (mig 183). To jest powód, dla którego '
    'nie dało się użyć starego modelu: chat_messages.read to jeden globalny bool — gdy jedna '
    'osoba z recepcji otworzy wątek, jest przeczytany dla całego zespołu.';

COMMENT ON COLUMN staff_conversation_members.user_id IS
    'auth.users.id — ZAWSZE prawdziwe konto. /api/employee/staff zwraca też sztuczne ''emp-<id>'' '
    'dla pracownika BEZ konta; tu typ UUID odrzuca je strukturalnie (wzorzec odsiewania: '
    'src/lib/taskAssignees.ts). Wpuszczenie ''emp-*'' dałoby wiadomości bez odbiorcy, a log '
    'powiadomień SKŁAMAŁBY, że wysłano. Bez FK do auth.users — D6, patrz nagłówek.';

COMMENT ON COLUMN staff_conversation_members.last_read_at IS
    'Ostatni moment przeczytania PRZEZ TĘ OSOBĘ. Nieprzeczytane = staff_messages WHERE '
    'created_at > last_read_at AND sender_user_id <> user_id AND deleted_at IS NULL. '
    'NULL = nic jeszcze nie przeczytane (cały wątek jest nowy).';

COMMENT ON COLUMN staff_conversation_members.muted IS
    'Wyciszenie POJEDYNCZEGO wątku przez tę osobę (nie mylić z globalnym '
    'employee_notification_preferences.muted_keys). Wycisza push, NIE ukrywa wątku.';

COMMENT ON COLUMN staff_conversation_members.left_at IS
    'Moment opuszczenia wątku / offboardingu. NIE kasujemy wiersza (D6) — druga strona '
    'zachowuje historię, a my wiemy, kto miał dostęp i do kiedy. left_at IS NOT NULL = '
    'osoba nie dostaje już push-a i nie widzi nowych wiadomości.';

-- Lista „moje wątki" — najczęstsze zapytanie w apce.
CREATE INDEX IF NOT EXISTS idx_staff_members_user
    ON staff_conversation_members (user_id, conversation_id)
    WHERE left_at IS NULL;

-- Skład wątku / adresaci push-a (tylko aktywni uczestnicy).
CREATE INDEX IF NOT EXISTS idx_staff_members_active
    ON staff_conversation_members (conversation_id, user_id)
    WHERE left_at IS NULL;

-- ── 3. staff_messages — wiadomości ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_messages (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id          UUID        NOT NULL REFERENCES staff_conversations(id) ON DELETE CASCADE,
    sender_user_id           UUID        NOT NULL,
    sender_name_snapshot     TEXT        NOT NULL,
    kind                     TEXT        NOT NULL DEFAULT 'text',
    content                  TEXT        NOT NULL DEFAULT '',

    -- Referencje kontekstowe (POLA STRUKTURALNE, nie tekst wklejony w treść)
    ref_task_id              UUID        REFERENCES employee_tasks(id) ON DELETE SET NULL,
    ref_patient_prodentis_id TEXT,
    ref_appointment_id       TEXT,
    ref_appointment_at       TEXT,

    client_msg_id            TEXT,
    has_attachments          BOOLEAN     NOT NULL DEFAULT false,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    edited_at                TIMESTAMPTZ,
    deleted_at               TIMESTAMPTZ,
    deleted_by               UUID,

    CONSTRAINT staff_msg_kind_check
        CHECK (kind IN ('text', 'system')),

    -- D3: identyfikator Prodentisa to CIĄG CYFR (np. '0100001711'), nie UUID.
    -- CHECK odrzuca wklejenie tu patients.id — to jedyne miejsce, gdzie taka pomyłka
    -- byłaby niewidoczna aż do momentu, gdy chip pacjenta przestanie się rozwijać.
    CONSTRAINT staff_msg_patient_ref_check
        CHECK (ref_patient_prodentis_id IS NULL OR ref_patient_prodentis_id ~ '^[0-9]{6,12}$'),

    -- D3 c.d.: identyfikator WIZYTY. Do tej poprawki było to jedyne tekstowe pole
    -- wiadomości bez ograniczenia formatu i bez szyfrowania — czyli najprostsza droga,
    -- żeby wbrew D3 wpisać do bazy nazwisko pacjenta jawnym tekstem („Kowalski, 600...").
    -- NA CZYM OPARTY JEST WZORZEC (formatu NIE da się dziś ustalić z pewnością):
    --   • ani jedna kolumna trzymająca id wizyty nie ma constraintu ani przykładu wartości:
    --     `patient_intake_tokens.appointment_id` (mig 054, komentarz „ID wizyty z Prodentis"),
    --     `online_bookings.prodentis_appointment_id` (056),
    --     `cancelled_appointments.prodentis_appointment_id` (062),
    --     `careflow_enrollments.appointment_id` (110) — wszystkie to gołe TEXT, a wartość
    --     bierze się wprost z `apt.id` odpowiedzi Prodentisa (api/employee/schedule),
    --   • id PACJENTA w Prodentisie to ciąg cyfr ('0100005679' — komentarz w
    --     supabase_patient_portal_schema.sql), więc id wizyty jest najpewniej z tej samej
    --     rodziny, ale nie ma na to dowodu w repo,
    --   • do tych samych pól trafiają LEGALNIE wartości nie-prodentisowe: UUID
    --     `appointment_actions.id` (mig 124, legacy `?appointmentId=<UUID>`) oraz
    --     'SIM-APT-<epoch ms>' z symulatora CareFlow (api/admin/careflow/simulate).
    -- Stąd wzorzec OSTROŻNY: alfanumeryczny z myślnikiem, 1-64 znaki. Mieści 10-cyfrowe id,
    -- 36-znakowy UUID i 'SIM-APT-…', a odrzuca spację, przecinek, kropkę i polskie znaki —
    -- czyli każdą realną postać wklejonego nazwiska. Drugi warunek („co najmniej jedna
    -- cyfra") domyka przypadek jednowyrazowy: samo 'Kowalski' przeszłoby przez wzorzec
    -- alfanumeryczny, a żaden znany identyfikator wizyty nie jest pozbawiony cyfr.
    -- To BARIERA NA POMYŁKĘ, nie dowód: kto się uprze, wpisze 'Kowalski1'. Od tego jest
    -- audyt wzmianek o pacjencie (src/lib/auditLog.ts), a nie CHECK.
    -- Wzorzec MUSI byc identyczny z APPOINTMENT_ID_RE w src/lib/staffMessaging.ts —
    -- rozjazd oznacza, ze warstwa aplikacji przepusci wartosc, ktora baza odrzuci
    -- bledem 23514, a trasa odda 500 i wiadomosc PRZEPADNIE. Warstwa aplikacji
    -- odrzuca niezgodny format czytelnym 400, a nie przycina go po cichu. Gdyby produkcja pokazała identyfikator
    -- spoza tej klasy znaków — poszerzyć wzorzec TUTAJ, dopóki migracja nie jest wgrana.
    CONSTRAINT staff_msg_appt_id_check
        CHECK (
            ref_appointment_id IS NULL
            OR (
                ref_appointment_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'
                AND ref_appointment_id ~ '[0-9]'
            )
        ),

    -- Czas ŚCIENNY gabinetu, dokładnie 'YYYY-MM-DDTHH:MM'. CHECK odrzuca wynik
    -- toISOString() (ma sekundy i 'Z'), czyli dokładnie ten błąd, który przesuwałby
    -- godzinę wizyty o offset strefy przy każdym renderze.
    CONSTRAINT staff_msg_appt_at_check
        CHECK (
            ref_appointment_at IS NULL
            OR ref_appointment_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$'
        ),

    -- Kto skasował, musi mieć KIEDY — inaczej audyt mówi „ktoś usunął" bez momentu.
    CONSTRAINT staff_msg_deleted_check
        CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL),

    -- client_msg_id służy WYŁĄCZNIE idempotencji ponowień; nie jest miejscem na dane.
    CONSTRAINT staff_msg_client_id_check
        CHECK (client_msg_id IS NULL OR char_length(client_msg_id) BETWEEN 1 AND 100)
);

COMMENT ON TABLE staff_messages IS
    'Wiadomości czatu wewnętrznego personelu (mig 183). Autor jest KONKRETNYM użytkownikiem '
    '(sender_user_id), a nie rolą jak w chat_messages.sender_role.';

COMMENT ON COLUMN staff_messages.content IS
    'SZYFROGRAM treści (base64, AES-256-GCM, src/lib/fieldEncryption.ts → encryptStringToBase64 / '
    'tryDecryptString). To szyfrowanie W BAZIE kluczem SERWEROWYM (ENCRYPTION_KEY), NIE end-to-end '
    '— serwer odszyfrowuje treść, żeby ją wyświetlić, więc NIE WOLNO nazywać tego end-to-end ani '
    'w kodzie, ani w UI. Pusty string = wiadomość bez tekstu (sam załącznik), NIE szyfrogram pustego '
    'stringa. Każdy programowy dostęp do DM zostawia ślad w audycie (src/lib/auditLog.ts).';

COMMENT ON COLUMN staff_messages.sender_user_id IS
    'auth.users.id autora (nie e-mail, nie rola). Bez FK do auth.users — D6, patrz nagłówek.';

COMMENT ON COLUMN staff_messages.sender_name_snapshot IS
    'Nazwa autora w chwili wysyłki (employees.name), żeby wiadomość dało się wyświetlić bez '
    'dociągania kartoteki. D6: przy offboardingu ta kolumna jest ANONIMIZOWANA (wzorzec z '
    'anonimizacji konta pacjenta) — rozmowa zostaje, nazwisko znika.';

COMMENT ON COLUMN staff_messages.kind IS
    'text = wiadomość człowieka; system = wpis techniczny wątku (dołączenie, opuszczenie, '
    'zmiana tematu). Wiadomości ''system'' nie generują push-a.';

COMMENT ON COLUMN staff_messages.ref_patient_prodentis_id IS
    'D3: identyfikator pacjenta W PRODENTISIE (np. ''0100001711'') — i NIC WIĘCEJ. Nazwiska, '
    'telefonu, PESEL-u ani notatek wizyty tu NIE ZAPISUJEMY; nazwisko podstawia się przy '
    'wyświetlaniu (just-in-time). Dzięki temu w bazie wiadomości nie ma ani jednego nazwiska pacjenta.';

COMMENT ON COLUMN staff_messages.ref_appointment_id IS
    'Identyfikator WIZYTY w Prodentisie (`apt.id` z grafiku). Format wymuszony przez '
    'staff_msg_appt_id_check: [A-Za-z0-9-], 1-64 znaki, co najmniej jedna cyfra. Wzorzec jest '
    'CELOWO szerszy niż przy ref_patient_prodentis_id, bo do pól z id wizyty trafiają też UUID '
    'z appointment_actions i ''SIM-APT-<epoch>'' z symulatora CareFlow. To NIE jest miejsce na '
    'nazwisko, telefon ani opis wizyty — pole jest jawne (nieszyfrowane), więc obowiązuje je '
    'to samo ograniczenie co D3.';

COMMENT ON COLUMN staff_messages.ref_appointment_at IS
    'Czas ŚCIENNY gabinetu w formacie ''YYYY-MM-DDTHH:MM'' (TEXT, nie TIMESTAMPTZ). '
    'NIGDY toISOString() — patrz staff_msg_appt_at_check.';

COMMENT ON COLUMN staff_messages.ref_task_id IS
    'Podlinkowane zadanie (employee_tasks). ON DELETE SET NULL — skasowanie zadania nie może '
    'usunąć wiadomości, która się do niego odnosiła; zostaje sama treść bez karty zadania.';

COMMENT ON COLUMN staff_messages.client_msg_id IS
    'Identyfikator nadany przez apkę przed wysyłką. UNIQUE per (conversation_id, sender_user_id, '
    'client_msg_id) → ponowienie po zerwaniu sieci NIE tworzy duplikatu (dostaje 23505, a trasa '
    'zwraca istniejącą wiadomość).';

COMMENT ON COLUMN staff_messages.deleted_at IS
    'Soft-delete (nagrobek „wiadomość usunięta"). Twardy DELETE robi WYŁĄCZNIE cron retencyjny '
    'dla DM starszych niż 12 miesięcy (D4), nigdy użytkownik.';

-- Wiadomości wątku, od najnowszych (paginacja w apce).
CREATE INDEX IF NOT EXISTS idx_staff_msg_conv
    ON staff_messages (conversation_id, created_at DESC);

-- Retencja D4 (kasowanie DM / odcięcie widoczności w grupie).
CREATE INDEX IF NOT EXISTS idx_staff_msg_created
    ON staff_messages (created_at);

-- „Kto pisał o pacjencie X" — audyt RODO i podgląd kontekstu.
CREATE INDEX IF NOT EXISTS idx_staff_msg_patient_ref
    ON staff_messages (ref_patient_prodentis_id, created_at DESC)
    WHERE ref_patient_prodentis_id IS NOT NULL;

-- FK bez indeksu = seq scan po całej tabeli wiadomości przy KAŻDYM kasowaniu zadania
-- (kontrola referencyjna dla ON DELETE SET NULL). Lekcja z mig 181 (care_tasks.step_id).
CREATE INDEX IF NOT EXISTS idx_staff_msg_task_ref
    ON staff_messages (ref_task_id)
    WHERE ref_task_id IS NOT NULL;

-- D6: anonimizacja przy offboardingu aktualizuje wszystkie wiadomości jednej osoby.
CREATE INDEX IF NOT EXISTS idx_staff_msg_sender
    ON staff_messages (sender_user_id);

-- Idempotencja ponowień z apki.
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_msg_client
    ON staff_messages (conversation_id, sender_user_id, client_msg_id)
    WHERE client_msg_id IS NOT NULL;

-- ── 4. chat_attachments — WSPÓLNA tabela załączników obu torów ─────────────
CREATE TABLE IF NOT EXISTS chat_attachments (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_message_id       UUID        REFERENCES staff_messages(id) ON DELETE CASCADE,
    chat_message_id        UUID        REFERENCES chat_messages(id)  ON DELETE CASCADE,
    storage_path           TEXT        NOT NULL,
    thumb_path             TEXT,
    mime                   TEXT        NOT NULL,
    size_bytes             INTEGER     NOT NULL,
    width                  INTEGER,
    height                 INTEGER,
    origin                 TEXT        NOT NULL,
    uploaded_by_user_id    UUID,
    uploaded_by_patient_id UUID,
    is_health_data         BOOLEAN     NOT NULL DEFAULT false,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Polimorficzny właściciel: DOKŁADNIE JEDEN z dwóch torów.
    CONSTRAINT chat_att_one_owner_check
        CHECK (num_nonnulls(staff_message_id, chat_message_id) = 1),

    CONSTRAINT chat_att_origin_check
        CHECK (origin IN ('staff', 'patient')),

    -- D7: załącznik pacjenta wolno przyjąć WYŁĄCZNIE od zalogowanego pacjenta (gość NIE —
    -- dlatego nie ma wartości 'guest' i dlatego uploaded_by_patient_id jest wymagane).
    -- Personel może załączać w obu torach (recepcja odpowiada plikiem w czacie pacjenta).
    CONSTRAINT chat_att_origin_shape_check
        CHECK (
            (origin = 'staff'
                AND uploaded_by_user_id    IS NOT NULL
                AND uploaded_by_patient_id IS NULL)
            OR
            (origin = 'patient'
                AND uploaded_by_patient_id IS NOT NULL
                AND uploaded_by_user_id    IS NULL
                AND chat_message_id        IS NOT NULL)
        ),

    -- ŚCIEŻKA w buckecie, nigdy URL. Zapisany URL zmusza potem do parsowania ścieżki
    -- z powrotem (dziś robi to extractStoragePath w careflow/report-link) i kusi, żeby
    -- wysłać klientowi link publiczny zamiast signed URL z krótkim TTL.
    CONSTRAINT chat_att_path_not_url_check
        CHECK (storage_path !~* '^https?://'),

    CONSTRAINT chat_att_size_check
        CHECK (size_bytes > 0)
);

COMMENT ON TABLE chat_attachments IS
    'Załączniki OBU torów czatu (mig 183): staff_message_id → czat wewnętrzny personelu, '
    'chat_message_id → istniejący czat pacjent↔recepcja. Dokładnie jeden z nich niepusty. '
    'Wspólna tabela, żeby nie budować dwóch magazynów plików i dwóch ścieżek audytu.';

COMMENT ON COLUMN chat_attachments.storage_path IS
    'Ścieżka obiektu w prywatnym buckecie (np. ''<conversationId>/<uuid>.jpg''), NIGDY URL. '
    'Klient dostaje wyłącznie signed URL o krótkim TTL, wybijany przy każdym odczycie. '
    'W ścieżce NIE WOLNO umieszczać nazwiska, PESEL-u ani prodentis id (błąd bucketa consents).';

COMMENT ON COLUMN chat_attachments.origin IS
    'staff | patient. D7: gość (chat_conversations.is_anonymous) NIE może załączać plików — '
    'nie ma uwierzytelnienia poza guest_token, a plik od osoby niezidentyfikowanej to dane '
    'zdrowotne bez podstawy przetwarzania.';

COMMENT ON COLUMN chat_attachments.uploaded_by_patient_id IS
    'patients.id pacjenta, który wysłał plik. Bez FK — twarde kasowanie pacjenta i tak zabiera '
    'ten wiersz kaskadą przez chat_messages, a FK z ON DELETE SET NULL wywróciłby '
    'chat_att_origin_shape_check w trakcie kasowania.';

COMMENT ON COLUMN chat_attachments.is_health_data IS
    'TRUE = materiał traktowany jako dana o zdrowiu (art. 9 RODO) — domyślnie dla załączników '
    'pacjenta. Wpływa na audyt odczytu, eksport art. 15 i kasowanie art. 17.';

CREATE INDEX IF NOT EXISTS idx_chat_att_staff_msg
    ON chat_attachments (staff_message_id)
    WHERE staff_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_att_chat_msg
    ON chat_attachments (chat_message_id)
    WHERE chat_message_id IS NOT NULL;

-- Retencja / sprzątanie osieroconych plików w Storage.
CREATE INDEX IF NOT EXISTS idx_chat_att_created
    ON chat_attachments (created_at);

-- Jeden obiekt w Storage = jeden wiersz. Bez tego ponowiony upload zrobiłby dwa wiersze
-- na ten sam plik, a sprzątanie osieroconych obiektów skasowałoby plik wciąż używany.
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_att_path
    ON chat_attachments (storage_path);

-- ── 5. RLS — wyłącznie rola serwisowa ──────────────────────────────────────
-- Konwencja projektu po audycie 2026-05-18 (mig 132) i po zamknięciu wycieku czatu (mig 182):
-- ZAWSZE `TO service_role`. Polityka bez `TO` obejmuje też anon i authenticated, a rejestracja
-- w Supabase jest otwarta — „authenticated" to NIE jest personel kliniki.
-- Tu nie ma nawet wyjątku na odczyt (mig 182 dała go chat_* wyłącznie po to, żeby utrzymać
-- Realtime w panelu admina): czat wewnętrzny jest dostarczany push-em, nie Realtime,
-- a treść DM nie może być czytana z pominięciem serwerowego audytu.
ALTER TABLE staff_conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_attachments           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_conversations_service_only        ON staff_conversations;
DROP POLICY IF EXISTS staff_conversation_members_service_only ON staff_conversation_members;
DROP POLICY IF EXISTS staff_messages_service_only             ON staff_messages;
DROP POLICY IF EXISTS chat_attachments_service_only           ON chat_attachments;

CREATE POLICY staff_conversations_service_only ON staff_conversations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY staff_conversation_members_service_only ON staff_conversation_members
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY staff_messages_service_only ON staff_messages
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY chat_attachments_service_only ON chat_attachments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 6. Realtime — ŚWIADOMY BRAK ────────────────────────────────────────────
-- Tych tabel CELOWO nie ma w publikacji `supabase_realtime`. Wersja pierwsza dostarcza
-- wiadomości push-em (mig 179 + src/lib/expoPush.ts), a nie Realtime. Dopisanie ich do
-- publikacji byłoby bezużyteczne bez polityki `SELECT TO authenticated` — a taka polityka
-- otworzyłaby REST-owy odczyt treści DM z pominięciem logAudit. Gdyby kiedyś potrzebny był
-- sygnał na żywo: `realtime.send()` z triggera na kanał prywatny, BEZ treści, tabele zostają
-- `TO service_role`. Kontrola 7 w bloku WERYFIKACJA pilnuje, że nikt tego po cichu nie zmienił.

COMMIT;

-- ============================================================================
-- WERYFIKACJA PO WGRANIU — skopiuj CAŁY blok poniżej i uruchom jednym wklejeniem
-- ============================================================================
-- Edytor SQL w Supabase pokazuje wynik tylko OSTATNIEGO zapytania i połyka RAISE NOTICE,
-- dlatego cała weryfikacja to JEDNO zapytanie zwracające tabelkę kontroli.
--
-- OCZEKIWANY WYNIK: 34 wiersze, w kolumnie „ocena" WSZĘDZIE „OK".
--   1 — cztery nowe tabele istnieją (4 wiersze),
--   2 — komplet 16 indeksów (16 wierszy, po jednym na indeks; „BRAK" wskazuje, którego nie ma),
--   3 — komplet nazwanych CHECK-ów strukturalnych (4 wiersze, po jednym na tabelę;
--       razem 16 constraintów: 4 + 1 + 6 + 5, licząc od staff_conversations do
--       chat_attachments; w „wynik" pojawiają się nazwy BRAKUJĄCYCH constraintów),
--   4 — RLS włączone na wszystkich czterech tabelach (4 wiersze),
--   5 — polityki: na każdej tabeli DOKŁADNIE JEDNA, FOR ALL, TO {service_role} (4 wiersze).
--       Cokolwiek innego (zwłaszcza {public} lub {authenticated}) = treść DM czytelna
--       publicznym kluczem anon z pominięciem audytu — to jest dokładnie ta klasa błędu,
--       którą zamykała migracja 182,
--   6 — ZERO nowych tabel w publikacji supabase_realtime (1 wiersz),
--   7 — stary czat pacjenta NADAL jest w publikacji realtime (1 wiersz, oczekiwane 2:
--       chat_conversations + chat_messages). To kontrola, że migracja niczego nie zabrała
--       działającemu panelowi admina.
-- Jakiekolwiek „SPRAWDZ" = coś nie powstało albo powstało inaczej — szczegół w „wynik".

WITH kontrola AS (
    -- 1) Tabele
    SELECT 1 AS lp,
           ('Tabela ' || v.tbl)::TEXT AS kontrola,
           CASE WHEN to_regclass('public.' || v.tbl) IS NULL THEN 'BRAK' ELSE 'jest' END::TEXT AS wynik,
           'jest'::TEXT AS oczekiwane,
           CASE WHEN to_regclass('public.' || v.tbl) IS NULL THEN 'SPRAWDZ' ELSE 'OK' END::TEXT AS ocena
    FROM (VALUES
        ('staff_conversations'),
        ('staff_conversation_members'),
        ('staff_messages'),
        ('chat_attachments')
    ) AS v(tbl)

    -- 2) Indeksy
    UNION ALL
    SELECT 2,
           ('Indeks ' || v.idx)::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM pg_indexes i
                              WHERE i.schemaname = 'public' AND i.indexname::TEXT = v.idx)
                THEN 'jest' ELSE 'BRAK' END::TEXT,
           'jest'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM pg_indexes i
                              WHERE i.schemaname = 'public' AND i.indexname::TEXT = v.idx)
                THEN 'OK' ELSE 'SPRAWDZ' END::TEXT
    FROM (VALUES
        ('idx_staff_conv_dm_key'),
        ('idx_staff_conv_single_group'),
        ('idx_staff_conv_last_msg'),
        ('idx_staff_conv_kind_last_msg'),
        ('idx_staff_members_user'),
        ('idx_staff_members_active'),
        ('idx_staff_msg_conv'),
        ('idx_staff_msg_created'),
        ('idx_staff_msg_patient_ref'),
        ('idx_staff_msg_task_ref'),
        ('idx_staff_msg_sender'),
        ('idx_staff_msg_client'),
        ('idx_chat_att_staff_msg'),
        ('idx_chat_att_chat_msg'),
        ('idx_chat_att_created'),
        ('idx_chat_att_path')
    ) AS v(idx)

    -- 3) Nazwane CHECK-i strukturalne
    UNION ALL
    SELECT 3,
           ('CHECK-i na ' || c.tbl)::TEXT,
           COALESCE((
               SELECT 'BRAKUJE: ' || string_agg(n, ', ')
               FROM unnest(c.names) AS n
               WHERE NOT EXISTS (
                   SELECT 1 FROM pg_constraint pc
                   WHERE pc.conrelid = to_regclass('public.' || c.tbl)
                     AND pc.contype = 'c'
                     AND pc.conname = n
               )
           ), 'komplet')::TEXT,
           'komplet'::TEXT,
           CASE WHEN EXISTS (
               SELECT 1 FROM unnest(c.names) AS n
               WHERE NOT EXISTS (
                   SELECT 1 FROM pg_constraint pc
                   WHERE pc.conrelid = to_regclass('public.' || c.tbl)
                     AND pc.contype = 'c'
                     AND pc.conname = n
               )
           ) THEN 'SPRAWDZ' ELSE 'OK' END::TEXT
    FROM (VALUES
        ('staff_conversations',        ARRAY['staff_conv_kind_check','staff_conv_status_check','staff_conv_shape_check','staff_conv_dm_key_format_check']),
        ('staff_conversation_members', ARRAY['staff_member_role_check']),
        ('staff_messages',             ARRAY['staff_msg_kind_check','staff_msg_patient_ref_check','staff_msg_appt_id_check','staff_msg_appt_at_check','staff_msg_deleted_check','staff_msg_client_id_check']),
        ('chat_attachments',           ARRAY['chat_att_one_owner_check','chat_att_origin_check','chat_att_origin_shape_check','chat_att_path_not_url_check','chat_att_size_check'])
    ) AS c(tbl, names)

    -- 4) RLS włączone
    UNION ALL
    SELECT 4,
           ('RLS na ' || v.tbl)::TEXT,
           COALESCE((SELECT CASE WHEN cl.relrowsecurity THEN 'włączone' ELSE 'WYŁĄCZONE' END
                       FROM pg_class cl
                      WHERE cl.oid = to_regclass('public.' || v.tbl)), 'BRAK TABELI')::TEXT,
           'włączone'::TEXT,
           CASE WHEN COALESCE((SELECT cl.relrowsecurity FROM pg_class cl
                                WHERE cl.oid = to_regclass('public.' || v.tbl)), false)
                THEN 'OK' ELSE 'SPRAWDZ' END::TEXT
    FROM (VALUES
        ('staff_conversations'),
        ('staff_conversation_members'),
        ('staff_messages'),
        ('chat_attachments')
    ) AS v(tbl)

    -- 5) Polityki: dokładnie jedna, FOR ALL, wyłącznie service_role
    UNION ALL
    SELECT 5,
           ('Polityki na ' || v.tbl)::TEXT,
           COALESCE((
               SELECT string_agg(p.policyname::TEXT || ' (' || p.cmd || ', ' || p.roles::TEXT || ')', ' | '
                                 ORDER BY p.policyname)
               FROM pg_policies p
               WHERE p.schemaname = 'public' AND p.tablename::TEXT = v.tbl
           ), '(BRAK POLITYK)')::TEXT,
           (v.tbl || '_service_only (ALL, {service_role})')::TEXT,
           CASE WHEN (
                   SELECT count(*) FROM pg_policies p
                    WHERE p.schemaname = 'public' AND p.tablename::TEXT = v.tbl
               ) = 1
               AND NOT EXISTS (
                   SELECT 1 FROM pg_policies p
                    WHERE p.schemaname = 'public' AND p.tablename::TEXT = v.tbl
                      AND (p.cmd <> 'ALL' OR p.roles <> ARRAY['service_role']::name[])
               )
               THEN 'OK' ELSE 'SPRAWDZ' END::TEXT
    FROM (VALUES
        ('staff_conversations'),
        ('staff_conversation_members'),
        ('staff_messages'),
        ('chat_attachments')
    ) AS v(tbl)

    -- 6) Nowe tabele NIE mogą być w publikacji realtime
    UNION ALL
    SELECT 6,
           'Nowe tabele w publikacji supabase_realtime'::TEXT,
           COALESCE((
               SELECT string_agg(pt.tablename::TEXT, ', ' ORDER BY pt.tablename)
               FROM pg_publication_tables pt
               WHERE pt.pubname = 'supabase_realtime'
                 AND pt.schemaname = 'public'
                 AND pt.tablename IN ('staff_conversations','staff_conversation_members','staff_messages','chat_attachments')
           ), 'brak (poprawnie)')::TEXT,
           'brak (poprawnie)'::TEXT,
           CASE WHEN EXISTS (
               SELECT 1 FROM pg_publication_tables pt
               WHERE pt.pubname = 'supabase_realtime'
                 AND pt.schemaname = 'public'
                 AND pt.tablename IN ('staff_conversations','staff_conversation_members','staff_messages','chat_attachments')
           ) THEN 'SPRAWDZ' ELSE 'OK' END::TEXT

    -- 7) Stary czat pacjenta nadal w realtime (dowód, że migracja nic mu nie zabrała)
    UNION ALL
    SELECT 7,
           'Stary czat pacjenta w publikacji realtime'::TEXT,
           (SELECT count(*)::TEXT FROM pg_publication_tables pt
             WHERE pt.pubname = 'supabase_realtime'
               AND pt.schemaname = 'public'
               AND pt.tablename IN ('chat_conversations','chat_messages'))::TEXT,
           '2'::TEXT,
           CASE WHEN (SELECT count(*) FROM pg_publication_tables pt
                       WHERE pt.pubname = 'supabase_realtime'
                         AND pt.schemaname = 'public'
                         AND pt.tablename IN ('chat_conversations','chat_messages')) = 2
                THEN 'OK' ELSE 'SPRAWDZ' END::TEXT
)
SELECT lp, kontrola, wynik, oczekiwane, ocena
FROM kontrola
ORDER BY lp, kontrola;

-- ============================================================================
-- ŚWIADOMIE POZA TĄ MIGRACJĄ (żeby nikt nie założył, że jest zrobione)
-- ============================================================================
-- 1. BUCKET `chat-attachments`. Tabela `chat_attachments` opisuje pliki, ale samego bucketa
--    NIE tworzy. Musi powstać MIGRACJĄ (wzorzec 125_social_media_bucket_lockdown.sql), jako
--    PRYWATNY, z file_size_limit i allowed_mime_types, BEZ jakichkolwiek polityk
--    storage.objects → dostęp wyłącznie service_role + signed URL o krótkim TTL.
--    NIE reużywać bucketa `task-images` — jest PUBLICZNY (mig 020), a zdjęcie zmiany w jamie
--    ustnej pod wiecznym publicznym URL-em to dane art. 9 RODO dostępne bez uwierzytelnienia.
--
-- 2. RETENCJA (D4) to KOD, nie baza. Ta migracja daje tylko `created_at` i indeksy pod
--    przebiegi. Stan po tej rundzie napraw:
--      • ZROBIONE: filtr widoczności w `src/lib/staffMessaging.ts` (`RETENTION_MONTHS = 12`,
--        `visibilityFloorIso`) — w grupie zwykły pracownik widzi 12 miesięcy, admin całość
--        (to jest owo „archiwum"); w DM okno 12 miesięcy obowiązuje obie strony,
--      • W TEJ SAMEJ RUNDZIE: twarde, bezpowrotne kasowanie DM starszych niż 12 miesięcy
--        (DELETE staff_messages dla wątków kind='dm') dopisywane do
--        `/api/cron/data-retention-cleanup`. Jeśli czytasz to przed wgraniem migracji —
--        potwierdź regułę w kodzie trasy, zanim uznasz retencję DM za działającą,
--      • grupa: NIC nie kasujemy — archiwum admina to właśnie te wiersze,
--      • DALEJ ODŁOŻONE: osierocone OBIEKTY w Storage po kaskadowym skasowaniu
--        `chat_attachments` — kaskada w bazie NIE kasuje plików; potrzebny osobny przebieg
--        po Storage API.
--    UWAGA: cron retencyjny chodzi dziś na produkcji z `?dry_run=true` (vercel.json) —
--    dopisanie reguły bez zdjęcia dry-run nie skasuje ani jednego wiersza.
--
-- 3. PUSH — warstwa powiadomień JEST ZROBIONA (wcześniej stał tu wpis, że to osobne
--    zadanie): `src/lib/staffMessaging.ts` → `shouldPush` (D1: z kanału grupowego push
--    wychodzi WYŁĄCZNIE dla wiadomości admina; D2: w DM zawsze; wiadomości 'system' nigdy)
--    + `pushRecipients` (pomija autora, osoby z `left_at` i te z `muted = true`) →
--    `pushToStaffMembers` (src/lib/pushService.ts). Kluczy `push_notification_config`
--    ('chat-internal-dm' / '-group') NIE MA i nie są potrzebne: push czatu jest adresowany
--    SKŁADEM WĄTKU, a nie grupą z konfiguracji, a bramką wyciszenia jest
--    `staff_conversation_members.muted`. Baza nadal nie pilnuje D1 i pilnować nie może
--    (rola autora żyje w `user_roles`, nie tutaj).
--    Poza migracją zostaje EKRAN W APCE (D8) — backend czeka na interfejs mobilny.
--
-- 4. OFFBOARDING (D6). Sprostowanie nieaktualnego wpisu, który stał tu wcześniej:
--    `api/admin/employees/deactivate` NIE czyści już samej porzuconej `push_subscriptions`.
--    Kasuje ŻYWE tabele tokenów — `fcm_tokens` (web-push, mig 104) i `staff_push_tokens`
--    (apka personelu / Expo, mig 179), a legacy `push_subscriptions` sprząta dodatkowo —
--    więc telefon zwolnionej osoby przestaje dostawać powiadomienia.
--    Pozostaje część czatowa: anonimizacja `sender_name_snapshot` i ustawienie `left_at`
--    w `staff_conversation_members` — dopisywana w tej samej rundzie napraw i realizowana
--    w KODZIE, nie w bazie (schemat celowo nie ma triggera ani FK do auth.users — D6).
--    Jeśli czytasz to przed wgraniem migracji: potwierdź obie operacje w trasie
--    dezaktywacji, zanim uznasz D6 za domknięte.
