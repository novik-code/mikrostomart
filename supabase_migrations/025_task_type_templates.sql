-- ============================================
-- Migration: Task Type Templates
-- ============================================
-- Date: 2026-02-15
-- Purpose: Dynamic task type definitions with checklist templates.
--          Replaces hardcoded TASK_TYPE_CHECKLISTS in pracownik/page.tsx.

CREATE TABLE IF NOT EXISTS task_type_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    label TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '📋',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with existing hardcoded types
INSERT INTO task_type_templates (key, label, icon, items, sort_order) VALUES
    ('modele_archiwalne',  'Modele Archiwalne',             '📦', '["Zgrać skany"]',  1),
    ('modele_analityczne', 'Modele Analityczne / Wax Up',   '🔬', '["Zgrać skany"]',  2),
    ('korona_zab',         'Korona na Zębie',               '🦷', '["Zgrać dane","Projekt","Frez","Piec","Charakteryzacja","Wycienienie","Spr"]', 3),
    ('korona_implant',     'Korona na Implancie',           '🔩', '["Zgrać dane","Stworzyć model","Projekt","Frez","Piec","Charakteryzacja","Skleić z ti base","Spr"]', 4),
    ('chirurgia',          'Chirurgia / Implantologia',     '🏥', '["Zgrać CBCT","Zgrać skany","Projekt szablonu","Podać rozmiar implantów","Zamówić implant","Zamówić multiunit","Druk","Sprawdzić dziurki","Sterylizacja","Wpłacony zadatek"]', 5),
    ('ortodoncja',         'Ortodoncja',                    '😁', '["Wgrać dane do CC","Pokazać wizualizacje","Akceptacja","Wpłata 50%","Zamówienie nakładek"]', 6),
    ('plan_leczenia',      'Plan Leczenia',                 '📝', '["Plan","Prezentacja","Sprawdzić","Druk","Oddanie"]', 7),
    ('inne',               'Inne',                          '📋', '[]', 99)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE task_type_templates IS 'Dynamic task type definitions with checklist templates, managed from Employee Zone UI';
