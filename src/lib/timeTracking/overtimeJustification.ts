// Algorytm rozdziału nadgodzin (overtime_total) na zasadne i niezasadne.
//
// Zasada (uzgodniona z Marcinem):
//   - dla każdego pracownika z calculated_shifts.overtime_total_minutes > 0
//   - znajdź "doctor_end_time" — moment, w którym lekarz, do którego pracownik
//     był przypisany w ostatnim segmencie zmiany, faktycznie skończył pracę
//   - nadgodziny do (doctor_end_time + cleanup_buffer_minutes) = ZASADNE
//   - nadgodziny po tym czasie = NIEZASADNE
//
// Asysta: ostatni segment z shift_assignments (sortowany po segment_start)
//   → bierzemy doctor_employee_id (lub doctor_schedule_id)
//   → fetch calculated_shifts.doctor_end_time tego lekarza tego dnia
//
// Recepcja / inne role bez konkretnego lekarza: max(doctor_end_time)
//   wszystkich lekarzy, którzy pracowali tego dnia
//
// Lekarze: nie liczymy zasadne/niezasadne — ich nadgodziny są zawsze "zasadne"
//   (lekarz pracujący dłużej z definicji jest sensowny).

import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getServiceClient(): SupabaseClient {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

interface JustificationInputs {
    actual_end: string | null;        // ISO
    planned_end_time: string | null;  // HH:MM:SS
    date: string;                      // YYYY-MM-DD
    doctor_end_time: string | null;   // ISO
    cleanup_buffer_minutes: number;
}

export interface JustificationResult {
    overtime_total_minutes: number;
    overtime_justified_minutes: number;
    overtime_unjustified_minutes: number;
    justified_until: string | null;    // ISO — granica zasadnych
}

/**
 * Pure function — czysta arytmetyka, do testów.
 */
export function calculateJustification(input: JustificationInputs): JustificationResult {
    const empty: JustificationResult = {
        overtime_total_minutes: 0,
        overtime_justified_minutes: 0,
        overtime_unjustified_minutes: 0,
        justified_until: null,
    };

    if (!input.actual_end || !input.planned_end_time) return empty;

    const actualEndMs = new Date(input.actual_end).getTime();
    const plannedEndDt = new Date(`${input.date}T${input.planned_end_time.slice(0, 8)}+02:00`).getTime();
    const overtimeMs = actualEndMs - plannedEndDt;
    if (overtimeMs <= 0) return empty;

    const overtimeMin = Math.round(overtimeMs / 60000);

    if (!input.doctor_end_time) {
        // Brak danych Prodentis → nie wiemy czy zasadne, traktujemy jako "do weryfikacji"
        // Zwracamy total, ale obie kategorie 0 (admin musi rozstrzygnąć)
        return {
            overtime_total_minutes: overtimeMin,
            overtime_justified_minutes: 0,
            overtime_unjustified_minutes: 0,
            justified_until: null,
        };
    }

    const doctorEndMs = new Date(input.doctor_end_time).getTime();
    const justifiedUntilMs = doctorEndMs + input.cleanup_buffer_minutes * 60000;

    if (actualEndMs <= justifiedUntilMs) {
        // Wszystkie nadgodziny zasadne
        return {
            overtime_total_minutes: overtimeMin,
            overtime_justified_minutes: overtimeMin,
            overtime_unjustified_minutes: 0,
            justified_until: new Date(justifiedUntilMs).toISOString(),
        };
    }

    if (justifiedUntilMs <= plannedEndDt) {
        // Lekarz skończył przed planowanym końcem zmiany → wszystkie nadgodziny niezasadne
        return {
            overtime_total_minutes: overtimeMin,
            overtime_justified_minutes: 0,
            overtime_unjustified_minutes: overtimeMin,
            justified_until: new Date(justifiedUntilMs).toISOString(),
        };
    }

    // Częściowo zasadne
    const justifiedMs = justifiedUntilMs - plannedEndDt;
    const unjustifiedMs = actualEndMs - justifiedUntilMs;
    return {
        overtime_total_minutes: overtimeMin,
        overtime_justified_minutes: Math.round(justifiedMs / 60000),
        overtime_unjustified_minutes: Math.round(unjustifiedMs / 60000),
        justified_until: new Date(justifiedUntilMs).toISOString(),
    };
}

/**
 * Sync-uje doctor_end_time + naliczenie zasadne/niezasadne dla wszystkich
 * pracowników z danego dnia. Wywoływane przez cron i endpoint manual.
 *
 * Zwraca metryki: ile lekarzy zsynchronizowano (high/medium/low confidence),
 * ilu pracowników niezbiernych (no doctor data fallback to max), suma minut
 * zasadnych vs niezasadnych.
 */
export async function syncProdentisAndRecalcJustification(
    date: string,
    fetchDoctor: (prodentisId: string, date: string) => Promise<{ estimatedWorkEnd: string | null; confidence: 'high' | 'medium' | 'low' } | null>
): Promise<{
    doctorsHigh: number;
    doctorsMedium: number;
    doctorsLow: number;
    doctorsMissing: number;
    employeesUpdated: number;
    totalJustifiedMin: number;
    totalUnjustifiedMin: number;
}> {
    const supabase = getServiceClient();

    // 1. Pobierz wszystkich aktywnych lekarzy z prodentis_id
    const { data: doctors } = await supabase
        .from('employees')
        .select('id, name, prodentis_id')
        .eq('is_active', true)
        .eq('position', 'Lekarz')
        .not('prodentis_id', 'is', null);

    let doctorsHigh = 0, doctorsMedium = 0, doctorsLow = 0, doctorsMissing = 0;

    // doctorEndByEmpId: employee_id → doctor_end_time ISO
    const doctorEndByEmpId: Record<string, { time: string; confidence: string }> = {};

    for (const d of (doctors ?? []) as Array<{ id: string; name: string; prodentis_id: string }>) {
        const summary = await fetchDoctor(d.prodentis_id, date);
        if (!summary || !summary.estimatedWorkEnd) {
            doctorsMissing++;
            continue;
        }
        // Update calculated_shifts dla lekarza
        await supabase
            .from('calculated_shifts')
            .update({
                doctor_end_time: summary.estimatedWorkEnd,
                doctor_end_confidence: summary.confidence,
            })
            .eq('employee_id', d.id)
            .eq('date', date);

        doctorEndByEmpId[d.id] = { time: summary.estimatedWorkEnd, confidence: summary.confidence };
        if (summary.confidence === 'high') doctorsHigh++;
        else if (summary.confidence === 'medium') doctorsMedium++;
        else doctorsLow++;
    }

    // Max doctor_end z dnia (fallback dla recepcji)
    const maxDoctorEnd = Object.values(doctorEndByEmpId)
        .map((x) => new Date(x.time).getTime())
        .reduce((a, b) => Math.max(a, b), 0);
    const maxDoctorEndIso = maxDoctorEnd > 0 ? new Date(maxDoctorEnd).toISOString() : null;

    // 2. Pobierz wszystkie shifty pracowników niebędących lekarzami z overtime_total > 0
    const { data: shiftsToUpdate } = await supabase
        .from('calculated_shifts')
        .select(`
            id, employee_id, date, planned_end_time, actual_end,
            overtime_total_minutes, schedule_id,
            employees!inner(id, position)
        `)
        .eq('date', date)
        .neq('employees.position', 'Lekarz')
        .gt('overtime_total_minutes', 0);

    let employeesUpdated = 0;
    let totalJustifiedMin = 0;
    let totalUnjustifiedMin = 0;

    for (const shift of (shiftsToUpdate ?? []) as any[]) {
        // Znajdź doctor_end_time dla tego pracownika
        let doctorEndForThisEmp: string | null = null;

        // 2a. Sprawdź ostatni segment z shift_assignments
        if (shift.schedule_id) {
            const { data: assignments } = await supabase
                .from('shift_assignments')
                .select('doctor_employee_id, doctor_schedule_id, segment_start, segment_end')
                .eq('schedule_id', shift.schedule_id)
                .order('segment_start', { ascending: false })
                .limit(1);

            const lastAssignment = assignments?.[0];
            if (lastAssignment?.doctor_employee_id && doctorEndByEmpId[lastAssignment.doctor_employee_id]) {
                doctorEndForThisEmp = doctorEndByEmpId[lastAssignment.doctor_employee_id].time;
            } else if (lastAssignment?.doctor_schedule_id) {
                // doctor_schedule_id → znajdź employee_id
                const { data: docSchedule } = await supabase
                    .from('work_schedules')
                    .select('employee_id')
                    .eq('id', lastAssignment.doctor_schedule_id)
                    .maybeSingle();
                if (docSchedule?.employee_id && doctorEndByEmpId[docSchedule.employee_id]) {
                    doctorEndForThisEmp = doctorEndByEmpId[docSchedule.employee_id].time;
                }
            }
        }

        // 2b. Fallback: max doctor_end z dnia
        if (!doctorEndForThisEmp) {
            doctorEndForThisEmp = maxDoctorEndIso;
        }

        // 2c. Pobierz cleanup_buffer_minutes z employment_terms
        const { data: terms } = await supabase
            .from('employment_terms')
            .select('cleanup_buffer_minutes')
            .eq('employee_id', shift.employee_id)
            .lte('valid_from', date)
            .or(`valid_to.is.null,valid_to.gte.${date}`)
            .order('valid_from', { ascending: false })
            .limit(1);
        const buffer = (terms?.[0]?.cleanup_buffer_minutes as number | undefined) ?? 30;

        // 2d. Wylicz justification
        const result = calculateJustification({
            actual_end: shift.actual_end,
            planned_end_time: shift.planned_end_time,
            date: shift.date,
            doctor_end_time: doctorEndForThisEmp,
            cleanup_buffer_minutes: buffer,
        });

        // 2e. Update calculated_shifts (tylko jeśli nie admin_approved)
        const { data: currentStatus } = await supabase
            .from('calculated_shifts')
            .select('status')
            .eq('id', shift.id)
            .maybeSingle();

        if ((currentStatus as any)?.status === 'admin_approved') continue;

        await supabase
            .from('calculated_shifts')
            .update({
                overtime_justified_minutes: result.overtime_justified_minutes,
                overtime_unjustified_minutes: result.overtime_unjustified_minutes,
                doctor_end_time: doctorEndForThisEmp,
                cleanup_buffer_used: buffer,
            })
            .eq('id', shift.id);

        employeesUpdated++;
        totalJustifiedMin += result.overtime_justified_minutes;
        totalUnjustifiedMin += result.overtime_unjustified_minutes;
    }

    return {
        doctorsHigh,
        doctorsMedium,
        doctorsLow,
        doctorsMissing,
        employeesUpdated,
        totalJustifiedMin,
        totalUnjustifiedMin,
    };
}
