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
 * Zwraca ostatni wpis dla pracownika (nie ograniczony do dziś).
 */
export async function getLastEntry(employeeId: string): Promise<TimeEntry | null> {
    const supabase = getServiceClient();
    const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .order('scanned_at', { ascending: false })
        .limit(1);
    if (error) {
        console.error('[timeTracking] getLastEntry error:', error);
        return null;
    }
    return (data?.[0] as TimeEntry) ?? null;
}

/**
 * Zwraca ostatni wpis pracownika z dzisiaj.
 */
export async function getLastEntryToday(employeeId: string, now: Date = new Date()): Promise<TimeEntry | null> {
    const { start, end } = todayBoundsLocal(now);
    const supabase = getServiceClient();
    const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employeeId)
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
            })),
        },
    };
}
