-- ============================================================================
-- 188 — REJESTR ZDROWIA: ścieżka „potwierdzenie obecności pacjenta"
-- ============================================================================
--
-- 🚨 WGRAĆ NA OBA ŚRODOWISKA SUPABASE. Bezpieczna w każdej kolejności względem
--    deployu: `recordPushPath` przy braku wiersza po prostu nic nie zapisze
--    (UPDATE po nieistniejącym `path_key` to zero zmodyfikowanych wierszy),
--    więc kod wdrożony wcześniej nie wywali się — po prostu nie będzie widać stanu.
--
-- PO CO
-- Potwierdzenie obecności to dla właściciela funkcja KLUCZOWA, a jej awaria jest
-- z natury cicha: `logPush` zapisuje wpis niezależnie od dostarczenia, więc historia
-- Alertów pokazuje „wysłane" nawet wtedy, gdy powiadomienie nie opuściło serwera.
-- Dokładnie tak ta ścieżka milczała do 2026-07-29 — Telegram działał, push nie miał
-- ŻADNEJ drogi na telefon. Rejestr odpowiada na inne pytanie niż historia:
-- „kiedy ta droga OSTATNIO REALNIE zadziałała".
--
-- DLACZEGO 2880 MINUT (48 h), A NIE MNIEJ
-- Potwierdzenia zależą od tego, czy PACJENT kliknie — w długi weekend albo przy
-- dniu bez wizyt cisza jest normalna. 48 h to próg, który przepuszcza naturalne
-- przerwy, a łapie realną awarię kanału.
-- ⚠️ Sam próg NIE WYSTARCZY: `findSilentPushPaths` alarmował dotąd także wtedy, gdy
-- ścieżki NIGDY NIE PODJĘTO (brak kandydatów wyglądał jak awaria). Poprawka tej
-- logiki idzie w tym samym commicie — bez niej ten wiersz zacząłby wysyłać
-- codzienny fałszywy alarm zaraz po wgraniu.
--
-- Idempotentna: ON CONFLICT DO UPDATE (aktualizuje próg, gdyby wiersz już istniał).
-- ============================================================================

BEGIN;

INSERT INTO push_path_health (path_key, label, max_silence_minutes) VALUES
    ('appointment_confirmed', 'Potwierdzenia obecności pacjentów', 2880)
ON CONFLICT (path_key) DO UPDATE
    SET label               = EXCLUDED.label,
        max_silence_minutes = EXCLUDED.max_silence_minutes;

COMMIT;

-- ============================================================================
-- WERYFIKACJA PO WGRANIU — skopiuj CAŁY blok i uruchom jednym wklejeniem.
-- Oczekiwane: 2 wiersze, wszędzie 'OK'.
-- ============================================================================
-- WITH checks AS (
--     SELECT '1. wiersz istnieje z progiem 48 h' AS kontrola,
--            CASE WHEN EXISTS (
--                SELECT 1 FROM push_path_health
--                WHERE path_key = 'appointment_confirmed'
--                  AND max_silence_minutes = 2880
--            ) THEN 'OK' ELSE 'BLAD' END AS wynik
--     UNION ALL
--     -- Kontrola, że nie ruszyliśmy nic innego: awarie zostają ZDARZENIOWE (NULL).
--     SELECT '2. incident_blocking nadal bez progu',
--            CASE WHEN EXISTS (
--                SELECT 1 FROM push_path_health
--                WHERE path_key = 'incident_blocking'
--                  AND max_silence_minutes IS NULL
--            ) THEN 'OK' ELSE 'BLAD' END
-- )
-- SELECT * FROM checks ORDER BY kontrola;
