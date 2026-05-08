// GET /api/time/status
// Status pracownika na dziś — używane w /pracownik/czas-pracy

import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { getEmployeeByAuthUserId } from '@/lib/timeTracking/employeeContext';
import { buildStatusResponse } from '@/lib/timeTracking/timeEntryService';
import { isDemoMode } from '@/lib/demoMode';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET() {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [isEmployee, isAdmin] = await Promise.all([
        hasRole(user.id, 'employee'),
        hasRole(user.id, 'admin'),
    ]);
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (isDemoMode) {
        return NextResponse.json({
            employee: { id: 'demo', name: 'Demo User', position: 'Asystentka' },
            isWorkingNow: false,
            expectedNextType: 'clock_in',
            lastEntry: null,
            today: {
                clockIns: 0,
                clockOuts: 0,
                firstClockIn: null,
                lastClockOut: null,
                workedMinutes: 0,
                entries: [],
            },
            isDemoMode: true,
        });
    }

    const employee = await getEmployeeByAuthUserId(user.id);
    if (!employee) {
        return NextResponse.json(
            { error: 'Twoje konto nie jest powiązane z aktywnym pracownikiem' },
            { status: 403 }
        );
    }

    const status = await buildStatusResponse(
        { id: employee.id, name: employee.name, position: employee.position },
        new Date()
    );
    return NextResponse.json(status);
}
