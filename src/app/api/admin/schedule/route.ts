// GET /api/admin/schedule?month=YYYY-MM — pełny grid grafiku za dany miesiąc

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authGuards';
import { hasRole } from '@/lib/roles';
import { fetchScheduleMonth } from '@/lib/timeTracking/scheduleService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    if (!(await hasRole(user.id, 'admin'))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const month = url.searchParams.get('month') ?? '';
    if (!/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json({ error: 'Niepoprawny parametr month (YYYY-MM)' }, { status: 400 });
    }

    const data = await fetchScheduleMonth(month);
    if (!data) {
        return NextResponse.json({ error: 'Nie udało się pobrać grafiku' }, { status: 500 });
    }
    return NextResponse.json(data);
}
