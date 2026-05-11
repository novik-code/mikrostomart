// PATCH /api/admin/employees/[id] — edycja pojedynczego pracownika
//
// Backend dla rozwijanego wiersza w admin panel „Pracownicy" (Phase 3 UI).
// Wszystkie pola opcjonalne — wysyłasz tylko te które chcesz zmienić.
//
// Body: {
//   name?: string,
//   email?: string,
//   position?: string | null,
//   showInBooking?: boolean,
//   pushGroups?: ('doctor'|'hygienist'|'reception'|'assistant')[],
//   isActive?: boolean,                                 // toggle deactivation
//   roles?: ('admin'|'employee'|'patient')[],           // pełen set — diff grant/revoke
// }
//
// Zwraca: { success, employeeId, grantedRoles, revokedRoles, warnings, message }

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { updateEmployee } from '@/lib/employeeService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'employee id required' }, { status: 400 });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    try {
        const result = await updateEmployee(
            id,
            {
                name: body.name,
                email: body.email,
                position: body.position,
                showInBooking: body.showInBooking,
                pushGroups: body.pushGroups,
                isActive: body.isActive,
                roles: body.roles,
            },
            user.email || 'admin'
        );
        console.log(`[Employees PATCH /${id}] ${result.message} (by ${user.email})`);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error(`[Employees PATCH /${id}] Error:`, error);
        return NextResponse.json(
            { error: error?.message || 'Server error' },
            { status: 400 }
        );
    }
}
