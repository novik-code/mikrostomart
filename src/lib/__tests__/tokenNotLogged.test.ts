/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST są z natury dynamiczne. Zawężenie do typów SDK wywala
 * kompilację na `TS2589`. Konwencja repo: jawne wyłączenie z powodem.
 */
/**
 * STRAŻNIK: POŚWIADCZENIE NA OKAZICIELA NIE TRAFIA DO LOGÓW
 * (znalezione 06.09 przy P-088, poza planem audytu).
 *
 * 🔴 CO BYŁO ZEPSUTE. `POST /api/patients/verify-email` drukowało token WPROST:
 * `console.log('[Verify Email] Verifying token:', token)`. Ten token potwierdza adres
 * e-mail przy zakładaniu konta pacjenta, więc kto ma dostęp do logów Vercela — a ma go
 * każdy z uprawnieniami do projektu i każdy dren logów — mógł zweryfikować cudze konto.
 * Logi są poza `employee_audit_log`, poza retencją i poza eksportem RODO. Ta sama zasada
 * stoi już w `patients/verify`, gdzie numer telefonu jest maskowany do trzech cyfr.
 *
 * 🪤 CELOWO NIE DOKŁADAM TU DŁAWIKA. Token powstaje jako `crypto.randomUUID()`
 * (register/route.ts:146), czyli 122 bity — zgadywanie jest niewykonalne niezależnie
 * od limitu, a kod, który nie chroni przed niczym, trzeba potem utrzymywać. To inny
 * przypadek niż `/s/[code]`, gdzie kod miał 36 bitów i limit realnie zmieniał rachunek.
 *
 * DOWÓD, ŻE GRYZIE (cofka): przywróć `console.log('…', token)` → pada pierwszy test.
 *
 * Uruchomienie: `npx vitest run tokenNotLogged`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const TOKEN = 'ff11e2a0-9c3d-4b7e-8a1f-0d2c4e6a8b90';

let wypisane: string[] = [];
let oryginalneLog: typeof console.log;
let oryginalneError: typeof console.error;

function zapytanie(): any {
    const q: any = {};
    for (const m of ['select', 'eq', 'order', 'limit', 'update', 'insert']) q[m] = () => q;
    q.single = async () => ({ data: null, error: { message: 'no rows' } });
    q.maybeSingle = async () => q.single();
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => zapytanie() }) }));

beforeEach(() => {
    vi.clearAllMocks();
    wypisane = [];
    oryginalneLog = console.log;
    oryginalneError = console.error;
    console.log = (...a: unknown[]) => { wypisane.push(a.map(String).join(' ')); };
    console.error = (...a: unknown[]) => { wypisane.push(a.map(String).join(' ')); };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

afterEach(() => {
    console.log = oryginalneLog;
    console.error = oryginalneError;
});

const req = (body: unknown) =>
    new Request('https://example.test/api/patients/verify-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });

describe('verify-email · token nie pada w logach', () => {
    it('🔴 SEDNO: token NIE pojawia się w żadnym wypisie', async () => {
        const { POST } = await import('@/app/api/patients/verify-email/route');
        await POST(req({ token: TOKEN }) as any);

        // Kontrola pozytywna miernika: trasa w ogóle coś wypisała — inaczej asercja
        // „nie ma tokenu" przechodziłaby dlatego, że przechwytywanie nie działa.
        expect(wypisane.length).toBeGreaterThan(0);

        for (const linia of wypisane) {
            expect(linia, `token wyciekł do logu: ${linia}`).not.toContain(TOKEN);
        }
    });

    it('🪤 nie wycieka też fragment tokenu — maskowanie musi być skuteczne', async () => {
        const { POST } = await import('@/app/api/patients/verify-email/route');
        await POST(req({ token: TOKEN }) as any);

        const wszystko = wypisane.join('\n');
        // Pierwszy człon UUID-a wystarczy do zawężenia przestrzeni; nie ma prawa wyjść.
        expect(wszystko).not.toContain('ff11e2a0');
    });
});
