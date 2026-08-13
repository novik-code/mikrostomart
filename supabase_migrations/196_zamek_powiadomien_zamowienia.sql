-- ============================================================================
-- Migracja 196 — DWUETAPOWY ZAMEK POWIADOMIEŃ O ZAMÓWIENIU
-- Data: 2026-08-13
-- Wejście: plan napraw bezpieczeństwa, „zamek zamówienia dwuetapowy"
--
-- ============================================================================
-- CO JEST NIE TAK DZISIAJ
-- ============================================================================
-- `/api/order-confirmation` bierze zamek jednoetapowo:
--     UPDATE orders SET notified_at = now() WHERE id = $1 AND notified_at IS NULL
-- To jest atomowe i poprawnie rozstrzyga wyścig równoległych odpytań — sprawdzone.
-- Problem jest ODWROTNY do tego, przed którym zamek broni:
--
-- 🔴 **Znacznik „wysłane" stawiamy PRZED wysyłką.** Jeśli `sendTelegramNotification`
--    albo `sendEmail` rzuci (Resend padnie, timeout SMTP), sterowanie leci do `catch`,
--    trasa oddaje 500 — a `notified_at` ZOSTAJE ustawiony. Kolejne odpytanie dostaje
--    `alreadyNotified: true`. Skutek: klient zapłacił, potwierdzenie nie poszło do niego
--    ANI do gabinetu, i nikt się nigdy nie dowie. Przy zamówieniu za 2500 zł to nie
--    jest usterka kosmetyczna.
--
-- ⚠️ ZMIERZONE PRZED NAPRAWĄ (2026-08-13): 15 zamówień `paid`, z czego 12 bez
--    `notified_at` — ale to wiersze SPRZED wprowadzenia zamka (ostatnie takie z 13.05
--    07:47, a pierwsze ze znacznikiem z 13.05 07:56). **Zgubionych powiadomień nie ma.**
--    Ta migracja zamyka ryzyko na przyszłość, nie sprząta zaległości.
--
-- ============================================================================
-- ROZWIĄZANIE — ROZDZIELIĆ „ZACZĄŁEM" OD „SKOŃCZYŁEM"
-- ============================================================================
--   `notify_started_at` — kto wziął robotę (broni przed równoległością)
--   `notified_at`       — kto ją SKOŃCZYŁ (stawiany dopiero po udanej wysyłce)
-- Ponowienie jest możliwe, gdy `notified_at IS NULL`, a `notify_started_at` jest
-- starszy niż okno (domyślnie 5 minut). Dzięki temu twarda śmierć procesu — timeout
-- lambdy, przy którym `catch` się NIE wykona — też się sama leczy.
--
-- 🔑 Zamek bierze RPC, nie łańcuch `.or()` w PostgREST. Warunek „NULL albo starsze niż
--    okno" sklejony stringiem w filtrze to ta sama klasa błędu, którą złapano
--    w `employee/documents/file` (przecinek w wartości rozbijał wyrażenie). W SQL
--    warunek jest warunkiem, nie tekstem.
--
-- ============================================================================
-- KOLEJNOŚĆ WZGLĘDEM DEPLOYU — BEZPIECZNA W OBIE STRONY
-- ============================================================================
-- Kod ma fallback: gdy RPC nie odpowiada (migracja jeszcze niewgrana), wraca do
-- dzisiejszego zamka jednoetapowego. Odwrotnie też jest bezpiecznie: kolumna i funkcja
-- bez nowego kodu nikomu nie przeszkadzają. **Żadna kolejność nie psuje sklepu** —
-- w odróżnieniu od kolumny `avatar`, gdzie deploy przed migracją wywalał cały select.
-- ============================================================================

-- ── Kolumna ─────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notify_started_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.notify_started_at IS
    'Kiedy ktos WZIAL sie za wysylke powiadomien o zamowieniu. notified_at = kiedy SKONCZYL. '
    'Rozdzielone, zeby nieudana wysylka nie zostawiala zamowienia bez powiadomienia na zawsze.';

-- ── Atomowe wzięcie zamka ───────────────────────────────────────────────────
-- TRUE = wołający ma robotę i ma wysyłać. FALSE = ktoś inny już wysłał albo właśnie wysyła.
CREATE OR REPLACE FUNCTION claim_order_notification(
    p_order_id      UUID,
    p_stale_minutes INT DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wziete BOOLEAN;
BEGIN
    UPDATE orders
       SET notify_started_at = now()
     WHERE id = p_order_id
       AND notified_at IS NULL
       AND (
             notify_started_at IS NULL
             OR notify_started_at < now() - make_interval(mins => greatest(p_stale_minutes, 1))
           )
    RETURNING true INTO v_wziete;

    RETURN coalesce(v_wziete, false);
END;
$$;

-- ── Domknięcie po udanej wysyłce ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION finish_order_notification(p_order_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE orders SET notified_at = now() WHERE id = p_order_id AND notified_at IS NULL;
$$;

-- ── Zwolnienie zamka, gdy wysyłka padła ─────────────────────────────────────
CREATE OR REPLACE FUNCTION release_order_notification(p_order_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE orders SET notify_started_at = NULL WHERE id = p_order_id AND notified_at IS NULL;
$$;

-- ── Uprawnienia: WYŁĄCZNIE rola serwisowa ───────────────────────────────────
-- 🔑 `SECURITY DEFINER` bez odebrania praw publicznych to funkcja, którą każdy
--    z kluczem anon woła w imieniu właściciela. Patrz `reference_supabase_rls_service_role`.
REVOKE ALL ON FUNCTION claim_order_notification(UUID, INT)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION finish_order_notification(UUID)       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_order_notification(UUID)      FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_order_notification(UUID, INT)   TO service_role;
GRANT EXECUTE ON FUNCTION finish_order_notification(UUID)       TO service_role;
GRANT EXECUTE ON FUNCTION release_order_notification(UUID)      TO service_role;

-- ── Weryfikacja ─────────────────────────────────────────────────────────────
-- Oczekiwane: kolumna jest, trzy funkcje istnieją.
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'orders' AND column_name IN ('notified_at', 'notify_started_at')
 ORDER BY column_name;

SELECT proname FROM pg_proc
 WHERE proname IN ('claim_order_notification', 'finish_order_notification', 'release_order_notification')
 ORDER BY proname;

-- ============================================================================
-- WERYFIKACJA POZA SQL-em
-- ============================================================================
--   1. kontrola negatywna: RPC kluczem anon → oczekiwane `42501` (brak uprawnień)
--   2. drugie wywołanie `claim_order_notification` na tym samym zamówieniu
--      w oknie 5 min → FALSE
--   3. po `release_order_notification` kolejne `claim` → TRUE
--   4. zamówienie z ustawionym `notified_at` → `claim` zawsze FALSE
-- ============================================================================
