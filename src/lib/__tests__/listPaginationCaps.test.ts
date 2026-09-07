/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST są z natury dynamiczne. Konwencja repo: jawne wyłączenie.
 */
/**
 * STRAŻNIK GÓRNYCH GRANIC LIST (P-114, P-113).
 *
 * 🔴 CO BYŁO ZEPSUTE. Dwie listy personelu zwracały KOMPLET wierszy bez limitu:
 *   · **P-114** `GET /api/employee/incidents` — `select('*')` bez limitu, a apka pobiera
 *     całość i filtruje po stronie klienta. Opisy sięgają 4000 znaków, więc ładunek
 *     rośnie z każdą rozwiązaną awarią, a po 1000 wierszy PostgREST utnie po cichu —
 *     przez sortowanie malejące akurat najstarsze, czyli archiwum.
 *   · **P-113** `GET /api/admin/chat/conversations` — bez limitu i bez sprawdzenia
 *     `status`; apka personelu odpytuje tę trasę co 5 s z listy i co 4 s z ekranu wątku.
 *
 * 🔑 UCZCIWIE O SKALI — pomiar produkcyjny 07.09: **1 awaria** i **6 rozmów**
 * (5 otwartych, 1 zamknięta). Obie zmiany są więc CZYSTO PREWENCYJNE: nic dziś nie
 * ucinają i niczego nie przyspieszają. Limit to jedna linia, która zamyka horyzont lat.
 *
 * 🪤 CZEGO TU CELOWO NIE MA: przebudowy N+1 w rozmowach na jedno zapytanie zbiorcze.
 * Przy sześciu wątkach to 13 zapytań na tik — problem, którego nie ma. Optymalizacja
 * bez problemu do rozwiązania to kod, który trzeba potem utrzymywać; wraca do kolejki
 * z progiem („gdy rozmów przekroczy setkę"), nie do tego commitu.
 *
 * DOWÓD, ŻE GRYZIE (cofka): usuń `.limit(` z dowolnej trasy → pada jej test.
 *
 * Uruchomienie: `npx vitest run listPaginationCaps`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

let limity: number[] = [];
let filtry: [string, unknown][] = [];

vi.mock('@/lib/authGuards', () => ({
    requireEmployeeOrAdmin: async () => ({ ok: true, user: { id: 'u1', email: 'p@example.test' } }),
    requireAdmin: async () => ({ ok: true, user: { id: 'u1', email: 'p@example.test' } }),
}));
vi.mock('@/lib/auth', () => ({ verifyAdmin: async () => ({ id: 'u1', email: 'p@example.test' }) }));
vi.mock('@/lib/roles', () => ({ hasRole: async () => true }));
vi.mock('@/lib/auditLog', () => ({ logAudit: async () => {} }));

function zapytanie(): any {
    const q: any = {};
    for (const m of ['select', 'order', 'in', 'is', 'neq', 'contains', 'gte', 'lte']) q[m] = () => q;
    q.eq = (k: string, v: unknown) => { filtry.push([k, v]); return q; };
    q.limit = (n: number) => { limity.push(n); return q; };
    q.single = async () => ({ data: null, error: null });
    q.maybeSingle = async () => ({ data: null, error: null });
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(res);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => zapytanie() }) }));

const get = (adres: string) => new NextRequest(adres);

beforeEach(() => {
    vi.clearAllMocks();
    limity = [];
    filtry = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('P-114 · lista awarii ma górną granicę', () => {
    it('🔴 SEDNO: zapytanie niesie limit', async () => {
        const { GET } = await import('@/app/api/employee/incidents/route');
        await GET(get('https://example.test/api/employee/incidents'));

        expect(limity.length).toBeGreaterThan(0);
        expect(limity[0]).toBeLessThanOrEqual(500);
    });

    it('filtr statusu dalej działa (apka go używa)', async () => {
        const { GET } = await import('@/app/api/employee/incidents/route');
        await GET(get('https://example.test/api/employee/incidents?status=reported'));
        expect(filtry.some(([k, v]) => k === 'status' && v === 'reported')).toBe(true);
    });
});

describe('P-113 · lista rozmów ma granicę i sprawdza status', () => {
    it('🔴 SEDNO: zapytanie niesie limit', async () => {
        const { GET } = await import('@/app/api/admin/chat/conversations/route');
        await GET(get('https://example.test/api/admin/chat/conversations?status=open'));

        expect(limity.length).toBeGreaterThan(0);
        expect(limity[0]).toBeLessThanOrEqual(500);
    });

    it('🪤 nieznany status → 400, zamiast cichej pustej listy', async () => {
        const { GET } = await import('@/app/api/admin/chat/conversations/route');
        const res = await GET(get('https://example.test/api/admin/chat/conversations?status=cokolwiek'));
        expect(res.status).toBe(400);
    });

    it('oba dozwolone statusy przechodzą', async () => {
        const { GET } = await import('@/app/api/admin/chat/conversations/route');
        for (const s of ['open', 'closed']) {
            expect((await GET(get(`https://example.test/api/admin/chat/conversations?status=${s}`))).status).toBeLessThan(400);
        }
    });
});
