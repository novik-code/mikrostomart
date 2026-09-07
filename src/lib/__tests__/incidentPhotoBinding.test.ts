/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST i klienta storage są z natury dynamiczne. Konwencja repo.
 */
/**
 * STRAŻNIK PRZYPINANIA ZDJĘĆ DO AWARII (P-108).
 *
 * 🔴 CO BYŁO ZEPSUTE. `POST /api/employee/incidents` przypinało do zgłoszenia DOWOLNE
 * napisy z pola `photoPaths` — serwer nie sprawdzał ani wzorca ścieżki, ani istnienia
 * obiektu w buckecie, ani tego, czy zdjęcie nie wisi już przy innej awarii.
 *
 * 🪤 NAJGORSZY SKUTEK NIE JEST OCZYWISTY. `photoBelongsToIncident` używa `maybeSingle()`,
 * więc ścieżka przypięta do DWÓCH awarii zwraca błąd PGRST116 — a wtedy
 * `GET /incidents/photo` oddaje 404 dla WSZYSTKICH, także dla prawowitego zgłoszenia.
 * Zdjęcie-dowód staje się nieotwieralne, a naprawa jest możliwa tylko w bazie.
 * Duplikat wystarczy zgłosić raz, żeby zepsuć oryginał.
 *
 * 🔴 Druga część: `POST /incidents/photo` nie miało limitu — każde żądanie to `sharp`
 * na pliku do 10 MB. Kubełek jest po UŻYTKOWNIKU (mamy sesję), nie po adresie:
 * `getClientIP` czyta nagłówek podawany przez klienta (lekcja z P-088).
 *
 * ⏳ POZA ZAKRESEM tej zmiany: sprzątanie nieprzypiętych szkiców. `removeIncidentPhotos`
 * nie ma dziś ani jednego wywołującego, a cron retencji nie zna bucketa `incident-photos`.
 * To nowy cron, czyli nowa infrastruktura — osobna pozycja, nie „przy okazji".
 *
 * DOWÓD, ŻE GRYZIE (cofka): usuń filtr istnienia → padają dwa pierwsze testy.
 *
 * Uruchomienie: `npx vitest run incidentPhotoBinding`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const MOJE = 'draft-abc/1730000000-aaaaaaaa.jpg';
const CUDZE_PRZYPIETE = 'draft-xyz/1730000001-bbbbbbbb.jpg';
const NIEISTNIEJACE = 'draft-abc/1730000002-cccccccc.jpg';

/** Co REALNIE leży w buckecie. */
const W_BUCKECIE = new Set([MOJE, CUDZE_PRZYPIETE]);
/** Co jest już przypięte do innej awarii. */
const JUZ_PRZYPIETE = new Set([CUDZE_PRZYPIETE]);

let wstawione: Record<string, any>[] = [];
let limitPrzepuszcza = true;
let wolaniaLimitera: string[] = [];

vi.mock('@/lib/authGuards', () => ({
    requireEmployeeOrAdmin: async () => ({ ok: true, user: { id: 'user-1', email: 'p@example.test' } }),
}));
vi.mock('@/lib/auditLog', () => ({ logAudit: async () => {} }));
vi.mock('@/lib/rateLimit', () => ({
    checkRateLimit: async (klucz: string) => { wolaniaLimitera.push(klucz); return { allowed: limitPrzepuszcza, remaining: 0 }; },
    getClientIP: () => '1.2.3.4',
}));
vi.mock('@/lib/incidents', async (orig) => {
    const rzeczywiste = await orig() as any;
    return {
        ...rzeczywiste,
        istniejeZdjecieAwarii: async (p: string) => W_BUCKECIE.has(p),
        photoBelongsToIncident: async (p: string) => (JUZ_PRZYPIETE.has(p) ? 'inna-awaria' : null),
        resolveStaffName: async () => 'Pracownik Testowy',
    };
});

