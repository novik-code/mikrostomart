import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { logAudit } from '@/lib/auditLog';
import { prodentisFetch } from '@/lib/prodentisFetch';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employee/patient-details?patientId=...
 * Proxy to Prodentis GET /api/patient/:id/details
 * Auth: employee or admin role required.
 * Returns: id, firstName, lastName, middleName, maidenName, pesel, birthDate, gender,
 *          phone, email, address, notes, warnings[]
 */
export async function GET(request: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
        return NextResponse.json({ error: 'Missing patientId' }, { status: 400 });
    }

    try {
        const res = await prodentisFetch(`/api/patient/${patientId}/details`, { klucz: 'personel' });

        if (!res.ok) {
            return NextResponse.json(
                { error: `Prodentis: ${res.status}` },
                { status: res.status }
            );
        }

        const data = await res.json();

        // GDPR audit log
        logAudit({
            userId: user.id, userEmail: user.email || '',
            action: 'view_patient_data', resourceType: 'patient',
            resourceId: patientId || undefined,
            patientName: data?.firstName ? `${data.firstName} ${data.lastName}` : undefined,
            request,
        });

        return NextResponse.json(data);
    } catch (e: any) {
        console.error('Patient details fetch error:', e);
        return NextResponse.json(
            { error: 'Brak połączenia z Prodentis', details: e.message },
            { status: 502 }
        );
    }
}
