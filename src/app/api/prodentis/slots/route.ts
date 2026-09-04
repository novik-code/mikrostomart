import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { isDemoMode } from '@/lib/demoMode';
import { zbudujZapytanieSlotow } from '@/lib/slotsQuery';
import { prodentisFetch, pmsError } from '@/lib/prodentisFetch';

export const dynamic = 'force-dynamic'; // Always fetch fresh data

export async function GET(request: Request) {
    // Rate limit: 30 requests per minute per IP.
    // The form fetches 5 days in parallel per week navigation, so 30 = ~6 week clicks/min.
    const ip = getClientIP(request);
    const rl = await checkRateLimit(`slots:${ip}`, 30, 60_000);
    if (!rl.allowed) {
        return NextResponse.json(
            { error: 'Too many slot requests. Please slow down.' },
            { status: 429, headers: { 'Retry-After': '60' } }
        );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const duration = searchParams.get('duration');

    // 🔑 2026-09-04 (PMS v11.0): przepuszczamy też `meta`, `days`, `doctor`, `policy`.
    // Walidacja stoi TUTAJ, na naszym brzegu, bo PMS na śmieciowy parametr odpowiada PUSTĄ
    // TABLICĄ, a nie błędem — a pusta tablica jest u nas nieodróżnialna od „brak terminów".
    // 🔴 Gdy nie podano żadnego z nowych parametrów, adres jest DOKŁADNIE taki jak dotąd:
    // od tego zależy aplikacja mobilna zamrożona w sklepach.
    const zapytanie = zbudujZapytanieSlotow(searchParams);
    if (!zapytanie.ok) {
        return NextResponse.json({ error: zapytanie.blad, code: zapytanie.kod }, { status: 400 });
    }

    // Demo mode: return synthetic slots so the demo flow works without hitting prod Prodentis.
    // Generates 10:00, 10:30, 11:00, 11:30, 12:00 for Marcin on the requested date.
    if (isDemoMode) {
        const times = ['10:00', '10:30', '11:00', '11:30', '12:00'];
        const slots = times.map(t => {
            const [h, m] = t.split(':');
            return {
                doctor: '0100000001',
                doctorName: 'Marcin Nowosielski',
                start: `${date}T${h}:${m}:00+01:00`,
                end: `${date}T${h}:${(parseInt(m) + parseInt(duration || '30')).toString().padStart(2, '0')}:00+01:00`,
            };
        });
        return NextResponse.json(slots);
    }

    const sciezka = `/api/slots/free?${zapytanie.query}`;

    try {
        console.log(`Fetching Prodentis slots from: ${sciezka}`);

        const response = await prodentisFetch(sciezka, {
            // 🪤 `days=14` to w jednym żądaniu praca za czternaście — zmierzone u dostawcy:
            // osiem żądań `meta=1` w 1,2 s, ale margines zostawiamy większy niż dla jednego dnia.
            timeoutMs: searchParams.get('days') ? 12000 : 5000,
        });

        if (!response.ok) {
            // 🔑 Kod błędu z PMS przepuszczamy W NIEZMIENIONEJ POSTACI. Dostawca uzgodnił z nami
            // taksonomię (`DATE_OUT_OF_RANGE`, `DOCTOR_NOT_FOUND`, `MISSING_DURATION`,
            // `DAYS_OUT_OF_RANGE`…) i prosił, żebyśmy rozpoznawali po polu `error`, nie po treści.
            // Do 2026-09-04 kasowaliśmy tu ciało odpowiedzi i podmienialiśmy je na własny napis —
            // przez co ta taksonomia NIE MIAŁA JAK do nas dojechać, choć obie strony ją uzgodniły.
            const zPms = await pmsError(response);
            console.error(`Prodentis API Error: ${response.status} ${response.statusText} (${zPms.error ?? 'bez kodu'})`);
            return NextResponse.json(
                { error: zPms.error ?? `Prodentis API Error: ${response.status}`, message: zPms.message ?? undefined },
                { status: response.status },
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Prodentis Connection Failed:', error);

        // Return a structured error so the frontend knows to fallback or show a message
        return NextResponse.json(
            { error: 'Connection to Prodentis server failed', details: error.message },
            { status: 502 } // Bad Gateway
        );
    }
}
