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
    LEAVE_TYPE_LABELS,
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

    // Push do admina — web-push FCM ORAZ aplikacja mobilna (`alsoApp`).
    //
    // 🔑 Bez `alsoApp` to powiadomienie NIE DOCIERAŁO na telefon: `pushToGroups`
    // czytało wyłącznie `fcm_tokens`, a tokeny apki żyją w `staff_push_tokens`.
    // Wpis w historii Alertów powstawał mimo to (`logPush` leci niezależnie od
    // dostarczenia), więc wyglądało to na działające.
    //
    // 🔑 TREŚĆ JEST NEUTRALNA i to jest skutek powyższego: dopiero teraz ten tekst
    // ląduje na ZABLOKOWANYM ekranie telefonu. Powód wniosku bywa wrażliwy
    // („wizyta u onkologa"), więc zostaje w panelu i w aplikacji, a nie na banerze.
    // Typ podajemy etykietą, nie surowym enumem — dotąd na telefon szłoby „vacation".
    if (!isDemoMode) {
        const range = body.dateTo !== body.dateFrom ? `${body.dateFrom} – ${body.dateTo}` : body.dateFrom;
        void pushToGroups(
            ['admin'],
            {
                title: '🏖 Nowy wniosek urlopowy',
                body: `${employee.name}: ${LEAVE_TYPE_LABELS[body.type] ?? body.type}, ${range}`,
                url: '/admin?tab=leaves',
                tag: 'leave-new',
                // Apka rozpoznaje wniosek po `type` i otwiera listę wniosków zespołu;
                // `url` jest webowy (`/admin?tab=leaves`) i sam z siebie jej nie prowadzi.
                data: { type: 'leave_request' },
            },
            { alsoApp: true },
        );
    }

    return NextResponse.json({ ok: true, request: result.request });
}
