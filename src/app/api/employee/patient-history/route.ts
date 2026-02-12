import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || 'http://localhost:3000';

/**
 * GET /api/employee/patient-history?patientId={prodentisId}&limit=50
 * 
 * Returns patient visit history from Prodentis API.
 * Auth: employee or admin role required.
 * Proxies to: GET /api/patient/{patientId}/appointments?limit={limit}
 */
export async function GET(req: Request) {
    try {
        // Auth check — must be logged in
        const user = await verifyAdmin();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check employee or admin role
        const isEmployee = await hasRole(user.id, 'employee');
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isEmployee && !isAdmin) {
            return NextResponse.json({ error: 'Brak uprawnień pracownika' }, { status: 403 });
        }

        // Get query params
        const url = new URL(req.url);
        const patientId = url.searchParams.get('patientId');
        const limit = url.searchParams.get('limit') || '50';

        if (!patientId) {
            return NextResponse.json({ error: 'Missing patientId parameter' }, { status: 400 });
        }

        // Fetch visit history from Prodentis
        const apiUrl = `${PRODENTIS_API_URL}/api/patient/${patientId}/appointments?limit=${limit}`;
        console.log(`[PatientHistory] Fetching from: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            console.error(`[PatientHistory] Prodentis API error: ${response.status}`);
            return NextResponse.json(
                { error: 'Failed to fetch patient history' },
                { status: 500 }
            );
        }

        const data = await response.json();

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('[PatientHistory] Error:', error);
        return NextResponse.json(
            { error: 'Server error' },
            { status: 500 }
        );
    }
}
