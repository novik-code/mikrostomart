/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST są z natury dynamiczne. Konwencja repo: jawne wyłączenie.
 */
/**
 * STRAŻNIK RĘCZNEGO ODPALANIA CRONÓW (P-021).
 *
 * 🔴 CO BYŁO ZEPSUTE. Ręczna gałąź `GET /api/cron/daily-article`, `/api/cron/youtube-sync`
 * i `GET /api/fix-db-images` stała na `verifyAdmin()` — a ta funkcja, wbrew nazwie,
 * sprawdza WYŁĄCZNIE istnienie sesji Supabase, nie rolę. `/api/cron` nie jest w
 * `PROTECTED_PREFIXES`, więc nie było też bramki 2FA, limitu prób ani wpisu audytu.
 * Każdy zalogowany PRACOWNIK mógł odpalić generację artykułu przez OpenAI, sync YouTube
 * i zapis obrazów produktów.
 *
 * 🪤 NAZWA FUNKCJI KŁAMAŁA. `verifyAdmin` brzmi jak sprawdzenie roli i przez to trafiła
 * do trzech tras jako „bramka admina". Rolę sprawdza `requireAdmin` z `lib/authGuards`.
 * `daily-article` miał wejść w S1-4 (`9f3fa64`) i został pominięty, `youtube-sync`
 * skopiował wzorzec, `fix-db-images` odłożono świadomie jako debug — trzy razy ten sam
 * błąd z jednego mylącego imienia.
 *
 * 🔑 TOR CRONA NIETKNIĘTY: `Bearer CRON_SECRET` działa jak dotąd, bo to nim Vercel
 * odpala harmonogram. Zmienia się wyłącznie gałąź RĘCZNA.
 *
 * DOWÓD, ŻE GRYZIE (cofka): przywróć `verifyAdmin()` w dowolnej z tras → pada jej test.
 *
 * Uruchomienie: `npx vitest run manualCronAdminOnly`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

let role: string[] = ['employee'];
let jestSesja = true;
let wykonano: string[] = [];

vi.mock('@/lib/auth', () => ({
    verifyAdmin: async () => (jestSesja ? { id: 'u1', email: 'pracownik@example.test' } : null),
}));
vi.mock('@/lib/authGuards', () => ({
    requireAdmin: async () =>
        !jestSesja
            ? { ok: false, response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) }
            : role.includes('admin')
              ? { ok: true, user: { id: 'u1', email: 'admin@example.test' }, roles: role }
              : { ok: false, response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }) },
    requireEmployeeOrAdmin: async () => ({ ok: true, user: { id: 'u1', email: 'p@example.test' }, roles: role }),
}));
vi.mock('@/lib/auditLog', () => ({ logAudit: async () => {} }));
vi.mock('@/lib/telegram', () => ({ sendTelegramNotification: async () => true, notifyTelegram: async () => {} }));
vi.mock('@/lib/cronHeartbeat', () => ({ logCronHeartbeat: async () => {} }));
vi.mock('@/lib/demoMode', () => ({ isDemoMode: false }));
vi.mock('openai', () => ({ default: class { chat = { completions: { create: async () => { wykonano.push('openai'); return { choices: [{ message: { content: '{}' } }] }; } } }; } }));

function zapytanie(): any {
    const q: any = {};
    for (const m of ['select', 'eq', 'in', 'order', 'limit', 'is', 'neq', 'gte', 'lte', 'not']) q[m] = () => q;
    q.single = async () => ({ data: null, error: { message: 'brak' } });
    q.maybeSingle = async () => ({ data: null, error: null });
    q.update = () => { wykonano.push('update'); return q; };
    q.insert = () => { wykonano.push('insert'); const r: any = { select: () => r, single: async () => ({ data: null, error: null }) }; r.then = (res: any) => Promise.resolve({ data: null, error: null }).then(res); return r; };
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => zapytanie(), storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: 'x' } }) }) } }) }));

const TRASY = [
    { nazwa: 'cron/daily-article', modul: '@/app/api/cron/daily-article/route', adres: 'https://example.test/api/cron/daily-article' },
    { nazwa: 'cron/youtube-sync', modul: '@/app/api/cron/youtube-sync/route', adres: 'https://example.test/api/cron/youtube-sync' },
    { nazwa: 'fix-db-images', modul: '@/app/api/fix-db-images/route', adres: 'https://example.test/api/fix-db-images' },
];

const get = (adres: string, naglowki: Record<string, string> = {}) => new NextRequest(adres, { headers: naglowki });

beforeEach(() => {
    vi.clearAllMocks();
    role = ['employee'];
    jestSesja = true;
    wykonano = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.CRON_SECRET = 'sekret-crona';
});

describe('P-021 · ręczne odpalenie tylko dla ADMINA', () => {
    for (const t of TRASY) {
        it(`🔴 ${t.nazwa}: zalogowany PRACOWNIK bez roli admin → 403`, async () => {
            const { GET } = await import(t.modul);
            const res = await GET(get(t.adres));
            expect(res.status).toBe(403);
        });

        it(`${t.nazwa}: anonim → 401`, async () => {
            jestSesja = false;
            const { GET } = await import(t.modul);
            expect((await GET(get(t.adres))).status).toBe(401);
        });
    }

    it('🔑 tor CRONA nietknięty: `Bearer CRON_SECRET` przechodzi mimo braku roli', async () => {
        role = [];
        const { GET } = await import('@/app/api/cron/youtube-sync/route');
        const res = await GET(get('https://example.test/api/cron/youtube-sync', { authorization: 'Bearer sekret-crona' }));
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
    });

    it('admin dalej może odpalić ręcznie', async () => {
        role = ['admin'];
        const { GET } = await import('@/app/api/cron/youtube-sync/route');
        const res = await GET(get('https://example.test/api/cron/youtube-sync'));
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
    });
});
