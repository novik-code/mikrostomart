// Service do operacji na time_entries: zapis, dedup, status pracownika.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { TimeEntry, TimeEntryType, TimeStatusResponse } from './types';

export const TAP_DEDUP_WINDOW_SECONDS = 60;

function getServiceClient(): SupabaseClient {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

function todayBoundsLocal(now: Date = new Date()): { start: Date; end: Date } {
    // Granice "dnia roboczego" w czasie lokalnym serwera (Vercel = UTC, ale nasze
    // godziny pracy 8-20 są lokalne PL — różnica zwykle nie sięga północy).
    // W F4 (calculated_shifts) przejdziemy na strefę Europe/Warsaw.
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
}

/**
 * Zwraca ostatni AKTYWNY (nie anulowany) wpis dla pracownika.
 */
export async function getLastEntry(employeeId: string): Promise<TimeEntry | null> {
    const supabase = getServiceClient();
    const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('cancelled', false)
        .order('scanned_at', { ascending: false })
        .limit(1);
    if (error) {
        console.error('[timeTracking] getLastEntry error:', error);
        return null;
    }
    return (data?.[0] as TimeEntry) ?? null;
}

/**
 * Zwraca ostatni AKTYWNY wpis pracownika z dzisiaj.
 */
export async function getLastEntryToday(employeeId: string, now: Date = new Date()): Promise<TimeEntry | null> {
    const { start, end } = todayBoundsLocal(now);
    const supabase = getServiceClient();
    const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('cancelled', false)
        .gte('scanned_at', start.toISOString())
        .lt('scanned_at', end.toISOString())
        .order('scanned_at', { ascending: false })
        .limit(1);
    if (error) {
        console.error('[timeTracking] getLastEntryToday error:', error);
        return null;
    }
    return (data?.[0] as TimeEntry) ?? null;
}

/**
 * Czego oczekiwać jako kolejny skan na podstawie ostatniego wpisu z dziś:
 *   brak wpisów dziś → clock_in
 *   ostatni clock_in → clock_out
 *   ostatni clock_out → clock_in (kolejna sesja)
 */
export async function getExpectedNextType(employeeId: string, now: Date = new Date()): Promise<TimeEntryType> {
    const last = await getLastEntryToday(employeeId, now);
    if (!last) return 'clock_in';
    return last.type === 'clock_in' ? 'clock_out' : 'clock_in';
}

/**
 * Sprawdza czy w oknie 60s pracownik już zarejestrował taki sam typ wpisu (tap-protection).
 */
export async function isDuplicateTap(employeeId: string, type: TimeEntryType, now: Date = new Date()): Promise<TimeEntry | null> {
    const cutoff = new Date(now.getTime() - TAP_DEDUP_WINDOW_SECONDS * 1000);
    const supabase = getServiceClient();
    const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('type', type)
        .eq('cancelled', false)
        .gte('scanned_at', cutoff.toISOString())
        .order('scanned_at', { ascending: false })
        .limit(1);
    if (error) {
        console.error('[timeTracking] isDuplicateTap error:', error);
        return null;
    }
    return (data?.[0] as TimeEntry) ?? null;
}

interface InsertEntryInput {
    employeeId: string;
    type: TimeEntryType;
    locationId: string | null;
    qrTokenUsed?: string | null;
    qrPeriod?: number | null;
    deviceInfo?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
}

export async function getEntryById(entryId: string): Promise<TimeEntry | null> {
    const supabase = getServiceClient();
    const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('id', entryId)
        .maybeSingle();
    if (error) {
        console.error('[timeTracking] getEntryById error:', error);
        return null;
    }
    return data as TimeEntry | null;
}

interface CancelEntryInput {
    entryId: string;
    employeeId: string;
    cancelledByUserId: string;
    reason: string;
}

/**
 * Anuluje wpis (soft-delete). Walidacja:
 *  - wpis należy do tego pracownika
 *  - wpis jest z dzisiaj
 *  - jeszcze nie anulowany
 *  - powód niepusty
 */
export async function cancelTimeEntry(input: CancelEntryInput): Promise<{ ok: true; entry: TimeEntry } | { ok: false; error: string }> {
    const reason = input.reason?.trim();
    if (!reason || reason.length < 3) {
        return { ok: false, error: 'Podaj krótki powód anulowania (min. 3 znaki)' };
    }
    if (reason.length > 500) {
        return { ok: false, error: 'Powód za długi (max 500 znaków)' };
    }

    const existing = await getEntryById(input.entryId);
    if (!existing) {
        return { ok: false, error: 'Nie znaleziono wpisu' };
    }
    if (existing.employee_id !== input.employeeId) {
        return { ok: false, error: 'Nie możesz anulować cudzego wpisu' };
    }
    if (existing.cancelled) {
        return { ok: false, error: 'Wpis już został anulowany' };
    }

    const { start, end } = todayBoundsLocal(new Date());
    const scannedDate = new Date(existing.scanned_at);
    if (scannedDate < start || scannedDate >= end) {
        return { ok: false, error: 'Można anulować tylko wpisy z dzisiaj — starsze koryguje admin' };
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
        .from('time_entries')
        .update({
            cancelled: true,
            cancelled_at: new Date().toISOString(),
            cancelled_by: input.cancelledByUserId,
            cancel_reason: reason,
        })
        .eq('id', input.entryId)
        .eq('cancelled', false)
        .select('*')
        .single();
    if (error || !data) {
        return { ok: false, error: 'Nie udało się anulować wpisu' };
    }
    return { ok: true, entry: data as TimeEntry };
}

export async function insertTimeEntry(input: InsertEntryInput): Promise<TimeEntry> {
    const supabase = getServiceClient();
    const { data, error } = await supabase
        .from('time_entries')
        .insert({
            employee_id: input.employeeId,
            type: input.type,
            location_id: input.locationId,
            qr_token_used: input.qrTokenUsed ?? null,
            qr_period: input.qrPeriod ?? null,
            device_info: input.deviceInfo ?? null,
            ip_address: input.ipAddress ?? null,
            user_agent: input.userAgent ?? null,
        })
        .select('*')
        .single();
    if (error || !data) {
        throw new Error(`Failed to insert time entry: ${error?.message ?? 'unknown'}`);
    }
    return data as TimeEntry;
}

interface TodayEntriesData {
    entries: TimeEntry[];
    clockIns: number;
    clockOuts: number;
    firstClockIn: TimeEntry | null;
    lastClockOut: TimeEntry | null;
    workedMinutes: number;
}

/**
 * Suma minut pracy dziś. Każdy clock_in paruje z kolejnym clock_out;
 * niesparowany clock_in (pracownik aktualnie w pracy) liczy się od czasu wpisu do now.
 */
export async function getTodayEntries(employeeId: string, now: Date = new Date()): Promise<TodayEntriesData> {
    const { start, end } = todayBoundsLocal(now);
    const supabase = getServiceClient();
    const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('cancelled', false)
        .gte('scanned_at', start.toISOString())
        .lt('scanned_at', end.toISOString())
        .order('scanned_at', { ascending: true });

    if (error) {
        console.error('[timeTracking] getTodayEntries error:', error);
        return { entries: [], clockIns: 0, clockOuts: 0, firstClockIn: null, lastClockOut: null, workedMinutes: 0 };
    }

    const entries = (data ?? []) as TimeEntry[];
    let clockIns = 0;
    let clockOuts = 0;
    let firstClockIn: TimeEntry | null = null;
    let lastClockOut: TimeEntry | null = null;
    let workedMs = 0;
    let openIn: TimeEntry | null = null;

    for (const e of entries) {
        if (e.type === 'clock_in') {
            clockIns += 1;
            if (!firstClockIn) firstClockIn = e;
            openIn = e;
        } else {
            clockOuts += 1;
            lastClockOut = e;
            if (openIn) {
                workedMs += new Date(e.scanned_at).getTime() - new Date(openIn.scanned_at).getTime();
                openIn = null;
            }
        }
    }
    if (openIn) {
        workedMs += now.getTime() - new Date(openIn.scanned_at).getTime();
    }
    return {
        entries,
        clockIns,
        clockOuts,
        firstClockIn,
        lastClockOut,
        workedMinutes: Math.max(0, Math.round(workedMs / 60000)),
    };
}

/**
 * Buduje obiekt statusu dla endpointa /api/time/status.
 */
export async function buildStatusResponse(
    employee: { id: string; name: string; position: string | null },
    now: Date = new Date()
): Promise<TimeStatusResponse> {
    const today = await getTodayEntries(employee.id, now);
    const lastEntry = today.entries[today.entries.length - 1] ?? null;

    let locationName: string | null = null;
    if (lastEntry?.location_id) {
        const supabase = getServiceClient();
        const { data: loc } = await supabase
            .from('work_locations')
            .select('name')
            .eq('id', lastEntry.location_id)
            .maybeSingle();
        locationName = loc?.name ?? null;
    }

    const isWorkingNow = lastEntry?.type === 'clock_in';

    return {
        employee,
        isWorkingNow,
        expectedNextType: isWorkingNow ? 'clock_out' : 'clock_in',
        lastEntry: lastEntry
            ? {
                id: lastEntry.id,
                type: lastEntry.type,
                scannedAt: lastEntry.scanned_at,
                locationName,
            }
            : null,
        today: {
            clockIns: today.clockIns,
            clockOuts: today.clockOuts,
            firstClockIn: today.firstClockIn?.scanned_at ?? null,
            lastClockOut: today.lastClockOut?.scanned_at ?? null,
            workedMinutes: today.workedMinutes,
            entries: today.entries.map((e) => ({
                id: e.id,
                type: e.type,
                scannedAt: e.scanned_at,
                manual: e.manual,
                canCancel: !e.manual,  // tylko własne, nie-manualne wpisy
            })),
        },
    };
}
