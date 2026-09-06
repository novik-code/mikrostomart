/**
 * STRAŻNIK WSTRZYKNIĘĆ DO ŚCIEŻKI ADRESU PMS (P-035, audyt 2026-09-05).
 *
 * 🔴 CO BYŁO ZEPSUTE. Trasy personelu sklejały identyfikator prosto w ścieżkę:
 *
 *     prodentisFetch(`/api/patient/${patientId}/details`, { klucz: 'personel' })
 *
 * a `patientId` przychodził z `searchParams.get(...)` — czyli JUŻ ZDEKODOWANY — i był
 * sprawdzany wyłącznie na niepustość. WHATWG `URL` normalizuje `..` i ucina wszystko
 * po `#`, więc pracownik po 2FA mógł wykonać DOWOLNE żądanie GET do API Prodentisa
 * NASZYM kluczem. Zmierzone wykonaniem (patrz przypadki niżej):
 *
 *     '../patients/search?q=kow&limit=500#'  →  /api/patients/search?q=kow&limit=500
 *     '../../admin/export'                   →  /admin/export/details
 *
 * Odpowiedź (lista pacjentów z PESEL-ami i telefonami) wracała w całości jako 200,
 * a `logAudit` zapisywał wstrzyknięty string jako `resourceId` — rejestr dostępu do
 * danych medycznych stawał się bezużyteczny dokładnie wtedy, gdy jest potrzebny.
 *
 * 🔑 Ten plik WYKONUJE handlery i patrzy, JAKA ŚCIEŻKA realnie poszła do `prodentisFetch`.
 * Grep po `encodeURIComponent` przepuściłby trasę, która koduje, ale nie waliduje —
 * albo waliduje po sklejeniu.
 *
 * Uruchomienie: `npx vitest run pmsPathInjection`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { czyPoprawnyIdPms, parsePmsLimit, PRODENTIS_ID_RE } from '../prodentisId';

/** Ładunki, które do 06.09 przechodziły. Pierwszy jest dosłownie z karty audytu. */
const LADUNKI = [
    '../patients/search?q=kow&limit=500#',
    '../../admin/export',
    '..%2Fpatients%2Fsearch',
    '0100001110/../../admin',
    '0100001110#',
    '0100001110?limit=999',
];

let sciezkiDoPms: string[] = [];

vi.mock('@/lib/prodentisFetch', () => ({
    prodentisFetch: async (path: string) => {
        sciezkiDoPms.push(path);
        return { ok: true, status: 200, json: async () => ({ appointments: [], patients: [] }) };
    },
    BrakKluczaPMS: class extends Error {},
    TrybDemoBezPMS: class extends Error {},
    pmsError: async () => null,
}));
vi.mock('@/lib/authGuards', () => ({
    requireAdmin: async () => ({ ok: true, user: { id: 'a', email: 'a@b.pl' }, roles: ['admin'] }),
    requireEmployeeOrAdmin: async () => ({ ok: true, user: { id: 'e', email: 'e@b.pl' }, roles: ['employee'] }),
}));
// 🪤 Trasy personelu NIE używają `authGuards` — idą przez `verifyAdmin` + `hasRole`.
// Pierwsza wersja tego pliku mockowała nie tę warstwę, więc handlery wywracały się na 500
// i asercja „400" nie mierzyła bramki, tylko awarię. Złapane wykonaniem.
vi.mock('@/lib/auth', () => ({ verifyAdmin: async () => ({ id: 'e', email: 'e@b.pl' }) }));
vi.mock('@/lib/roles', () => ({ hasRole: async () => true }));
vi.mock('@/lib/auditLog', () => ({ logAudit: async () => {} }));
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: () => {
            const q: Record<string, unknown> = {};
            for (const m of ['select', 'eq', 'order', 'limit', 'in', 'update', 'insert', 'delete']) q[m] = () => q;
            q.single = async () => ({ data: null, error: { message: 'brak' } });
            q.maybeSingle = async () => ({ data: null, error: null });
            q.then = (r: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(r);
            return q;
        },
    }),
}));

