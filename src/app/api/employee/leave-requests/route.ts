// GET /api/employee/leave-requests — lista własnych wniosków + bilans
// POST /api/employee/leave-requests — złożenie nowego wniosku

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { getEmployeeByAuthUserId } from '@/lib/timeTracking/employeeContext';
import {
    createLeaveRequest,
    getVacationBalance,
    listOwnRequests,
    type LeaveType,
} from '@/lib/timeTracking/leaveService';
import { pushToGroups } from '@/lib/pushService';
import { isDemoMode } from '@/lib/demoMode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [isEmployee, isAdmin] = await Promise.all([hasRole(user.id, 'employee'), hasRole(user.id, 'admin')]);
    if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const employee = await getEmployeeByAuthUserId(user.id);
    if (!employee) return NextResponse.json({ error: 'Brak aktywnego pracownika' }, { status: 403 });

    const [requests, balance] = await Promise.all([
        listOwnRequests(employee.id),
        getVacationBalance(employee.id, new Date().getFullYear()),
    ]);

    return NextResponse.json({ requests, balance });
}

interface CreateBody {
    type: LeaveType;
    dateFrom: string;
    dateTo: string;
    hoursPerDay?: number | null;
    reason?: string | null;
    notes?: string | null;
}

const VALID_TYPES: LeaveType[] = ['vacation', 'on_demand', 'sick', 'child_care', 'training', 'delegation', 'unpaid', 'other'];

export async function POST(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [isEmployee, isAdmin] = await Promise.all([hasRole(user.id, 'employee'), hasRole(user.id, 'admin')]);
    if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const employee = await getEmployeeByAuthUserId(user.id);
    if (!employee) return NextResponse.json({ error: 'Brak aktywnego pracownika' }, { status: 403 });

    let body: CreateBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(body.type)) {
        return NextResponse.json({ error: 'Niepoprawny typ wniosku' }, { status: 400 });
    }

    const result = await createLeaveRequest({
        employeeId: employee.id,
        type: body.type,
        dateFrom: body.dateFrom,
        dateTo: body.dateTo,
        hoursPerDay: body.hoursPerDay ?? null,
        reason: body.reason ?? null,
        notes: body.notes ?? null,
        requestedByUserId: user.id,
    });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    // Push do admina
    if (!isDemoMode) {
        void pushToGroups(['admin'], {
            title: '🏖 Nowy wniosek urlopowy',
            body: `${employee.name}: ${body.type} ${body.dateFrom}${body.dateTo !== body.dateFrom ? ` – ${body.dateTo}` : ''}${body.reason ? ` (${body.reason.slice(0, 80)})` : ''}`,
            url: '/admin?tab=leaves',
            tag: 'leave-new',
        });
    }

    return NextResponse.json({ ok: true, request: result.request });
}
