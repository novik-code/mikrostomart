import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { KLUCZ_PUDEL_SKROTU, MAX_PUDEL, OKNO_PUDEL_MS } from '@/lib/shortLinkCodes';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /s/[code]
 *
 * Server-side resolver for SMS short links: looks up the row in `short_links`,
 * checks expiration, and returns a 302 to the destination URL.
 *
 * Previously this was `s/[code]/page.tsx` — a client component that fetched
 * the destination from `/api/short-links/[code]` via JS and used
 * `window.location.href = ...`. Two issues with that approach:
 *   1. Hidden flicker — the page loads, React hydrates, then redirects. A
 *      patient on a slow connection sees a "Przekierowywanie..." screen for
 *      300-700ms before navigating.
 *   2. Search engines see an empty page, not the destination — SMS links
 *      sometimes leak to Google indexing via screenshots or shared messages,
 *      and an empty 200 page doesn't pass authority forward.
 *
 * Now it's a Next route handler returning HTTP 302 directly. Zero JS, zero
 * flicker, proper search engine semantics. Click count update remains
 * fire-and-forget.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const fallbackUrl = new URL('/', req.url).toString();

    /**
     * 🔒 DŁAWIK ZGADYWANIA (07.09) — liczy WYŁĄCZNIE PUDŁA.
     *
     * Kod skracający miał 6 znaków (~36 bitów), a przekierowanie oddaje w nagłówku
     * `Location` token potwierdzenia wizyty, którego P-088 broni jako 96-bitowego.
     * Bez limitu efektywna obrona wynosiła 36 bitów.
     *
     * 🔑 Uczciwy człowiek klika link, który ISTNIEJE — jego żądanie nie zużywa budżetu
     * ani razu. Zgadujący generuje same pudła i wyczerpuje go po kilkunastu próbach.
     * Dlatego próg może być niski bez ryzyka, że uciszy pacjenta.
     *
     * 🔑 ODPOWIEDŹ SIĘ NIE ZMIENIA: zawsze 302 na stronę główną. Osobny kod (429, 404)
     * zamieniłby dławik w wyrocznię „ten kod istnieje, tylko cię zdławiliśmy".
     */
    const adres = getClientIP(req) || 'nieznany';
    const zapiszPudlo = async () => {
        const { allowed } = await checkRateLimit(KLUCZ_PUDEL_SKROTU(adres), MAX_PUDEL, OKNO_PUDEL_MS);
        return allowed;
    };

    try {
        const { code } = await params;
        if (!code) return NextResponse.redirect(fallbackUrl, { status: 302 });

        const { data: link, error } = await supabase
            .from('short_links')
            .select('id, destination_url, expires_at, click_count')
            .eq('short_code', code)
            .single();

        if (error || !link) {
            console.warn('[SHORT-LINK] Not found:', code);
            if (!(await zapiszPudlo())) console.warn('[SHORT-LINK] Budżet zgadywania wyczerpany dla adresu');
            return NextResponse.redirect(fallbackUrl, { status: 302 });
        }

        if (link.expires_at && new Date(link.expires_at) < new Date()) {
            console.warn('[SHORT-LINK] Expired:', code);
            await zapiszPudlo();
            return NextResponse.redirect(fallbackUrl, { status: 302 });
        }

        /**
         * 🪤 TRAFIENIA CELOWO NIE SPRAWDZAMY WOBEC BUDŻETU. Kusiło, żeby odciąć też
         * zgadującego, który akurat trafi — ale `checkRateLimit` w tym repo ZAWSZE
         * inkrementuje (atomowe RPC), więc każde takie sprawdzenie zużywałoby budżet
         * uczciwemu pacjentowi i psuło całą zaletę liczenia samych pudeł.
         *
         * Rachunek i tak wychodzi: 15 pudeł na 10 minut to ~90 prób na godzinę, a kod
         * ma ~60 bitów. Ryzyko trafienia w ciągu jednego okna jest o rzędy wielkości
         * mniejsze niż ryzyko, że uciszymy człowieka z linkiem z SMS-a.
         */
        // Fire-and-forget click tracking — don't block the redirect on this.
        supabase
            .from('short_links')
            .update({
                click_count: (link.click_count || 0) + 1,
                last_clicked_at: new Date().toISOString(),
            })
            .eq('id', link.id)
            .then(({ error: trackErr }) => {
                if (trackErr) console.error('[SHORT-LINK] Click track failed:', trackErr);
            });

        // Resolve destination — if it's a relative path, make it absolute
        // against the current request origin so 302 Location is well-formed.
        const destination = link.destination_url.startsWith('/')
            ? new URL(link.destination_url, req.url).toString()
            : link.destination_url;

        return NextResponse.redirect(destination, { status: 302 });
    } catch (e) {
        console.error('[SHORT-LINK] Resolver error:', e);
        return NextResponse.redirect(fallbackUrl, { status: 302 });
    }
}
