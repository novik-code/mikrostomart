/**
 * STRAŻNIK DOSTĘPU DO ZADAŃ PERSONELU (P-040).
 *
 * 🔴 CO BYŁO ZEPSUTE. Prywatność zadania egzekwowała wyłącznie LISTA. Wszystkie trasy
 * per-id sprawdzały rolę i na tym kończyły, więc pracownik B znający UUID mógł czytać
 * historię, edytować, kasować i komentować prywatne zadanie pracownika A. Równolegle
 * te same trasy ogłaszały tytuł zadania prywatnego CAŁEJ grupie pushem — czyli dostarczały
 * UUID, którym potem można było je ruszyć. `tasks/[id]/push` nie sprawdzał nawet ROLI
 * i rozgłaszał tytuł razem z nazwiskiem pacjenta.
 *
 * 🔑 POMIAR PRODUKCYJNY (06.09, przed kodem): 342 zadania, `is_private = true` — jedno,
 * `is_private IS NULL` — zero, prywatnych bez właściciela i twórcy — zero.
 *
 * 🔑 TEN PLIK WYKONUJE SZEŚĆ PRAWDZIWYCH HANDLERÓW, nie grepuje źródeł. Osobno pilnuje
 * dwóch rzeczy, które łatwo rozjechać: (1) że bramka stoi PRZED zapisem, a nie po nim —
 * asercje sprawdzają, że `update`/`delete`/`insert` NIE zostały wywołane; (2) że push
 * zespołowy milknie dla prywatnych przy KAŻDYM z trzech wywołań w `PATCH` — pominięcie
 * jednego zostawia połowę wycieku.
 *
 * DOWÓD, ŻE GRYZIE (cofka): usuń bramkę z dowolnego handlera → pada jego test dostępu.
 * Usuń `teamMayHear` przy jednym z trzech pushy → pada odpowiedni test ciszy.
 *
 * Uruchomienie: `npx vitest run taskAccess`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canAccessTask, teamMayHear } from '@/lib/taskAccess';

const A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'; // właściciel zadania prywatnego
const B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'; // inny pracownik — intruz
const PRYWATNE = '11111111-1111-4111-8111-111111111111';
const ZESPOLOWE = '22222222-2222-4222-8222-222222222222';
const NIEISTNIEJACE = '99999999-9999-4999-8999-999999999999';

// ── Warstwa 1: sama reguła ──────────────────────────────────────────────────

describe('P-040 · reguła dostępu', () => {
    it('zadanie zespołowe jest dostępne dla każdego', () => {
        expect(canAccessTask({ is_private: false, owner_user_id: A }, B)).toBe(true);
    });

    it('🔴 zadanie prywatne cudze — odmowa', () => {
        expect(canAccessTask({ is_private: true, owner_user_id: A, created_by: A }, B)).toBe(false);
    });

    it('zadanie prywatne własne — dostęp z owner_user_id ORAZ z created_by', () => {
        expect(canAccessTask({ is_private: true, owner_user_id: A, created_by: null }, A)).toBe(true);
        expect(canAccessTask({ is_private: true, owner_user_id: null, created_by: A }, A)).toBe(true);
    });

    it('🪤 legacy `is_private: null` znaczy zespołowe, nie prywatne', () => {
        expect(canAccessTask({ is_private: null, owner_user_id: A }, B)).toBe(true);
    });

    it('🪤 prywatna sierota (bez właściciela i twórcy) jest niedostępna dla WSZYSTKICH', () => {
        // Zmierzone: takich wierszy na produkcji jest zero. Lista ich też nie pokazuje.
        expect(canAccessTask({ is_private: true, owner_user_id: null, created_by: null }, A)).toBe(false);
    });

    it('brak wiersza to zawsze odmowa — nie wolno pomylić z „publiczne"', () => {
        expect(canAccessTask(null, A)).toBe(false);
        expect(canAccessTask(undefined, A)).toBe(false);
    });

    it('grupa słyszy o zespołowych, nigdy o prywatnych', () => {
        expect(teamMayHear({ is_private: false })).toBe(true);
        expect(teamMayHear({ is_private: null })).toBe(true);
        expect(teamMayHear({ is_private: true })).toBe(false);
        expect(teamMayHear(null)).toBe(false);
    });
});

// ── Warstwa 2: prawdziwe handlery ───────────────────────────────────────────

let ktoWola = B;
let pushZespolowy: { config: string; body: string }[] = [];
let pushImienny: { uids: string[] }[] = [];
let zapisy: { tabela: string; op: string }[] = [];
/** Czy odczyt wiersza pod bramkę ma paść (timeout / 5xx z PostgREST). */
let odczytPada = false;

