import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { getConsentTypesFromDB } from '@/lib/consentTypes';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODENTIS_API = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';

/** Klucz limitu z tokenu — sam token nie ląduje w `rate_limit_entries`. */
const rateKeyFor = (v: string) => crypto.createHash('sha256').update(v).digest('hex').slice(0, 32);

/** Nagłówki odpowiedzi z danymi pacjenta — nigdy do cache po drodze. */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Referrer-Policy': 'no-referrer' };

/**
 * POST /api/consents/verify
 * Verifies consent token and returns consent list + patient details from Prodentis.
 * Body: { token }
 *
 * 🔴 CO TA TRASA ODDAJE: po samym tokenie z paska adresu zwraca dane identyfikacyjne
 * pacjenta (w tym PESEL, datę urodzenia i adres) — bez sesji i, do 2026-08-06, bez
 * żadnego limitu zapytań. Token wędruje w URL-u na tablecie w rejestracji, więc zostaje
 * w historii przeglądarki, w logach proxy i w nagłówku `Referer`.
 *
 * 🪤 KOLEJNOŚĆ MA ZNACZENIE: najpierw szukamy tokenu, DOPIERO POTEM liczymy limit.
 * Odwrotnie (jak w `careflow/[token]`) zgadywane tokeny zakładałyby śmieciowe wiersze
 * w `rate_limit_entries`, żyjące 24 h.
 *
 * 🪤 WYGASŁY TOKEN TO TRAFIENIE, NIE NIETRAFIENIE: pacjent, który wrócił po dobie,
 * nie może zużywać budżetu nietrafień całego gabinetu dzielącego jedno IP.
 */
export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ error: 'Token required' }, { status: 400 });
        }

        const { data: tokenRow, error } = await supabase
            .from('consent_tokens')
            .select('*')
            .eq('token', token)
            .single();

        if (error || !tokenRow) {
            // Nietrafienie — jedyne miejsce karmiące licznik po adresie IP.
            const miss = await checkRateLimit(`cverify:miss:${getClientIP(req)}`, 20, 60 * 60_000);
            if (!miss.allowed) {
                return NextResponse.json(
                    { error: 'Zbyt wiele prób. Spróbuj ponownie później.' },
                    { status: 429, headers: { ...NO_STORE, 'Retry-After': '3600' } }
                );
            }
            return NextResponse.json({ error: 'Token nieważny' }, { status: 404, headers: NO_STORE });
        }

        // Token istnieje → budżet liczony PER TOKEN. 30 odczytów na dobę to gruby zapas
        // dla jednego pacjenta odświeżającego stronę na tablecie.
        const rl = await checkRateLimit(`cverify:${rateKeyFor(token)}`, 30, 24 * 60 * 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Zbyt wiele prób dla tego linku. Poproś o nowy w rejestracji.' },
                { status: 429, headers: { ...NO_STORE, 'Retry-After': '3600' } }
            );
        }

        if (new Date(tokenRow.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Token wygasł' }, { status: 410, headers: NO_STORE });
        }

        // Get already signed consents for this token
        const { data: signed } = await supabase
            .from('patient_consents')
            .select('consent_type')
            .eq('prodentis_patient_id', tokenRow.prodentis_patient_id || '')
            .eq('patient_name', tokenRow.patient_name);

        const signedTypes = new Set((signed || []).map((s: any) => s.consent_type));

        // Build consent list from DB
        const CONSENT_TYPES = await getConsentTypesFromDB();
        const consents = tokenRow.consent_types
            .filter((ct: string) => CONSENT_TYPES[ct])
            .map((ct: string) => ({
                type: ct,
                label: CONSENT_TYPES[ct].label,
                file: CONSENT_TYPES[ct].file.startsWith('http') ? CONSENT_TYPES[ct].file : `/zgody/${CONSENT_TYPES[ct].file}`,
                signed: signedTypes.has(ct),
            }));

        // Fetch patient details from Prodentis for PDF pre-fill
        let patientDetails: any = null;
        if (tokenRow.prodentis_patient_id) {
            try {
                const detailsRes = await fetch(
                    `${PRODENTIS_API}/api/patient/${tokenRow.prodentis_patient_id}/details`
                );
                if (detailsRes.ok) {
                    const details = await detailsRes.json();
                    patientDetails = {
                        firstName: details.firstName || '',
                        lastName: details.lastName || '',
                        pesel: details.pesel || '',
                        birthDate: details.birthDate || '',
                        phone: details.phone || '',
                        address: details.address || null,
                    };
                }
            } catch (e) {
                console.error('[ConsentVerify] Prodentis details fetch error:', e);
            }
        }

        // Odpowiedź niesie PESEL, datę urodzenia i adres — nigdy do cache po drodze.
        return NextResponse.json({
            patientName: tokenRow.patient_name,
            prodentisPatientId: tokenRow.prodentis_patient_id,
            patientDetails,
            consents,
        }, { headers: NO_STORE });
    } catch (err: any) {
        // Bez `err.message` w treści — komunikat bazy potrafi ujawnić nazwy kolumn i zapytanie.
        console.error('[ConsentVerify] Error:', err);
        return NextResponse.json({ error: 'Błąd serwera' }, { status: 500, headers: NO_STORE });
    }
}
