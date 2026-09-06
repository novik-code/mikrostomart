/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST są z natury dynamiczne. Zawężenie do typów SDK wywala
 * kompilację na `TS2589`. Konwencja repo: jawne wyłączenie z powodem.
 */
/**
 * STRAŻNIK ZASIĘGU PODPISÓW PERSONELU (znalezione 06.09 przy P-071, poza planem).
 *
 * 🔴 CO BYŁO ZEPSUTE. `GET /api/staff-signatures?consentToken=…` oddawało `signature_data`
 * — obraz podpisu w base64 — WSZYSTKICH aktywnych pracowników każdemu, kto ma ważny token
 * zgody. Czyli pacjentowi na tablecie w rejestracji. Do wypalenia PDF-u potrzebny jest
 * podpis JEDNEGO wybranego lekarza; wysyłany był cały zespół.
 *
 * 🪤 To NIE jest ta sama luka, którą zamknęło S10-3. Tamto zamknęło dostęp ANONIMOWY.
 * Nadmiarowość wobec posiadacza tokenu została — a własny komentarz trasy nazywa ryzyko
 * wprost: „atakujący mógł sobie pobrać podpisy lekarzy i użyć ich do podrobienia dokumentów".
 *
 * 🔑 POMIAR PRODUKCYJNY (06.09): 6 aktywnych podpisów, KAŻDY z obrazem, łącznie 172 KB;
 * role „lekarz" i „higienistka" — czyli wzory podpisów całego zespołu klinicznego
 * lądowały w przeglądarce pacjenta przy każdym otwarciu formularza zgody.
 *
 * 🔑 KTO TEGO UŻYWA (zmierzone w kodzie): landing `/zgody/[token]` czyta `signature_data`
 * w DOKŁADNIE JEDNYM miejscu — przy wypalaniu PDF-u, dla lekarza wybranego z listy.
 * Dropdown i etykiety biorą wyłącznie `staff_name` i `role`.
 *
 * DOWÓD, ŻE GRYZIE (cofka): przywróć `signature_data` w select liście → pada pierwszy test.
 *
 * Uruchomienie: `npx vitest run staffSignaturesScope`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const TOKEN = 'wazny-token-zgody-123';
const PODPIS_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const PODPIS_B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

const PODPISY = [
    { id: PODPIS_A, staff_name: 'Lekarz Pierwszy', role: 'lekarz', is_active: true, signature_data: 'data:image/png;base64,PODPIS-LEKARZA-A' },
    { id: PODPIS_B, staff_name: 'Higienistka Druga', role: 'higienistka', is_active: true, signature_data: 'data:image/png;base64,PODPIS-HIGIENISTKI-B' },
];

let limitPrzepuszcza = true;
let tokenWazny = true;

vi.mock('@/lib/rateLimit', () => ({
    checkRateLimit: async () => ({ allowed: limitPrzepuszcza, remaining: 0 }),
    getClientIP: () => '1.2.3.4',
}));
vi.mock('@/lib/authGuards', () => ({
    requireEmployeeOrAdmin: async () => ({
        ok: false,
        response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    }),
}));

function zapytanie(tabela: string): any {
    const q: any = {};
    const filtry: [string, unknown][] = [];
    for (const m of ['order', 'limit', 'in', 'is', 'neq']) q[m] = () => q;
    /**
     * 🪤 ATRAPA MUSI RESPEKTOWAĆ `select`. Pierwsza wersja zwracała pełne wiersze
     * niezależnie od listy kolumn — więc asercja „lista nie niesie obrazów" padała
     * nawet po poprawnej naprawie, a gdyby przechodziła, robiłaby to z niewłaściwego
     * powodu. Prawdziwy PostgREST oddaje wyłącznie wybrane kolumny.
     */
    let kolumny: string[] | null = null;
    q.select = (lista?: string) => {
        kolumny = lista ? lista.split(',').map(k => k.trim()) : null;
        return q;
    };
    const przytnij = (w: Record<string, unknown>) => {
        if (!kolumny) return { ...w };
        const wynik: Record<string, unknown> = {};
        for (const k of kolumny) if (k in w) wynik[k] = w[k];
        return wynik;
    };
    q.eq = (k: string, v: unknown) => { filtry.push([k, v]); return q; };
    q.maybeSingle = async () => {
        if (tabela === 'consent_tokens') {
            return tokenWazny
                ? { data: { token: TOKEN, expires_at: '2099-01-01T00:00:00Z' }, error: null }
                : { data: null, error: null };
        }
        const id = filtry.find(([k]) => k === 'id')?.[1];
        const w = PODPISY.find(p => p.id === id);
        return { data: w ? przytnij(w) : null, error: null };
    };
    q.single = async () => q.maybeSingle();
    q.then = (res: (v: unknown) => unknown) =>
        Promise.resolve({ data: tabela === 'staff_signatures' ? PODPISY.map(przytnij) : [], error: null }).then(res);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (t: string) => zapytanie(t) }) }));

