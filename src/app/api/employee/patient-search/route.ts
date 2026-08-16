import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

const PRODENTIS_API_URL = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';

/**
 * Wyszukiwarka pacjentów (proxy do Prodentisa). Rola: employee albo admin.
 *
 * W4 — DWA warianty tej samej operacji:
 *   · `GET ?q=&limit=`  — ZOSTAJE dla zgodności z binarkami 1.1/1.2 ze sklepów,
 *   · `POST {q, limit}` — nowy, preferowany.
 *
 * Powód jest prosty: `q` to fraza wpisana przez pracownika, czyli zwykle NAZWISKO
 * PACJENTA. W GET ląduje w adresie, a adresy zapisują się w logach brzegowych
 * Vercela i w historii pośredników — poza rejestrem RODO (art. 30), który prowadzimy
 * w `logAudit`. Dokładnie ta sama klasa co token gościa w query-stringu, naprawiony
 * wcześniej. W POST fraza jedzie w ciele i do logu adresu nie trafia.
 *
 * Wygaszenie GET-a dopiero, gdy binarki 1.1/1.2 przestaną być używane.
 */
async function szukaj(request: Request, query: string | undefined, limit: string) {
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

        // GDPR audit log (Art. 30 RODO) — fires only for non-trivial searches
        if (query.length >= 2 && patients.length > 0) {
            logAudit({
                userId: user.id, userEmail: user.email || '',
                action: 'search_patients', resourceType: 'patient_search',
                metadata: { query, resultCount: patients.length },
                request,
            });
        }

        return NextResponse.json({ patients, total: data.total || patients.length });

    } catch (error) {
        console.error('[Employee Patient Search] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error', patients: [] },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    return szukaj(request, searchParams.get('q')?.trim(), searchParams.get('limit') || '5');
}

export async function POST(request: Request) {
    // Ciało czytane w `try`: nieparsowalny JSON nie może wychodzić surowym 500.
    let body: { q?: unknown; limit?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ patients: [] });
    }
    const q = typeof body?.q === 'string' ? body.q.trim() : undefined;
    const limit = Number.isFinite(Number(body?.limit)) ? String(Math.trunc(Number(body.limit))) : '5';
    return szukaj(request, q, limit);
}
