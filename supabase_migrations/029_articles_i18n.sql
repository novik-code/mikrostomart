-- Migration: Add i18n support to articles table
-- Adds locale column and group_id to link translated versions of the same article

-- 1. Add locale column (default 'pl' for existing articles)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'pl';

-- 2. Add group_id to link translations of the same article
ALTER TABLE articles ADD COLUMN IF NOT EXISTS group_id UUID DEFAULT gen_random_uuid();

-- 3. Set group_id for all existing articles that don't have one
UPDATE articles SET group_id = gen_random_uuid() WHERE group_id IS NULL;

-- 4. Ensure unique constraint: one locale per group
ALTER TABLE articles ADD CONSTRAINT articles_group_locale_unique UNIQUE (group_id, locale);

-- 5. Index for fast locale-filtered queries
CREATE INDEX IF NOT EXISTS idx_articles_locale ON articles (locale);
CREATE INDEX IF NOT EXISTS idx_articles_group_id ON articles (group_id);
