/**
 * STRAŻNIK KANAŁÓW ZESPOŁOWYCH — zadania prywatne nie trafiają na wspólny Telegram (P-040).
 * Dwa crony, bo obie drogi prowadzą na TEN SAM kanał całej kliniki.
 *
 * 🔴 CO BYŁO ZEPSUTE. Poranny raport wypisywał TYTUŁY wszystkich zaległych zadań na kanał
 * zespołu, bez pytania o `is_private`. Tytuł zadania prywatnego to w tym gabinecie
 * dosłownie „Fryzjer 16:00" albo nazwisko — i szedł codziennie o 6:30 do całej ekipy.
 *
 * 🔑 Osobny plik, bo cron ma własny komplet atrap (Telegram, PMS, bicie serca) i vi.mock
 * z `taskAccess.test.ts` by się z nimi pobił.
 *
 * DOWÓD, ŻE GRYZIE (cofka): usuń `.filter(teamMayHear)` w `cron/daily-report/route.ts`
 * → pierwszy test pada, bo tytuł prywatnego wraca do wiadomości.
 *
 * Uruchomienie: `npx vitest run dailyReportPrivateTasks`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const TYTUL_PRYWATNY = 'Fryzjer 16:00 — sprawa osobista';
const TYTUL_ZESPOLOWY = 'Zamowic rekawiczki rozmiar M';

let wyslaneDoTelegrama: string[] = [];

vi.mock('@/lib/demoMode', () => ({ isDemoMode: false }));
vi.mock('@/lib/telegram', () => ({
    sendTelegramNotification: async (msg: string) => { wyslaneDoTelegrama.push(msg); return true; },
}));
vi.mock('@/lib/cronHeartbeat', () => ({ logCronHeartbeat: async () => {} }));
vi.mock('@/lib/authGuards', () => ({ requireAdmin: async () => ({ ok: true }) }));
vi.mock('@/lib/pushService', () => ({
    sendPushToGroups: async () => ({ sent: 0 }),
    sendPushToSpecificUsers: async () => ({ sent: 0 }),
}));
vi.mock('@/lib/prodentisFetch', () => ({
    prodentisFetch: async () => ({ ok: true, status: 200, json: async () => ({ appointments: [] }) }),
    BrakKluczaPMS: class extends Error {},
    TrybDemoBezPMS: class extends Error {},
    pmsError: async () => null,
}));

/** Dwa zaległe zadania: jedno prywatne, jedno zespołowe. Oba z tą samą datą. */
const ZADANIA = [
    { id: '1', title: TYTUL_PRYWATNY, due_date: '2000-01-01', priority: 'high', is_private: true,
      created_at: new Date(Date.now() - 86400000).toISOString(), checklist_items: [], patient_name: 'Kowalska Anna' },
    { id: '2', title: TYTUL_ZESPOLOWY, due_date: '2000-01-01', priority: 'normal', is_private: false,
      created_at: new Date(Date.now() - 86400000).toISOString(), checklist_items: [], patient_name: null },
    // 🔑 Zadanie dyktowane: `tasks/ai-parse` tworzy WYŁĄCZNIE `is_private: true`, typowo
    // bez terminu — czyli dokładnie ten kształt, który wpadał w „ZADANIA BEZ DATY".
    { id: '3', title: 'Notatka glosowa: sprawa osobista', due_date: null, priority: 'normal', is_private: true,
      created_at: new Date(Date.now() - 86400000).toISOString(), checklist_items: [], patient_name: 'Nowak Jan' },
];

function zapytanie(tabela: string): any {
    const q: any = {};
    for (const m of ['select', 'eq', 'in', 'not', 'lte', 'gte', 'lt', 'gt', 'is', 'or', 'order', 'limit', 'neq']) {
        q[m] = () => q;
    }
    q.single = async () => ({ data: null, error: null });
    q.maybeSingle = async () => ({ data: null, error: null });
    q.then = (res: (v: unknown) => unknown) =>
        Promise.resolve({ data: tabela === 'employee_tasks' ? ZADANIA : [], error: null }).then(res);
    return q;
}

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: (t: string) => zapytanie(t) }),
}));

beforeEach(() => {
    vi.clearAllMocks();
    wyslaneDoTelegrama = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.CRON_SECRET = 'sekret';
    process.env.PRODENTIS_API_KEY = 'klucz-testowy';
});

const req = () =>
    new NextRequest('https://example.test/api/cron/daily-report', {
        headers: { authorization: 'Bearer sekret' },
    });

describe('P-040 · poranny raport na Telegramie', () => {
    it('🔴 SEDNO: tytuł zadania PRYWATNEGO nie pojawia się w wiadomości', async () => {
        const { GET } = await import('@/app/api/cron/daily-report/route');
        await GET(req());

        const tresc = wyslaneDoTelegrama.join('\n');
        // Kontrola pozytywna miernika: wiadomość w ogóle poszła i zawiera blok zadań.
        expect(wyslaneDoTelegrama.length).toBeGreaterThan(0);
        expect(tresc).toContain('Zadania');
        expect(tresc).not.toContain('Fryzjer');
    });

    it('kontrola negatywna: tytuł zadania ZESPOŁOWEGO nadal jest w raporcie', async () => {
        const { GET } = await import('@/app/api/cron/daily-report/route');
        await GET(req());
        expect(wyslaneDoTelegrama.join('\n')).toContain('rekawiczki');
    });
});

describe('P-040 · raport dzienny nie kłamie, że zaległych nie ma', () => {
    it('🔴 gdy JEDYNE zaległe zadania są prywatne, raport NIE mówi „Brak zaległych"', async () => {
        // Zostawiamy w bazie same prywatne — zespołowe znika z listy.
        const kopia = ZADANIA.splice(1, 1);
        try {
            const { GET } = await import('@/app/api/cron/daily-report/route');
            await GET(req());
            const tresc = wyslaneDoTelegrama.join('\n');
            expect(tresc).not.toContain('Brak zaległych zadań');
            expect(tresc).toContain('Prywatne (pominięte)');
            expect(tresc).not.toContain('Fryzjer');
        } finally {
            ZADANIA.splice(1, 0, ...kopia);
        }
    });
});

describe('P-040 · cron przypomnień o zadaniach (drugi kanał na ten sam Telegram)', () => {
    it('🔴 SEDNO: zadanie prywatne BEZ DATY (dyktowane) nie idzie na kanał zespołu', async () => {
        const { GET } = await import('@/app/api/cron/task-reminders/route');
        await GET(req() as any);

        const tresc = wyslaneDoTelegrama.join('\n');
        expect(tresc).not.toContain('Notatka glosowa');
        expect(tresc).not.toContain('Nowak Jan');
        expect(tresc).not.toContain('Fryzjer');
        expect(tresc).not.toContain('Kowalska');
    });
});