vi.mock('@/lib/auth', () => ({
    verifyAdmin: async () => ({ id: ktoWola, email: 'pracownik@example.test' }),
}));
vi.mock('@/lib/roles', () => ({ hasRole: async () => true }));

vi.mock('@/lib/pushService', () => ({
    sendPushByConfig: async (config: string, payload: { body?: string }) => {
        pushZespolowy.push({ config, body: payload?.body || '' });
        return { sent: 1 };
    },
    pushToUsers: async (uids: string[]) => {
        pushImienny.push({ uids });
        return { sent: uids.length };
    },
}));
vi.mock('@/lib/googleCalendar', () => ({ deleteEvent: async () => ({ success: true }) }));
vi.mock('@/lib/taskImages', () => ({
    normalizedTaskImageFields: async () => ({}),
    withSignedTaskImages: async (rows: unknown[]) => rows,
}));

/** Wiersze zadań — jedno prywatne A, jedno zespołowe. */
const ZADANIA: Record<string, Record<string, unknown>> = {
    [PRYWATNE]: {
        id: PRYWATNE,
        is_private: true,
        owner_user_id: A,
        created_by: A,
        title: 'Fryzjer 16:00',
        patient_name: 'Kowalska Anna',
        status: 'todo',
        assigned_to: [],
        checklist_items: [{ label: 'zadzwonić', done: false }],
        google_event_id: null,
    },
    [ZESPOLOWE]: {
        id: ZESPOLOWE,
        is_private: false,
        owner_user_id: A,
        created_by: A,
        title: 'Zamówić rękawiczki',
        patient_name: null,
        status: 'todo',
        assigned_to: [],
        checklist_items: [{ label: 'policzyć stan', done: false }],
        google_event_id: null,
    },
};

function zapytanie(tabela: string): any {
    const q: any = {};
    const filtry: [string, unknown][] = [];
    for (const m of ['order', 'limit', 'in', 'not', 'lte', 'gte', 'is', 'or', 'neq']) q[m] = () => q;
    q.select = () => q;
    q.eq = (kol: string, war: unknown) => { filtry.push([kol, war]); return q; };

    const idZFiltrow = () => {
        const f = filtry.find(([k]) => k === 'id' || k === 'task_id');
        return f ? String(f[1]) : '';
    };

    q.single = async () => {
        if (tabela !== 'employee_tasks') return { data: null, error: { code: 'PGRST116' } };
        const w = ZADANIA[idZFiltrow()];
        // 🪤 Prawdziwy PostgREST przy zerze wierszy zwraca BŁĄD, nie `data: null` —
        // stąd dawne 500 na nieistniejącym id. Atrapa musi to odtwarzać.
        return w ? { data: { ...w }, error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows' } };
    };
    q.maybeSingle = async () => {
        if (odczytPada) return { data: null, error: { message: 'timeout' } };
        const w = ZADANIA[idZFiltrow()];
        return { data: w ? { ...w } : null, error: null };
    };
    q.insert = (payload: unknown) => {
        zapisy.push({ tabela, op: 'insert' });
        const r: any = {
            select: () => r,
            single: async () => ({ data: { id: 'nowy', ...(payload as object) }, error: null }),
        };
        r.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(res);
        return r;
    };
    q.update = (payload: unknown) => {
        zapisy.push({ tabela, op: 'update' });
        const u: any = {};
        for (const m of ['eq', 'in', 'select']) u[m] = () => u;
        u.single = async () => {
            const w = ZADANIA[idZFiltrow()] || ZADANIA[PRYWATNE];
            return { data: { ...w, ...(payload as object) }, error: null };
        };
        u.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(res);
        return u;
    };
    q.delete = () => {
        zapisy.push({ tabela, op: 'delete' });
        const d: any = {};
        d.eq = () => d;
        d.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(res);
        return d;
    };
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res);
    return q;
}

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: (t: string) => zapytanie(t),
        // `tasks/[id]/push` buduje własnego klienta na cookie i pyta o użytkownika.
        auth: { getUser: async () => ({ data: { user: { id: ktoWola, email: 'pracownik@example.test' } } }) },
    }),
}));

