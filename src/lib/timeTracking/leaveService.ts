// Service do urlopów: składanie wniosków, walidacje, zatwierdzanie,
// auto-wpis do work_schedules przy approve, bilans urlopu wypoczynkowego.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getServiceClient(): SupabaseClient {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

export type LeaveType = 'vacation' | 'on_demand' | 'sick' | 'child_care' | 'training' | 'delegation' | 'unpaid' | 'other';
export type LeaveStatus = 'requested' | 'approved' | 'rejected' | 'cancelled';

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
    vacation:    'Urlop wypoczynkowy',
    on_demand:   'Urlop na żądanie',
    sick:        'Chorobowe',
    child_care:  'Opieka nad dzieckiem',
    training:    'Szkolenie',
    delegation:  'Delegacja',
    unpaid:      'Urlop bezpłatny',
    other:       'Inne',
};

// Mapowanie LeaveType → absence_type w work_schedules (tożsame stringi)
const LEAVE_TO_ABSENCE: Record<LeaveType, string> = {
    vacation:    'vacation',
    on_demand:   'on_demand',
    sick:        'sick',
    child_care:  'child_care',
    training:    'training',
    delegation:  'delegation',
    unpaid:      'unpaid',
    other:       'other',
};

// LeaveTypy które liczone są do rocznego bilansu urlopu (vacation_days_per_year)
const COUNTS_TO_VACATION_BALANCE: LeaveType[] = ['vacation', 'on_demand'];

export interface LeaveRequest {
    id: string;
    employee_id: string;
    type: LeaveType;
    date_from: string;
    date_to: string;
    days_count: number;
    hours_per_day: number | null;
    status: LeaveStatus;
    reason: string | null;
    rejected_reason: string | null;
    approved_by: string | null;
    approved_at: string | null;
    requested_by: string | null;
    cancelled_at: string | null;
    attachment_url: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

// ── Helpers daty ────────────────────────────────────────────────────

function parseISO(s: string): Date {
    return new Date(s + 'T00:00:00Z');
}

function isoDateUTC(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function* iterateDays(from: string, to: string): Generator<string> {
    const start = parseISO(from);
    const end = parseISO(to);
    const cur = new Date(start);
    while (cur <= end) {
        yield isoDateUTC(cur);
        cur.setUTCDate(cur.getUTCDate() + 1);
    }
}

/**
 * Oblicza liczbę dni roboczych (pn-pt minus święta państwowe) w przedziale.
 */
export async function countWorkingDays(from: string, to: string): Promise<number> {
    const supabase = getServiceClient();
    const { data: holidays } = await supabase
        .from('polish_holidays')
        .select('date')
        .eq('type', 'national')
        .gte('date', from)
        .lte('date', to);
    const holidaySet = new Set((holidays ?? []).map((h: any) => h.date as string));

    let count = 0;
    for (const day of iterateDays(from, to)) {
        const d = parseISO(day);
        const dow = d.getUTCDay();
        if (dow === 0 || dow === 6) continue;     // weekend
        if (holidaySet.has(day)) continue;         // święto
        count++;
    }
    return count;
}

// ── Bilans urlopu wypoczynkowego ────────────────────────────────────

interface VacationBalance {
    employeeId: string;
    year: number;
    annualEntitlement: number;
    daysUsed: number;
    daysPending: number;            // wnioski w status='requested'
    daysRemaining: number;          // entitlement - used - pending
}

/**
 * Bilans urlopu wypoczynkowego (vacation + on_demand) dla pracownika w danym roku.
 */
export async function getVacationBalance(employeeId: string, year: number = new Date().getFullYear()): Promise<VacationBalance> {
    const supabase = getServiceClient();
    const { data: terms } = await supabase
        .from('employment_terms')
        .select('vacation_days_per_year')
        .eq('employee_id', employeeId)
        .lte('valid_from', `${year}-12-31`)
        .or(`valid_to.is.null,valid_to.gte.${year}-01-01`)
        .order('valid_from', { ascending: false })
        .limit(1);
    const annualEntitlement = (terms?.[0]?.vacation_days_per_year as number | undefined) ?? 26;

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const { data: requests } = await supabase
        .from('leave_requests')
        .select('type, days_count, status')
        .eq('employee_id', employeeId)
        .in('type', COUNTS_TO_VACATION_BALANCE)
        .in('status', ['requested', 'approved'])
        .gte('date_from', yearStart)
        .lte('date_to', yearEnd);

    let daysUsed = 0;
    let daysPending = 0;
    for (const r of (requests ?? []) as Array<{ type: LeaveType; days_count: number; status: LeaveStatus }>) {
        if (r.status === 'approved') daysUsed += r.days_count;
        else if (r.status === 'requested') daysPending += r.days_count;
    }

    return {
        employeeId,
        year,
        annualEntitlement,
        daysUsed,
        daysPending,
        daysRemaining: annualEntitlement - daysUsed - daysPending,
    };
}

// ── Tworzenie wniosku ───────────────────────────────────────────────

interface CreateRequestInput {
    employeeId: string;
    type: LeaveType;
    dateFrom: string;
    dateTo: string;
    hoursPerDay?: number | null;
    reason?: string | null;
    notes?: string | null;
    attachmentUrl?: string | null;
    requestedByUserId: string;       // auth user id
}

interface CreateResult {
    ok: boolean;
    error?: string;
    request?: LeaveRequest;
}

export async function createLeaveRequest(input: CreateRequestInput): Promise<CreateResult> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(input.dateTo)) {
        return { ok: false, error: 'Niepoprawny format daty (YYYY-MM-DD)' };
    }
    if (input.dateTo < input.dateFrom) {
        return { ok: false, error: 'Data końcowa musi być >= początkowa' };
    }

