-- Migracja 174: atomowy licznik limitów (RPC) — zamiast select-then-update
--
-- PROBLEM: src/lib/rateLimit.ts robił SELECT, potem UPDATE w dwóch osobnych
-- zapytaniach. Przy równoległych żądaniach (Vercel = wiele lambd naraz) obie
-- odczytywały tę samą wartość i zapisywały count+1, więc realna liczba żądań
-- przekraczała limit. Dla dziennego capa kosztowego symulatora
-- (smile:global:<dzień>, GLOBAL_DAILY_LIMIT) oznaczało to, że budżet na
-- Replicate mógł zostać przekroczony pod obciążeniem.
--
-- ROZWIĄZANIE: jedno atomowe INSERT ... ON CONFLICT DO UPDATE, które
-- inkrementuje i zwraca nową wartość w jednej operacji.
--
-- Okno czasowe: jeśli wpis wygasł (reset_at < now), licznik startuje od nowa
-- z nowym reset_at — dokładnie tak, jak robił to stary kod w TS.
--
-- KOMPATYBILNOŚĆ: rateLimit.ts wywołuje ten RPC, a gdy go nie ma (np. migracja
-- jeszcze nie wgrana), po cichu wraca do starej ścieżki select-then-update.
-- Dzięki temu kolejność deploy vs migracja nie ma znaczenia — ale i tak
-- zalecane: wgrać na OBA env, potem deploy.

CREATE OR REPLACE FUNCTION increment_rate_limit(
    p_key TEXT,
    p_window_ms BIGINT
)
RETURNS TABLE (out_count INTEGER, out_reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_now   TIMESTAMPTZ := NOW();
    v_reset TIMESTAMPTZ := NOW() + (p_window_ms * INTERVAL '1 millisecond');
BEGIN
    -- Data-modifying CTE wrapped in a SELECT: the form RETURN QUERY always
    -- accepts (a bare "RETURN QUERY INSERT ..." is not portable).
    RETURN QUERY
    WITH upserted AS (
        INSERT INTO rate_limit_entries AS r (key, count, reset_at)
        VALUES (p_key, 1, v_reset)
        ON CONFLICT (key) DO UPDATE
            SET count = CASE
                            WHEN r.reset_at < v_now THEN 1
                            ELSE r.count + 1
                        END,
                reset_at = CASE
                            WHEN r.reset_at < v_now THEN v_reset
                            ELSE r.reset_at
                        END
        RETURNING r.count AS c, r.reset_at AS ra
    )
    SELECT c, ra FROM upserted;
END;
$$;

-- Dostęp wyłącznie dla service_role (cała obsługa limitów jest po stronie serwera).
REVOKE ALL ON FUNCTION increment_rate_limit(TEXT, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION increment_rate_limit(TEXT, BIGINT) FROM anon;
REVOKE ALL ON FUNCTION increment_rate_limit(TEXT, BIGINT) FROM authenticated;
GRANT EXECUTE ON FUNCTION increment_rate_limit(TEXT, BIGINT) TO service_role;
