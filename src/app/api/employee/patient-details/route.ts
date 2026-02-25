import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employee/patient-details?patientId=...
 * Fetches full patient data + notes ("Uwagi i ostrzeżenia dla lekarza") from Prodentis.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
        return NextResponse.json({ error: 'Missing patientId' }, { status: 400 });
    }

    const apiUrl = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';
    const apiKey = process.env.PRODENTIS_API_KEY || '';

    try {
        // Fetch patient details + notes in parallel
        const [detailsRes, notesRes] = await Promise.all([
            fetch(`${apiUrl}/api/patient/${patientId}/details`, {
                headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-Key': apiKey } : {}) },
                signal: AbortSignal.timeout(8000),
                cache: 'no-store',
            }),
            fetch(`${apiUrl}/api/patients/${patientId}/notes`, {
                headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-Key': apiKey } : {}) },
                signal: AbortSignal.timeout(8000),
                cache: 'no-store',
            }).catch(() => null), // notes endpoint may not exist yet → fallback
        ]);

        if (!detailsRes.ok) {
            return NextResponse.json(
                { error: `Prodentis: ${detailsRes.status}` },
                { status: detailsRes.status }
            );
        }

        const details = await detailsRes.json();
        let notes = null;
        if (notesRes && notesRes.ok) {
            notes = await notesRes.json();
        }

        return NextResponse.json({ ...details, medicalNotes: notes });
    } catch (e: any) {
        console.error('Patient details fetch error:', e);
        return NextResponse.json(
            { error: 'Brak połączenia z Prodentis', details: e.message },
            { status: 502 }
        );
    }
}
