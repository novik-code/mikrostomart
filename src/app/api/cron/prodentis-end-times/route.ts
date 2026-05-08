// GET /api/cron/prodentis-end-times
// Vercel Cron — codziennie 03:00 PL (01:00 UTC), po close-day o 02:30.
// Pobiera z Prodentis API work-summary każdego aktywnego lekarza za wczoraj,
// zapisuje doctor_end_time + confidence do calculated_shifts.
// Następnie nalicza overtime_justified/unjustified dla asystentek/recepcji.

import { NextRequest, NextResponse } from 'next/server';
import { logCronHeartbeat } from '@/lib/cronHeartbeat';
import { syncProdentisAndRecalcJustification } from '@/lib/timeTracking/overtimeJustification';
import { fetchDoctorWorkSummary } from '@/lib/timeTracking/prodentisWorkSummary';
import { verifyDoctorEnd } from '@/lib/timeTracking/doctorEndVerification';
import { isDemoMode } from '@/lib/demoMode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 180;

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
        return NextResponse.json({ ok: true, demo: true });
    }

    // Domyślnie: wczoraj w PL. ?date=YYYY-MM-DD do override.
    const explicitDate = new URL(req.url).searchParams.get('date');
    let targetDate: string;
    if (explicitDate && /^\d{4}-\d{2}-\d{2}$/.test(explicitDate)) {
        targetDate = explicitDate;
    } else {
        const now = new Date();
        const warsawNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
        warsawNow.setDate(warsawNow.getDate() - 1);
        targetDate = warsawNow.toISOString().slice(0, 10);
    }

    const t0 = Date.now();
    try {
        const result = await syncProdentisAndRecalcJustification(targetDate, async (prodentisId, date) => {
            const summary = await fetchDoctorWorkSummary(prodentisId, date);
            if (!summary) return null;
            const verification = await verifyDoctorEnd(summary, date);
            return {
                estimatedWorkEnd: verification.finalEndTime,
                confidence: verification.finalConfidence,
                methods: verification.methods,
                crossVerified: verification.crossVerified,
            };
        });

        const summary = `${targetDate}: doctors[HV${result.doctorsHighVerified}/H${result.doctorsHigh}/M${result.doctorsMedium}/L${result.doctorsLow}/missing${result.doctorsMissing}] · employees=${result.employeesUpdated} · just=${result.totalJustifiedMin}min · unjust=${result.totalUnjustifiedMin}min`;
        await logCronHeartbeat('prodentis-end-times', 'ok', summary, Date.now() - t0);
        return NextResponse.json({ ok: true, date: targetDate, ...result });
    } catch (err) {
        console.error('[cron/prodentis-end-times] error:', err);
        await logCronHeartbeat('prodentis-end-times', 'error', (err as Error).message?.slice(0, 200), Date.now() - t0);
        return NextResponse.json(
            { ok: false, error: (err as Error).message, date: targetDate },
            { status: 500 }
        );
    }
}
