// GET /api/admin/leave-requests?status=&from=&to= — wszystkie wnioski

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authGuards';
import { hasRole } from '@/lib/roles';
import { listAllRequests, type LeaveStatus } from '@/lib/timeTracking/leaveService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const user = auth.user;
    if (!(await hasRole(user.id, 'admin'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(request.url);
    const status = url.searchParams.get('status') as LeaveStatus | null;
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const filters: { status?: LeaveStatus; from?: string; to?: string } = {};
    if (status && ['requested', 'approved', 'rejected', 'cancelled'].includes(status)) filters.status = status;
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) filters.from = from;
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) filters.to = to;

    const requests = await listAllRequests(filters);
    return NextResponse.json({ requests });
}