const req = (body?: unknown) =>
    new Request('https://example.test/api/employee/tasks/x', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    }) as any;
const par = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
    vi.clearAllMocks();
    ktoWola = B;
    pushZespolowy = [];
    pushImienny = [];
    zapisy = [];
    odczytPada = false;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('P-040 · cudze zadanie prywatne jest niewidoczne i nietykalne', () => {
    it('🔴 GET historia → 404', async () => {
        const { GET } = await import('@/app/api/employee/tasks/[id]/route');
        expect((await GET(req(), par(PRYWATNE))).status).toBe(404);
    });

    it('🔴 PATCH → 404 i ANI JEDEN zapis', async () => {
        const { PATCH } = await import('@/app/api/employee/tasks/[id]/route');
        const res = await PATCH(req({ status: 'done' }), par(PRYWATNE));
        expect(res.status).toBe(404);
        expect(zapisy.filter(z => z.op === 'update')).toHaveLength(0);
        expect(pushZespolowy).toHaveLength(0);
    });

    it('🔴 PATCH z PUSTYM ciałem też nie odda wiersza (dawna droga odczytu)', async () => {
        const { PATCH } = await import('@/app/api/employee/tasks/[id]/route');
        const res = await PATCH(req({}), par(PRYWATNE));
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(JSON.stringify(body)).not.toContain('Fryzjer');
        expect(JSON.stringify(body)).not.toContain('Kowalska');
    });

    it('🔴 DELETE → 404 i zadanie NIE ginie', async () => {
        const { DELETE } = await import('@/app/api/employee/tasks/[id]/route');
        const res = await DELETE(req(), par(PRYWATNE));
        expect(res.status).toBe(404);
        expect(zapisy.filter(z => z.op === 'delete')).toHaveLength(0);
    });

    it('🔴 GET komentarzy → 404', async () => {
        const { GET } = await import('@/app/api/employee/tasks/[id]/comments/route');
        expect((await GET(req(), par(PRYWATNE))).status).toBe(404);
    });

    it('🔴 POST komentarza → 404, komentarz nie powstaje, push nie leci', async () => {
        const { POST } = await import('@/app/api/employee/tasks/[id]/comments/route');
        const res = await POST(req({ content: 'wtrącam się' }), par(PRYWATNE));
        expect(res.status).toBe(404);
        expect(zapisy.filter(z => z.tabela === 'task_comments')).toHaveLength(0);
        expect(pushZespolowy).toHaveLength(0);
    });

    it('🔴 ręczny push cudzego zadania prywatnego → 404 i CISZA', async () => {
        const { POST } = await import('@/app/api/employee/tasks/[id]/push/route');
        const res = await POST(req(), par(PRYWATNE));
        expect(res.status).toBe(404);
        expect(pushZespolowy).toHaveLength(0);
    });
});