beforeEach(() => {
    sciezkiDoPms = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

// ── Sam mechanizm — dowód, że to nie teoria ─────────────────────────────────

describe('P-035 · mechanizm: `..` i `#` w ścieżce realnie przekierowują żądanie', () => {
    it('🔴 DOWÓD: sklejenie bez kodowania wyprowadza żądanie na inną trasę PMS', () => {
        const cel = (id: string) => new URL(`https://pms.test/api/patient/${id}/details`).pathname
            + new URL(`https://pms.test/api/patient/${id}/details`).search;

        expect(cel('../patients/search?q=kow&limit=500#')).toBe('/api/patients/search?q=kow&limit=500');
        expect(cel('../../admin/export')).toBe('/admin/export/details');
    });

    it('KONTROLA POZYTYWNA: `encodeURIComponent` neutralizuje wszystkie ładunki', () => {
        for (const l of LADUNKI) {
            const u = new URL(`https://pms.test/api/patient/${encodeURIComponent(l)}/details`);
            expect(u.pathname.startsWith('/api/patient/'), l).toBe(true);
            expect(u.pathname.endsWith('/details'), l).toBe(true);
            expect(u.search, l).toBe('');
        }
    });
});

// ── Biała lista ─────────────────────────────────────────────────────────────

describe('P-035 · biała lista identyfikatorów', () => {
    it('🔴 SEDNO: każdy ładunek jest odrzucany', () => {
        for (const l of LADUNKI) expect(czyPoprawnyIdPms(l), l).toBe(false);
    });

    it('KONTROLA POZYTYWNA: realne identyfikatory z produkcji przechodzą', () => {
        // Zmierzone 06.09: `patients.prodentis_id` — 149 ze 149 kont to 10 cyfr z zerem
        // wiodącym; identyfikatory wizyt mają ten sam kształt.
        for (const dobry of ['0100001110', '0100234418', '0100213775', '123456', '123456789012']) {
            expect(czyPoprawnyIdPms(dobry), dobry).toBe(true);
        }
    });

    it('🪤 wzorzec NIE jest zawężony do 10 cyfr — za wąski dawałby 400 legalnym pacjentom', () => {
        expect(PRODENTIS_ID_RE.test('123456')).toBe(true);        // 6
        expect(PRODENTIS_ID_RE.test('123456789012')).toBe(true);  // 12
        expect(PRODENTIS_ID_RE.test('12345')).toBe(false);        // 5
        expect(PRODENTIS_ID_RE.test('1234567890123')).toBe(false); // 13
    });

    it('`limit` staje się liczbą z pułapem, a śmieci wracają do domyślnej', () => {
        expect(parsePmsLimit('50', 50, 200)).toBe(50);
        expect(parsePmsLimit('999', 50, 200)).toBe(200);
        expect(parsePmsLimit('0', 50, 200)).toBe(50);
        expect(parsePmsLimit('abc', 50, 200)).toBe(50);
        expect(parsePmsLimit('50&x=1', 50, 200)).toBe(50);
        expect(parsePmsLimit(undefined, 50, 200)).toBe(50);
    });
});

// ── Wykonanie tras ──────────────────────────────────────────────────────────

const zapytanie = (url: string) => new Request(url, { headers: { authorization: 'Bearer t' } });

describe('P-035 okablowanie · trasy odrzucają ładunek PRZED dotknięciem PMS', () => {
    const TRASY: [string, string][] = [
        ['@/app/api/employee/patient-details/route', 'patientId'],
        ['@/app/api/employee/patient-history/route', 'patientId'],
        ['@/app/api/employee/patient-appointments/route', 'patientId'],
    ];

    for (const [modul, param] of TRASY) {
        const nazwa = modul.split('/').slice(-2)[0];

        it(`🔴 SEDNO: ${nazwa} — ładunek → 400 i ZERO żądań do PMS`, async () => {
            const { GET } = await import(modul);
            for (const l of LADUNKI) {
                const res = await GET(
                    zapytanie(`https://x.test/api?${param}=${encodeURIComponent(l)}`),
                );
                expect(res.status, `${nazwa} ← ${l}`).toBe(400);
            }
            expect(sciezkiDoPms).toEqual([]);
        });

        it(`KONTROLA POZYTYWNA: ${nazwa} — poprawny identyfikator DOCHODZI do PMS`, async () => {
            const { GET } = await import(modul);
            const res = await GET(zapytanie(`https://x.test/api?${param}=0100001110`));
            expect(res.status).not.toBe(400);
            expect(sciezkiDoPms.length).toBeGreaterThan(0);
            // Ścieżka musi zawierać identyfikator i NIE może wyjść poza `/api/patient/`.
            expect(sciezkiDoPms[0]).toContain('0100001110');
            expect(sciezkiDoPms[0].startsWith('/api/patient/')).toBe(true);
        });
    }

    it('🔴 SEDNO: `patient-history` przycina `limit` zamiast wysyłać surowy string', async () => {
        const { GET } = await import('@/app/api/employee/patient-history/route');
        await GET(zapytanie('https://x.test/api?patientId=0100001110&limit=999999&x=1'));
        expect(sciezkiDoPms[0]).toContain('limit=200');
        expect(sciezkiDoPms[0]).not.toContain('999999');
    });

    it('🔴 SEDNO: admin `color` (PUT — ZAPIS) odrzuca ładunek w identyfikatorze wizyty', async () => {
        const modul = (await import('@/app/api/admin/prodentis-schedule/color/route')) as unknown as Record<
            string,
            ((r: Request) => Promise<Response>) | undefined
        >;
        const handler = modul.PUT ?? modul.POST ?? modul.PATCH;
        expect(handler, 'trasa color musi mieć handler PUT albo POST').toBeTruthy();
        const res = await handler!(
            new Request('https://x.test/api', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ appointmentId: '../../admin/export', colorId: '1' }),
            }),
        );
        expect(res.status).toBe(400);
        expect(sciezkiDoPms).toEqual([]);
    });
});

