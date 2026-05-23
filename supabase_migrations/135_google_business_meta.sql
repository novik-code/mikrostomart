-- 135 (2026-05-23): google_business_meta — authoritative aggregate from Google Places API
--
-- KONTEKST:
-- GSC 2026-05-23 zgłosił 22 critical errors "Weryfikacja obejmuje wiele ocen
-- zbiorczych" na rich results dla homepage. Diagnoza: nasza schema markup
-- mówiła "5.0 ★, 23 reviews", a Google Business Profile pokazuje **278 reviews
-- / 4.5 ★**. Google porównuje schema z własnym authoritative data → rozjazd =
-- invalid structured data.
--
-- ROZWIĄZANIE (wariant D):
-- Cron /api/google-reviews pobiera już `userRatingCount` + `rating` z Places
-- API New (field mask), ale dotychczas ignorował te wartości. Teraz storujemy
-- je w tej singleton tabeli i schema aggregateRating czyta z niej zamiast
-- liczyć z naszej (limited) google_reviews tabeli.
--
-- Singleton pattern (id=1 fixed, CHECK constraint) — tylko jeden row dla
-- jednego biznesu. Seed defaults z aktualnych GBP liczb (Marcin verified
-- 2026-05-23: 278 reviews / 4.5★) — cron i tak nadpisze przy następnym fetchu.

CREATE TABLE IF NOT EXISTS google_business_meta (
    id INT PRIMARY KEY DEFAULT 1,
    user_rating_count INT NOT NULL DEFAULT 0,
    rating NUMERIC(2,1) NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (id = 1)
);

-- Seed singleton row (idempotent — re-run safe)
INSERT INTO google_business_meta (id, user_rating_count, rating, updated_at)
VALUES (1, 278, 4.5, NOW())
ON CONFLICT (id) DO NOTHING;

-- RLS service_role only (mig 132 pattern — explicit TO service_role żeby anon
-- nie miał dostępu, mimo że to dane public-by-design)
ALTER TABLE google_business_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS google_business_meta_service ON google_business_meta;
CREATE POLICY google_business_meta_service ON google_business_meta
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Brak public read policy — getAggregateRating() używa service_role client
-- przez supabase singleton w src/lib/supabaseClient.ts (BYPASSRLS).
