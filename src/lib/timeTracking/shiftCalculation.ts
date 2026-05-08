// Wyliczanie shift dnia: paruje time_entries z work_schedules, oblicza
// metryki (worked_minutes, late, early, overtime) i flagi anomalii.
// Bez Prodentis — F5 dorzuci doctor_end_time + rozdział overtime.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getServiceClient(): SupabaseClient {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

// Spóźnienie >= 5 min liczy się jako anomalia
const LATE_THRESHOLD_MIN = 5;
// Wcześniejsze wyjście >= 5 min
const EARLY_THRESHOLD_MIN = 5;
// Nadgodziny >= 5 min
const OVERTIME_THRESHOLD_MIN = 5;
// Krótka sesja (clock_in→clock_out) < 5 min — flag
const SHORT_SESSION_MAX_MIN = 5;

export interface ShiftCalculation {
    employee_id: string;
    date: string;                    // YYYY-MM-DD
    schedule_id: string | null;
    actual_start: string | null;     // ISO
    actual_end: string | null;
    worked_minutes: number;
    sessions_count: number;
    planned_start_time: string | null; // HH:MM:SS
    planned_end_time: string | null;
    planned_minutes: number;
    absence_type: string | null;
    late_minutes: number;
    early_leave_minutes: number;
    overtime_total_minutes: number;
    auto_closed: boolean;
    auto_close_reason: string | null;
    anomaly_flags: string[];
}

interface TimeEntryRow {
    id: string;
    employee_id: string;
    type: 'clock_in' | 'clock_out';
    scanned_at: string;
    cancelled: boolean;
    manual: boolean;
}

interface WorkScheduleRow {
    id: string;
    employee_id: string;
    date: string;
    planned_start: string | null;
    planned_end: string | null;
    absence_type: string | null;
}

function timeStringToMinutes(t: string | null): number {
    if (!t) return 0;
    const parts = t.split(':');
    return Number.parseInt(parts[0], 10) * 60 + Number.parseInt(parts[1], 10);
}

function plannedMinutes(start: string | null, end: string | null): number {
    if (!start || !end) return 0;
    return Math.max(0, timeStringToMinutes(end) - timeStringToMinutes(start));
}

function isoDateUTC(d: Date): string {
    return d.toISOString().slice(0, 10);
}

/**
 * Wylicza shift dla pojedynczego pracownika w danym dniu na bazie
 * time_entries + work_schedules. Stosuje strefę PL: granice "dnia roboczego"
 * to lokalne północ–północ (zakładamy że w PL nie ma sesji nocnych, które
 * łamią granicę dnia).
 */
