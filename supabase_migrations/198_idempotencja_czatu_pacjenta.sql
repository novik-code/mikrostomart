-- ============================================================================
-- Migracja 198 — IDEMPOTENCJA WYSYŁKI W CZACIE PACJENTA
-- Data: 2026-08-16
-- Wejście: plan 1.3.0 bezpieczeństwo, pozycja W5
--
-- ============================================================================
-- PROBLEM
-- ============================================================================
-- `POST /api/patients/chat` i `POST /api/chat/guest` wstawiają wiadomość BEZ
-- żadnego klucza żądania. Skutek jest widoczny dla człowieka:
--
--   pacjent pisze w poczekalni → sieć siada w trakcie żądania → apka pokazuje
--   „nie wysłano" → pacjent stuka „ponów" → serwer zapisał JUŻ pierwszą próbę
--   → recepcja widzi TĘ SAMĄ wiadomość dwa razy.
--
-- To nie jest teoria: dokładnie ten mechanizm doprowadził do zdublowanych
-- wiadomości w czacie ZESPOŁU, dlatego tamten tor dostał `client_msg_id`
-- (mig 183). Tor pacjenta go nie ma — czyli ta sama klasa błędu piętro niżej.
--
-- ============================================================================
-- MECHANIZM
-- ============================================================================
-- Apka nadaje wiadomości identyfikator PRZED wysyłką (generator już istnieje:
-- `newClientMsgId` w `src/lib/chat.ts`). Serwer zapisuje go razem z treścią.
-- Ponowienie tej samej wysyłki trafia na UNIKALNY indeks i zamiast drugiego
-- wiersza dostaje z powrotem wiadomość zapisaną za pierwszym razem.
--
-- Indeks jest CZĘŚCIOWY (`WHERE client_msg_id IS NOT NULL`), bo:
--   • binarki 1.1 i 1.2 ze sklepów NIE WYSYŁAJĄ tego pola i muszą działać dalej,
--   • panel recepcji też go nie wysyła,
--   • bez `WHERE` wszystkie takie wiersze miałyby NULL i kolidowałyby ze sobą
--     w niektórych konfiguracjach — a i tak nie ma czego deduplikować.
--
-- Zakres unikalności to `(conversation_id, client_msg_id)`, nie sam identyfikator:
-- klucz nadaje KLIENT, więc nie wolno zakładać, że jest globalnie niepowtarzalny.
--
-- ============================================================================
-- BEZPIECZEŃSTWO
-- ============================================================================
-- Kolumna jest nieszkodliwa: to losowy ciąg z urządzenia, bez treści i bez
-- tożsamości. Nie wchodzi do eksportu RODO jako osobna kategoria danych, bo nie
-- niesie informacji o osobie.
--
-- ============================================================================
-- ODWRACALNOŚĆ
-- ============================================================================
-- Migracja jest ADDYTYWNA i bezpieczna w dowolnej kolejności względem deployu:
-- kod bez kolumny po prostu jej nie zapisuje, a kolumna bez kodu stoi pusta.
-- Wycofanie: DROP INDEX + DROP COLUMN (na dole, zakomentowane).
-- ============================================================================

ALTER TABLE public.chat_messages
    ADD COLUMN IF NOT EXISTS client_msg_id TEXT;

COMMENT ON COLUMN public.chat_messages.client_msg_id IS
    'Klucz idempotencji nadany przez klienta przed wysylka (W5, mig 198). '
    'NULL dla panelu recepcji i binarek 1.1/1.2, ktore go nie wysylaja.';

-- Ponowienie tej samej wysyłki nie tworzy drugiego wiersza.
CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_client_msg_id_uniq
    ON public.chat_messages (conversation_id, client_msg_id)
    WHERE client_msg_id IS NOT NULL;

-- ============================================================================
-- KONTROLA PO WGRANIU (uruchomić i porównać)
-- ============================================================================
-- Kolumna istnieje i jest pusta (zero wpisow historycznych):
--   SELECT count(*) AS wszystkie,
--          count(client_msg_id) AS z_kluczem
--   FROM public.chat_messages;
--   -- oczekiwane: z_kluczem = 0
--
-- Indeks istnieje i jest CZESCIOWY:
--   SELECT indexdef FROM pg_indexes
--   WHERE tablename = 'chat_messages' AND indexname = 'chat_messages_client_msg_id_uniq';
--   -- oczekiwane: definicja zawiera "WHERE (client_msg_id IS NOT NULL)"
--
-- Kontrola NEGATYWNA — dwa NULL-e nadal wolno wstawic (panel recepcji dziala):
--   (nie robic na produkcji; sprawdzone tym, ze panel wysyla wiadomosci dalej)
--
-- ============================================================================
-- WYCOFANIE
-- ============================================================================
-- DROP INDEX IF EXISTS public.chat_messages_client_msg_id_uniq;
-- ALTER TABLE public.chat_messages DROP COLUMN IF EXISTS client_msg_id;
