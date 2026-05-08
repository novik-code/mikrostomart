// Typy dla edytora grafiku (F3)

export type AbsenceType =
    | 'vacation'         // urlop wypoczynkowy
    | 'sick'             // chorobowe
    | 'on_demand'        // urlop na żądanie
    | 'child_care'       // opieka nad dzieckiem
    | 'training'         // szkolenie
    | 'delegation'       // delegacja
    | 'unpaid'           // urlop bezpłatny
    | 'other';

export const ABSENCE_TYPES: { value: AbsenceType; label: string; short: string; color: string }[] = [
    { value: 'vacation',   label: 'Urlop wypoczynkowy', short: 'U',  color: '#3b82f6' },
    { value: 'on_demand',  label: 'Urlop na żądanie',   short: 'UŻ', color: '#06b6d4' },
    { value: 'sick',       label: 'Chorobowe',          short: 'C',  color: '#ef4444' },
    { value: 'child_care', label: 'Opieka nad dzieckiem', short: 'OD', color: '#a855f7' },
    { value: 'training',   label: 'Szkolenie',          short: 'S',  color: '#fbbf24' },
    { value: 'delegation', label: 'Delegacja',          short: 'D',  color: '#10b981' },
    { value: 'unpaid',     label: 'Urlop bezpłatny',    short: 'UB', color: '#94a3b8' },
    { value: 'other',      label: 'Inne',               short: '?',  color: '#64748b' },
];

export type ShiftRole =
    | 'Lekarz'
    | 'Higienistka'
    | 'Asystentka'
    | 'Recepcja'
    | 'Manager'
    | 'Pracownia'
    | 'Biuro';

export const SHIFT_ROLES: { value: ShiftRole; label: string; color: string; icon: string }[] = [
    { value: 'Lekarz',      label: 'Lekarz',       color: '#38bdf8', icon: '🦷' },
    { value: 'Higienistka', label: 'Higienistka',  color: '#a78bfa', icon: '💉' },
    { value: 'Asystentka',  label: 'Asystentka',   color: '#34d399', icon: '🤝' },
    { value: 'Recepcja',    label: 'Recepcja',     color: '#fbbf24', icon: '📞' },
    { value: 'Manager',     label: 'Manager',      color: '#f472b6', icon: '👔' },
    { value: 'Pracownia',   label: 'Pracownia',    color: '#fb923c', icon: '🔬' },
    { value: 'Biuro',       label: 'Biuro',        color: '#94a3b8', icon: '📋' },
];

export interface EmploymentTerms {
    id: string;
    employee_id: string;
    contract_type: 'uop' | 'b2b' | 'zlecenie';
    weekly_hours: number;
    daily_hours: number;
    vacation_days_per_year: number;
    cleanup_buffer_minutes: number;
    hourly_rate: number | null;
    valid_from: string;
    valid_to: string | null;
    notes: string | null;
}

export interface WorkScheduleRow {
    id: string;
    employee_id: string;
    date: string;                  // YYYY-MM-DD
    planned_start: string | null;  // HH:MM:SS
    planned_end: string | null;
    absence_type: AbsenceType | null;
    location_id: string | null;
    roles_for_shift: string[];
    notes: string | null;
    created_by: string | null;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ShiftAssignmentRow {
    id: string;
    schedule_id: string;
    doctor_schedule_id: string | null;
    doctor_employee_id: string | null;
    workstation_id: string | null;
    segment_start: string;          // HH:MM:SS
    segment_end: string;
    location_id: string | null;
    notes: string | null;
}

// ── Workstations ────────────────────────────────────────────────────

export type WorkstationType = 'cabinet' | 'reception' | 'consultation' | 'lab' | 'office' | 'other';

export interface Workstation {
    id: string;
    name: string;
    short_label: string | null;
    workstation_type: WorkstationType;
    color: string | null;
    location_id: string | null;
    is_active: boolean;
    sort_order: number;
}

// ── DTO/payload do API ──────────────────────────────────────────────

export interface ShiftAssignmentInput {
    doctorScheduleId?: string | null;
    doctorEmployeeId?: string | null;   // gdy lekarz nie ma jeszcze grafiku
    workstationId?: string | null;
    segmentStart: string;                // HH:MM
    segmentEnd: string;
    locationId?: string | null;
    notes?: string | null;
}

export interface UpsertCellPayload {
    employeeId: string;
    date: string;                    // YYYY-MM-DD
    plannedStart?: string | null;    // HH:MM
    plannedEnd?: string | null;
    absenceType?: AbsenceType | null;
    rolesForShift?: string[];
    locationId?: string | null;
    notes?: string | null;
    assignments?: ShiftAssignmentInput[];   // pełna lista — replace strategy
}

// ── Odpowiedź GET /api/admin/schedule?month=YYYY-MM ─────────────────

export interface ScheduleEmployee {
    id: string;
    name: string;
    position: string | null;
    prodentis_id: string | null;
    daily_hours: number;
}

export interface ScheduleCell {
    id: string;
    employee_id: string;
    date: string;
    planned_start: string | null;
    planned_end: string | null;
    absence_type: AbsenceType | null;
    location_id: string | null;
    roles_for_shift: string[];
    notes: string | null;
    assignments: ShiftAssignmentRow[];
    minutes: number;                 // wyliczone minuty pracy planowane (0 dla absence)
}

export interface ScheduleMonthResponse {
    month: string;                   // YYYY-MM
    workingDays: number;             // dni robocze pn-pt w miesiącu
    employees: ScheduleEmployee[];
    workstations: Workstation[];     // dostępne stanowiska
    cells: ScheduleCell[];           // wszystkie wpisy w miesiącu
    summaries: Array<{
        employee_id: string;
        plannedMinutes: number;
        absenceDays: number;
        normaMinutes: number;        // norma = workingDays * employee.daily_hours * 60
    }>;
}