export function calculateShift(
    date: string,
    employeeId: string,
    entries: TimeEntryRow[],
    schedule: WorkScheduleRow | null,
    nowMs: number = Date.now()
): ShiftCalculation {
    const planned_start = schedule?.planned_start ?? null;
    const planned_end = schedule?.planned_end ?? null;
    const absence_type = schedule?.absence_type ?? null;
    const isAbsent = !!absence_type;
    const planned_minutes = isAbsent ? 0 : plannedMinutes(planned_start, planned_end);

    const flags = new Set<string>();

    // Filtruj wpisy: niecancelled, posortowane po czasie
    const validEntries = entries
        .filter((e) => !e.cancelled)
        .sort((a, b) => a.scanned_at.localeCompare(b.scanned_at));

    // Para in→out
    let workedMs = 0;
    let sessionsCount = 0;
    let firstStart: Date | null = null;
    let lastEnd: Date | null = null;
    let openIn: Date | null = null;
    let autoClosed = false;
    let autoCloseReason: string | null = null;

    for (const e of validEntries) {
        const t = new Date(e.scanned_at);
        if (e.type === 'clock_in') {
            if (!firstStart) firstStart = t;
            openIn = t;
        } else {
            // clock_out
            if (openIn) {
                const durationMs = t.getTime() - openIn.getTime();
                workedMs += durationMs;
                if (durationMs / 60000 < SHORT_SESSION_MAX_MIN) flags.add('short_session');
                lastEnd = t;
                sessionsCount += 1;
                openIn = null;
            } else {
                // clock_out bez clock_in — anomalia (zwykle korekta admina poprzednią sesję)
                flags.add('orphan_clock_out');
                lastEnd = t;
            }
        }
    }

    // Niezamknięta sesja (clock_in bez clock_out)
    if (openIn) {
        flags.add('no_clock_out');
        // Auto-domknięcie: na planned_end (jeśli jest) albo "now"
        if (!isAbsent && planned_end) {
            // Konstruuj timestamp planned_end na ten sam dzień co clock_in
            const dayPart = openIn.toISOString().slice(0, 10);
            const plannedEndDt = new Date(`${dayPart}T${planned_end.slice(0, 8)}+00:00`);
            // Jeśli planned_end_dt > nowMs, użyj nowMs
            const closingTs = Math.min(plannedEndDt.getTime(), nowMs);
            // Tylko jeśli closing > openIn
            if (closingTs > openIn.getTime()) {
                workedMs += closingTs - openIn.getTime();
                lastEnd = new Date(closingTs);
                sessionsCount += 1;
            }
            autoClosed = true;
            autoCloseReason = 'Brak clock_out — auto-domknięcie na planowany koniec zmiany';
        } else {
            autoClosed = true;
            autoCloseReason = 'Brak clock_out i brak grafiku — wymaga ręcznej korekty';
        }
    }

    const worked_minutes = Math.round(workedMs / 60000);

    // Anomalie i metryki
    let late_minutes = 0;
    let early_leave_minutes = 0;
    let overtime_total_minutes = 0;

    if (isAbsent) {
        // Pracownik miał być na nieobecności, ale się wbił
        if (firstStart || lastEnd) {
            flags.add('absence_but_clocked');
        }
    } else if (planned_start && planned_end) {
        // Spóźnienie
        if (firstStart) {
            const dayPart = firstStart.toISOString().slice(0, 10);
            const plannedStartDt = new Date(`${dayPart}T${planned_start.slice(0, 8)}+00:00`);
            const lateMs = firstStart.getTime() - plannedStartDt.getTime();
            if (lateMs > LATE_THRESHOLD_MIN * 60000) {
                late_minutes = Math.round(lateMs / 60000);
                flags.add('late_arrival');
            }
        } else {
            flags.add('no_clock_in');
        }
        // Wcześniejsze wyjście
        if (lastEnd && !autoClosed) {
            const dayPart = lastEnd.toISOString().slice(0, 10);
            const plannedEndDt = new Date(`${dayPart}T${planned_end.slice(0, 8)}+00:00`);
            const earlyMs = plannedEndDt.getTime() - lastEnd.getTime();
            if (earlyMs > EARLY_THRESHOLD_MIN * 60000) {
                early_leave_minutes = Math.round(earlyMs / 60000);
                flags.add('early_leave');
            }
            // Nadgodziny
            const overtimeMs = lastEnd.getTime() - plannedEndDt.getTime();
            if (overtimeMs > OVERTIME_THRESHOLD_MIN * 60000) {
                overtime_total_minutes = Math.round(overtimeMs / 60000);
                flags.add('overtime');
            }
        }
    } else if (firstStart || lastEnd) {
        // Pracownik wbił się ale nie miał grafiku
        flags.add('no_schedule_but_worked');
    }

    return {
        employee_id: employeeId,
        date,
        schedule_id: schedule?.id ?? null,
        actual_start: firstStart?.toISOString() ?? null,
        actual_end: lastEnd?.toISOString() ?? null,
        worked_minutes,
        sessions_count: sessionsCount,
        planned_start_time: planned_start,
        planned_end_time: planned_end,
        planned_minutes,
        absence_type,
        late_minutes,
        early_leave_minutes,
        overtime_total_minutes,
        auto_closed: autoClosed,
        auto_close_reason: autoCloseReason,
        anomaly_flags: Array.from(flags),
    };
}

/**
 * Wylicza shift dla wszystkich aktywnych pracowników w danym dniu i
 * upsertuje do calculated_shifts.
 */
