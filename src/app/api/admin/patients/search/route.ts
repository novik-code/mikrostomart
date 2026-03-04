import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || 'http://localhost:3000';

/**
 * GET /api/admin/patients/search?q=searchTerm&limit=10
 * Auth: admin required.
 * Proxy to Prodentis API 5.0 patient search endpoint.
 */
export async function GET(request: Request) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q')?.trim();
        const limit = searchParams.get('limit') || '10';

        if (!query || query.length < 1) {
            return NextResponse.json({ patients: [], message: 'Query must be at least 1 character' });
        }

        // Call Prodentis API 5.0 patient search
        const prodentisUrl = `${PRODENTIS_API_URL}/api/patients/search?q=${encodeURIComponent(query)}&limit=${limit}`;

        console.log(`[Patient Search] Querying Prodentis: ${prodentisUrl}`);

        const res = await fetch(prodentisUrl, {
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000)
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`[Patient Search] Prodentis error ${res.status}: ${errorText}`);
            return NextResponse.json(
                { error: `Prodentis API error: ${res.status}`, patients: [] },
                { status: res.status }
            );
        }

        const data = await res.json();

        // Normalize phone numbers: Prodentis returns "+48XXXXXXXXX", 
        // our SMS system uses "48XXXXXXXXX" (no + prefix)
        const patients = (data.patients || []).map((p: any) => ({
            id: p.id,
            firstName: p.firstName || '',
            lastName: p.lastName || '',
            phone: p.phone ? p.phone.replace(/^\+/, '') : '',
            fullName: `${p.firstName || ''} ${p.lastName || ''}`.trim()
        }));

        console.log(`[Patient Search] Found ${patients.length} patients for query "${query}"`);

        return NextResponse.json({ patients, total: data.total || patients.length });

    } catch (error) {
        console.error('[Patient Search] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error', patients: [] },
            { status: 500 }
        );
    }
}