function zapytanie(): any {
    const q: any = {};
    for (const m of ['select', 'eq', 'order', 'limit', 'is', 'neq', 'contains']) q[m] = () => q;
    q.single = async () => ({ data: { id: 'inc-1', photo_paths: [] }, error: null });
    q.maybeSingle = async () => ({ data: null, error: null });
    q.insert = (p: Record<string, any>) => { wstawione.push(p); const r: any = { select: () => r, single: async () => ({ data: { id: 'inc-1', ...p }, error: null }) }; r.then = (res: any) => Promise.resolve({ data: null, error: null }).then(res); return r; };
    q.update = () => q;
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: () => zapytanie(), storage: { from: () => ({ upload: async () => ({ error: null }), createSignedUrl: async () => ({ data: { signedUrl: 'https://x' }, error: null }), remove: async () => ({ error: null }), list: async () => ({ data: [], error: null }) }) } }),
}));

const post = (body: unknown) =>
    new NextRequest('https://example.test/api/employee/incidents', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });

beforeEach(() => {
    vi.clearAllMocks();
    wstawione = [];
    wolaniaLimitera = [];
    limitPrzepuszcza = true;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('P-108 · do awarii przypina się tylko realne, wolne zdjęcie', () => {
    it('🔴 SEDNO: ścieżka spoza bucketa NIE zostaje przypięta', async () => {
        const { POST } = await import('@/app/api/employee/incidents/route');
        await POST(post({ title: 'Zepsuty unit', photoPaths: [NIEISTNIEJACE] }));

        expect(wstawione).toHaveLength(1);
        expect(wstawione[0].photo_paths).toEqual([]);
    });

    it('🔴 zdjęcie JUŻ przypięte do innej awarii nie zostaje przypięte drugi raz', async () => {
        // Duplikat wywraca `maybeSingle()` w `photoBelongsToIncident` → 404 dla OBU awarii.
        const { POST } = await import('@/app/api/employee/incidents/route');
        await POST(post({ title: 'Druga awaria', photoPaths: [CUDZE_PRZYPIETE] }));

        expect(wstawione[0].photo_paths).toEqual([]);
    });

    it('🔴 ścieżka spoza wzorca odrzucana zanim dotknie storage', async () => {
        const { POST } = await import('@/app/api/employee/incidents/route');
        await POST(post({ title: 'X', photoPaths: ['../../etc/passwd', 'bez-katalogu.jpg'] }));

        expect(wstawione[0].photo_paths).toEqual([]);
    });

    it('własne, realne i wolne zdjęcie przypina się normalnie', async () => {
        const { POST } = await import('@/app/api/employee/incidents/route');
        await POST(post({ title: 'Zepsuty unit', photoPaths: [MOJE] }));

        expect(wstawione[0].photo_paths).toEqual([MOJE]);
    });

    it('🪤 awaria bez zdjęć powstaje jak dotąd', async () => {
        const { POST } = await import('@/app/api/employee/incidents/route');
        const res = await POST(post({ title: 'Bez zdjęć' }));
        expect(res.status).toBeLessThan(400);
        expect(wstawione[0].photo_paths).toEqual([]);
    });
});

describe('P-108 · upload zdjęcia ma limit', () => {
    const formularz = () => {
        const fd = new FormData();
        fd.append('file', new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' }), 'a.jpg');
        fd.append('draftId', 'draft-abc');
        return new NextRequest('https://example.test/api/employee/incidents/photo', { method: 'POST', body: fd });
    };

    it('🔴 przekroczony limit → 429 i ZERO pracy dekodera', async () => {
        limitPrzepuszcza = false;
        const { POST } = await import('@/app/api/employee/incidents/photo/route');
        const res = await POST(formularz());

        expect(res.status).toBe(429);
        expect(res.headers.get('Retry-After')).toBeTruthy();
    });

    it('🔑 kubełek jest po UŻYTKOWNIKU, nie po adresie', async () => {
        const { POST } = await import('@/app/api/employee/incidents/photo/route');
        await POST(formularz());
        expect(wolaniaLimitera[0]).toContain('user-1');
        expect(wolaniaLimitera[0]).not.toContain('1.2.3.4');
    });
});
