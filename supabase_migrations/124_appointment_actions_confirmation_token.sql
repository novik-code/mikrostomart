-- Migration 124: random confirmation_token for SMS appointment confirmation links
--
-- Context: SMS reminder links currently expand to:
--   https://mikrostomart.pl/wizyta/[type]?appointmentId=<UUID>&date=...&time=...&doctor=...
-- The UUID is enumerable — knowing the format, an attacker can brute-force IDs
-- or extrapolate from a leaked one (e.g. patient screenshots an SMS). There's
-- also no time validation: a UUID issued today still works a year later.
--
-- Fix (S4-4 wątek b): replace the UUID in the link with a 16-char random
-- token (nanoid, 96 bits entropy) stored alongside the appointment_action
-- row. Verification: lookup by token, check appointment_date - 7 days < now()
-- for TTL, and existing attendance_confirmed_at IS NULL for idempotency.
--
-- The legacy endpoint accepting ?appointmentId=UUID stays for ~14 days so SMS
-- links already in the pipeline keep working. After that grace period, only
-- token-based links resolve.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE UNIQUE INDEX IF NOT EXISTS.

ALTER TABLE appointment_actions
    ADD COLUMN IF NOT EXISTS confirmation_token TEXT;

-- Unique constraint via partial index — earlier rows without a token (NULL)
-- aren't constrained, so backfilling NULLs after deploy works fine. nanoid(16)
-- collision space is 96 bits — effectively zero collision risk per appointment
-- in practice, but the index guards against any accidental duplicate insert.
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_actions_confirmation_token
    ON appointment_actions (confirmation_token)
    WHERE confirmation_token IS NOT NULL;

COMMENT ON COLUMN appointment_actions.confirmation_token IS
    'Random nanoid(16) token used as the public identifier in SMS confirm/cancel links. Replaces enumerable UUID. NULL on rows predating S4-4; SMS cron backfills tokens going forward.';