    const supabase = getServiceClient();

    // Sprawdź nakładanie z istniejącymi (status: requested lub approved)
    const { data: overlapping } = await supabase
        .from('leave_requests')
        .select('id, date_from, date_to, status')
        .eq('employee_id', input.employeeId)
        .in('status', ['requested', 'approved'])
        .lte('date_from', input.dateTo)
        .gte('date_to', input.dateFrom);
    if (overlapping && overlapping.length > 0) {
        return { ok: false, error: 'Wniosek nakłada się z istniejącym (status requested/approved)' };
    }

    // Walidacja bilansu (dla typów wypoczynkowych)
    if (COUNTS_TO_VACATION_BALANCE.includes(input.type)) {
        const year = Number.parseInt(input.dateFrom.slice(0, 4), 10);
        const balance = await getVacationBalance(input.employeeId, year);
        const daysCount = await countWorkingDays(input.dateFrom, input.dateTo);
        if (daysCount > balance.daysRemaining) {
            return {
                ok: false,
                error: `Niewystarczający bilans urlopu w roku ${year}: wnioskujesz o ${daysCount} dni, dostępne ${balance.daysRemaining} (rocznie ${balance.annualEntitlement}, użyte ${balance.daysUsed}, oczekujące ${balance.daysPending})`
            };
        }
    }

    const daysCount = await countWorkingDays(input.dateFrom, input.dateTo);

    const { data: inserted, error } = await supabase
        .from('leave_requests')
        .insert({
            employee_id: input.employeeId,
            type: input.type,
            date_from: input.dateFrom,
            date_to: input.dateTo,
            days_count: daysCount,
            hours_per_day: input.hoursPerDay ?? null,
            status: 'requested',
            reason: input.reason ?? null,
            notes: input.notes ?? null,
            attachment_url: input.attachmentUrl ?? null,
            requested_by: input.requestedByUserId,
        })
        .select('*')
        .single();
    if (error || !inserted) {
        return { ok: false, error: error?.message ?? 'Błąd zapisu' };
    }
    return { ok: true, request: inserted as LeaveRequest };
}

// ── Akceptacja / odrzucenie ─────────────────────────────────────────

interface DecisionInput {
    requestId: string;
    adminUserId: string;
    decision: 'approved' | 'rejected';
    rejectedReason?: string | null;
}

