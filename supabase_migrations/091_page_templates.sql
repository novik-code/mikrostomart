-- =============================================
-- Migration 091: Page Templates
-- =============================================
-- Stores saved page layout configurations for quick switching.
-- Each template captures: theme overrides, section order/visibility, page overrides, custom logo.

CREATE TABLE IF NOT EXISTS page_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text DEFAULT '',
    config jsonb NOT NULL DEFAULT '{}',
    is_default boolean DEFAULT false,
    created_by text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE page_templates ENABLE ROW LEVEL SECURITY;

-- Public read (templates are not secret)
CREATE POLICY "page_templates_select" ON page_templates
    FOR SELECT USING (true);

-- Only authenticated users can insert/update/delete
CREATE POLICY "page_templates_insert" ON page_templates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "page_templates_update" ON page_templates
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "page_templates_delete" ON page_templates
    FOR DELETE USING (auth.role() = 'authenticated');
