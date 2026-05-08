// Serwis edytora grafiku (F3) — operacje na work_schedules + shift_assignments + employment_terms

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
    EmploymentTerms,
    ScheduleCell,
    ScheduleEmployee,
    ScheduleMonthResponse,
    ShiftAssignmentRow,
    UpsertCellPayload,
    WorkScheduleRow,
    Workstation,
} from './scheduleTypes';

function getServiceClient(): SupabaseClient {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

// ── Helpers daty ────────────────────────────────────────────────────

export function parseMonthString(month: string): { year: number; monthIdx: number; firstDay: Date; lastDay: Date } | null {
    const m = /^(\d{4})-(\d{2})$/.exec(month);
    if (!m) return null;
    const year = Number.parseInt(m[1], 10);
    const monthIdx = Number.parseInt(m[2], 10) - 1;  // 0-based
    if (monthIdx < 0 || monthIdx > 11) return null;
    const firstDay = new Date(Date.UTC(year, monthIdx, 1));
    const lastDay = new Date(Date.UTC(year, monthIdx + 1, 0));
    return { year, monthIdx, firstDay, lastDay };
}

export function isoDateUTC(d: Date): string {
    return d.toISOString().slice(0, 10);
}

export function workingDaysInMonth(year: number, monthIdx: number): number {
    let count = 0;
    const last = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
    for (let day = 1; day <= last; day++) {
        const d = new Date(Date.UTC(year, monthIdx, day));
        const dow = d.getUTCDay(); // 0 = niedz, 6 = sob
        if (dow !== 0 && dow !== 6) count++;
    }
    return count;
}

// HH:MM lub HH:MM:SS → minuty
function timeStringToMinutes(t: string | null): number {
    if (!t) return 0;
    const parts = t.split(':');
    if (parts.length < 2) return 0;
    return Number.parseInt(parts[0], 10) * 60 + Number.parseInt(parts[1], 10);
}

function calcMinutes(row: WorkScheduleRow): number {
    if (row.absence_type) return 0;
    if (!row.planned_start || !row.planned_end) return 0;
    const start = timeStringToMinutes(row.planned_start);
    const end = timeStringToMinutes(row.planned_end);
    return Math.max(0, end - start);
}

// ── Walidacje wejścia ───────────────────────────────────────────────

export function isValidTimeHHmm(s: string): boolean {
    return /^\d{2}:\d{2}$/.test(s);
}

export function isValidISODate(s: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// ── Pobranie aktywnych pracowników z domyślnymi daily_hours ─────────

export async function fetchActiveEmployeesForSchedule(): Promise<ScheduleEmployee[]> {
    const supabase = getServiceClient();
    const { data: emps, error } = await supabase
        .from('employees')
        .select('id, name, position, prodentis_id, is_active')
        .eq('is_active', true)
        .order('position', { ascending: true })
        .order('name', { ascending: true });
    if (error) {
        console.error('[scheduleService] fetchActiveEmployees error:', error);
        return [];
    }
    const employeeIds = (emps ?? []).map((e: any) => e.id);

    // employment_terms — najnowszy aktywny rekord per pracownik
    let termsByEmp: Record<string, EmploymentTerms | undefined> = {};
    if (employeeIds.length > 0) {
        const { data: terms } = await supabase
            .from('employment_terms')
            .select('*')
            .in('employee_id', employeeIds)
            .order('valid_from', { ascending: false });
        for (const t of (terms ?? []) as EmploymentTerms[]) {
            if (!termsByEmp[t.employee_id]) termsByEmp[t.employee_id] = t;
        }
    }

    return (emps ?? []).map((e: any) => ({
        id: e.id,
        name: e.name,
        position: e.position ?? null,
        prodentis_id: e.prodentis_id ?? null,
        daily_hours: termsByEmp[e.id]?.daily_hours ?? 8,
    }));
}

export async function fetchActiveWorkstations(): Promise<Workstation[]> {
    const supabase = getServiceClient();
    const { data, error } = await supabase
        .from('workstations')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
    if (error) {
        console.error('[scheduleService] fetchActiveWorkstations error:', error);
        return [];
    }
    return (data ?? []) as Workstation[];
}

// ── Główny widok miesiąca ───────────────────────────────────────────

export async function fetchScheduleMonth(month: string): Promise<ScheduleMonthResponse | null> {
    const parsed = parseMonthString(month);
    if (!parsed) return null;

    const supabase = getServiceClient();
    const [employees, workstations] = await Promise.all([
        fetchActiveEmployeesForSchedule(),
        fetchActiveWorkstations(),
    ]);

    const fromIso = isoDateUTC(parsed.firstDay);
    const toIso = isoDateUTC(parsed.lastDay);

    const { data: rows, error: errRows } = await supabase
        .from('work_schedules')
        .select('*')
        .gte('date', fromIso)
        .lte('date', toIso)
        .order('date', { ascending: true });
    if (errRows) {
        console.error('[scheduleService] fetchScheduleMonth rows error:', errRows);
        return null;
    }
    const scheduleRows = (rows ?? []) as WorkScheduleRow[];
    const scheduleIds = scheduleRows.map((r) => r.id);

    let assignments: ShiftAssignmentRow[] = [];
    if (scheduleIds.length > 0) {
        const { data: ass } = await supabase
            .from('shift_assignments')
            .select('*')
            .in('schedule_id', scheduleIds);
        assignments = (ass ?? []) as ShiftAssignmentRow[];
    }
    const assByScheduleId: Record<string, ShiftAssignmentRow[]> = {};
    for (const a of assignments) {
        (assByScheduleId[a.schedule_id] ||= []).push(a);
    }

    const cells: ScheduleCell[] = scheduleRows.map((r) => ({
        id: r.id,
        employee_id: r.employee_id,
        date: r.date,
        planned_start: r.planned_start,
        planned_end: r.planned_end,
        absence_type: r.absence_type as any,
        location_id: r.location_id,
        roles_for_shift: r.roles_for_shift ?? [],
        notes: r.notes,
        assignments: (assByScheduleId[r.id] ?? []).sort((a, b) =>
            a.segment_start < b.segment_start ? -1 : 1
        ),
        minutes: calcMinutes(r),
    }));

    const workingDays = workingDaysInMonth(parsed.year, parsed.monthIdx);

    // Summary per employee
    const summaries = employees.map((emp) => {
        const empCells = cells.filter((c) => c.employee_id === emp.id);
        const plannedMinutes = empCells.reduce((sum, c) => sum + c.minutes, 0);
        const absenceDays = empCells.filter((c) => c.absence_type).length;
        const normaMinutes = workingDays * emp.daily_hours * 60;
        return {
            employee_id: emp.id,
            plannedMinutes,
            absenceDays,
            normaMinutes,
        };
    });

    return {
        month,
        workingDays,
        employees,
        workstations,
        cells,
        summaries,
    };
}

// ── Upsert komórki (replace strategy dla assignments) ───────────────

interface UpsertResult {
    ok: boolean;
    error?: string;
    cell?: ScheduleCell;
}

export async function upsertScheduleCell(payload: UpsertCellPayload, userId: string): Promise<UpsertResult> {
    if (!payload.employeeId) return { ok: false, error: 'Brak employeeId' };
    if (!payload.date || !isValidISODate(payload.date)) {
        return { ok: false, error: 'Niepoprawna data (YYYY-MM-DD)' };
    }

    const isAbsence = !!payload.absenceType;
    const hasWork = !!(payload.plannedStart && payload.plannedEnd);

    if (isAbsence && hasWork) {
        return { ok: false, error: 'Nie można jednocześnie ustawić nieobecności i godzin pracy' };
    }
    if (!isAbsence && !hasWork) {
        return { ok: false, error: 'Wpisz godziny pracy lub wybierz typ nieobecności' };
    }
    if (hasWork && (!isValidTimeHHmm(payload.plannedStart!) || !isValidTimeHHmm(payload.plannedEnd!))) {
        return { ok: false, error: 'Niepoprawny format godzin (HH:MM)' };
    }
    if (hasWork && timeStringToMinutes(payload.plannedEnd!) <= timeStringToMinutes(payload.plannedStart!)) {
        return { ok: false, error: 'Godzina wyjścia musi być po godzinie przyjścia' };
    }

    const supabase = getServiceClient();

    const dbPayload = {
        employee_id: payload.employeeId,
        date: payload.date,
        planned_start: hasWork ? payload.plannedStart : null,
        planned_end: hasWork ? payload.plannedEnd : null,
        absence_type: isAbsence ? payload.absenceType : null,
        location_id: payload.locationId ?? null,
        roles_for_shift: payload.rolesForShift ?? [],
        notes: payload.notes ?? null,
        updated_by: userId,
    };

    // Upsert po (employee_id, date)
    const { data: existing } = await supabase
        .from('work_schedules')
        .select('id')
        .eq('employee_id', payload.employeeId)
        .eq('date', payload.date)
        .maybeSingle();

    let scheduleId: string;
    if (existing?.id) {
        const { data: updated, error: errUpd } = await supabase
            .from('work_schedules')
            .update(dbPayload)
            .eq('id', existing.id)
            .select('*')
            .single();
        if (errUpd || !updated) {
            return { ok: false, error: errUpd?.message ?? 'Błąd zapisu' };
        }
        scheduleId = (updated as WorkScheduleRow).id;
    } else {
        const { data: inserted, error: errIns } = await supabase
            .from('work_schedules')
            .insert({ ...dbPayload, created_by: userId })
            .select('*')
            .single();
        if (errIns || !inserted) {
            return { ok: false, error: errIns?.message ?? 'Błąd zapisu' };
        }
        scheduleId = (inserted as WorkScheduleRow).id;
    }

    // Replace strategy: usuń stare assignments, wstaw nowe
    await supabase.from('shift_assignments').delete().eq('schedule_id', scheduleId);
    const newAssignments = isAbsence ? [] : (payload.assignments ?? []);
    if (newAssignments.length > 0) {
        // Resolve doctorEmployeeId → doctor_schedule_id (gdy lekarz ma grafik tego dnia)
        const employeeIdsNeedingSchedule = newAssignments
            .map((a) => a.doctorEmployeeId)
            .filter((id): id is string => !!id && !newAssignments.find((b) => b.doctorEmployeeId === id && b.doctorScheduleId));
        let scheduleByEmployee: Record<string, string> = {};
        if (employeeIdsNeedingSchedule.length > 0) {
            const { data: doctorSchedules } = await supabase
                .from('work_schedules')
                .select('id, employee_id')
                .eq('date', payload.date)
                .in('employee_id', employeeIdsNeedingSchedule);
            for (const s of (doctorSchedules ?? []) as Array<{ id: string; employee_id: string }>) {
                scheduleByEmployee[s.employee_id] = s.id;
            }
        }

        const rows = newAssignments
            .filter((a) => isValidTimeHHmm(a.segmentStart) && isValidTimeHHmm(a.segmentEnd))
            .map((a) => {
                const resolvedScheduleId = a.doctorScheduleId
                    ?? (a.doctorEmployeeId ? scheduleByEmployee[a.doctorEmployeeId] ?? null : null);
                return {
                    schedule_id: scheduleId,
                    doctor_schedule_id: resolvedScheduleId,
                    doctor_employee_id: a.doctorEmployeeId ?? null,
                    workstation_id: a.workstationId ?? null,
                    segment_start: a.segmentStart,
                    segment_end: a.segmentEnd,
                    location_id: a.locationId ?? null,
                    notes: a.notes ?? null,
                };
            })
            .filter((r) => r.segment_end > r.segment_start);
        if (rows.length > 0) {
            await supabase.from('shift_assignments').insert(rows);
        }
    }

    // Re-fetch w pełni
    const { data: full } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();
    const { data: ass } = await supabase
        .from('shift_assignments')
        .select('*')
        .eq('schedule_id', scheduleId);

    const row = full as WorkScheduleRow;
    return {
        ok: true,
        cell: {
            id: row.id,
            employee_id: row.employee_id,
            date: row.date,
            planned_start: row.planned_start,
            planned_end: row.planned_end,
            absence_type: row.absence_type as any,
            location_id: row.location_id,
            roles_for_shift: row.roles_for_shift ?? [],
            notes: row.notes,
            assignments: ((ass ?? []) as ShiftAssignmentRow[]).sort((a, b) =>
                a.segment_start < b.segment_start ? -1 : 1
            ),
            minutes: calcMinutes(row),
        },
    };
}

export async function deleteScheduleCell(employeeId: string, date: string): Promise<{ ok: boolean; error?: string }> {
    if (!isValidISODate(date)) return { ok: false, error: 'Niepoprawna data' };
    const supabase = getServiceClient();
    const { error } = await supabase
        .from('work_schedules')
        .delete()
        .eq('employee_id', employeeId)
        .eq('date', date);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

// ── Kopia z poprzedniego miesiąca ───────────────────────────────────

export async function copyMonth(sourceMonth: string, targetMonth: string, userId: string): Promise<{ ok: boolean; copied: number; error?: string }> {
    const src = parseMonthString(sourceMonth);
    const tgt = parseMonthString(targetMonth);
    if (!src || !tgt) return { ok: false, copied: 0, error: 'Niepoprawny format miesiąca' };

    const supabase = getServiceClient();

    // Pobierz wszystkie wpisy źródłowego miesiąca
    const { data: srcRows } = await supabase
        .from('work_schedules')
        .select('*, shift_assignments(*)')
        .gte('date', isoDateUTC(src.firstDay))
        .lte('date', isoDateUTC(src.lastDay));
    if (!srcRows || srcRows.length === 0) {
        return { ok: true, copied: 0 };
    }

    // Mapowanie dnia źródłowego → dzień docelowy (po pozycji w miesiącu)
    let copied = 0;
    for (const s of srcRows as any[]) {
        const srcDate = new Date(s.date + 'T00:00:00Z');
        const dayOfMonth = srcDate.getUTCDate();
        const targetDate = new Date(Date.UTC(tgt.year, tgt.monthIdx, dayOfMonth));
        if (targetDate > tgt.lastDay) continue;          // np. 31 stycznia → brak 31 lutego, pomiń
        const targetIso = isoDateUTC(targetDate);

        // Pomijaj jeśli docelowo już istnieje wpis (nie nadpisuj)
        const { data: exists } = await supabase
            .from('work_schedules')
            .select('id')
            .eq('employee_id', s.employee_id)
            .eq('date', targetIso)
            .maybeSingle();
        if (exists?.id) continue;

        const { data: inserted, error } = await supabase
            .from('work_schedules')
            .insert({
                employee_id: s.employee_id,
                date: targetIso,
                planned_start: s.planned_start,
                planned_end: s.planned_end,
                absence_type: s.absence_type,
                location_id: s.location_id,
                roles_for_shift: s.roles_for_shift,
                notes: s.notes,
                created_by: userId,
                updated_by: userId,
            })
            .select('id')
            .single();
        if (error || !inserted) continue;

        const newScheduleId = (inserted as any).id;
        const srcAssignments = (s.shift_assignments ?? []) as ShiftAssignmentRow[];
        if (srcAssignments.length > 0) {
            await supabase.from('shift_assignments').insert(
                srcAssignments.map((a) => ({
                    schedule_id: newScheduleId,
                    doctor_schedule_id: null,            // wygasa — będzie sresolve'owany później po doctor_employee_id
                    doctor_employee_id: a.doctor_employee_id,
                    workstation_id: a.workstation_id,
                    segment_start: a.segment_start,
                    segment_end: a.segment_end,
                    location_id: a.location_id,
                    notes: a.notes,
                }))
            );
        }
        copied++;
    }

    return { ok: true, copied };
}
