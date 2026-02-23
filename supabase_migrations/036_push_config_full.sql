-- ============================================================
-- Migration 036: Full push_notification_config + recipient_types
-- ============================================================
-- Adds all 15 push notification types with recipient categorization.
-- recipient_types: 'employees', 'patients', or both.

-- Add recipient_types column (which audience this notification targets)
ALTER TABLE push_notification_config
    ADD COLUMN IF NOT EXISTS recipient_types TEXT[] NOT NULL DEFAULT ARRAY['employees'];

-- Insert all notification types (skip if key already exists)
INSERT INTO push_notification_config (key, label, description, groups, recipient_types, enabled) VALUES

-- ── CRON / SCHEDULED ──────────────────────────────────────
('task-no-date',
 'Zadania bez terminu',
 'Codziennie (9:30) — zadania bez ustawionej daty realizacji.',
 ARRAY['doctors','hygienists','reception','assistant','admin'],
 ARRAY['employees'], true),

('task-deposit',
 'Niewpłacony zadatek',
 'Codziennie (9:30) — zadania z oczekującym zadatkiem do odznaczenia.',
 ARRAY['doctors','hygienists','reception','assistant','admin'],
 ARRAY['employees'], true),

-- ── ZADANIA / TASKS ───────────────────────────────────────
('task-new',
 'Nowe zadanie',
 'Gdy pracownik tworzy nowe zadanie — powiadomienie dla pozostałych.',
 ARRAY['doctors','hygienists','reception','assistant','admin'],
 ARRAY['employees'], true),

('task-comment',
 'Komentarz do zadania',
 'Gdy ktoś dodaje komentarz do zadania.',
 ARRAY['doctors','hygienists','reception','assistant','admin'],
 ARRAY['employees'], true),

('task-status',
 'Zmiana statusu zadania',
 'Gdy status zadania zmienia się (np. w toku → zrobione).',
 ARRAY['doctors','hygienists','reception','assistant','admin'],
 ARRAY['employees'], true),

-- ── WIZYTY — POWIADOMIENIA DLA PERSONELU ────────────────
('appointment-confirmed',
 'Pacjent potwierdził wizytę',
 'Gdy pacjent potwierdza wizytę przez SMS link / aplikację.',
 ARRAY['reception','admin'],
 ARRAY['employees'], true),

('appointment-cancelled',
 'Pacjent odwołał wizytę',
 'Gdy pacjent odwołuje wizytę.',
 ARRAY['reception','admin'],
 ARRAY['employees'], true),

('appointment-rescheduled',
 'Prośba o przełożenie wizyty',
 'Gdy pacjent prosi o inny termin wizyty.',
 ARRAY['reception','admin'],
 ARRAY['employees'], true),

('new-reservation',
 'Nowa rezerwacja online',
 'Gdy pacjent rezerwuje wizytę przez formularz online.',
 ARRAY['reception','admin'],
 ARRAY['employees'], true),

-- ── SKLEP / ZAMÓWIENIA ────────────────────────────────────
('new-order',
 'Nowe zamówienie ze sklepu',
 'Gdy wpływa nowe zamówienie ze sklepu internetowego.',
 ARRAY['reception','admin'],
 ARRAY['employees'], true),

-- ── PACJENCI / REJESTRACJA ───────────────────────────────
('new-registration',
 'Nowy pacjent zarejestrowany',
 'Gdy nowy pacjent rejestruje się w strefie pacjenta.',
 ARRAY['admin'],
 ARRAY['employees'], true),

('new-contact-message',
 'Wiadomość kontaktowa',
 'Gdy ktoś wypełnia formularz kontaktowy.',
 ARRAY['reception','admin'],
 ARRAY['employees'], true),

('chat-patient-to-admin',
 'Czat: pacjent → recepcja',
 'Gdy pacjent wysyła wiadomość przez czat w strefie pacjenta.',
 ARRAY['reception','admin'],
 ARRAY['employees'], true),

-- ── WIZYTY — PRZYPOMNIENIA DLA PACJENTÓW ────────────────
('appointment-24h',
 'Przypomnienie o wizycie (24h)',
 'Automatyczne przypomnienie do pacjenta 24h przed wizytą.',
 ARRAY[]::TEXT[],
 ARRAY['patients'], true),

('appointment-1h',
 'Przypomnienie o wizycie (1h)',
 'Automatyczne przypomnienie do pacjenta 1h przed wizytą.',
 ARRAY[]::TEXT[],
 ARRAY['patients'], true)

ON CONFLICT (key) DO UPDATE SET
    label          = EXCLUDED.label,
    description    = EXCLUDED.description,
    recipient_types = EXCLUDED.recipient_types
    -- NOTE: we do NOT overwrite groups/enabled so admin customizations are preserved
;

COMMENT ON COLUMN push_notification_config.recipient_types IS
    'Who receives this notification: employees (by group), patients, or both.';
