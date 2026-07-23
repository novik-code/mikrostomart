-- Migracja 176: śledzenie wysyłki maila weryfikacyjnego przy rejestracji pacjenta
--
-- PROBLEM: /api/patients/register zapisywał token w email_verification_tokens i
-- próbował wysłać mail, ale wynik wysyłki był POŁYKANY (sendEmail zwraca
-- {success:false}, nie rzuca; register go nie sprawdzał). Efekt: gdy mail nie
-- wyszedł (transient Resend / odrzucenie), pacjent utykał bez śladu — recepcja
-- dostawała Telegram „nowy pacjent", a konto nigdy nie powstawało (patients row
-- tworzy się dopiero po kliknięciu linku z maila).
--
-- Ta migracja + zmiana w register/route.ts dają JEDNOZNACZNY ślad: czy dla danej
-- próby rejestracji mail wyszedł, po ilu próbach, i jaki był błąd. Zapytanie
-- diagnostyczne: SELECT prodentis_id, email, phone, created_at, email_error
--   FROM email_verification_tokens WHERE email_sent = false AND used = false;
--
-- Additive, read-safe. Wgrać na OBA env PRZED deployem backendu.

ALTER TABLE email_verification_tokens
    ADD COLUMN IF NOT EXISTS email_sent      BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS email_sent_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS email_error     TEXT,
    ADD COLUMN IF NOT EXISTS email_attempts  INTEGER NOT NULL DEFAULT 0;

-- Szybkie wyszukanie „prób rejestracji, którym mail nie wyszedł i nie dokończyli".
CREATE INDEX IF NOT EXISTS idx_email_verif_failed
    ON email_verification_tokens (email_sent, used, created_at DESC);

COMMENT ON COLUMN email_verification_tokens.email_sent IS
    'Czy mail weryfikacyjny wyszedł (Resend przyjął). false = pacjent NIE dostał linku.';
COMMENT ON COLUMN email_verification_tokens.email_error IS
    'Komunikat błędu wysyłki (NULL gdy OK). Do diagnostyki rejestracji.';