describe('P-040 · właściciel nie stracił nic', () => {
    beforeEach(() => { ktoWola = A; });

    it('GET historia własnego prywatnego → 200', async () => {
        const { GET } = await import('@/app/api/employee/tasks/[id]/route');
        expect((await GET(req(), par(PRYWATNE))).status).toBe(200);
    });

    it('PATCH własnego prywatnego → 200 i zapis idzie', async () => {
        const { PATCH } = await import('@/app/api/employee/tasks/[id]/route');
        expect((await PATCH(req({ status: 'done' }), par(PRYWATNE))).status).toBe(200);
        expect(zapisy.filter(z => z.op === 'update').length).toBeGreaterThan(0);
    });

    it('POST komentarza do własnego prywatnego → 201', async () => {
        const { POST } = await import('@/app/api/employee/tasks/[id]/comments/route');
        expect((await POST(req({ content: 'notatka' }), par(PRYWATNE))).status).toBe(201);
    });

    it('DELETE własnego prywatnego → 200', async () => {
        const { DELETE } = await import('@/app/api/employee/tasks/[id]/route');
        expect((await DELETE(req(), par(PRYWATNE))).status).toBe(200);
        expect(zapisy.filter(z => z.op === 'delete').length).toBeGreaterThan(0);
    });
});

describe('P-040 · zadania zespołowe działają jak dotąd (brak regresji)', () => {
    it('B edytuje zadanie zespołowe → 200', async () => {
        const { PATCH } = await import('@/app/api/employee/tasks/[id]/route');
        expect((await PATCH(req({ status: 'done' }), par(ZESPOLOWE))).status).toBe(200);
    });

    it('B czyta historię i komentarze zadania zespołowego → 200', async () => {
        const { GET } = await import('@/app/api/employee/tasks/[id]/route');
        const { GET: GETC } = await import('@/app/api/employee/tasks/[id]/comments/route');
        expect((await GET(req(), par(ZESPOLOWE))).status).toBe(200);
        expect((await GETC(req(), par(ZESPOLOWE))).status).toBe(200);
    });

    it('B wywołuje ręczny push zadania zespołowego → 200 i push leci', async () => {
        const { POST } = await import('@/app/api/employee/tasks/[id]/push/route');
        expect((await POST(req(), par(ZESPOLOWE))).status).toBe(200);
        expect(pushZespolowy).toHaveLength(1);
    });
});

describe('P-040 · grupa nie dowiaduje się o zadaniach prywatnych', () => {
    beforeEach(() => { ktoWola = A; });

    it('🔴 zmiana statusu prywatnego → ZERO pushy zespołowych', async () => {
        const { PATCH } = await import('@/app/api/employee/tasks/[id]/route');
        await PATCH(req({ status: 'done' }), par(PRYWATNE));
        expect(pushZespolowy).toHaveLength(0);
    });

    it('🔴 checklista prywatnego → ZERO pushy zespołowych', async () => {
        const { PATCH } = await import('@/app/api/employee/tasks/[id]/route');
        await PATCH(req({ checklist_items: [{ label: 'zadzwonić', done: true }] }), par(PRYWATNE));
        expect(pushZespolowy).toHaveLength(0);
    });

    it('🔴 przypisanie na prywatnym → ZERO pushy zespołowych, ale push IMIENNY zostaje', async () => {
        const { PATCH } = await import('@/app/api/employee/tasks/[id]/route');
        // 🪤 Kształt MUSI być `{ id: <uuid> }` — `assigneeUserIds` czyta pole `id`
        // i odsiewa wszystko, co nie jest UUID-em (pracownicy bez konta mają `emp-<n>`).
        await PATCH(req({ assigned_to: [{ id: B }] }), par(PRYWATNE));
        expect(pushZespolowy).toHaveLength(0);
        expect(pushImienny).toHaveLength(1);
        expect(pushImienny[0].uids).toContain(B);
    });

    it('🔴 komentarz do prywatnego → komentarz zapisany, push zespołowy NIE', async () => {
        const { POST } = await import('@/app/api/employee/tasks/[id]/comments/route');
        expect((await POST(req({ content: 'moja notatka' }), par(PRYWATNE))).status).toBe(201);
        expect(pushZespolowy).toHaveLength(0);
    });

    it('kontrola pozytywna: te same trzy zdarzenia na zadaniu ZESPOŁOWYM push wysyłają', async () => {
        const { PATCH } = await import('@/app/api/employee/tasks/[id]/route');
        const { POST } = await import('@/app/api/employee/tasks/[id]/comments/route');
        await PATCH(req({ status: 'done' }), par(ZESPOLOWE));
        await PATCH(req({ checklist_items: [{ label: 'policzyć stan', done: true }] }), par(ZESPOLOWE));
        await POST(req({ content: 'zrobione' }), par(ZESPOLOWE));
        expect(pushZespolowy.map(p => p.config)).toEqual(['task-status', 'task-comment', 'task-comment']);
    });
});

