/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST są z natury dynamiczne. Zawężenie do typów SDK wywala
 * kompilację na `TS2589`. Konwencja repo: jawne wyłączenie z powodem.
 */
/**
 * STRAŻNIK ZGADYWANIA SKRÓCONYCH LINKÓW (znalezione 06.09 przy P-088, poza planem).
 *
 * 🔴 CO BYŁO ZEPSUTE. `GET /s/[code]` nie miało ŻADNEGO limitu, a kod skracający to
 * `nanoid(6)` — około 36 bitów. Tymczasem `confirmation_token`, którego P-088 broni
 * dławikiem, ma `nanoid(16)`, czyli 96 bitów. Przekierowanie oddaje ten token w nagłówku
 * `Location`, więc efektywna obrona potwierdzenia i odwołania wizyty wynosiła 36 bitów,
 * nie 96: P-088 zamknęło drzwi, obok których stało tańsze wejście.
 *
 * 🔑 DŁAWIK LICZY WYŁĄCZNIE PUDŁA. Uczciwy człowiek klika link, który istnieje — jego
 * żądanie nie zużywa budżetu w ogóle. Zgadujący generuje same pudła i wyczerpuje go
 * po kilkunastu próbach. Dzięki temu próg może być NISKI bez ryzyka, że uciszy pacjenta,
 * i nie trzeba tu ważyć podrabialności `x-forwarded-for` tak jak w P-088 — pudło jest
 * zdarzeniem rzadkim niezależnie od tego, kto je zgłasza.
 *
 * 🔑 ODPOWIEDŹ NA PUDŁO SIĘ NIE ZMIENIA: 302 na stronę główną, tak jak dotąd. Kod błędu
 * nie ma prawa stać się wyrocznią „ten kod istnieje, tylko cię zdławiliśmy".
 *
 * DOWÓD, ŻE GRYZIE (cofka): usuń wywołanie dławika → pada pierwszy test.
 *
 * Uruchomienie: `npx vitest run shortLinkGuessing`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const KOD_ZYWY = 'abc123xyz0';
const CEL = 'https://www.mikrostomart.pl/wizyta/konsultacja?token=abcdef0123456789';

let wolaniaLimitera: string[] = [];
let limitPrzepuszcza = true;

vi.mock('@/lib/rateLimit', () => ({
    checkRateLimit: async (klucz: string) => {
        wolaniaLimitera.push(klucz);
        return { allowed: limitPrzepuszcza, remaining: 0 };
    },
    getClientIP: () => '1.2.3.4',
}));

function zapytanie(): any {
    const q: any = {};
    let szukanyKod: string | null = null;
    for (const m of ['select', 'order', 'limit']) q[m] = () => q;
    q.eq = (k: string, v: string) => { if (k === 'short_code') szukanyKod = v; return q; };
    q.single = async () =>
        szukanyKod === KOD_ZYWY
            ? { data: { id: 'link-1', destination_url: CEL, expires_at: '2099-01-01T00:00:00Z', click_count: 3 }, error: null }
            : { data: null, error: { message: 'no rows' } };
    q.update = () => ({ eq: () => ({ then: (r: any) => Promise.resolve({ error: null }).then(r) }) });
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => zapytanie() }) }));

const req = () => new NextRequest('https://www.mikrostomart.pl/s/x');
const par = (code: string) => ({ params: Promise.resolve({ code }) });

beforeEach(() => {
    vi.clearAllMocks();
    wolaniaLimitera = [];
    limitPrzepuszcza = true;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('/s/[code] · zgadywanie kodów jest dławione', () => {
    it('🔴 SEDNO: pudło zużywa budżet zgadywania', async () => {
        const { GET } = await import('@/app/s/[code]/route');
        const res = await GET(req(), par('nieistniejacy'));

        // Odpowiedź BEZ ZMIAN — 302 na stronę główną, żeby nie powstała wyrocznia.
        expect(res.status).toBe(302);
        expect(wolaniaLimitera).toHaveLength(1);
        expect(wolaniaLimitera[0]).toMatch(/pudl|miss/i);
    });

    it('🔑 TRAFIENIE nie zużywa budżetu — uczciwy klik jest za darmo', async () => {
        const { GET } = await import('@/app/s/[code]/route');
        const res = await GET(req(), par(KOD_ZYWY));

        expect(res.status).toBe(302);
        expect(res.headers.get('location')).toBe(CEL);
        expect(wolaniaLimitera).toHaveLength(0);
    });

    it('🔴 po wyczerpaniu budżetu pudło dalej wygląda tak samo — 302, bez wyroczni', async () => {
        limitPrzepuszcza = false;
        const { GET } = await import('@/app/s/[code]/route');
        const res = await GET(req(), par('kolejne-pudlo'));

        expect(res.status).toBe(302);
        // Nie 429 i nie 404: odpowiedź nie może zdradzać, czy kod istnieje.
        expect(res.headers.get('location')).toContain('mikrostomart.pl/');
        expect(res.headers.get('location')).not.toContain('token=');
    });

    /**
     * 🪤 CELOWO NIE MA TU ASERCJI „trafienie przy wyczerpanym budżecie jest odcięte".
     * Napisałem ją najpierw i musiałem wycofać: `checkRateLimit` w tym repo ZAWSZE
     * inkrementuje (atomowe RPC `increment_rate_limit`), więc sprawdzenie budżetu przy
     * trafieniu zużywałoby go uczciwemu pacjentowi — czyli niszczyło jedyną zaletę
     * liczenia samych pudeł. Rachunek broni się bez tego: 15 pudeł / 10 min to ~90 prób
     * na godzinę wobec ~60 bitów kodu.
     */
});

describe('/s/[code] · nowe kody są dłuższe niż 36 bitów', () => {
    it('🔴 oba miejsca generujące kod używają wspólnej, dłuższej stałej', async () => {
        const { readFileSync } = await import('node:fs');
        for (const plik of [
            'src/app/api/short-links/route.ts',
            'src/app/api/cron/appointment-reminders/route.ts',
        ]) {
            const zrodlo = readFileSync(plik, 'utf8');
            // Kontrola pozytywna: plik NAPRAWDĘ generuje kod skracający.
            expect(zrodlo, plik).toContain('short_code');
            expect(zrodlo, plik).not.toMatch(/nanoid\(6\)/);
            expect(zrodlo, plik).toContain('DLUGOSC_KODU_SKROTU');
        }
    });
});
