-- Add i18n columns to blog_posts table
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'pl',
  ADD COLUMN IF NOT EXISTS group_id UUID DEFAULT gen_random_uuid();

-- Unique constraint: one translation per locale per group
ALTER TABLE blog_posts
  ADD CONSTRAINT blog_posts_group_locale_unique UNIQUE (group_id, locale);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_blog_posts_locale ON blog_posts(locale);
CREATE INDEX IF NOT EXISTS idx_blog_posts_group_id ON blog_posts(group_id);
