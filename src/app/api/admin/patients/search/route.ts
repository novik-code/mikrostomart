import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';
import { prodentisFetch } from '@/lib/prodentisFetch';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/patients/search?q=searchTerm&limit=10
 * Auth: admin required.
 * Proxy to Prodentis API 5.0 patient search endpoint.
 */
export async function GET(request: Request) {
    try {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const user = auth.user;

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q')?.trim();
        const limit = searchParams.get('limit') || '10';

        if (!query || query.length < 1) {
            return NextResponse.json({ patients: [], message: 'Query must be at least 1 character' });
        }

        // Call Prodentis API 5.0 patient search
        const sciezka = `/api/patients/search?q=${encodeURIComponent(query)}&limit=${limit}`;

        console.log(`[Patient Search] Querying Prodentis: ${sciezka}`);

        const res = await prodentisFetch(sciezka, {
            klucz: 'personel', timeoutMs: 5000 });

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

        if (patients.length > 0) {
            logAudit({
                userId: user.id, userEmail: user.email || '',
                action: 'admin_search_patients', resourceType: 'patient_search',
                metadata: { query, resultCount: patients.length },
                request,
            });
        }

        return NextResponse.json({ patients, total: data.total || patients.length });

    } catch (error) {
        console.error('[Patient Search] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error', patients: [] },
            { status: 500 }
        );
    }
}
