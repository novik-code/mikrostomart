-- ============================================================================
-- 184 — ZAŁĄCZNIKI CZATU: prywatny bucket `chat-attachments`
-- ============================================================================
--
-- 🚨 WGRAĆ NA OBA ŚRODOWISKA SUPABASE (produkcja + demo) PRZED deployem kodu.
--    Kod, który wgrywa plik do nieistniejącego bucketa, dostanie z Storage API surowy
--    błąd i zostawi wiadomość z `has_attachments = true` bez pliku — wieczny dymek
--    „[załącznik]" bez obrazka. Kolejność jest jednokierunkowa: migracja, potem deploy.
--
-- CO TO JEST
-- Magazyn plików dla OBU torów czatu. Tabela `chat_attachments` powstała już w migracji
-- 183 (polimorficzny właściciel: `staff_message_id` albo `chat_message_id`) — brakowało
-- wyłącznie miejsca na same bajty. Ta migracja to uzupełnia i nic poza tym nie rusza.
--
-- DLACZEGO NOWY BUCKET, A NIE `task-images`
-- `task-images` (mig 020) jest PUBLICZNY: `getPublicUrl` bez wygaśnięcia, nazwa pliku
-- z `Date.now()` + 6 znaków base36, zero strip EXIF, zero audytu. Zdjęcie zmiany w jamie
-- ustnej pod takim URL-em to dana o zdrowiu (art. 9 RODO) dostępna bez uwierzytelnienia,
-- wiecznie, i nie da się tego unieważnić inaczej niż kasując plik. Migracja 183 wprost
-- zakazuje reużycia tamtego bucketa.
--
-- DLACZEGO MIGRACJĄ, A NIE `createBucket` W RUNTIME
-- W repo są cztery miejsca robiące „upload → jeśli błąd zawiera 'Bucket', to createBucket
-- i ponów". Taki bucket powstaje bez `allowed_mime_types` kontrolowanych w jednym miejscu,
-- a fallback UKRYWA fakt, że migracji nie wgrano — i wychodzi to dopiero wtedy, gdy ktoś
-- zauważy, że pliki leżą w buckecie o innych ustawieniach niż zakładano.
--
-- ZERO POLITYK NA `storage.objects`
-- Dostęp wyłącznie przez rolę serwisową + signed URL o krótkim TTL (300 s), wybijany
-- przez trasę serwerową, żeby KAŻDY odczyt przeszedł przez `logAudit`.
-- ⚠️ NIE dodawać polityki `TO authenticated` „żeby apka mogła pobierać": rejestracja
-- w Supabase jest OTWARTA (to była dziura zamknięta migracją 182), więc `authenticated`
-- nie znaczy „personel kliniki", tylko „ktokolwiek z internetu".
--
-- allowed_mime_types = TYLKO image/jpeg
-- Każdy plik przechodzi przez `sharp` i wychodzi z niego jako JPEG (pełny obraz
-- i miniatura), więc lista jest domknięta na jednej wartości. To NIE zastępuje walidacji
-- magic bytes w trasie: `allowed_mime_types` sprawdza MIME DEKLAROWANY w żądaniu uploadu,
-- a nie zawartość pliku. Rozszerzenie o `application/pdf` będzie jedną linijką, gdy
-- dojdzie wybór dokumentów w apce (wymaga `expo-document-picker`, czyli nowego buildu).
--
-- RETENCJA
-- 12 miesięcy, tak jak wiadomości (decyzja właściciela). Egzekwuje ją cron
-- `data-retention-cleanup`, nie baza — kaskada z `chat_attachments` kasuje WIERSZ,
-- ale NIE plik w Storage. Sprzątanie osieroconych obiektów to osobny przebieg po
-- Storage API (znana, świadomie odłożona luka, opisana w mig 183).
-- ⚠️ Cron chodzi na produkcji z `?dry_run=true` — dopóki parametr nie zostanie zdjęty,
-- żadna reguła retencji nie skasuje ani jednego wiersza.
--
-- Idempotentna: INSERT ... ON CONFLICT DO UPDATE + DROP POLICY IF EXISTS.
-- Po wgraniu uruchom blok WERYFIKACJA z końca pliku (osobne wklejenie).
-- ============================================================================

BEGIN;

-- ── 1. Bucket ───────────────────────────────────────────────────────────────
-- 10 MB: górna granica dla zdjęcia z telefonu po kompresji po stronie apki.
-- Serwer i tak przycina obraz do 1600 px i re-enkoduje, więc realne pliki są
-- o rząd wielkości mniejsze — limit jest zabezpieczeniem, nie budżetem.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-attachments', 'chat-attachments', false, 10485760, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE
    SET public             = false,          -- ⚠️ NIGDY true (mig 085 miała tu `true`)
        file_size_limit    = 10485760,
        allowed_mime_types = ARRAY['image/jpeg'];

-- ── 2. Domknięcie: żadnych polityk na obiektach tego bucketa ────────────────
-- Defensywnie, na wypadek gdyby ktoś kiedyś założył bucket ręcznie z dashboardu
-- (kreator Supabase potrafi dołożyć politykę publicznego odczytu).
DROP POLICY IF EXISTS "Allow public read chat-attachments"   ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads chat-attachments"       ON storage.objects;
DROP POLICY IF EXISTS "Allow service delete chat-attachments" ON storage.objects;

COMMIT;

-- ============================================================================
-- WERYFIKACJA PO WGRANIU — skopiuj CAŁY blok poniżej i uruchom jednym wklejeniem.
-- Oczekiwane: 4 wiersze, wszędzie 'OK'.
-- ============================================================================
-- WITH checks AS (
--     SELECT '1. bucket istnieje i jest PRYWATNY' AS kontrola,
--            CASE WHEN EXISTS (
--                SELECT 1 FROM storage.buckets
--                WHERE id = 'chat-attachments' AND public = false
--            ) THEN 'OK' ELSE 'BŁĄD' END AS wynik
--     UNION ALL
--     SELECT '2. limit rozmiaru = 10 MB',
--            CASE WHEN EXISTS (
--                SELECT 1 FROM storage.buckets
--                WHERE id = 'chat-attachments' AND file_size_limit = 10485760
--            ) THEN 'OK' ELSE 'BŁĄD' END
--     UNION ALL
--     SELECT '3. dozwolony wyłącznie image/jpeg',
--            CASE WHEN EXISTS (
--                SELECT 1 FROM storage.buckets
--                WHERE id = 'chat-attachments'
--                  AND allowed_mime_types = ARRAY['image/jpeg']
--            ) THEN 'OK' ELSE 'BŁĄD' END
--     UNION ALL
--     -- Kluczowa kontrola: ZERO polityk na obiektach tego bucketa. Każda polityka
--     -- tutaj oznacza drogę do pliku z pominięciem serwerowego audytu.
--     SELECT '4. brak polityk storage.objects dla bucketa',
--            CASE WHEN NOT EXISTS (
--                SELECT 1 FROM pg_policies
--                WHERE schemaname = 'storage'
--                  AND tablename  = 'objects'
--                  AND (qual ILIKE '%chat-attachments%' OR with_check ILIKE '%chat-attachments%')
--            ) THEN 'OK' ELSE 'BŁĄD' END
-- )
-- SELECT * FROM checks ORDER BY kontrola;