// ── Obrona w głąb w prodentisFetch ──────────────────────────────────────────

describe('P-035 obrona w głąb · `prodentisFetch` odrzuca segment nawigacyjny', () => {
    it('🔴 SEDNO: `..` w SEGMENCIE ścieżki rzuca, zanim poleci żądanie', async () => {
        vi.resetModules();
        vi.doUnmock('@/lib/prodentisFetch');
        const { prodentisFetch } = await vi.importActual<typeof import('../prodentisFetch')>('../prodentisFetch');
        await expect(prodentisFetch('/api/patient/../patients/search')).rejects.toThrow(/Podejrzana ścieżka PMS/);
        await expect(prodentisFetch('/api/patient/0100001110/details#x')).rejects.toThrow(/Podejrzana ścieżka PMS/);
    });

    it('🪤 KONTROLA POZYTYWNA: `..` w QUERY jest LEGALNE (fraza wyszukiwania `kow..`)', async () => {
        vi.resetModules();
        vi.doUnmock('@/lib/prodentisFetch');
        const { prodentisFetch } = await vi.importActual<typeof import('../prodentisFetch')>('../prodentisFetch');
        // Zakaz `'..'` w CAŁYM adresie wywróciłby wyszukiwarkę pacjentów — lekarstwo
        // groźniejsze od choroby. Ta ścieżka ma dojść dalej (padnie na braku klucza/sieci,
        // a NIE na naszej bramce).
        await expect(prodentisFetch('/api/patients/search?q=kow..')).rejects.not.toThrow(
            /Podejrzana ścieżka PMS/,
        );
    });
});
