import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { checkRateLimit } from '@/lib/rateLimit';

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
 *
 * 🔴 06.09: S10-3 zamknęło dostęp ANONIMOWY, ale NIE nadmiarowość wobec posiadacza
 * tokenu. Trasa dalej oddawała `signature_data` — wzór podpisu — WSZYSTKICH aktywnych
 * pracowników każdemu, kto ma ważny token zgody, czyli pacjentowi na tablecie.
 * Zmierzone: 6 aktywnych podpisów, każdy z obrazem, 172 KB; role „lekarz"
 * i „higienistka", więc szedł komplet wzorów zespołu klinicznego. Do wypalenia PDF-u
 * potrzebny jest podpis JEDNEGO wybranego lekarza — i tylko on wychodzi:
 *   · bez `signatureId` → lista `{id, staff_name, role}` do wyboru z listy;
 *   · z `signatureId`   → JEDEN wiersz, z obrazem.
 * Ryzyko nazywa własny komentarz tej trasy: podrobienie dokumentu podpisem lekarza.
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

    /**
     * 🔒 Dławik po TOKENIE zgody, nie po adresie: `getClientIP` czyta nagłówek podawany
     * przez klienta, więc limit po IP ograniczyłby wyłącznie uczciwych (lekcja z P-088).
     */
    const kluczLimitu = consentToken ? `staffsig:${consentToken}` : 'staffsig:personel';
    const { allowed } = await checkRateLimit(kluczLimitu, 30, 10 * 60_000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.' },
            { status: 429, headers: { 'Retry-After': '600', 'Cache-Control': 'no-store' } },
        );
    }

    const signatureId = request.nextUrl.searchParams.get('signatureId');

    // Obraz podpisu — WYŁĄCZNIE dla jednego, wskazanego wiersza.
    if (signatureId) {
        const { data: jeden, error: bladJednego } = await supabase
            .from('staff_signatures')
            .select('id, staff_name, role, signature_data')
            .eq('is_active', true)
            .eq('id', signatureId)
            .maybeSingle();

        if (bladJednego) return NextResponse.json({ error: bladJednego.message }, { status: 500 });
        // 404 bez żadnej podpowiedzi o pozostałych podpisach.
        if (!jeden) return NextResponse.json({ error: 'Signature not found' }, { status: 404 });
        return NextResponse.json(jeden, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Lista do wyboru — BEZ obrazów.
    const { data, error } = await supabase
        .from('staff_signatures')
        .select('id, staff_name, role')
        .eq('is_active', true)
        .order('staff_name');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
