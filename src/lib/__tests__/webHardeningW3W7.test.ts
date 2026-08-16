import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

import { przytnijDaneKupujacego, MAX_DLUGOSC, MAX_POZYCJI_KOSZYKA } from '@/lib/cartCustomer';

/**
 * Strażnik pozycji W3–W7 (plan 1.3.0 bezpieczeństwo).
 *
 * Podział jest świadomy i wynika z drogo kupionej lekcji „strażnik ma WYKONYWAĆ,
 * nie grepować": ZACHOWANIE (filtr danych kupującego) testujemy wykonaniem, a samo
 * OKABLOWANIE (czy trasa w ogóle woła limiter) asercją „znalazłem N miejsc" —
 * bo tego drugiego nie da się wykonać bez postawienia całego Next-a.
 */

const root = join(__dirname, '..', '..', '..');
const czytaj = (p: string) => readFileSync(join(root, p), 'utf8');

describe('W7 — filtr danych kupującego (wykonanie)', () => {
    it('przepuszcza wyłącznie pola z listy', () => {
        const out = przytnijDaneKupujacego({
            name: 'Jan Kowalski',
            email: 'jan@example.com',
            city: 'Opole',
            // — poniżej rzeczy, których checkout nigdy nie wysyła —
            isAdmin: true,
            notatka: 'x'.repeat(5000),
            __proto__: { zly: 1 },
            zagniezdzone: { a: 1 },
        });
        expect(out).toEqual({ name: 'Jan Kowalski', email: 'jan@example.com', city: 'Opole' });
    });

    it('przycina zbyt długie wartości zamiast je odrzucać', () => {
        const out = przytnijDaneKupujacego({ name: 'A'.repeat(1000) });
        expect(out?.name).toHaveLength(MAX_DLUGOSC.name);
    });

    it('nie przepuszcza wartości, które nie są tekstem', () => {
        const out = przytnijDaneKupujacego({ name: { toString: () => 'x' }, phone: 12345, city: null });
        expect(out).toBeUndefined();
    });

    it('puste i białe znaki nie tworzą pola', () => {
        expect(przytnijDaneKupujacego({ name: '   ', city: '' })).toBeUndefined();
    });

    it('odrzuca wejście, które nie jest obiektem', () => {
        expect(przytnijDaneKupujacego(undefined)).toBeUndefined();
        expect(przytnijDaneKupujacego('kowalski')).toBeUndefined();
        expect(przytnijDaneKupujacego(['a'])).toBeUndefined();
    });

    it('koszyk ma górną granicę liczby pozycji', () => {
        expect(MAX_POZYCJI_KOSZYKA).toBeGreaterThan(0);
        expect(MAX_POZYCJI_KOSZYKA).toBeLessThanOrEqual(100);
    });
});

describe('W6/W7 — okablowanie limitów na trasach publicznych', () => {
    const publiczne = [
        'src/app/api/games/score/route.ts',
        'src/app/api/games/leaderboard/route.ts',
        'src/app/api/cart/calculate-total/route.ts',
    ];

    it('każda publiczna trasa pisząca/czytająca woła checkRateLimit', () => {
        const bez = publiczne.filter((p) => !czytaj(p).includes('checkRateLimit('));
        expect(bez).toEqual([]);
    });

    it('trasy ZAPISUJĄCE są fail-closed (licznik w pamięci lambdy niczego nie ogranicza)', () => {
        for (const p of ['src/app/api/games/score/route.ts', 'src/app/api/cart/calculate-total/route.ts']) {
            expect(czytaj(p)).toContain('failClosed: true');
        }
    });

    it('trasa koszyka przepuszcza dane kupującego przez filtr, a nie surowe ciało', () => {
        const src = czytaj('src/app/api/cart/calculate-total/route.ts');
        expect(src).toContain('przytnijDaneKupujacego(body.customerDetails)');
        // Kontrola negatywna: surowe pole NIE MOŻE trafiać wprost do zamówienia.
        expect(src).not.toContain('customerDetails: body.customerDetails');
    });
});

describe('W5 — idempotencja czatu pacjenta (okablowanie)', () => {
    const trasy = ['src/app/api/patients/chat/route.ts', 'src/app/api/chat/guest/route.ts'];

    it('obie trasy przyjmują klucz klienta i obsługują kolizję unikalności', () => {
        for (const p of trasy) {
            const src = czytaj(p);
            expect(src).toContain('client_msg_id');
            expect(src, `${p}: brak gałęzi 23505`).toContain('23505');
        }
    });

    it('migracja 198 zakłada indeks CZĘŚCIOWY (binarki bez klucza muszą działać)', () => {
        const sql = czytaj('supabase_migrations/198_idempotencja_czatu_pacjenta.sql');
        expect(sql).toContain('CREATE UNIQUE INDEX');
        expect(sql).toContain('WHERE client_msg_id IS NOT NULL');
    });
});

describe('W3 — sprzątanie porzuconych tokenów personelu', () => {
    const src = czytaj('src/app/api/cron/push-receipts/route.ts');

    it('cron kasuje tokeny personelu bez odświeżenia', () => {
        expect(src).toContain('staff_push_tokens');
        expect(src).toMatch(/\.lt\('updated_at'/);
    });

    it('NIE rusza tokenów pacjentów (pacjent otwiera apkę raz na kilka tygodni)', () => {
        const poProgu = src.slice(src.indexOf('progStaff'));
        expect(poProgu).not.toContain('patient_push_tokens');
    });
});

describe('W4 — warianty POST zamiast fraz w adresie', () => {
    it('wyszukiwarka pacjentów ma POST i ZACHOWUJE GET (binarki 1.1/1.2)', () => {
        const src = czytaj('src/app/api/employee/patient-search/route.ts');
        expect(src).toContain('export async function POST');
        expect(src).toContain('export async function GET');
    });

    it('lista poczty obsługuje action=list w ciele POST', () => {
        const src = czytaj('src/app/api/employee/email/route.ts');
        expect(src).toContain("body?.action === 'list'");
        // Gałąź MUSI stać przed odczytem pól wysyłki, inaczej listowanie poleci jako mail.
        expect(src.indexOf("body?.action === 'list'")).toBeLessThan(src.indexOf('const { to, cc, subject'));
    });
});
