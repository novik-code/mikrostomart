-- Migration 118: Leaves + Polish Holidays (F6 z planu KCP)
-- Workflow urlopów: pracownik składa wniosek → admin akceptuje/odrzuca
-- → przy approve auto-wpis absence do work_schedules.
-- Plus kalendarz świąt PL — do auto-wyliczenia normy godzin.

-- =============================================================================
-- 1. polish_holidays — kalendarz świąt
-- =============================================================================
CREATE TABLE IF NOT EXISTS polish_holidays (
    date DATE PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'national',  -- 'national' | 'observed' | 'company'
    is_working_day BOOLEAN NOT NULL DEFAULT false,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_polish_holidays_date ON polish_holidays(date);

ALTER TABLE polish_holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS polish_holidays_public_read ON polish_holidays;
CREATE POLICY polish_holidays_public_read ON polish_holidays
    FOR SELECT USING (true);
DROP POLICY IF EXISTS polish_holidays_service_write ON polish_holidays;
CREATE POLICY polish_holidays_service_write ON polish_holidays
    FOR INSERT WITH CHECK (false);

-- Seed: święta państwowe PL 2026 i 2027
INSERT INTO polish_holidays (date, name, type) VALUES
    -- 2026
    ('2026-01-01', 'Nowy Rok',                           'national'),
    ('2026-01-06', 'Trzech Króli',                        'national'),
    ('2026-04-05', 'Wielkanoc',                           'national'),
    ('2026-04-06', 'Poniedziałek Wielkanocny',            'national'),
    ('2026-05-01', 'Święto Pracy',                        'national'),
    ('2026-05-03', 'Konstytucji 3 Maja',                  'national'),
    ('2026-05-24', 'Zielone Świątki',                     'national'),
    ('2026-06-04', 'Boże Ciało',                          'national'),
    ('2026-08-15', 'Wniebowzięcie NMP',                   'national'),
    ('2026-11-01', 'Wszystkich Świętych',                 'national'),
    ('2026-11-11', 'Święto Niepodległości',               'national'),
    ('2026-12-24', 'Wigilia',                             'observed'),  -- nieobowiązkowe
    ('2026-12-25', 'Boże Narodzenie',                     'national'),
    ('2026-12-26', 'Drugi dzień Bożego Narodzenia',       'national'),
    -- 2027
    ('2027-01-01', 'Nowy Rok',                            'national'),
    ('2027-01-06', 'Trzech Króli',                        'national'),
    ('2027-03-28', 'Wielkanoc',                           'national'),
    ('2027-03-29', 'Poniedziałek Wielkanocny',            'national'),
    ('2027-05-01', 'Święto Pracy',                        'national'),
    ('2027-05-03', 'Konstytucji 3 Maja',                  'national'),
    ('2027-05-16', 'Zielone Świątki',                     'national'),
    ('2027-05-27', 'Boże Ciało',                          'national'),
    ('2027-08-15', 'Wniebowzięcie NMP',                   'national'),
    ('2027-11-01', 'Wszystkich Świętych',                 'national'),
    ('2027-11-11', 'Święto Niepodległości',               'national'),
    ('2027-12-24', 'Wigilia',                             'observed'),
    ('2027-12-25', 'Boże Narodzenie',                     'national'),
    ('2027-12-26', 'Drugi dzień Bożego Narodzenia',       'national')
ON CONFLICT (date) DO NOTHING;

-- =============================================================================
-- 2. leave_requests — wnioski urlopowe
-- =============================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'vacation',         -- urlop wypoczynkowy (liczone do bilansu)
        'on_demand',        -- na żądanie (z bilansu)
        'sick',             -- chorobowe (osobny licznik)
        'child_care',       -- opieka nad dzieckiem
        'training',         -- szkolenie
        'delegation',       -- delegacja
        'unpaid',           -- bezpłatny
        'other'
    )),
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    days_count INTEGER NOT NULL,           -- dni roboczych w przedziale (pn-pt minus święta)
    hours_per_day NUMERIC(4,2),            -- np. 4.0 dla półdniówki, NULL = pełen dzień
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
        'requested', 'approved', 'rejected', 'cancelled'
    )),
    reason TEXT,                           -- powód wniosku (od pracownika)
    rejected_reason TEXT,                  -- powód odrzucenia (od admina)
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- może być admin za pracownika
    cancelled_at TIMESTAMPTZ,
    attachment_url TEXT,                   -- ZUS, zaświadczenia
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT date_range_valid CHECK (date_to >= date_from),
    CONSTRAINT days_count_positive CHECK (days_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_status
    ON leave_requests(employee_id, status, date_from DESC);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status_pending
    ON leave_requests(created_at DESC) WHERE status = 'requested';
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates
    ON leave_requests(date_from, date_to) WHERE status = 'approved';

CREATE OR REPLACE FUNCTION update_leave_requests_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS leave_requests_updated_at_trigger ON leave_requests;
CREATE TRIGGER leave_requests_updated_at_trigger
    BEFORE UPDATE ON leave_requests FOR EACH ROW
    EXECUTE FUNCTION update_leave_requests_updated_at();

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leave_requests_service_only ON leave_requests;
CREATE POLICY leave_requests_service_only ON leave_requests
    FOR ALL USING (false) WITH CHECK (false);

COMMENT ON COLUMN leave_requests.days_count IS
    'Liczba dni roboczych (pn-pt minus święta z polish_holidays) w przedziale [date_from, date_to]';
COMMENT ON COLUMN leave_requests.hours_per_day IS
    'NULL = pełen dzień (= daily_hours z umowy). Liczba = półdniówka / niepełne godziny';
