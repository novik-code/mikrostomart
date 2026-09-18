import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rateLimit';
import { czyWizytaOdwolana, czyWizytaPotwierdzonaGdziekolwiek } from '@/lib/blokadaPotwierdzonejWizyty';

export const dynamic = 'force-dynamic';

const NO_STORE: Record<string, string> = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
};

/** Osobny kubełek od potwierdzenia/odwołania: `checkRateLimit` ZAWSZE inkrementuje, więc wspólny
 *  kubełek `apptpublic:` zjadałby budżet potwierdzenia przy każdym otwarciu strony. */
const STAN_MAX = 60;
const STAN_OKNO_MS = 10 * 60_000;

/**
 * POST /api/appointments/state — stan wizyty po tokenie z linku SMS/push: WYŁĄCZNIE tak/nie.
 *
 * 🔑 Decyzja właściciela 18.09.2026: strona z linku i ekran pusha w apce mają przy ponownym wejściu
 * od razu pokazać „wizyta potwierdzona — nie można odwołać”, zamiast przycisku „Odwołuję”, który
 * dopiero po kliknięciu kończy się odmową. Odpowiedź NIE niesie danych osobowych ani danych wizyty
 * (ekran pusha w apce świadomie nie pobiera szczegółów wizyty po samym tokenie).
 * 🪤 POST, nie GET: token nie ląduje w logach brzegowych jako część adresu.
 * Nieznany token → 404 (tak jak confirm/cancel; token ma 96 bitów, wyrocznia nic nie daje).
 */
export async function POST(req: NextRequest) {
    let token: unknown;
    try {
        ({ token } = await req.json());
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: NO_STORE });
    }
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(token)) {
        return NextResponse.json({ error: 'Missing token' }, { status: 400, headers: NO_STORE });
    }

    const { allowed } = await checkRateLimit(`apptstate:${token}`, STAN_MAX, STAN_OKNO_MS);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Zbyt wiele żądań dla tego linku. Spróbuj ponownie za kilka minut.' },
            { status: 429, headers: { ...NO_STORE, 'Retry-After': String(STAN_OKNO_MS / 1000) } },
        );
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data, error } = await supabase
        .from('appointment_actions')
        .select('attendance_confirmed, status, cancellation_requested, prodentis_id')
        .eq('confirmation_token', token)
        .maybeSingle();

    if (error) {
        console.error('[APPT-STATE] Błąd odczytu:', error.message);
        return NextResponse.json({ error: 'Nie udało się sprawdzić stanu wizyty.' }, { status: 503, headers: NO_STORE });
    }
    if (!data) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404, headers: NO_STORE });
    }

    // 🔑 `confirmed` per WIZYTA (jak bramka odwołania), `cancelled` per wiersz. Oba naraz zdarzają
    // się tylko w wierszach sprzed 18.09 — klienci sprawdzają wtedy NAJPIERW `cancelled`
    // (późniejsze zgłoszenie odwołania wygrywa). `prodentis_id` nie wychodzi w odpowiedzi.
    return NextResponse.json(
        {
            confirmed: await czyWizytaPotwierdzonaGdziekolwiek(supabase, data),
            cancelled: czyWizytaOdwolana(data),
        },
        { headers: NO_STORE },
    );
}
