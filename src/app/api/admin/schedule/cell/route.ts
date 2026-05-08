// PUT /api/admin/schedule/cell — upsert komórki grafiku
// DELETE /api/admin/schedule/cell?employeeId=&date= — usunięcie komórki

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { deleteScheduleCell, upsertScheduleCell } from '@/lib/timeTracking/scheduleService';
import type { UpsertCellPayload } from '@/lib/timeTracking/scheduleTypes';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await hasRole(user.id, 'admin'))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: UpsertCellPayload;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const result = await upsertScheduleCell(body, user.id);
    if (!result.ok) {
        return NextResponse.json({ error: result.error ?? 'Błąd zapisu' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, cell: result.cell });
}

export async function DELETE(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await hasRole(user.id, 'admin'))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    const date = url.searchParams.get('date');
    if (!employeeId || !date) {
        return NextResponse.json({ error: 'Brak employeeId / date' }, { status: 400 });
    }

    const result = await deleteScheduleCell(employeeId, date);
    if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
}
