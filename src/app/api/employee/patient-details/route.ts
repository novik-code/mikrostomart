import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employee/patient-details?patientId=...
 * Proxy to Prodentis GET /api/patient/:id/details
 * Returns: id, firstName, lastName, middleName, maidenName, pesel, birthDate, gender,
 *          phone, email, address, notes, warnings[]
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
        return NextResponse.json({ error: 'Missing patientId' }, { status: 400 });
    }

    const apiUrl = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';

    try {
        const res = await fetch(`${apiUrl}/api/patient/${patientId}/details`, {
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(8000),
            cache: 'no-store',
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: `Prodentis: ${res.status}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (e: any) {
        console.error('Patient details fetch error:', e);
        return NextResponse.json(
            { error: 'Brak połączenia z Prodentis', details: e.message },
            { status: 502 }
        );
    }
}
