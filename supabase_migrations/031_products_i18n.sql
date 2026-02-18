-- 031: Add i18n translation columns to products table
-- Polish text stays in original columns (name, description, category)
-- Translations stored as JSONB: {"en": "...", "de": "...", "ua": "..."}

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS name_translations JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description_translations JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS category_translations JSONB DEFAULT '{}';
