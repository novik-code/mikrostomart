// GET /api/cron/close-day
// Vercel Cron — codziennie ~02:30 Warsaw (00:30 UTC), zamyka wczorajszy dzień:
//   - dla każdego pracownika łączy time_entries z work_schedules
//   - liczy worked_minutes / late / early / overtime / anomalie
//   - zapisuje do calculated_shifts
//
// Wpisy bez clock_out → auto-domykane na planowany koniec zmiany
// (z flag auto_closed=true). Status='calculated'. Wpisy admin_approved
// nie są nadpisywane.
//
// W F4 nadgodziny są łączne (overtime_total). F5 dorzuci doctor_end_time
// z Prodentis i rozdział na justified/unjustified.

import { NextRequest, NextResponse } from 'next/server';
import { calculateAndPersistDay } from '@/lib/timeTracking/shiftCalculation';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';
import { isDemoMode } from '@/lib/demoMode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const isManual = new URL(req.url).searchParams.get('manual') === 'true';
    if (
        authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
        process.env.NODE_ENV === 'production' &&
        !isManual
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isDemoMode) {
        return NextResponse.json({ ok: true, demo: true, message: 'demo mode — skip' });
    }

    // Override daty przez ?date=YYYY-MM-DD (do ręcznego naliczenia historii)
    const explicitDate = new URL(req.url).searchParams.get('date');
    let targetDate: string;
    if (explicitDate && /^\d{4}-\d{2}-\d{2}$/.test(explicitDate)) {
        targetDate = explicitDate;
    } else {
        // Domyślnie: wczoraj w PL
        const now = new Date();
        const warsawNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
        warsawNow.setDate(warsawNow.getDate() - 1);
        targetDate = warsawNow.toISOString().slice(0, 10);
    }

    const t0 = Date.now();
    try {
        const result = await calculateAndPersistDay(targetDate);
        await logCronHeartbeat('close-day', 'ok', `${targetDate}: ${result.processed}/${result.withAnomalies}/${result.autoClosed}`, Date.now() - t0);
        return NextResponse.json({
            ok: true,
            date: targetDate,
            ...result,
        });
    } catch (err) {
        console.error('[cron/close-day] error:', err);
        await logCronHeartbeat('close-day', 'error', (err as Error).message?.slice(0, 200), Date.now() - t0);
        return NextResponse.json(
            { ok: false, error: (err as Error).message, date: targetDate },
            { status: 500 }
        );
    }
}
