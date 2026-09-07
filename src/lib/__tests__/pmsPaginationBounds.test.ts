/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST i klienta PMS są z natury dynamiczne. Konwencja repo:
 * jawne wyłączenie z powodem, nie ciche `any`.
 */
/**
 * STRAŻNIK GRANIC STRONICOWANIA W ZAPYTANIACH DO PMS (P-084).
 *
 * 🔴 CO BYŁO ZEPSUTE. `limit` i `offset` szły z adresu WPROST do ścieżki żądania do
 * Prodentisa, bez parsowania do liczb i bez kodowania. Zalogowany pacjent mógł dokleić
 * własne parametry do wywołania `/api/patient/<własne id>/appointments` albo zażądać
 * dowolnie dużej strony. Segment ścieżki i identyfikator były już bezpieczne (P-035) —
 * dziurą został sam parametr.
 *
 * 🪤 KARTA AUDYTU WYMIENIAŁA DWIE TRASY, A JEST ICH TRZY. `employee/patient-history`
 * dostało `parsePmsLimit` przy P-035 i jest czyste; poza `patients/me/visits` z karty
 * surowy `limit` wklejają TAKŻE `employee/patient-search` i `admin/patients/search`.
 * Inwentarz zrobiony gremem po `limit=${` w całym `src/app/api` — nie z listy w karcie.
 *
 * 🔑 REGUŁA JEST JEDNA: `parsePmsLimit` z `lib/prodentisId.ts` (istnieje od P-035)
 * plus bliźniaczy `parsePmsOffset`. Nie powstaje druga definicja granic.
 *
 * DOWÓD, ŻE GRYZIE (cofka): przywróć surowy `${limit}` w dowolnej z tras → pada jej test.
 *
 * Uruchomienie: `npx vitest run pmsPaginationBounds`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parsePmsLimit, parsePmsOffset } from '@/lib/prodentisId';

describe('P-084 · granice liczbowe', () => {
    it('🔴 śmieci sprowadzone do liczby domyślnej', () => {
        for (const smiec of ['abc', '', '&x=1', '-5', '0', null, undefined, {}]) {
            expect(parsePmsLimit(smiec, 50, 200)).toBe(50);
        }
    });

    it('🔑 wstrzyknięcie ginie przy PARSOWANIU, nie przy odrzuceniu', () => {
        // `parseInt` bierze prefiks liczbowy i porzuca resztę — a że zwracamy LICZBĘ,
        // do ścieżki nie ma jak trafić nic poza nią. Doklejka po prostu przestaje istnieć.
        expect(parsePmsLimit('10&admin=1', 50, 200)).toBe(10);
        expect(parsePmsLimit('7 OR 1=1', 50, 200)).toBe(7);
    });

    it('🔴 wartość ponad maksimum jest ŚCINANA, nie odrzucana', () => {
        expect(parsePmsLimit('999999', 50, 200)).toBe(200);
    });

    it('rozsądna wartość przechodzi bez zmian', () => {
        expect(parsePmsLimit('25', 50, 200)).toBe(25);
    });

    it('🔴 offset: ujemny i śmieciowy → zero; ponad maksimum ścinany', () => {
        for (const smiec of ['-1', 'abc', '', null, undefined]) {
            expect(parsePmsOffset(smiec, 100000)).toBe(0);
        }
        expect(parsePmsOffset('0', 100000)).toBe(0);
        expect(parsePmsOffset('120', 100000)).toBe(120);
        expect(parsePmsOffset('99999999', 100000)).toBe(100000);
    });
});

// ── Okablowanie: trzy trasy, jedna reguła ───────────────────────────────────

let sciezkiPMS: string[] = [];

vi.mock('@/lib/jwt', () => ({ verifyPatientSession: async () => ({ prodentisId: '0100001110', userId: 'u1' }) }));
vi.mock('@/lib/auth', () => ({ verifyAdmin: async () => ({ id: 'u1', email: 'p@example.test' }) }));
vi.mock('@/lib/roles', () => ({ hasRole: async () => true }));
vi.mock('@/lib/authGuards', () => ({
    requireAdmin: async () => ({ ok: true, user: { id: 'u1', email: 'p@example.test' } }),
    requireEmployeeOrAdmin: async () => ({ ok: true, user: { id: 'u1', email: 'p@example.test' } }),
}));
vi.mock('@/lib/auditLog', () => ({ logAudit: async () => {} }));
vi.mock('@/lib/demoMode', () => ({ isDemoMode: false }));
vi.mock('@/lib/prodentisFetch', () => ({
    prodentisFetch: async (path: string) => {
        sciezkiPMS.push(path);
        return { ok: true, status: 200, json: async () => ({ appointments: [], patients: [] }) };
    },
    BrakKluczaPMS: class extends Error {},
    TrybDemoBezPMS: class extends Error {},
    pmsError: async () => null,
}));
function zapytanie(): any {
    const q: any = {};
    for (const m of ['select', 'eq', 'in', 'order', 'limit', 'is', 'neq', 'ilike']) q[m] = () => q;
    q.single = async () => ({ data: null, error: null });
    q.maybeSingle = async () => ({ data: null, error: null });
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => zapytanie() }) }));

const req = (adres: string) => new Request(adres, { headers: { authorization: 'Bearer t' } }) as any;

beforeEach(() => {
    vi.clearAllMocks();
    sciezkiPMS = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.PRODENTIS_API_KEY = 'klucz-testowy';
});

describe('P-084 · trasy nie wklejają surowego parametru do ścieżki PMS', () => {
    it('🔴 me/visits: wstrzyknięcie w `limit` i `offset` nie dociera do PMS', async () => {
        const { GET } = await import('@/app/api/patients/me/visits/route');
        await GET(req('https://example.test/api/patients/me/visits?limit=10%26admin=1&offset=-5%26x=2'));

        expect(sciezkiPMS).toHaveLength(1);
        const sciezka = sciezkiPMS[0];
        expect(sciezka).not.toContain('admin=1');
        expect(sciezka).not.toContain('x=2');
        expect(sciezka).not.toContain('-5');
        // Kontrola pozytywna: to nadal jest wywołanie o wizyty tego pacjenta.
        expect(sciezka).toContain('/api/patient/0100001110/appointments');
    });

    it('🔴 me/visits: żądanie gigantycznej strony jest ścinane', async () => {
        const { GET } = await import('@/app/api/patients/me/visits/route');
        await GET(req('https://example.test/api/patients/me/visits?limit=999999'));
        expect(sciezkiPMS[0]).not.toContain('999999');
    });

    it('🔴 employee/patient-search: to samo dla wyszukiwarki personelu', async () => {
        const { GET } = await import('@/app/api/employee/patient-search/route');
        await GET(req('https://example.test/api/employee/patient-search?q=kowal&limit=9999%26admin=1'));

        expect(sciezkiPMS).toHaveLength(1);
        expect(sciezkiPMS[0]).not.toContain('admin=1');
        expect(sciezkiPMS[0]).not.toContain('9999');
        expect(sciezkiPMS[0]).toContain('q=kowal');
    });

    it('🔴 admin/patients/search: to samo po stronie admina', async () => {
        const { GET } = await import('@/app/api/admin/patients/search/route');
        await GET(req('https://example.test/api/admin/patients/search?q=kowal&limit=9999%26admin=1'));

        expect(sciezkiPMS).toHaveLength(1);
        expect(sciezkiPMS[0]).not.toContain('admin=1');
        expect(sciezkiPMS[0]).not.toContain('9999');
    });
});
