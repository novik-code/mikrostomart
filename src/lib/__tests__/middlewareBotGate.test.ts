/**
 * WYKONUJE `middleware()` — pierwszy taki test w tym repo.
 *
 * ══ PO CO ═══════════════════════════════════════════════════════════════════
 * `botBypassStrefaPacjenta.test.ts` sprawdza CZYSTY predykat i to dobrze, ale
 * sam predykat może być bez zarzutu, a `middleware.ts` może go nie wołać —
 * i wtedy mamy zielonego strażnika przy zdjętej ochronie. Ta lekcja jest
 * w tym projekcie kupiona: „strażnik BEZ kroku w CI to ozdoba", a wcześniej
 * 706 asercji stało poza bramką.
 *
 * Ten test przepuszcza prawdziwe żądanie przez prawdziwe `middleware()`
 * i patrzy na KOD ODPOWIEDZI. Zamockowane są wyłącznie rzeczy zewnętrzne:
 * warstwa i18n i klienci Supabase.
 *
 * ⚠️ Zakres: sprawdzamy WYŁĄCZNIE bramkę pacjenta na szybkiej ścieżce botów.
 * Bramka 2FA personelu ma własną powierzchnię i własne pozycje planu.
 */
import { describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// i18n: przepuszczamy dalej, bez tłumaczeń — nie o nie tu chodzi.
vi.mock('next-intl/middleware', () => ({
    default: () => () => NextResponse.next(),
}));
vi.mock('@/i18n/routing', () => ({ routing: { locales: ['pl', 'en', 'de', 'ua'], defaultLocale: 'pl' } }));

// Żadna ścieżka w tym teście nie powinna dotknąć Supabase. Gdyby dotknęła,
// atrapa odda „brak użytkownika", czyli wariant BEZPIECZNY — test nie może
// przejść dzięki temu, że coś przypadkiem uwierzytelniło.
vi.mock('@supabase/ssr', () => ({
    createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));

const BOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const CZLOWIEK = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

async function zadanie(sciezka: string, ua: string) {
    const { middleware } = await import('@/middleware');
    const req = new NextRequest(new URL(`https://www.mikrostomart.pl${sciezka}`), {
        headers: { 'user-agent': ua },
    });
    return middleware(req);
}

describe('middleware: nagłówek bota NIE otwiera strefy pacjenta', () => {
    it('bot na /strefa-pacjenta/dashboard dostaje przekierowanie, nie 200', async () => {
        // PRZED naprawą ta ścieżka kończyła się `NextResponse.next()` ze szybkiej
        // ścieżki botów. Zmierzone wtedy na produkcji: HTTP 200.
        const res = await zadanie('/strefa-pacjenta/dashboard', BOT);
        expect(res.status, 'bot musi zostać odbity na login').toBe(307);
        expect(res.headers.get('location')).toContain('/strefa-pacjenta/login');
    });

    it('bot pod prefiksem języka też jest odbijany', async () => {
        const res = await zadanie('/en/strefa-pacjenta/dashboard', BOT);
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain('/en/strefa-pacjenta/login');
    });

    it('KONTROLA POZYTYWNA: człowiek bez ciasteczka jest odbijany tak samo', async () => {
        // Gdyby ten przypadek padł, mierzylibyśmy coś innego niż bramkę.
        const res = await zadanie('/strefa-pacjenta/dashboard', CZLOWIEK);
        expect(res.status).toBe(307);
    });

    it('KONTROLA NEGATYWNA: bot na stronie publicznej NIE jest odbijany', async () => {
        // Szybka ścieżka botów istnieje dla wydajności indeksowania i ma działać.
        const res = await zadanie('/o-nas', BOT);
        expect(res.status).toBe(200);
    });

    it('KONTROLA NEGATYWNA: publiczny landing logowania pacjenta zostaje otwarty', async () => {
        const res = await zadanie('/strefa-pacjenta/login', BOT);
        expect(res.status).toBe(200);
    });
});
