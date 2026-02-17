-- Migration 028: Add i18n locale columns to news table
-- Adds translation columns for EN, DE, UA (PL stays in original columns as default)

ALTER TABLE news
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS title_de TEXT,
  ADD COLUMN IF NOT EXISTS title_ua TEXT,
  ADD COLUMN IF NOT EXISTS excerpt_en TEXT,
  ADD COLUMN IF NOT EXISTS excerpt_de TEXT,
  ADD COLUMN IF NOT EXISTS excerpt_ua TEXT,
  ADD COLUMN IF NOT EXISTS content_en TEXT,
  ADD COLUMN IF NOT EXISTS content_de TEXT,
  ADD COLUMN IF NOT EXISTS content_ua TEXT;

-- Add comments for documentation
COMMENT ON COLUMN news.title_en IS 'English translation of title (falls back to title if NULL)';
COMMENT ON COLUMN news.title_de IS 'German translation of title (falls back to title if NULL)';
COMMENT ON COLUMN news.title_ua IS 'Ukrainian translation of title (falls back to title if NULL)';
COMMENT ON COLUMN news.excerpt_en IS 'English translation of excerpt (falls back to excerpt if NULL)';
COMMENT ON COLUMN news.excerpt_de IS 'German translation of excerpt (falls back to excerpt if NULL)';
COMMENT ON COLUMN news.excerpt_ua IS 'Ukrainian translation of excerpt (falls back to excerpt if NULL)';
COMMENT ON COLUMN news.content_en IS 'English translation of content (falls back to content if NULL)';
COMMENT ON COLUMN news.content_de IS 'German translation of content (falls back to content if NULL)';
COMMENT ON COLUMN news.content_ua IS 'Ukrainian translation of content (falls back to content if NULL)';
