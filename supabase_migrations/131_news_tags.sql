-- Migration 131: news.tags TEXT[] for per-article SEO keywords
--
-- Slug page (src/app/[locale]/aktualnosci/[slug]/page.tsx) already supports
-- `localizedArticle.tags` (J-1 fix 2026-05-12) — generuje schema NewsArticle
-- `keywords` field z CSV tagów + meta name="keywords" w generateMetadata.
-- Brakuje column w DB.
--
-- Per-article keywords pozwalają targetować długi-ogon SEO (Wojtek: "metamorfoza
-- implant augmentacja kości endodoncja mikroskop ZEISS"). Generic keywords z
-- /aktualnosci/layout.tsx zostają jako fallback gdy tags = null lub [].
--
-- Idempotent: ADD COLUMN IF NOT EXISTS.

ALTER TABLE news
    ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT NULL;

COMMENT ON COLUMN news.tags IS 'Per-article SEO keywords as PostgreSQL text array. Joined as CSV in NewsArticle schema keywords field. NULL/empty = fallback do generic keywords z aktualnosci/layout.tsx.';

-- Optional GIN index — only useful if we ever query "find news by tag" (admin
-- filter, related articles). Cheap to add proactively.
CREATE INDEX IF NOT EXISTS idx_news_tags_gin ON news USING GIN (tags);
