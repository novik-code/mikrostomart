-- Migracja 186: diagnostyka powiadomień push
--
-- DWA PROBLEMY, KTÓRE TO ZAMYKA:
--
-- 1. MARTWE TOKENY ODKŁADAJĄ SIĘ W NIESKOŃCZONOŚĆ.
--    `deliver()` w expoPush.ts kasuje token tylko wtedy, gdy `DeviceNotRegistered`
--    przyjdzie w TICKECIE (odpowiedź natychmiastowa). W praktyce Expo zwraca ten błąd
--    w RECEIPCIE — dostępnym dopiero kilka–kilkanaście minut później i TYLKO po
--    identyfikatorze ticketu. Ticketów nigdzie nie zapisywaliśmy, więc receiptów nie
--    dało się odpytać i trupy zostawały w bazie (usuwane ręcznie, dwa razy).
--
-- 2. „WYSŁANE" NIE ZNACZY „DOSTARCZONE".
--    `logPush` zapisuje historię NIEZALEŻNIE od dostarczenia, więc powiadomienie,
--    które nigdy nie opuściło serwera, wyglądało w Alertach na wysłane. Rejestr
--    ścieżek pozwala zapytać wprost: „kiedy ta droga ostatnio realnie zadziałała".

-- ─── 1. Bilety oczekujące na receipt ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_receipts (
    ticket_id   TEXT PRIMARY KEY,
    token       TEXT NOT NULL,
    -- Z której tabeli skasować token, gdy receipt powie DeviceNotRegistered.
    token_table TEXT NOT NULL CHECK (token_table IN ('patient_push_tokens', 'staff_push_tokens')),
    path_key    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checked_at  TIMESTAMPTZ,
    status      TEXT,   -- 'ok' | 'error'
    error_code  TEXT    -- np. DeviceNotRegistered, MessageTooBig
);

-- Cron bierze nieodpytane bilety od najstarszych. Expo trzyma receipty ~24 h,
-- więc indeks częściowy pokrywa dokładnie ten dostęp i nie rośnie z historią.
CREATE INDEX IF NOT EXISTS idx_push_receipts_pending
    ON push_receipts (created_at)
    WHERE checked_at IS NULL;

-- ─── 2. Rejestr zdrowia ścieżek push ───────────────────────────────────────────
-- Jeden wiersz na drogę powiadomienia. `max_silence_minutes` = po ilu minutach
-- ciszy uznajemy ścieżkę za podejrzaną. NULL = ścieżka zdarzeniowa, której cisza
-- jest normalna (nikt nie odwołał wizyty) — takiej nie alarmujemy z braku ruchu,
-- ale nadal widać przy niej ostatni sukces i ostatni błąd.
CREATE TABLE IF NOT EXISTS push_path_health (
    path_key            TEXT PRIMARY KEY,
    label               TEXT NOT NULL,
    max_silence_minutes INTEGER,
    last_attempt_at     TIMESTAMPTZ,
    last_success_at     TIMESTAMPTZ,
    last_error          TEXT,
    attempts_24h        INTEGER NOT NULL DEFAULT 0,
    failures_24h        INTEGER NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: obie tabele wyłącznie dla roli serwisowej.
-- 🔑 `TO service_role` jest OBOWIĄZKOWE — polityka bez klauzuli TO ma roles={public},
-- czyli otwiera tabelę dla anon i authenticated (tak powstał wyciec zamknięty mig 182).
ALTER TABLE push_receipts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_path_health  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_receipts' AND policyname = 'service_only') THEN
        CREATE POLICY service_only ON push_receipts FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_path_health' AND policyname = 'service_only') THEN
        CREATE POLICY service_only ON push_path_health FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ─── 3. Zasiew ścieżek ─────────────────────────────────────────────────────────
-- Ścieżki cykliczne dostają próg ciszy z zapasem wzgledem swojego crona.
-- Zdarzeniowe (rezerwacja, odwołanie, czat) maja NULL — ich cisza nic nie znaczy.
INSERT INTO push_path_health (path_key, label, max_silence_minutes) VALUES
    ('appointment_reminder',  'Przypomnienia o wizytach (push zamiast SMS)', 1560),
    ('careflow_task',         'Opieka — przypomnienia o krokach',            180),
    ('staff_chat',            'Czat zespołu',                               NULL),
    ('staff_task',            'Zadania personelu',                          NULL),
    ('patient_chat',          'Wiadomosci pacjent <-> recepcja',            NULL),
    ('new_reservation',       'Nowe rezerwacje',                            NULL),
    ('appointment_cancelled', 'Odwolania wizyt',                            NULL)
ON CONFLICT (path_key) DO NOTHING;
