/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST są z natury dynamiczne. Zawężenie do typów SDK wywala
 * kompilację na `TS2589`. Konwencja repo: jawne wyłączenie z powodem.
 */
/**
 * STRAŻNIK ZAŁĄCZNIKÓW ZADAŃ (znalezione 06.09 przy P-040, poza planem audytu).
 *
 * 🔴 CO BYŁO ZEPSUTE. `GET /api/employee/documents/file?type=task-image&path=…`
 * sprawdzało wyłącznie, że ścieżka należy do **JAKIEGOKOLWIEK** zadania —
 * `select('id')`, bez `is_private`, `owner_user_id` i `created_by`. Identyfikator
 * znalezionego zadania szedł tylko do audytu, nigdy do decyzji. Każdy pracownik znający
 * klucz obiektu dostawał podpisany link do zdjęcia z CUDZEGO zadania prywatnego,
 * a w trybie `redirect=1` (miniatury) nie zostawiał przy tym śladu w rejestrze.
 *
 * 🔑 UCZCIWIE O SKALI: pomiar produkcyjny 07.09 — 342 zadania, 94 z załącznikiem,
 * **ZERO prywatnych z załącznikiem**. Dziś nie ma więc czego wyciekać. Bramka jest
 * strukturalna: pierwszy człowiek, który dołoży zdjęcie do zadania prywatnego,
 * nie powinien odkrywać, że „prywatne" nie obejmowało załączników.
 *
 * 🔑 REGUŁA JEST TA SAMA CO W P-040 — `canAccessTask` z `lib/taskAccess.ts`. Nie powstaje
 * druga definicja: trasy zadań i trasa plików odpowiadają na to samo pytanie.
 *
 * DOWÓD, ŻE GRYZIE (cofka): zdejmij `canAccessTask` z tej trasy → padają dwa pierwsze testy.
 *
 * Uruchomienie: `npx vitest run taskImageAccess`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'; // właściciel zadania prywatnego
const B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'; // inny pracownik
const SCIEZKA_PRYWATNA = 'tasks/1730000000-abc123.jpg';
const SCIEZKA_ZESPOLOWA = 'tasks/1730000001-def456.jpg';

const ZADANIA = [
    { id: 'zad-prywatne', is_private: true, owner_user_id: A, created_by: A, image_path: SCIEZKA_PRYWATNA, image_paths: [SCIEZKA_PRYWATNA] },
    { id: 'zad-zespolowe', is_private: false, owner_user_id: A, created_by: A, image_path: SCIEZKA_ZESPOLOWA, image_paths: [SCIEZKA_ZESPOLOWA] },
];

let ktoWola = B;
let podpisane: string[] = [];
let wpisyAudytu: string[] = [];

vi.mock('@/lib/auth', () => ({ verifyAdmin: async () => ({ id: ktoWola, email: 'p@example.test' }) }));
vi.mock('@/lib/roles', () => ({ hasRole: async () => true }));
vi.mock('@/lib/auditLog', () => ({ logAudit: async (a: { resourceId?: string }) => { wpisyAudytu.push(a?.resourceId || '?'); } }));
vi.mock('@/lib/privateStorage', () => ({
    PATIENT_DOC_BUCKET: 'patient-docs',
    TASK_IMAGE_BUCKET: 'task-images',
    CONSENT_TEMPLATE_BUCKET: 'consent-templates',
    displayUrlFor: async (_b: string, p: string) => { podpisane.push(p); return `https://example.test/podpisany/${p}`; },
}));

function zapytanie(): any {
    const q: any = {};
    let kolumny: string[] | null = null;
    let szukanaSciezka: string | null = null;
    for (const m of ['order', 'in', 'is', 'neq', 'gte', 'lte']) q[m] = () => q;
    q.select = (l?: string) => { kolumny = l ? l.split(',').map(k => k.trim()) : null; return q; };
    q.eq = (k: string, v: string) => { if (k === 'image_path') szukanaSciezka = v; return q; };
    q.contains = (_k: string, v: string[]) => { szukanaSciezka = v[0]; return q; };
    const przytnij = (w: Record<string, unknown>) => {
        if (!kolumny) return { ...w };
        const r: Record<string, unknown> = {};
        for (const k of kolumny) if (k in w) r[k] = w[k];
        return r;
    };
    q.limit = () => q;
    q.then = (res: (v: unknown) => unknown) => {
        const trafione = ZADANIA.filter(z => z.image_path === szukanaSciezka || z.image_paths.includes(szukanaSciezka || ''));
        return Promise.resolve({ data: trafione.map(przytnij), error: null }).then(res);
    };
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => zapytanie() }) }));

const req = (qs: string) => new NextRequest(`https://example.test/api/employee/documents/file${qs}`);

beforeEach(() => {
    vi.clearAllMocks();
    ktoWola = B;
    podpisane = [];
    wpisyAudytu = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('załączniki zadań · cudze zadanie prywatne nie oddaje zdjęcia', () => {
    it('🔴 SEDNO: obcy pracownik → 404 i ANI JEDEN podpisany link', async () => {
        const { GET } = await import('@/app/api/employee/documents/file/route');
        const res = await GET(req(`?type=task-image&path=${encodeURIComponent(SCIEZKA_PRYWATNA)}`));

        expect(res.status).toBe(404);
        expect(podpisane).toHaveLength(0);
    });

    it('🔴 tryb `redirect=1` (miniatury) też jest zamknięty — tam nie ma nawet śladu w audycie', async () => {
        const { GET } = await import('@/app/api/employee/documents/file/route');
        const res = await GET(req(`?type=task-image&redirect=1&path=${encodeURIComponent(SCIEZKA_PRYWATNA)}`));

        expect(res.status).toBe(404);
        expect(podpisane).toHaveLength(0);
    });

    it('właściciel dostaje swoje zdjęcie i wpis w audycie', async () => {
        ktoWola = A;
        const { GET } = await import('@/app/api/employee/documents/file/route');
        const res = await GET(req(`?type=task-image&path=${encodeURIComponent(SCIEZKA_PRYWATNA)}`));

        expect(res.status).toBe(200);
        expect(podpisane).toContain(SCIEZKA_PRYWATNA);
        expect(wpisyAudytu).toContain('zad-prywatne');
    });

    it('brak regresji: zadanie ZESPOŁOWE dalej otwiera każdy pracownik', async () => {
        const { GET } = await import('@/app/api/employee/documents/file/route');
        const res = await GET(req(`?type=task-image&path=${encodeURIComponent(SCIEZKA_ZESPOLOWA)}`));

        expect(res.status).toBe(200);
        expect(podpisane).toContain(SCIEZKA_ZESPOLOWA);
    });

    it('kontrola: ścieżka spoza wzorca dalej odrzucana zanim dotknie bazy', async () => {
        const { GET } = await import('@/app/api/employee/documents/file/route');
        expect((await GET(req('?type=task-image&path=../../etc/passwd'))).status).toBe(400);
        expect(podpisane).toHaveLength(0);
    });

    it('kontrola: ścieżka nienależąca do żadnego zadania → 404', async () => {
        const { GET } = await import('@/app/api/employee/documents/file/route');
        expect((await GET(req('?type=task-image&path=tasks/nieistniejace.jpg'))).status).toBe(404);
    });
});
