import { NextResponse, NextRequest } from 'next/server';
import { verifyPatientSession } from '@/lib/jwt';
import { prodentisFetch } from '@/lib/prodentisFetch';
import { isDemoMode } from '@/lib/demoMode';
import { parsePmsLimit, parsePmsOffset } from '@/lib/prodentisId';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // Verify JWT
        
        const payload = await verifyPatientSession(request);

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // In demo mode, return empty visits
        if (isDemoMode) {
            console.log('[Visits] DEMO MODE: Returning empty visits');
            return NextResponse.json({ appointments: [], total: 0 });
        }

        // Get query params
        const { searchParams } = new URL(request.url);
        /**
         * 🔴 P-084: `limit` i `offset` szły stąd WPROST do ścieżki żądania do PMS —
         * bez parsowania do liczb i bez kodowania. Zalogowany pacjent doklejał własne
         * parametry do wywołania `/api/patient/<własne id>/appointments` albo żądał
         * dowolnie dużej strony. Segment ścieżki i identyfikator były już bezpieczne
         * (P-035); dziurą został sam parametr.
         * 🔑 Parsujemy do LICZBY — doklejka nie ma wtedy jak przetrwać, bo do ścieżki
         * trafia liczba, nie napis. Ta sama reguła co w `employee/patient-history`.
         */
        const limit = parsePmsLimit(searchParams.get('limit'), 50, 200);
        const offset = parsePmsOffset(searchParams.get('offset'), 100_000);

        // Fetch visits from Prodentis
        const path = `/api/patient/${payload.prodentisId}/appointments?limit=${limit}&offset=${offset}`;

        console.log('[Visits] Fetching from:', path);

        const response = await prodentisFetch(path);

        if (!response.ok) {
            console.error('[Visits] Prodentis API error:', response.status);
            return NextResponse.json(
                { error: 'Failed to fetch visit history' },
                { status: 500 }
            );
        }

        const visitsData = await response.json();

        return NextResponse.json(visitsData);

    } catch (error: any) {
        console.error('[Visits] Error:', error);
        return NextResponse.json(
            { error: 'Server error' },
            { status: 500 }
        );
    }
}
