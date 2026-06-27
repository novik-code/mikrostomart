-- 170_chat_guest_conversations.sql
-- Czat gościa (anonimowy, bez konta pacjenta): pozwól, by konwersacja istniała bez
-- patient_id. Dostęp do wątku tylko przez losowy guest_token (telefon = kontakt zwrotny).
-- Additive + idempotentne. Istniejące wiersze mają patient_id → CHECK spełniony bez zmian.

ALTER TABLE chat_conversations ALTER COLUMN patient_id DROP NOT NULL;

ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS guest_name  TEXT;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS guest_phone TEXT;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS guest_token TEXT;

-- spójność: albo zalogowany pacjent (patient_id), albo gość (token + telefon)
ALTER TABLE chat_conversations DROP CONSTRAINT IF EXISTS chat_conv_patient_or_guest;
ALTER TABLE chat_conversations ADD CONSTRAINT chat_conv_patient_or_guest
    CHECK (
        patient_id IS NOT NULL
        OR (is_anonymous = true AND guest_token IS NOT NULL AND guest_phone IS NOT NULL)
    );

-- token = jedyny klucz dostępu do wątku gościa (unikalny); telefon do kontaktu recepcji
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_conv_guest_token ON chat_conversations (guest_token) WHERE guest_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_conv_guest_phone ON chat_conversations (guest_phone) WHERE guest_phone IS NOT NULL;
