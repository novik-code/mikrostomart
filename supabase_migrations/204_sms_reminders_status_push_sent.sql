-- ═══════════════════════════════════════════════════════════════════════════
-- 204: sms_reminders.status dopuszcza 'push_sent'
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 🔴 CO BYŁO ZEPSUTE (zmierzone 2026-09-14). Migracja 007 założyła
--     status CHECK (status IN ('draft', 'sent', 'failed', 'cancelled'))
-- a push-first (`lib/patientDelivery.ts → updateDeliveryStatus`) po udanym pushu
-- zapisuje `status = 'push_sent'` RAZEM z kanałem, `push_sent = true` i godziną.
-- Baza odrzucała CAŁY zapis, więc wiersz zostawał szkicem bez żadnej informacji
-- o dostarczeniu i znikał przy najbliższym czyszczeniu szkiców.
--
-- Skala: od 07.09 do pacjentów doszło 36 pushy „Przypomnienie o wizycie",
-- a w `sms_reminders` nie ma ANI JEDNEGO wiersza z `push_sent = true` w całej
-- historii. Panel pokazywał wyłącznie SMS-y, a cron `push-escalation`
-- (SMS po 2 h bez reakcji na push) nigdy nie miał czego eskalować.
--
-- Zmiana jest czysto poszerzająca: każdy istniejący wiersz spełnia nowy warunek.
-- Nazwa ograniczenia z 007 była nadana automatycznie, dlatego zdejmujemy
-- KAŻDY CHECK na tej tabeli, który dotyczy statusu, zamiast zgadywać nazwę.

DO $$
DECLARE
    c record;
BEGIN
    FOR c IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.sms_reminders'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE public.sms_reminders DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

ALTER TABLE public.sms_reminders
    ADD CONSTRAINT sms_reminders_status_check
    CHECK (status IN ('draft', 'sent', 'failed', 'cancelled', 'push_sent'));

COMMENT ON COLUMN public.sms_reminders.status IS
    'draft = szkic do przeglądu, push_sent = dostarczone pushem (SMS jeszcze nie), sent = SMS wysłany (także po pushu), failed = błąd wysyłki, cancelled = anulowane';

-- Weryfikacja po wgraniu:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.sms_reminders'::regclass AND contype = 'c';
