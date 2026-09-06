/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST i handlerów tras Next są z natury dynamiczne: builder zwraca
 * sam siebie z dowolnej metody, a `params` bywa `Promise`. Zawężenie tych kształtów do
 * typów SDK wywala kompilację na `TS2589` (rekurencyjne generyki `SupabaseClient`).
 * Konwencja repo dla tej klasy przypadków to jawne wyłączenie z powodem, nie ciche `any`.
 */
/**
 * STRAŻNIK DŁAWIKA AKCJI WIZYTY + POGRZEB TRASY TESTOWEJ (P-087).
 *
 * 🔴 CO BYŁO ZEPSUTE — DWIE RZECZY NARAZ.
 *
 * 1. `POST /api/patients/appointments/[id]/reset-status` — trasa DEBUGOWA żyła na produkcji.
 *    Kasowała pacjentowi `attendance_confirmed`, czyli JEDYNĄ flagę, której produkcyjna
 *    ścieżka `create` nie resetuje. Po jej wyzerowaniu wolno było potwierdzać obecność
 *    w pętli, a każde potwierdzenie to e-mail + Telegram + DWA pushe do personelu
 *    + ikona w PMS. Zmierzone przed usunięciem: ZERO wywołań w webie, ZERO w apce,
 *    ZERO w wyeksportowanym bundlu — jedyne wystąpienia to sama trasa i wiersz
 *    w dokumentacji opisany jako „Dev/debug".
 *
 * 2. Trasy akcji nie miały ŻADNEGO limitu per pacjent. Skasowanie trasy testowej zamyka
 *    jedną drogę do pętli, ale nie zamyka samej pętli — dlatego dokładamy dławik.
 *    To jest krok 8 karty P-001, odłożony wtedy świadomie.
 *
 * 🔑 KUBEŁEK JEST WSPÓLNY DLA TRZECH TRAS — celowo. Osobne dałyby napastnikowi
 * trzykrotność budżetu, a z punktu widzenia recepcji to jedna klasa hałasu: każda z tych
 * akcji budzi ten sam zespół tym samym kanałem.
 *
 * 🔑 KLUCZ PO PACJENCIE, NIE PO IP — lekcja `dc1e132`: cały gabinet i operatorzy komórkowi
 * siedzą za jednym NAT-em, więc limit po adresie ucisza wszystkich naraz.
 *
 * DOWÓD, ŻE GRYZIE (cofka): usuń `guardAppointmentAction` z dowolnej trasy → pada jej test.
 * Przywróć plik `reset-status/route.ts` → pada ostatni test.
 *
 * Uruchomienie: `npx vitest run appointmentActionThrottle`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const JA = '0100001110';
const PACJENT_UUID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const MOJA_WIZYTA = '0100234418';
const WIERSZ = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

let wolaniaLimitera: { klucz: string; max: number; okno: number }[] = [];
let limitPrzepuszcza = true;
let odczytyBazy: string[] = [];
let zapisyDoPMS: string[] = [];

vi.mock('@/lib/rateLimit', () => ({
    checkRateLimit: async (klucz: string, max: number, okno: number) => {
        wolaniaLimitera.push({ klucz, max, okno });
        return { allowed: limitPrzepuszcza, remaining: limitPrzepuszcza ? 5 : 0 };
    },
    getClientIP: () => '1.2.3.4',
}));

vi.mock('@/lib/jwt', () => ({
    verifyPatientSession: async () => ({ prodentisId: JA, userId: PACJENT_UUID }),
}));

vi.mock('@/lib/prodentisFetch', () => ({
    prodentisFetch: async (path: string, opts?: { method?: string }) => {
        const method = opts?.method || 'GET';
        if (/\/future-appointments/.test(path)) {
            return {
                ok: true, status: 200,
                json: async () => ({
                    appointments: [{
                        id: MOJA_WIZYTA, date: '2026-09-11T14:30:00.000Z', patientId: JA,
                        duration: 30, doctor: { id: '0100000001', name: 'Lekarz Testowy' },
                    }],
                }),
            };
        }
        if (/\/api\/schedule\/appointment\/[0-9]+$/.test(path) && method === 'GET') {
            return {
                ok: true, status: 200,
                json: async () => ({
                    id: MOJA_WIZYTA, patientId: JA, doctorId: '0100000001',
                    doctorName: 'Lekarz Testowy', date: '2026-09-11', startTime: '16:30',
                    endTime: '17:00', duration: 30, status: 'scheduled', cancelDate: null,
                }),
            };
        }
        zapisyDoPMS.push(`${method} ${path}`);
        return { ok: true, status: 200, json: async () => ({ success: true }), text: async () => '' };
    },
    BrakKluczaPMS: class extends Error {},
    TrybDemoBezPMS: class extends Error {},
    pmsError: async () => null,
}));

function zapytanie(tabela: string): any {
    odczytyBazy.push(tabela);
    const q: any = {};
    for (const m of ['select', 'eq', 'gte', 'lt', 'lte', 'gt', 'in', 'order', 'limit', 'neq', 'is']) q[m] = () => q;
    q.single = async () =>
        tabela === 'patients'
            ? { data: { id: PACJENT_UUID, prodentis_id: JA, phone: '+48000000000' }, error: null }
            : { data: { id: WIERSZ, prodentis_id: MOJA_WIZYTA, patient_id: PACJENT_UUID, status: 'pending' }, error: null };
    q.maybeSingle = async () => q.single();
    q.insert = () => {
        const r: any = { select: () => r, single: async () => ({ data: { id: WIERSZ }, error: null }) };
        r.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(res);
        return r;
    };
    q.update = () => q;
    q.delete = () => q;
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (t: string) => zapytanie(t) }) }));

vi.mock('@/lib/careflowLifecycle', () => ({
    cancelCareflowForAppointment: async () => ({ count: 0, ambiguousEnrollmentIds: [] as string[] }),
    rescheduleCareflowForAppointment: async () => ({ count: 0, ambiguousEnrollmentIds: [] as string[] }),
    findOpenEnrollments: async () => [],
}));
vi.mock('@/lib/telegram', () => ({ sendTelegramMessage: async () => {}, notifyTelegram: async () => {} }));
vi.mock('@/lib/pushService', () => ({ broadcastPush: async () => {}, pushToUser: async () => {}, pushToUsers: async () => {} }));
vi.mock('resend', () => ({ Resend: class { emails = { send: async () => ({ data: null, error: null }) }; } }));

const req = (body: unknown = {}) =>
    new NextRequest('https://example.test/api', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer t' },
        body: JSON.stringify(body),
    });
const par = (id: string) => ({ params: Promise.resolve({ id }) });

const TRASY = [
    { nazwa: 'cancel', modul: '@/app/api/patients/appointments/[id]/cancel/route', body: { reason: 'test' } },
    { nazwa: 'reschedule', modul: '@/app/api/patients/appointments/[id]/reschedule/route', body: { reason: 'test' } },
    { nazwa: 'confirm-attendance', modul: '@/app/api/patients/appointments/[id]/confirm-attendance/route', body: {} },
];

beforeEach(() => {
    vi.clearAllMocks();
    wolaniaLimitera = [];
    odczytyBazy = [];
    zapisyDoPMS = [];
    limitPrzepuszcza = true;
    delete process.env.APPT_ACTION_RATE_LIMIT_OFF;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.PRODENTIS_API_KEY = 'klucz-testowy';
});

describe('P-087 · dławik akcji wizyty', () => {
    for (const t of TRASY) {
        it(`🔴 ${t.nazwa}: przekroczony limit → 429, ZERO odczytów bazy, ZERO zapisów do PMS`, async () => {
            limitPrzepuszcza = false;
            const { POST } = await import(t.modul);
            const res = await POST(req(t.body), par(WIERSZ));

            expect(res.status).toBe(429);
            expect(res.headers.get('Retry-After')).toBeTruthy();
            // Dławik ma OSZCZĘDZAĆ bazę i PMS, nie tylko liczyć — stoi przed odczytem.
            expect(odczytyBazy).toHaveLength(0);
            expect(zapisyDoPMS).toHaveLength(0);
        });
    }

    it('🔑 wszystkie trzy trasy dzielą JEDEN kubełek — inaczej budżet jest potrójny', async () => {
        for (const t of TRASY) {
            const { POST } = await import(t.modul);
            await POST(req(t.body), par(WIERSZ));
        }
        expect(wolaniaLimitera).toHaveLength(3);
        const klucze = new Set(wolaniaLimitera.map(w => w.klucz));
        expect(klucze.size).toBe(1);
        // Klucz po PACJENCIE, nie po IP: cały gabinet siedzi za jednym NAT-em.
        expect([...klucze][0]).toContain(JA);
    });

    it('limit przepuszcza → akcja idzie normalnie', async () => {
        const { POST } = await import(TRASY[2].modul);
        const res = await POST(req({}), par(WIERSZ));
        expect(res.status).toBeLessThan(400);
        expect(odczytyBazy.length).toBeGreaterThan(0);
    });

    it('🪤 wyłącznik APPT_ACTION_RATE_LIMIT_OFF=1 przepuszcza mimo odmowy licznika', async () => {
        limitPrzepuszcza = false;
        process.env.APPT_ACTION_RATE_LIMIT_OFF = '1';
        const { POST } = await import(TRASY[2].modul);
        const res = await POST(req({}), par(WIERSZ));
        expect(res.status).not.toBe(429);
    });

    it('🪤 niezalogowany NIE wypala cudzego kubełka — 401 przed licznikiem', async () => {
        vi.resetModules();
        vi.doMock('@/lib/jwt', () => ({ verifyPatientSession: async () => null }));
        const { POST } = await import(TRASY[2].modul);
        const res = await POST(req({}), par(WIERSZ));
        expect(res.status).toBe(401);
        expect(wolaniaLimitera).toHaveLength(0);
        vi.doUnmock('@/lib/jwt');
        vi.resetModules();
    });
});

describe('P-087 · trasa debugowa nie żyje', () => {
    it('🔴 reset-status nie istnieje w drzewie tras', async () => {
        const { existsSync } = await import('node:fs');
        // Kontrola pozytywna miernika: katalog akcji istnieje, więc ścieżka jest realna.
        expect(existsSync('src/app/api/patients/appointments/[id]/cancel/route.ts')).toBe(true);
        expect(existsSync('src/app/api/patients/appointments/[id]/reset-status/route.ts')).toBe(false);
    });
});