describe('P-040 · nieistniejące zadanie', () => {
    it('🪤 PATCH nieistniejącego id → 404, nie 500 (dawniej PGRST116 leciał jako błąd zapisu)', async () => {
        const { PATCH } = await import('@/app/api/employee/tasks/[id]/route');
        expect((await PATCH(req({ status: 'done' }), par(NIEISTNIEJACE))).status).toBe(404);
    });

    it('GET historia nieistniejącego id → 404', async () => {
        const { GET } = await import('@/app/api/employee/tasks/[id]/route');
        expect((await GET(req(), par(NIEISTNIEJACE))).status).toBe(404);
    });
});

describe('P-040 · właściciel a ręczny push (jedyne zachowanie, które naprawa ODBIERA)', () => {
    beforeEach(() => { ktoWola = A; });

    it('🔴 własne zadanie prywatne → 403 z JAWNYM powodem, nie 404, i ZERO pushy', async () => {
        const { POST } = await import('@/app/api/employee/tasks/[id]/push/route');
        const res = await POST(req(), par(PRYWATNE));

        // 404 („nie ma takiego zadania") wysłałoby właściciela szukać usterki tam, gdzie
        // jej nie ma. Panel pokazuje treść błędu, więc musi ona mówić prawdę.
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(String(body.error)).toMatch(/prywatn/i);
        expect(pushZespolowy).toHaveLength(0);
    });

    it('własne zadanie ZESPOŁOWE → 200 i push leci (nie odebraliśmy nic ponad to)', async () => {
        const { POST } = await import('@/app/api/employee/tasks/[id]/push/route');
        expect((await POST(req(), par(ZESPOLOWE))).status).toBe(200);
        expect(pushZespolowy).toHaveLength(1);
    });
});

describe('P-040 · awaria odczytu to NIE jest „nie ma takiego zadania"', () => {
    beforeEach(() => { ktoWola = A; odczytPada = true; });

    it('🔴 PATCH przy padniętym odczycie → 503, nie 404, i ZERO zapisów', async () => {
        const { PATCH } = await import('@/app/api/employee/tasks/[id]/route');
        const res = await PATCH(req({ status: 'done' }), par(ZESPOLOWE));

        // 404 przy timeoucie bazy = cicha utrata zapisu: panel weba przy odhaczaniu
        // checklisty nie sprawdza `res.ok`, więc zmiana zniknęłaby przy odświeżeniu.
        expect(res.status).toBe(503);
        expect(zapisy.filter(z => z.op === 'update')).toHaveLength(0);
    });

    it('🔴 GET historia przy padniętym odczycie → 503, nie 404', async () => {
        const { GET } = await import('@/app/api/employee/tasks/[id]/route');
        expect((await GET(req(), par(ZESPOLOWE))).status).toBe(503);
    });

    it('🔴 komentarze przy padniętym odczycie → 503, nie 404', async () => {
        const { GET } = await import('@/app/api/employee/tasks/[id]/comments/route');
        const { POST } = await import('@/app/api/employee/tasks/[id]/comments/route');
        expect((await GET(req(), par(ZESPOLOWE))).status).toBe(503);
        expect((await POST(req({ content: 'x' }), par(ZESPOLOWE))).status).toBe(503);
    });

    it('🔴 DELETE przy padniętym odczycie NIE kasuje zadania', async () => {
        const { DELETE } = await import('@/app/api/employee/tasks/[id]/route');
        const res = await DELETE(req(), par(ZESPOLOWE));
        expect(res.status).toBe(503);
        expect(zapisy.filter(z => z.op === 'delete')).toHaveLength(0);
    });
});
