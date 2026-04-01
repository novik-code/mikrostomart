import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';

/**
 * GET /api/employee/patient-search?q=searchTerm&limit=5
 * 
 * Proxy to Prodentis API patient search for employees.
 * Requires employee or admin role.
 */
export async function GET(request: Request) {
    try {
        // Verify authentication
        const user = await verifyAdmin();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized', patients: [] }, { status: 401 });
        }

        const isEmployee = await hasRole(user.id, 'employee');
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isEmployee && !isAdmin) {
            return NextResponse.json({ error: 'Brak uprawnień pracownika', patients: [] }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q')?.trim();
        const limit = searchParams.get('limit') || '5';

        if (!query || query.length < 2) {
            return NextResponse.json({ patients: [] });
        }

        // Call Prodentis API patient search
        const prodentisUrl = `${PRODENTIS_API_URL}/api/patients/search?q=${encodeURIComponent(query)}&limit=${limit}`;

        const res = await fetch(prodentisUrl, {
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) {
            console.error(`[Employee Patient Search] Prodentis error ${res.status}`);
            return NextResponse.json({ error: 'Prodentis API error', patients: [] }, { status: res.status });
        }

        const data = await res.json();

        const patients = (data.patients || []).map((p: any) => ({
            id: p.id,
            firstName: p.firstName || '',
            lastName: p.lastName || '',
            phone: p.phone ? p.phone.replace(/^\+/, '') : '',
            fullName: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
        }));

        return NextResponse.json({ patients, total: data.total || patients.length });

    } catch (error) {
        console.error('[Employee Patient Search] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error', patients: [] },
            { status: 500 }
        );
    }
}
