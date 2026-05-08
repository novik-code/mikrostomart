// DELETE /api/employee/leave-requests/[id] — anulowanie własnego wniosku
// (tylko gdy status='requested')

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { getEmployeeByAuthUserId } from '@/lib/timeTracking/employeeContext';
import { cancelOwnRequest } from '@/lib/timeTracking/leaveService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [isEmployee, isAdmin] = await Promise.all([hasRole(user.id, 'employee'), hasRole(user.id, 'admin')]);
    if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const employee = await getEmployeeByAuthUserId(user.id);
    if (!employee) return NextResponse.json({ error: 'Brak aktywnego pracownika' }, { status: 403 });

    const { id } = await ctx.params;
    const result = await cancelOwnRequest(id, employee.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
}
