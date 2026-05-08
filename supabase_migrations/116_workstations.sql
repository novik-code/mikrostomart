-- Migration 116: Stanowiska pracy (workstations)
-- Klinika ma 3 gabinety, recepcję, pokój konsultacyjny, pracownię i biuro.
-- Pracownicy są przypisywani do stanowisk w segmentach zmiany (np. asysta
-- może być 8-14 w Gabinecie 2 z dr Iloną, a 14-16 na Recepcji).

-- =============================================================================
-- 1. workstations
-- =============================================================================
CREATE TABLE IF NOT EXISTS workstations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    short_label TEXT,
    workstation_type TEXT NOT NULL CHECK (workstation_type IN (
        'cabinet',         -- gabinet stomatologiczny
        'reception',       -- recepcja
        'consultation',    -- pokój konsultacyjny
        'lab',             -- pracownia (technik)
        'office',          -- biuro / manager
        'other'
    )),
    color TEXT,            -- hex
    location_id UUID REFERENCES work_locations(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 100,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workstations_active_sort
    ON workstations(is_active, sort_order, name)
    WHERE is_active = true;

CREATE OR REPLACE FUNCTION update_workstations_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS workstations_updated_at_trigger ON workstations;
CREATE TRIGGER workstations_updated_at_trigger
    BEFORE UPDATE ON workstations FOR EACH ROW
    EXECUTE FUNCTION update_workstations_updated_at();

ALTER TABLE workstations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workstations_service_only ON workstations;
CREATE POLICY workstations_service_only ON workstations
    FOR ALL USING (false) WITH CHECK (false);

-- =============================================================================
-- 2. Seed: 7 domyślnych stanowisk Mikrostomart
-- =============================================================================
INSERT INTO workstations (name, short_label, workstation_type, color, location_id, sort_order)
SELECT * FROM (VALUES
    ('Gabinet 1',              'G1',  'cabinet',      '#38bdf8',  (SELECT id FROM work_locations WHERE is_primary LIMIT 1), 10),
    ('Gabinet 2',              'G2',  'cabinet',      '#0ea5e9',  (SELECT id FROM work_locations WHERE is_primary LIMIT 1), 20),
    ('Gabinet 3',              'G3',  'cabinet',      '#0284c7',  (SELECT id FROM work_locations WHERE is_primary LIMIT 1), 30),
    ('Recepcja',               'R',   'reception',    '#fbbf24',  (SELECT id FROM work_locations WHERE is_primary LIMIT 1), 40),
    ('Pokój konsultacyjny',    'PK',  'consultation', '#a78bfa',  (SELECT id FROM work_locations WHERE is_primary LIMIT 1), 50),
    ('Pracownia',              'P',   'lab',          '#fb923c',  (SELECT id FROM work_locations WHERE is_primary LIMIT 1), 60),
    ('Biuro',                  'BR',  'office',       '#94a3b8',  (SELECT id FROM work_locations WHERE is_primary LIMIT 1), 70)
) AS s(name, short_label, workstation_type, color, location_id, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM workstations WHERE name = s.name
);

-- =============================================================================
-- 3. shift_assignments — rozszerzenie o workstation_id i doctor_employee_id
-- =============================================================================
ALTER TABLE shift_assignments
    ADD COLUMN IF NOT EXISTS workstation_id UUID REFERENCES workstations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS doctor_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shift_assignments_workstation
    ON shift_assignments(workstation_id) WHERE workstation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shift_assignments_doctor_employee
    ON shift_assignments(doctor_employee_id) WHERE doctor_employee_id IS NOT NULL;

-- doctor_employee_id pozwala wskazać lekarza nawet gdy nie ma jeszcze grafiku
-- (system ostrzeże, ale segment się zapisze). Gdy lekarz dostanie grafik,
-- algorytm w F4/F5 dopasuje doctor_schedule_id automatycznie.

COMMENT ON COLUMN shift_assignments.workstation_id IS
    'Stanowisko pracy w tym segmencie (gabinet/recepcja/pracownia)';
COMMENT ON COLUMN shift_assignments.doctor_employee_id IS
    'Lekarz, z którym pracownik jest sparowany w tym segmencie (alternatywa do doctor_schedule_id, gdy lekarz nie ma jeszcze wpisu grafiku)';
