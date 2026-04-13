-- CareFlow: Perioperative Patient Care System
-- Migration 110: Core tables for automated pre/post-procedure patient management

-- 1. Care templates (admin creates procedure protocols)
CREATE TABLE IF NOT EXISTS care_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    procedure_types TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    default_medications JSONB DEFAULT '[]',
    push_settings JSONB DEFAULT '{"reminder_interval_minutes": 30, "reminder_max_count": 6, "quiet_hours_start": 22, "quiet_hours_end": 7}',
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Template steps (ordered actions in a protocol)
CREATE TABLE IF NOT EXISTS care_template_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES care_templates(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '💊',
    offset_hours NUMERIC NOT NULL,
    smart_snap BOOLEAN DEFAULT true,
    push_message TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_count INTEGER DEFAULT 0,
    recurrence_interval_hours NUMERIC DEFAULT 8,
    reminder_interval_minutes INTEGER DEFAULT 30,
    reminder_max_count INTEGER DEFAULT 6,
    requires_confirmation BOOLEAN DEFAULT true,
    medication_index INTEGER,
    visible_hours_before NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_care_template_steps_template ON care_template_steps(template_id, sort_order);

-- 3. Patient enrollments (activation of a CareFlow for a patient)
CREATE TABLE IF NOT EXISTS care_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT,
    patient_db_id UUID,
    template_id UUID NOT NULL REFERENCES care_templates(id),
    template_name TEXT,
    appointment_id TEXT,
    appointment_date TIMESTAMPTZ NOT NULL,
    doctor_name TEXT,
    doctor_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled','paused')),
    custom_medications JSONB,
    custom_notes TEXT,
    prescription_code TEXT,
    follow_up_appointments JSONB DEFAULT '[]',
    access_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    enrolled_by TEXT NOT NULL,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    report_pdf_url TEXT,
    report_exported_to_prodentis BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_care_enrollments_patient ON care_enrollments(patient_id);
CREATE INDEX IF NOT EXISTS idx_care_enrollments_status ON care_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_care_enrollments_token ON care_enrollments(access_token);
CREATE INDEX IF NOT EXISTS idx_care_enrollments_date ON care_enrollments(appointment_date);

-- 4. Individual patient tasks (generated from template steps)
CREATE TABLE IF NOT EXISTS care_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES care_enrollments(id) ON DELETE CASCADE,
    step_id UUID REFERENCES care_template_steps(id),
    sort_order INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '💊',
    scheduled_at TIMESTAMPTZ NOT NULL,
    original_offset_hours NUMERIC,
    completed_at TIMESTAMPTZ,
    skipped_at TIMESTAMPTZ,
    push_sent_count INTEGER DEFAULT 0,
    push_last_sent_at TIMESTAMPTZ,
    push_max_count INTEGER DEFAULT 6,
    push_interval_minutes INTEGER DEFAULT 30,
    medication_name TEXT,
    medication_dose TEXT,
    medication_description TEXT,
    visible_from TIMESTAMPTZ,
    requires_confirmation BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_care_tasks_enrollment ON care_tasks(enrollment_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_care_tasks_pending ON care_tasks(scheduled_at)
    WHERE completed_at IS NULL AND skipped_at IS NULL;

-- 5. Audit log (full documentation of the care process)
CREATE TABLE IF NOT EXISTS care_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES care_enrollments(id) ON DELETE CASCADE,
    task_id UUID REFERENCES care_tasks(id),
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_care_audit_enrollment ON care_audit_log(enrollment_id, created_at);

-- RLS
ALTER TABLE care_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY care_templates_service ON care_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY care_template_steps_service ON care_template_steps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY care_enrollments_service ON care_enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY care_tasks_service ON care_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY care_audit_log_service ON care_audit_log FOR ALL USING (true) WITH CHECK (true);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_care_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER care_templates_updated BEFORE UPDATE ON care_templates
    FOR EACH ROW EXECUTE FUNCTION update_care_updated_at();
CREATE TRIGGER care_enrollments_updated BEFORE UPDATE ON care_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_care_updated_at();

-- Seed: "Zabieg chirurgiczny" template
INSERT INTO care_templates (name, description, procedure_types, default_medications, created_by) VALUES (
    'Zabieg chirurgiczny',
    'Standardowy protokół opieki peri-operacyjnej dla zabiegów chirurgii stomatologicznej (ekstrakcje, implanty, augmentacje)',
    ARRAY['Chirurgia', 'Implantologia'],
    '[
        {"name": "Antybiotyk (Amoksycylina)", "dose": "1g", "description": "Antybiotyk do stosowania przed i po zabiegu chirurgicznym. Stosować co 8 godzin.", "frequency": "co 8 godzin"},
        {"name": "Lek przeciwbólowy (Ibuprofen)", "dose": "400mg", "description": "W razie bólu. Nie przekraczać 3 tabletek dziennie.", "frequency": "w razie potrzeby, max co 6h"}
    ]'::jsonb,
    'system'
) ON CONFLICT DO NOTHING;

-- Seed steps for surgical template
DO $$
DECLARE tmpl_id UUID;
BEGIN
    SELECT id INTO tmpl_id FROM care_templates WHERE name = 'Zabieg chirurgiczny' LIMIT 1;
    IF tmpl_id IS NOT NULL THEN
        INSERT INTO care_template_steps (template_id, sort_order, title, description, icon, offset_hours, smart_snap, push_message, requires_confirmation, medication_index, visible_hours_before, reminder_interval_minutes, reminder_max_count) VALUES
        (tmpl_id, 1, 'Wykup receptę', 'Udaj się do apteki i wykup przepisany antybiotyk. Kod recepty znajdziesz poniżej.', '💊', -24, true, '💊 Wykup receptę na antybiotyk — zrób to dzisiaj!', true, NULL, 24, 30, 6),
        (tmpl_id, 2, 'Weź antybiotyk (dawka 1)', 'Przyjmij pierwszą dawkę antybiotyku — 1g Amoksycyliny.', '💊', -16, true, '💊 Pora na antybiotyk! Przyjmij 1g Amoksycyliny.', true, 0, NULL, 30, 6),
        (tmpl_id, 3, 'Weź antybiotyk (dawka 2)', 'Przyjmij drugą dawkę antybiotyku — 1g Amoksycyliny.', '💊', -8, true, '💊 Pora na antybiotyk! Przyjmij 1g Amoksycyliny.', true, 0, NULL, 30, 6),
        (tmpl_id, 4, 'Weź antybiotyk + lek przeciwbólowy. Przyjedź na zabieg.', 'Przyjmij antybiotyk (1g) i lek przeciwbólowy (Ibuprofen 400mg). Przyjedź do gabinetu 30 minut przed planowaną godziną zabiegu.', '🏥', -1, false, '🏥 Za godzinę Twój zabieg! Weź antybiotyk + lek przeciwbólowy i wyruszaj do gabinetu.', true, NULL, NULL, 0),
        (tmpl_id, 5, 'Weź antybiotyk po zabiegu', 'Przyjmij antybiotyk (1g Amoksycyliny). W razie bólu weź również Ibuprofen 400mg.', '💊', 8, true, '💊 Pora na antybiotyk po zabiegu! Przyjmij 1g Amoksycyliny.', true, 0, NULL, 30, 6),
        (tmpl_id, 6, 'Weź antybiotyk', 'Przyjmij antybiotyk (1g Amoksycyliny).', '💊', 16, true, '💊 Pora na antybiotyk! Przyjmij 1g Amoksycyliny.', true, 0, NULL, 30, 6),
        (tmpl_id, 7, 'Weź antybiotyk', 'Przyjmij antybiotyk (1g Amoksycyliny).', '💊', 24, true, '💊 Pora na antybiotyk! Przyjmij 1g Amoksycyliny.', true, 0, NULL, 30, 6),
        (tmpl_id, 8, 'Weź antybiotyk', 'Kontynuuj antybiotykoterapię — 1g Amoksycyliny.', '💊', 32, true, '💊 Pora na antybiotyk! Przyjmij 1g Amoksycyliny.', true, 0, NULL, 30, 6),
        (tmpl_id, 9, 'Weź antybiotyk', 'Kontynuuj antybiotykoterapię — 1g Amoksycyliny.', '💊', 40, true, '💊 Pora na antybiotyk! Przyjmij 1g Amoksycyliny.', true, 0, NULL, 30, 6),
        (tmpl_id, 10, 'Weź antybiotyk', 'Kontynuuj antybiotykoterapię — 1g Amoksycyliny.', '💊', 48, true, '💊 Pora na antybiotyk! Przyjmij 1g Amoksycyliny.', true, 0, NULL, 30, 6)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