const req = (qs: string) =>
    new NextRequest(`https://example.test/api/staff-signatures${qs}`);

beforeEach(() => {
    vi.clearAllMocks();
    limitPrzepuszcza = true;
    tokenWazny = true;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('staff-signatures · lista nie niesie wzorów podpisów', () => {
    it('🔴 SEDNO: lista po tokenie zgody NIE zawiera ani jednego obrazu podpisu', async () => {
        const { GET } = await import('@/app/api/staff-signatures/route');
        const res = await GET(req(`?consentToken=${TOKEN}`));
        const body = await res.json();

        expect(res.status).toBe(200);
        // Kontrola pozytywna miernika: źródło NAPRAWDĘ ma obrazy.
        expect(PODPISY.every(p => p.signature_data)).toBe(true);

        expect(Array.isArray(body) ? body : body.signatures).toHaveLength(2);
        expect(JSON.stringify(body)).not.toContain('PODPIS-LEKARZA-A');
        expect(JSON.stringify(body)).not.toContain('PODPIS-HIGIENISTKI-B');
    });

    it('lista zachowuje to, z czego żyje formularz: nazwisko i rola', async () => {
        const { GET } = await import('@/app/api/staff-signatures/route');
        const lista = await (await GET(req(`?consentToken=${TOKEN}`))).json();
        const wiersze = Array.isArray(lista) ? lista : lista.signatures;

        expect(wiersze[0].id).toBe(PODPIS_A);
        expect(wiersze[0].staff_name).toBe('Lekarz Pierwszy');
        expect(wiersze[0].role).toBe('lekarz');
        expect(wiersze[0]).not.toHaveProperty('signature_data');
    });

    it('obraz JEDNEGO wybranego podpisu — na żądanie po `signatureId`', async () => {
        const { GET } = await import('@/app/api/staff-signatures/route');
        const body = await (await GET(req(`?consentToken=${TOKEN}&signatureId=${PODPIS_B}`))).json();

        expect(body.signature_data).toContain('PODPIS-HIGIENISTKI-B');
        // 🔑 ...i tylko ten jeden — nie cała lista z obrazami.
        expect(JSON.stringify(body)).not.toContain('PODPIS-LEKARZA-A');
    });

    it('🪤 nieistniejący `signatureId` → 404, bez podpowiedzi o innych podpisach', async () => {
        const { GET } = await import('@/app/api/staff-signatures/route');
        const res = await GET(req(`?consentToken=${TOKEN}&signatureId=99999999-9999-4999-8999-999999999999`));
        expect(res.status).toBe(404);
        expect(JSON.stringify(await res.json())).not.toContain('PODPIS');
    });

    it('🔴 dławik: przekroczony limit → 429 i ZERO podpisów', async () => {
        limitPrzepuszcza = false;
        const { GET } = await import('@/app/api/staff-signatures/route');
        const res = await GET(req(`?consentToken=${TOKEN}&signatureId=${PODPIS_A}`));

        expect(res.status).toBe(429);
        expect(JSON.stringify(await res.json())).not.toContain('PODPIS');
    });

    it('kontrola: S10-3 nadal trzyma — bez tokenu i bez sesji 401', async () => {
        const { GET } = await import('@/app/api/staff-signatures/route');
        expect((await GET(req(''))).status).toBe(401);
    });

    it('kontrola: nieważny token zgody dalej odrzucany', async () => {
        tokenWazny = false;
        const { GET } = await import('@/app/api/staff-signatures/route');
        expect((await GET(req(`?consentToken=${TOKEN}`))).status).toBe(401);
    });
});

describe('staff-signatures · druga połowa kontraktu', () => {
    it('🔴 landing zgód dociąga obraz wybranego podpisu, zamiast brać go z listy', async () => {
        const { readFileSync } = await import('node:fs');
        const zrodlo = readFileSync('src/app/zgody/[token]/page.tsx', 'utf8');

        // Kontrola pozytywna: plik nadal wypala podpis lekarza do PDF-u.
        expect(zrodlo).toContain('embedPng');

        expect(zrodlo).toMatch(/signatureId=/);
    });
});