export async function decideLeaveRequest(input: DecisionInput): Promise<{ ok: boolean; error?: string; request?: LeaveRequest }> {
    const supabase = getServiceClient();

    const { data: existing } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', input.requestId)
        .maybeSingle();
    if (!existing) return { ok: false, error: 'Wniosek nie istnieje' };
    if ((existing as any).status !== 'requested') {
        return { ok: false, error: `Wniosek nie jest w statusie 'requested' (jest: ${(existing as any).status})` };
    }
    if (input.decision === 'rejected' && !input.rejectedReason?.trim()) {
        return { ok: false, error: 'Przy odrzuceniu wymagany powód (min 3 znaki)' };
    }
    if (input.decision === 'rejected' && (input.rejectedReason?.trim().length ?? 0) < 3) {
        return { ok: false, error: 'Powód odrzucenia za krótki (min 3)' };
    }

    const patch: any = {
        status: input.decision,
        approved_by: input.adminUserId,
        approved_at: new Date().toISOString(),
    };
    if (input.decision === 'rejected') patch.rejected_reason = input.rejectedReason?.trim();

    const { data: updated, error } = await supabase
        .from('leave_requests')
        .update(patch)
        .eq('id', input.requestId)
        .select('*')
        .single();
    if (error || !updated) return { ok: false, error: error?.message ?? 'Błąd zapisu' };

    // Po approve: wstaw absence do work_schedules na każdy dzień (jeśli już ma wpis pracy → zastąp)
    if (input.decision === 'approved') {
        const req = updated as LeaveRequest;
        const absenceType = LEAVE_TO_ABSENCE[req.type];
        for (const day of iterateDays(req.date_from, req.date_to)) {
            // Pomiń weekendy i święta
            const d = parseISO(day);
            const dow = d.getUTCDay();
            if (dow === 0 || dow === 6) continue;
            const { data: holiday } = await supabase
                .from('polish_holidays')
                .select('date')
                .eq('date', day)
                .eq('type', 'national')
                .maybeSingle();
            if (holiday) continue;

            const { data: existingSchedule } = await supabase
                .from('work_schedules')
                .select('id')
                .eq('employee_id', req.employee_id)
                .eq('date', day)
                .maybeSingle();

            if (existingSchedule?.id) {
                // Usuń stare assignments (nieobecność = brak segmentów)
                await supabase.from('shift_assignments').delete().eq('schedule_id', existingSchedule.id);
                // Update na absence
                await supabase
                    .from('work_schedules')
                    .update({
                        planned_start: null,
                        planned_end: null,
                        absence_type: absenceType,
                        notes: `Z wniosku #${req.id.slice(0, 8)} (${LEAVE_TYPE_LABELS[req.type]})`,
                        updated_by: input.adminUserId,
                    })
                    .eq('id', existingSchedule.id);
            } else {
                await supabase.from('work_schedules').insert({
                    employee_id: req.employee_id,
                    date: day,
                    planned_start: null,
                    planned_end: null,
                    absence_type: absenceType,
                    roles_for_shift: [],
                    notes: `Z wniosku #${req.id.slice(0, 8)} (${LEAVE_TYPE_LABELS[req.type]})`,
                    created_by: input.adminUserId,
                    updated_by: input.adminUserId,
                });
            }
        }
    }

    return { ok: true, request: updated as LeaveRequest };
}

// ── Anulowanie własnego wniosku ─────────────────────────────────────

export async function cancelOwnRequest(requestId: string, employeeId: string): Promise<{ ok: boolean; error?: string }> {
    const supabase = getServiceClient();
    const { data: existing } = await supabase
        .from('leave_requests')
        .select('id, employee_id, status')
        .eq('id', requestId)
        .maybeSingle();
    if (!existing) return { ok: false, error: 'Wniosek nie istnieje' };
    if ((existing as any).employee_id !== employeeId) {
        return { ok: false, error: 'Nie możesz anulować cudzego wniosku' };
    }
    if ((existing as any).status !== 'requested') {
        return { ok: false, error: 'Można anulować tylko wnioski oczekujące (requested)' };
    }
    const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', requestId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

// ── Listowanie ──────────────────────────────────────────────────────

export async function listOwnRequests(employeeId: string): Promise<LeaveRequest[]> {
    const supabase = getServiceClient();
    const { data } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
    return (data ?? []) as LeaveRequest[];
}

export async function listAllRequests(filters?: { status?: LeaveStatus; from?: string; to?: string }): Promise<Array<LeaveRequest & { employee_name: string; employee_position: string | null }>> {
    const supabase = getServiceClient();
    let query = supabase
        .from('leave_requests')
        .select('*, employees!inner(id, name, position)')
        .order('created_at', { ascending: false });
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.from) query = query.gte('date_from', filters.from);
    if (filters?.to) query = query.lte('date_to', filters.to);

    const { data } = await query;
    return (data ?? []).map((r: any) => ({
        ...r,
        employee_name: r.employees.name,
        employee_position: r.employees.position,
    }));
}
