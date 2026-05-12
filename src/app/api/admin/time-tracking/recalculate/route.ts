// POST /api/admin/time-tracking/recalculate
// Body: { date: 'YYYY-MM-DD' } — admin może ręcznie odpalić wyliczenie

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authGuards';
import { hasRole } from '@/lib/roles';
import { calculateAndPersistDay } from '@/lib/timeTracking/shiftCalculation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

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
        const result = await calculateAndPersistDay(body.date);
        return NextResponse.json({ ok: true, date: body.date, ...result });
    } catch (err) {
        return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
    }
}
