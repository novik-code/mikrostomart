-- Migration 115: Schedule Editor (F3 z planu KCP)
-- Tabele dla edytora grafiku pracy:
--   - employment_terms — warunki zatrudnienia per pracownik (etat, bufor sprzątania, stawka)
--   - work_schedules — planowana zmiana per pracownik per dzień (We/Wy/nieobecność/role)
--   - shift_assignments — segmenty asysta↔lekarz↔gabinet (np. "8-14R, 14-16M")

-- =============================================================================
-- 1. employment_terms
-- =============================================================================
CREATE TABLE IF NOT EXISTS employment_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    contract_type TEXT NOT NULL DEFAULT 'uop' CHECK (contract_type IN ('uop','b2b','zlecenie')),
    weekly_hours NUMERIC(4,2) NOT NULL DEFAULT 40 CHECK (weekly_hours > 0),
    daily_hours NUMERIC(4,2) NOT NULL DEFAULT 8 CHECK (daily_hours > 0),
    vacation_days_per_year INTEGER NOT NULL DEFAULT 26 CHECK (vacation_days_per_year >= 0),
    cleanup_buffer_minutes INTEGER NOT NULL DEFAULT 30 CHECK (cleanup_buffer_minutes >= 0),
    hourly_rate NUMERIC(10,2),
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employment_terms_employee
    ON employment_terms(employee_id, valid_from DESC);

CREATE OR REPLACE FUNCTION update_employment_terms_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS employment_terms_updated_at_trigger ON employment_terms;
CREATE TRIGGER employment_terms_updated_at_trigger
    BEFORE UPDATE ON employment_terms FOR EACH ROW
    EXECUTE FUNCTION update_employment_terms_updated_at();

ALTER TABLE employment_terms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employment_terms_service_only ON employment_terms;
CREATE POLICY employment_terms_service_only ON employment_terms
    FOR ALL USING (false) WITH CHECK (false);

-- =============================================================================
-- 2. work_schedules
-- =============================================================================
CREATE TABLE IF NOT EXISTS work_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    planned_start TIME,                 -- NULL gdy absence_type wypełnione
    planned_end TIME,                    -- NULL gdy absence_type wypełnione
    absence_type TEXT,                   -- 'vacation','sick','on_demand','child_care','training','delegation','unpaid','other'
    location_id UUID REFERENCES work_locations(id) ON DELETE SET NULL,
    roles_for_shift TEXT[] NOT NULL DEFAULT '{}',  -- np. ARRAY['Asystentka'] albo ARRAY['Higienistka','Recepcja']
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(employee_id, date),

    -- Albo praca (start+end, brak absence) ALBO nieobecność (absence_type, brak start/end)
    CONSTRAINT work_or_absence CHECK (
        (planned_start IS NOT NULL AND planned_end IS NOT NULL AND absence_type IS NULL)
        OR
        (planned_start IS NULL AND planned_end IS NULL AND absence_type IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_work_schedules_date_employee
    ON work_schedules(date, employee_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_employee_date_desc
    ON work_schedules(employee_id, date DESC);

CREATE OR REPLACE FUNCTION update_work_schedules_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS work_schedules_updated_at_trigger ON work_schedules;
CREATE TRIGGER work_schedules_updated_at_trigger
    BEFORE UPDATE ON work_schedules FOR EACH ROW
    EXECUTE FUNCTION update_work_schedules_updated_at();

ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS work_schedules_service_only ON work_schedules;
CREATE POLICY work_schedules_service_only ON work_schedules
    FOR ALL USING (false) WITH CHECK (false);

-- =============================================================================
-- 3. shift_assignments
-- =============================================================================
CREATE TABLE IF NOT EXISTS shift_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES work_schedules(id) ON DELETE CASCADE,
    doctor_schedule_id UUID REFERENCES work_schedules(id) ON DELETE SET NULL,
    segment_start TIME NOT NULL,
    segment_end TIME NOT NULL,
    location_id UUID REFERENCES work_locations(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT segment_valid CHECK (segment_end > segment_start)
);

CREATE INDEX IF NOT EXISTS idx_shift_assignments_schedule
    ON shift_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_doctor
    ON shift_assignments(doctor_schedule_id);

ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shift_assignments_service_only ON shift_assignments;
CREATE POLICY shift_assignments_service_only ON shift_assignments
    FOR ALL USING (false) WITH CHECK (false);

-- =============================================================================
-- 4. Seed: domyślne employment_terms dla wszystkich aktywnych pracowników
-- =============================================================================
INSERT INTO employment_terms (employee_id, contract_type, weekly_hours, daily_hours, vacation_days_per_year, valid_from)
SELECT
    e.id,
    CASE
        WHEN e.position = 'Lekarz' THEN 'b2b'   -- lekarze na B2B (Marcin)
        ELSE 'uop'                               -- reszta na UoP
    END,
    40,
    8,
    26,
    '2026-01-01'::DATE                           -- ważne od początku roku
FROM employees e
WHERE e.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM employment_terms et
    WHERE et.employee_id = e.id AND et.valid_to IS NULL
  );
