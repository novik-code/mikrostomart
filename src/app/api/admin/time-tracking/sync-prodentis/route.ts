// POST /api/admin/time-tracking/sync-prodentis
// Body: { date: 'YYYY-MM-DD' }
// Manualne wywołanie sync z Prodentis + naliczenie justified/unjustified.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authGuards';
import { hasRole } from '@/lib/roles';
import { syncProdentisAndRecalcJustification } from '@/lib/timeTracking/overtimeJustification';
import { fetchDoctorWorkSummary } from '@/lib/timeTracking/prodentisWorkSummary';
import { verifyDoctorEnd } from '@/lib/timeTracking/doctorEndVerification';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const user = auth.user;
    if (!(await hasRole(user.id, 'admin'))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: { date?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
        return NextResponse.json({ error: 'Brak date (YYYY-MM-DD)' }, { status: 400 });
    }

    try {
        const result = await syncProdentisAndRecalcJustification(body.date, async (prodentisId, date) => {
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
        return NextResponse.json({ ok: true, date: body.date, ...result });
    } catch (err) {
        return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
    }
}
