import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/staff-signatures
 *
 * S10-3 (audyt P1/P2 #4): wcześniej endpoint zwracał `signature_data` (base64 PNG)
 * wszystkich pracowników publicznie. Atakujący mógł sobie pobrać podpisy lekarzy
 * i użyć ich do podrobienia dokumentów. Fix: token-scoped access.
 *
 * Access przez 2 ścieżki:
 *
 * 1. Consent flow (`/zgody/[token]/page.tsx`): pacjent na tablecie wybiera
 *    lekarza z dropdownu. Endpoint akceptuje `?consentToken=xxx` w query, verify
 *    czy token istnieje + nie expired w `consent_tokens`. Jeśli OK → zwraca listę
 *    podpisów. Bez tokena ten endpoint nie zwraca nic.
 *
 * 2. Employee/admin session (do podglądu w przyszłych narzędziach): zalogowany
 *    pracownik może pobrać listę. Anonymous → 401.
 */
export async function GET(request: NextRequest) {
    const consentToken = request.nextUrl.searchParams.get('consentToken');

    // Path 1: consent token verification (najczęstszy use case — /zgody flow)
    if (consentToken) {
        if (typeof consentToken !== 'string' || consentToken.length < 8) {
            return NextResponse.json({ error: 'Invalid consent token' }, { status: 400 });
        }

        const { data: tokenRow, error: tokenErr } = await supabase
            .from('consent_tokens')
            .select('token, expires_at')
            .eq('token', consentToken)
            .maybeSingle();

        if (tokenErr) {
            console.error('[StaffSignatures] Token lookup error:', tokenErr);
            return NextResponse.json({ error: 'Token verification failed' }, { status: 500 });
        }

        if (!tokenRow) {
            return NextResponse.json({ error: 'Invalid consent token' }, { status: 401 });
        }

        if (new Date(tokenRow.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Consent token expired' }, { status: 410 });
        }

        // Token valid → return signatures
    } else {
        // Path 2: employee/admin session check (no consent token in query)
        const auth = await requireEmployeeOrAdmin();
        if (!auth.ok) return auth.response;
    }

    const { data, error } = await supabase
        .from('staff_signatures')
        .select('id, staff_name, role, signature_data')
        .eq('is_active', true)
        .order('staff_name');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}