export async function calculateAndPersistDay(date: string): Promise<{
    processed: number;
    withAnomalies: number;
    autoClosed: number;
}> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`Nieprawidłowa data: ${date}`);
    }

    const supabase = getServiceClient();

    // Lista aktywnych pracowników
    const { data: employees } = await supabase
        .from('employees')
        .select('id')
        .eq('is_active', true);
    const employeeIds = (employees ?? []).map((e: any) => e.id);
    if (employeeIds.length === 0) return { processed: 0, withAnomalies: 0, autoClosed: 0 };

    // Time entries w przedziale [date 00:00 PL, date+1 00:00 PL]
    // PL = UTC+1 (CET) lub UTC+2 (CEST). Bezpiecznie: rozszerzamy okno
    // o ±2h (UTC+2 daje że dzień PL to UTC -2h do +22h).
    const dayStartUTC = new Date(`${date}T00:00:00+02:00`).toISOString();
    const nextDay = new Date(date + 'T00:00:00Z');
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const dayEndUTC = new Date(nextDay.toISOString().slice(0, 10) + 'T00:00:00+02:00').toISOString();

    const { data: entries } = await supabase
        .from('time_entries')
        .select('id, employee_id, type, scanned_at, cancelled, manual')
        .in('employee_id', employeeIds)
        .gte('scanned_at', dayStartUTC)
        .lt('scanned_at', dayEndUTC)
        .order('scanned_at', { ascending: true });

    const entriesByEmp: Record<string, TimeEntryRow[]> = {};
    for (const e of (entries ?? []) as TimeEntryRow[]) {
        (entriesByEmp[e.employee_id] ||= []).push(e);
    }

    // Schedules na ten dzień
    const { data: schedules } = await supabase
        .from('work_schedules')
        .select('id, employee_id, date, planned_start, planned_end, absence_type')
        .eq('date', date)
        .in('employee_id', employeeIds);

    const scheduleByEmp: Record<string, WorkScheduleRow> = {};
    for (const s of (schedules ?? []) as WorkScheduleRow[]) {
        scheduleByEmp[s.employee_id] = s;
    }

    let processed = 0;
    let withAnomalies = 0;
    let autoClosedCount = 0;

    for (const empId of employeeIds) {
        const entrs = entriesByEmp[empId] ?? [];
        const sched = scheduleByEmp[empId] ?? null;

        // Pomiń pracowników którzy nie mają ani grafiku ani wpisów
        if (entrs.length === 0 && !sched) continue;

        const calc = calculateShift(date, empId, entrs, sched);

        // Upsert do calculated_shifts (chyba że status='admin_approved' — nie nadpisuj)
        const { data: existing } = await supabase
            .from('calculated_shifts')
            .select('id, status')
            .eq('employee_id', empId)
            .eq('date', date)
            .maybeSingle();

        if (existing && (existing as any).status === 'admin_approved') {
            // Zatwierdzone ręcznie — nie nadpisuj
            continue;
        }

        const payload = {
            employee_id: calc.employee_id,
            date: calc.date,
            schedule_id: calc.schedule_id,
            actual_start: calc.actual_start,
            actual_end: calc.actual_end,
            worked_minutes: calc.worked_minutes,
            sessions_count: calc.sessions_count,
            planned_start_time: calc.planned_start_time,
            planned_end_time: calc.planned_end_time,
            planned_minutes: calc.planned_minutes,
            absence_type: calc.absence_type,
            late_minutes: calc.late_minutes,
            early_leave_minutes: calc.early_leave_minutes,
            overtime_total_minutes: calc.overtime_total_minutes,
            auto_closed: calc.auto_closed,
            auto_close_reason: calc.auto_close_reason,
            anomaly_flags: calc.anomaly_flags,
            status: 'calculated',
            calculated_at: new Date().toISOString(),
        };

        if (existing) {
            await supabase
                .from('calculated_shifts')
                .update(payload)
                .eq('id', (existing as any).id);
        } else {
            await supabase.from('calculated_shifts').insert(payload);
        }

        processed++;
        if (calc.anomaly_flags.length > 0) withAnomalies++;
        if (calc.auto_closed) autoClosedCount++;
    }

    return { processed, withAnomalies, autoClosed: autoClosedCount };
}
