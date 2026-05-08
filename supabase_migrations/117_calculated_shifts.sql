-- Migration 117: Calculated Shifts (F4 z planu KCP)
-- Cache wyliczeń dnia pracy + audit log korekt admina.
--
-- F4 (bez Prodentis): planned vs actual, late/early/overtime jako totals.
-- F5 (z Prodentis): doctor_end_time + rozdzielenie overtime na justified/unjustified.

-- =============================================================================
-- 1. calculated_shifts
-- =============================================================================
CREATE TABLE IF NOT EXISTS calculated_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    schedule_id UUID REFERENCES work_schedules(id) ON DELETE SET NULL,

    -- Faktyczne czasy (z time_entries, par clock_in→clock_out)
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    worked_minutes INTEGER NOT NULL DEFAULT 0,
    sessions_count INTEGER NOT NULL DEFAULT 0,    -- ile par in→out było w dniu

    -- Planowane (z work_schedules)
    planned_start_time TIME,
    planned_end_time TIME,
    planned_minutes INTEGER NOT NULL DEFAULT 0,
    absence_type TEXT,

    -- Anomalie (vs grafik)
    late_minutes INTEGER NOT NULL DEFAULT 0,         -- spóźnienie (actual_start > planned_start)
    early_leave_minutes INTEGER NOT NULL DEFAULT 0,  -- wcześniejsze wyjście
    overtime_total_minutes INTEGER NOT NULL DEFAULT 0,  -- nadgodziny sumarycznie (actual_end > planned_end)
    overtime_justified_minutes INTEGER NOT NULL DEFAULT 0,    -- F5: zasadne (po analizie Prodentis)
    overtime_unjustified_minutes INTEGER NOT NULL DEFAULT 0,  -- F5: niezasadne

    -- Pole z F5 (Prodentis) — w F4 NULL
    doctor_end_time TIMESTAMPTZ,
    doctor_end_confidence TEXT CHECK (doctor_end_confidence IN ('high','medium','low','unknown')),
    cleanup_buffer_used INTEGER,

    -- Auto-domknięcie (clock_out brakował, system zamknął na planned_end)
    auto_closed BOOLEAN NOT NULL DEFAULT false,
    auto_close_reason TEXT,

    -- Stany przepływu
    status TEXT NOT NULL DEFAULT 'calculated'
        CHECK (status IN ('pending','calculated','admin_approved','disputed','frozen')),

    -- Anomalie (typy do filtrów w UI)
    anomaly_flags TEXT[] NOT NULL DEFAULT '{}',
    -- Wartości: 'no_clock_in', 'no_clock_out', 'late_arrival', 'early_leave',
    --           'overtime', 'no_schedule_but_worked', 'absence_but_clocked', 'short_session'

    notes TEXT,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,

    UNIQUE(employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_calculated_shifts_date_status
    ON calculated_shifts(date DESC, status);
CREATE INDEX IF NOT EXISTS idx_calculated_shifts_employee_date
    ON calculated_shifts(employee_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_calculated_shifts_anomalies
    ON calculated_shifts(date DESC) WHERE array_length(anomaly_flags, 1) > 0;

ALTER TABLE calculated_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS calculated_shifts_service_only ON calculated_shifts;
CREATE POLICY calculated_shifts_service_only ON calculated_shifts
    FOR ALL USING (false) WITH CHECK (false);

-- =============================================================================
-- 2. time_tracking_audit
-- =============================================================================
CREATE TABLE IF NOT EXISTS time_tracking_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    target_table TEXT NOT NULL,
    target_id UUID,
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT NOT NULL                  -- WYMAGANY (RODO + sprawiedliwość)
);

CREATE INDEX IF NOT EXISTS idx_audit_target_employee
    ON time_tracking_audit(target_employee_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at
    ON time_tracking_audit(changed_at DESC);

ALTER TABLE time_tracking_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS time_tracking_audit_service_only ON time_tracking_audit;
CREATE POLICY time_tracking_audit_service_only ON time_tracking_audit
    FOR ALL USING (false) WITH CHECK (false);
