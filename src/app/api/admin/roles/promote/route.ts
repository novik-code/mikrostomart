// POST /api/admin/roles/promote
//
// THIN WRAPPER (od Phase 2 unified employee management).
//
// Dotychczasowy endpoint do „awansowania pacjenta" / „dodawania konta
// pracownikowi" — zachowuje backwards-compat dla obecnego UI w admin/page.tsx
// (funkcje addEmployee / addManualEmployee / promotePatient). Pod spodem
// wszystko żyje teraz w `createOrUpdateEmployee()` z `src/lib/employeeService.ts`.
//
// Po Phase 3 (UI wizard) ten endpoint stanie się zbędny, ale do tego czasu
// musi działać jak wcześniej.
//
// Body: {
//   patientEmail: string,
//   roles: ('admin'|'employee'|'patient')[],
//   sendPasswordReset?: boolean,   // default true
//   employeeName?: string,         // fallback do prefiksu email gdy brak
// }
//
// Odpowiedź zachowuje stare pola + nowe z employeeService:
//   { success, userId, email, grantedRoles, failedRoles, isNewAccount,
//     isNewEmployee, employeeId, message, warnings }

import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { createOrUpdateEmployee } from '@/lib/employeeService';
import type { UserRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const {
        patientEmail,
        roles,
        sendPasswordReset = true,
        employeeName,
    } = body;

    if (!patientEmail) {
        return NextResponse.json(
            { error: 'Wymagany email pacjenta' },
            { status: 400 }
        );
    }
    const rolesToGrant: UserRole[] = Array.isArray(roles) ? roles : [];

    // Fallback dla name — stary kod czasem go nie podawał
    const name =
        employeeName ||
        (typeof patientEmail === 'string'
            ? patientEmail.split('@')[0].replace(/[._-]/g, ' ')
            : 'Pracownik');

    try {
        const result = await createOrUpdateEmployee(
            {
                source: 'manual',
                name,
                email: patientEmail,
                roles: rolesToGrant,
                sendPasswordReset,
            },
            adminUser.email || 'admin'
        );

        // Backwards-compat response shape
        return NextResponse.json({
            success: result.success,
            userId: result.userId,
            employeeId: result.employeeId,
            email: patientEmail,
            grantedRoles: result.grantedRoles,
            failedRoles: result.failedRoles,
            isNewAccount: result.isNewAccount,
            isNewEmployee: result.isNewEmployee,
            warnings: result.warnings,
            message:
                result.message +
                (result.failedRoles.length > 0
                    ? `. Nie udało się nadać: ${result.failedRoles.join(', ')}`
                    : ''),
        });
    } catch (error: any) {
        console.error('[Promote] Error:', error);
        return NextResponse.json(
            { error: error?.message || 'Błąd serwera' },
            { status: 400 }
        );
    }
}
