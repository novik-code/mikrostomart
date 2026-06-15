-- 165_articles_status.sql
-- Silnik treści Klasy A (GEO 2026-06-15): kolumna status dla `articles` (baza wiedzy).
-- Cel: auto-generowane artykuły KB lądują jako 'draft' → admin zatwierdza ('published').
-- Publiczne strony/sitemap czytają TYLKO status='published'; drafty nigdy nie indeksowane.
--
-- BEZPIECZNE / ADDITIVE / IDEMPOTENTNE:
-- - Istniejące wiersze dostają DEFAULT 'published' (zero zmian widoczności obecnych KB).
-- - NOT NULL + DEFAULT 'published' → backfill automatyczny dla istniejących rekordów.
--
-- 🚨 WGRAĆ NA OBU Supabase (produkcja keucogopujdolzmfajjv + demo mhosfncgasjfruiohlfo)
--    PRZED deployem kodu, który filtruje po `status` (inaczej PostgREST błąd na publicznych
--    odczytach KB → strony bazy wiedzy się wysypią).

BEGIN;

ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';

-- CHECK constraint (idempotentny przez catch duplicate_object)
DO $$
BEGIN
    ALTER TABLE articles
        ADD CONSTRAINT articles_status_chk CHECK (status IN ('draft', 'published'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Indeksy pod filtrowanie publiczne (locale+status) i przegląd draftów w adminie
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_locale_status ON articles(locale, status);

-- Safeguard: cokolwiek z NULL (gdyby kolumna istniała wcześniej bez NOT NULL) → published
UPDATE articles SET status = 'published' WHERE status IS NULL;

COMMIT;
