/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST i handlerów tras Next są z natury dynamiczne. Zawężenie do typów SDK
 * wywala kompilację na `TS2589`. Konwencja repo: jawne wyłączenie z powodem.
 */
/**
 * STRAŻNIK: POTWIERDZONEJ WIZYTY NIE DA SIĘ ODWOŁAĆ ANI PRZEŁOŻYĆ — ŻADNĄ Z DRÓG PACJENTA.
 *
 * 🔴 CO BYŁO ZEPSUTE (zgłoszenie właściciela 18.09.2026). Pacjenci potwierdzali wizytę, a potem ją
 * odwoływali. Publiczne `POST /api/appointments/cancel` (strona z linku SMS i ekran pusha w apce)
 * w ogóle nie sprawdzało potwierdzenia — zmierzone: 48 z 52 odwołań pacjentów w 90 dni szło tędy.
 * Do tego strona z linku przy ponownym wejściu znów pokazywała „Odwołuję”, a SMS po odwołaniu
 * podawał nieistniejący numer 77 454 24 24.
 *
 * Strażnik WYKONUJE prawdziwe trasy (publiczne cancel/confirm/state, strefa cancel/reschedule/status)
 * i patrzy na SKUTKI: status, `code`, zapisy w bazie, zapisy do PMS, powiadomienia recepcji.
 * Kontrole pozytywne pilnują, że niepotwierdzona wizyta dalej się odwołuje (inaczej strażnik
 * przechodziłby na pustej trasie).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { KOD_WIZYTA_ODWOLANA, KOD_WIZYTA_POTWIERDZONA } from '@/lib/deklaracjaPotwierdzenia';

const TOKEN = 'TestowyTokenLinku'; // gitleaks:allow — fikcyjny token atrapy (same litery)
const WIERSZ_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const PACJENT_UUID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const JA = '0100001110';
const WIZYTA = '0100234418';

let wiersz: Record<string, unknown> = {};
/** Inne wiersze TEJ SAMEJ wizyty (duplikaty z `/create`) — widoczne dla zapytań listowych i `maybeSingle`. */
let blizniaki: Record<string, unknown>[] = [];
let zapisyBazy: Record<string, unknown>[] = [];
let zapisyPMS: { path: string; method: string }[] = [];
let powiadomienia: string[] = [];
let sms: string[] = [];
let kluczeLimitu: string[] = [];
const LEKARZ = '0100000024';
/** Wolne terminy PMS (`/api/slots/free`) dla testów przełożenia; `null` = PMS nie odpowiada. */
let wolneSloty: { doctor: string; start: string }[] | null = [];
let zapytaniaSlotow: string[] = [];
let dlugoscWizytyPms = 30;

vi.mock('@/lib/rateLimit', () => ({
    checkRateLimit: async (klucz: string) => { kluczeLimitu.push(klucz); return { allowed: true, remaining: 9 }; },
    getClientIP: () => '1.2.3.4',
}));
vi.mock('@/lib/jwt', () => ({ verifyPatientSession: async () => ({ prodentisId: JA }) }));
vi.mock('@/lib/telegram', () => ({
    sendTelegramNotification: async () => { powiadomienia.push('telegram'); return true; },
    sendTelegramMessage: async () => { powiadomienia.push('telegram'); return true; },
    notifyTelegram: async () => { powiadomienia.push('telegram'); },
}));
vi.mock('@/lib/pushService', () => ({
    broadcastPush: async () => { powiadomienia.push('push'); return { sent: 0, failed: 0 }; },
    pushToUser: async () => { powiadomienia.push('push'); return { sent: 0, failed: 0 }; },
    pushToUsers: async () => { powiadomienia.push('push'); return { sent: 0, failed: 0 }; },
}));
vi.mock('@/lib/pushHealth', () => ({ recordPushPath: async () => {} }));
vi.mock('@/lib/smsService', () => ({ sendSMS: async (o: { message: string }) => { sms.push(o.message); return { success: true }; } }));
vi.mock('@/lib/emailSender', () => ({ sendEmail: async () => ({ success: true }) }));
vi.mock('@/lib/careflowLifecycle', () => ({
    cancelCareflowForAppointment: async () => ({ count: 0, ambiguousEnrollmentIds: [] as string[] }),
    rescheduleCareflowForAppointment: async () => ({ count: 0, ambiguousEnrollmentIds: [] as string[] }),
    findOpenEnrollments: async () => [],
}));
vi.mock('@/lib/prodentisFetch', () => ({
    prodentisFetch: async (path: string, opts?: { method?: string }) => {
        const method = opts?.method || 'GET';
        if (/\/future-appointments/.test(path)) {
            return { ok: true, status: 200, json: async () => ({ appointments: [{ id: WIZYTA, patientId: JA, date: '2099-01-01T10:00:00.000Z' }] }) };
        }
        if (/\/api\/schedule\/appointment\/[0-9]+$/.test(path) && method === 'GET') {
            return { ok: true, status: 200, json: async () => ({ id: WIZYTA, patientId: JA, doctorId: LEKARZ, duration: dlugoscWizytyPms, date: '2099-01-01', startTime: '11:00', status: 'scheduled' }) };
        }
        if (/\/api\/slots\/free/.test(path)) {
            zapytaniaSlotow.push(path);
            if (wolneSloty === null) return { ok: false, status: 503, json: async () => ({}) };
            const sloty = wolneSloty;
            return { ok: true, status: 200, json: async () => sloty };
        }
        zapisyPMS.push({ path, method });
        return { ok: true, status: 200, json: async () => ({ success: true, newEndTime: '11:30' }), text: async () => '' };
    },
    BrakKluczaPMS: class extends Error {},
    TrybDemoBezPMS: class extends Error {},
    pmsError: async () => null,
}));

function zapytanie(tabela: string): any {
    const q: any = {};
    const filtry: [string, unknown][] = [];
    const filtryIn: [string, unknown[]][] = [];
    const zakresy: [string, 'gte' | 'lt', string][] = [];
    let zapis = false;
    for (const m of ['select', 'order', 'limit', 'lte', 'gt', 'is', 'neq', 'not']) q[m] = () => q;
    q.eq = (k: string, v: unknown) => { if (!zapis) filtry.push([k, v]); return q; };
    q.in = (k: string, v: unknown[]) => { if (!zapis) filtryIn.push([k, v]); return q; };
    q.gte = (k: string, v: string) => { if (!zapis) zakresy.push([k, 'gte', v]); return q; };
    q.lt = (k: string, v: string) => { if (!zapis) zakresy.push([k, 'lt', v]); return q; };
    const pasujeDo = (w: Record<string, unknown>) =>
        filtry.every(([k, v]) => w[k] === undefined || String(w[k]) === String(v))
        && filtryIn.every(([k, vs]) => w[k] === undefined || vs.map(String).includes(String(w[k])))
        && zakresy.every(([k, op, v]) => {
            if (w[k] === undefined) return true;
            const a = Date.parse(String(w[k])), b = Date.parse(v);
            return op === 'gte' ? a >= b : a < b;
        });
    const pasuje = () => pasujeDo(wiersz);
    const wiersze = () => [wiersz, ...blizniaki].filter(pasujeDo).map((w) => ({ ...w }));
    q.single = async () => {
        if (tabela === 'patients') return { data: { id: PACJENT_UUID, prodentis_id: JA, phone: '+48000000000' }, error: null };
        return pasuje() ? { data: { ...wiersz }, error: null } : { data: null, error: { message: 'brak' } };
    };
    q.maybeSingle = async () => ({ data: tabela === 'appointment_actions' ? (wiersze()[0] ?? null) : null, error: null });
    q.update = (d: Record<string, unknown>) => { zapis = true; zapisyBazy.push({ tabela, ...d }); return q; };
    q.insert = (d: Record<string, unknown>) => {
        zapisyBazy.push({ tabela, insert: true, ...d });
        const r: any = { select: () => r, single: async () => ({ data: { id: 'x' }, error: null }) };
        r.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(res);
        return r;
    };
    q.delete = () => { zapis = true; return q; };
    q.then = (res: (v: unknown) => unknown) =>
        Promise.resolve({ data: tabela === 'appointment_actions' && !zapis ? wiersze() : [], error: null }).then(res);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (t: string) => zapytanie(t) }) }));
vi.mock('resend', () => ({ Resend: class { emails = { send: async () => ({ data: null, error: null }) }; } }));

const post = (url: string, body: unknown) =>
    new NextRequest(`https://example.test${url}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer t' },
        body: JSON.stringify(body),
    });
const get = (url: string) => new NextRequest(`https://example.test${url}`, { headers: { authorization: 'Bearer t' } });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

const za3dni = () => new Date(Date.now() + 3 * 24 * 3600_000).toISOString();

beforeEach(() => {
    vi.clearAllMocks();
    zapisyBazy = []; zapisyPMS = []; powiadomienia = []; sms = []; kluczeLimitu = []; blizniaki = [];
    wolneSloty = [{ doctor: LEKARZ, start: '2099-02-01T10:00:00' }]; zapytaniaSlotow = []; dlugoscWizytyPms = 30;
    wiersz = {
        id: WIERSZ_ID, patient_id: PACJENT_UUID, prodentis_id: WIZYTA, confirmation_token: TOKEN,
        appointment_date: za3dni(), doctor_name: 'Lekarz Testowy', patient_name: 'Pacjent Testowy',
        status: 'pending', attendance_confirmed: false, cancellation_requested: false, reschedule_requested: false,
    };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.PRODENTIS_API_KEY = 'klucz-testowy';
});

describe('publiczne odwołanie po tokenie (link SMS, ekran pusha w apce)', () => {
    const odwolaj = async () => {
        const { POST } = await import('@/app/api/appointments/cancel/route');
        const res = await POST(post('/api/appointments/cancel', { token: TOKEN }));
        return { status: res.status, body: await res.json() };
    };

    it('🔴 SEDNO: potwierdzona wizyta → 409 z pouczeniem, ZERO zapisów, ZERO alarmów do recepcji', async () => {
        wiersz.attendance_confirmed = true;
        const { status, body } = await odwolaj();
        expect(status).toBe(409);
        expect(body.code).toBe(KOD_WIZYTA_POTWIERDZONA);
        expect(body.locked).toBe(true);
        // `error` to zdanie dla człowieka (apka 1.3.x pokazuje je wprost) — z numerem i regulaminem
        expect(body.error).toMatch(/nie można już odwołać/);
        expect(body.error).toMatch(/Regulaminem gabinetu/);
        expect(body.error).toMatch(/570 270 470/);
        expect(zapisyBazy).toEqual([]);
        expect(powiadomienia).toEqual([]);
    });

    it('🔴 blokada patrzy na FLAGĘ, nie na status — cron nadpisuje status na „pending”', async () => {
        wiersz.attendance_confirmed = true;
        wiersz.status = 'pending';
        expect((await odwolaj()).status).toBe(409);
    });

    it('🔴 blokada stoi PRZED oknem 2 h — potwierdzony pacjent tuż przed wizytą dostaje pouczenie, nie angielskie „Cancellation must be…”', async () => {
        wiersz.attendance_confirmed = true;
        wiersz.appointment_date = new Date(Date.now() + 60 * 60_000).toISOString();
        const { status, body } = await odwolaj();
        expect(status).toBe(409);
        expect(body.code).toBe(KOD_WIZYTA_POTWIERDZONA);
    });

    it('kontrola pozytywna: NIEpotwierdzoną wizytę (flaga false albo null) dalej da się odwołać', async () => {
        for (const flaga of [false, null]) {
            zapisyBazy = []; powiadomienia = [];
            wiersz.attendance_confirmed = flaga;
            const { status, body } = await odwolaj();
            expect(status).toBe(200);
            expect(body.success).toBe(true);
            expect(zapisyBazy.some((z) => z.status === 'reschedule_requested')).toBe(true);
            expect(powiadomienia.length).toBeGreaterThan(0);
        }
    });
});

describe('publiczne potwierdzenie po tokenie', () => {
    const potwierdz = async () => {
        const { POST } = await import('@/app/api/appointments/confirm/route');
        const res = await POST(post('/api/appointments/confirm', { token: TOKEN }));
        return { status: res.status, body: await res.json() };
    };

    it('🔴 wizyty ODWOŁANEJ linkiem nie da się potwierdzić — inaczej blokada zamroziłaby odwołaną wizytę', async () => {
        for (const stan of [{ status: 'reschedule_requested' }, { status: 'cancelled' }, { cancellation_requested: true }]) {
            zapisyBazy = []; powiadomienia = [];
            Object.assign(wiersz, { status: 'pending', cancellation_requested: false }, stan);
            const { status, body } = await potwierdz();
            expect(status).toBe(409);
            expect(body.code).toBe(KOD_WIZYTA_ODWOLANA);
            expect(zapisyBazy).toEqual([]);
            expect(powiadomienia).toEqual([]);
        }
    });

    it('potwierdzenie i ponowne potwierdzenie niosą `locked: true` (addytywnie)', async () => {
        const pierwsze = await potwierdz();
        expect(pierwsze.status).toBe(200);
        expect(pierwsze.body.locked).toBe(true);
        expect(zapisyBazy.some((z) => z.attendance_confirmed === true)).toBe(true);

        wiersz.attendance_confirmed = true;
        const ponowne = await potwierdz();
        expect(ponowne.body.alreadyConfirmed).toBe(true);
        expect(ponowne.body.locked).toBe(true);
    });
});

describe('stan wizyty po tokenie — wyłącznie tak/nie (decyzja właściciela)', () => {
    const stan = async (body: unknown) => {
        const { POST } = await import('@/app/api/appointments/state/route');
        const res = await POST(post('/api/appointments/state', body));
        return { status: res.status, body: await res.json() };
    };

    it('oddaje DOKŁADNIE {confirmed, cancelled} — bez danych osobowych i danych wizyty', async () => {
        wiersz.attendance_confirmed = true;
        const { status, body } = await stan({ token: TOKEN });
        expect(status).toBe(200);
        expect(body).toEqual({ confirmed: true, cancelled: false });

        Object.assign(wiersz, { attendance_confirmed: false, status: 'reschedule_requested' });
        expect((await stan({ token: TOKEN })).body).toEqual({ confirmed: false, cancelled: true });
    });

    it('🪤 osobny kubełek limitu — otwieranie strony nie zjada budżetu potwierdzenia (`apptpublic:`)', async () => {
        await stan({ token: TOKEN });
        expect(kluczeLimitu).toEqual([`apptstate:${TOKEN}`]);
    });

    it('zły token → 400, nieznany → 404', async () => {
        expect((await stan({ token: 'x' })).status).toBe(400);
        expect((await stan({})).status).toBe(400);
        wiersz.confirmation_token = 'InnyTokenLinku'; // gitleaks:allow — atrapa
        expect((await stan({ token: TOKEN })).status).toBe(404);
    });
});

describe('strefa pacjenta (apka panel, strona) — odwołanie, przełożenie, status', () => {
    it('🔴 odwołanie potwierdzonej → 400 z `code`, ZERO zapisów do PMS i w bazie', async () => {
        wiersz.attendance_confirmed = true;
        const { POST } = await import('@/app/api/patients/appointments/[id]/cancel/route');
        const res = await POST(post('/x', { reason: 'test' }), params(WIERSZ_ID));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.code).toBe(KOD_WIZYTA_POTWIERDZONA);
        expect(body.error).toMatch(/570 270 470/);
        expect(zapisyPMS).toEqual([]);
        expect(zapisyBazy).toEqual([]);
    });

    it('🔴 przełożenie potwierdzonej → 400 z `code`, ZERO zapisów do PMS', async () => {
        wiersz.attendance_confirmed = true;
        const { POST } = await import('@/app/api/patients/appointments/[id]/reschedule/route');
        const res = await POST(post('/x', { newDate: '2099-02-01', newStartTime: '10:00' }), params(WIERSZ_ID));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.code).toBe(KOD_WIZYTA_POTWIERDZONA);
        expect(body.error).toMatch(/nie można już przełożyć/);
        expect(zapisyPMS).toEqual([]);
    });

    it('kontrola pozytywna + numer w SMS: niepotwierdzona wizyta się odwołuje, a SMS podaje 570 270 470 (nie nieistniejący 77 454 24 24)', async () => {
        const { POST } = await import('@/app/api/patients/appointments/[id]/cancel/route');
        const res = await POST(post('/x', { reason: 'test' }), params(WIERSZ_ID));
        expect(res.status).toBe(200);
        expect(zapisyPMS.some((z) => z.method === 'DELETE')).toBe(true);
        expect(sms).toHaveLength(1);
        expect(sms[0]).toMatch(/570 270 470/);
        expect(sms[0]).not.toMatch(/77 454/);
    });

    it('status: potwierdzona → brak przycisków odwołania i przełożenia + `lockedAfterConfirmation` (stare binarki chowają przyciski po canCancel/canReschedule)', async () => {
        const { GET } = await import('@/app/api/patients/appointments/[id]/status/route');
        wiersz.attendance_confirmed = true;
        const zablokowana = await (await GET(get('/x'), params(WIERSZ_ID))).json();
        expect(zablokowana.actions.canCancel).toBe(false);
        expect(zablokowana.actions.canReschedule).toBe(false);
        expect(zablokowana.lockedAfterConfirmation).toBe(true);

        wiersz.attendance_confirmed = false;
        const wolna = await (await GET(get('/x'), params(WIERSZ_ID))).json();
        expect(wolna.actions.canCancel).toBe(true);
        expect(wolna.actions.canReschedule).toBe(true);
        expect(wolna.lockedAfterConfirmation).toBe(false);
    });
});

/**
 * 🔴 PRZEGLĄD ADWERSARYJNY 18.09 (30 agentów, 13 zgłoszeń utrzymanych) — przypadki, których
 * pierwsza wersja strażnika nie wykonywała. Każdy woła prawdziwą trasę.
 */
describe('przegląd 18.09 — blokada per WIZYTA, nie per wiersz', () => {
    const BLIZNIAK = {
        id: 'cccccccc-3333-4333-8333-cccccccccccc', patient_id: PACJENT_UUID, prodentis_id: '100234418',
        confirmation_token: 'InnyTokenBlizniaka', appointment_date: za3dni(), status: 'pending',
        attendance_confirmed: true, cancellation_requested: false, reschedule_requested: false,
    };

    it('🔴 odwołanie w strefie na NIEpotwierdzonym duplikacie, gdy potwierdzony jest inny wiersz tej wizyty → 400, ZERO DELETE w PMS', async () => {
        blizniaki = [BLIZNIAK]; // ten sam numer wizyty zapisany bez zera wiodącego
        const { POST } = await import('@/app/api/patients/appointments/[id]/cancel/route');
        const res = await POST(post('/x', { reason: 'test' }), params(WIERSZ_ID));
        expect(res.status).toBe(400);
        expect((await res.json()).code).toBe(KOD_WIZYTA_POTWIERDZONA);
        expect(zapisyPMS).toEqual([]);
    });

    it('🔴 to samo dla przełożenia i dla publicznego linku', async () => {
        blizniaki = [BLIZNIAK];
        const { POST: przeloz } = await import('@/app/api/patients/appointments/[id]/reschedule/route');
        const r1 = await przeloz(post('/x', { newDate: '2099-02-01', newStartTime: '10:00' }), params(WIERSZ_ID));
        expect(r1.status).toBe(400);
        expect(zapisyPMS).toEqual([]);

        const { POST: odwolajLink } = await import('@/app/api/appointments/cancel/route');
        const r2 = await odwolajLink(post('/api/appointments/cancel', { token: TOKEN }));
        expect(r2.status).toBe(409);
        expect(zapisyBazy).toEqual([]);
    });

    it('kontrola pozytywna: bliźniak NIEpotwierdzony nie blokuje', async () => {
        blizniaki = [{ ...BLIZNIAK, attendance_confirmed: false }];
        const { POST } = await import('@/app/api/patients/appointments/[id]/cancel/route');
        const res = await POST(post('/x', { reason: 'test' }), params(WIERSZ_ID));
        expect(res.status).toBe(200);
        expect(zapisyPMS.some((z) => z.method === 'DELETE')).toBe(true);
    });

    it('🔴 /create z id bez zera wiodącego ZWRACA potwierdzony wiersz zamiast zakładać drugi (rozjazd formatu daty ±2 h)', async () => {
        // PMS: '2099-01-01T10:00:00.000Z' (atrapa future-appointments); nasz wiersz z crona: czas ścienny jako UTC.
        Object.assign(wiersz, { attendance_confirmed: true, appointment_date: '2099-01-01T12:00:00.000Z' });
        const { POST } = await import('@/app/api/patients/appointments/create/route');
        const res = await POST(post('/api/patients/appointments/create', { schedule_appointment_id: '100234418' }));
        expect(res.status).toBe(200);
        expect((await res.json()).id).toBe(WIERSZ_ID);
        expect(zapisyBazy.filter((z) => z.insert)).toEqual([]);
    });
});

describe('przegląd 18.09 — „odwołana” = ZGŁOSZENIE, na obu trasach potwierdzenia', () => {
    const za10h = () => new Date(Date.now() + 10 * 3600_000).toISOString();

    it('🔴 strefa (panel apki, dashboard) nie potwierdza zgłoszonego odwołania → 409 KOD_WIZYTA_ODWOLANA, ZERO zapisów', async () => {
        for (const stan of [{ status: 'reschedule_requested' }, { cancellation_requested: true, status: 'pending' }]) {
            zapisyBazy = []; powiadomienia = [];
            Object.assign(wiersz, { appointment_date: za10h(), status: 'pending', cancellation_requested: false }, stan);
            const { POST } = await import('@/app/api/patients/appointments/[id]/confirm-attendance/route');
            const res = await POST(post('/x', { appointmentDate: wiersz.appointment_date }), params(WIERSZ_ID));
            expect(res.status).toBe(409);
            expect((await res.json()).code).toBe(KOD_WIZYTA_ODWOLANA);
            expect(zapisyBazy).toEqual([]);
            expect(powiadomienia).toEqual([]);
        }
    });

    it('🔴 status: zgłoszone odwołanie → bez „Potwierdź obecność” i „Odwołaj”, za to `cancellationPending`', async () => {
        Object.assign(wiersz, { appointment_date: za10h(), status: 'reschedule_requested' });
        const { GET } = await import('@/app/api/patients/appointments/[id]/status/route');
        const st = await (await GET(get('/x'), params(WIERSZ_ID))).json();
        expect(st.canConfirmAttendance).toBe(false);
        expect(st.actions.canConfirmAttendance).toBe(false);
        expect(st.actions.canCancel).toBe(false);
        expect(st.cancellationPending).toBe(true);
    });

    it('🔴 publiczne odwołanie zapisuje TRWAŁĄ flagę — cron nadpisuje `status`, flagi nie rusza', async () => {
        const { POST } = await import('@/app/api/appointments/cancel/route');
        const res = await POST(post('/api/appointments/cancel', { token: TOKEN }));
        expect(res.status).toBe(200);
        const zapis = zapisyBazy.find((z) => z.status === 'reschedule_requested');
        expect(zapis?.cancellation_requested).toBe(true);
        expect(typeof zapis?.cancellation_requested_at).toBe('string');

        // …i po nadpisaniu statusu przez crona potwierdzenie linkiem nadal odmawia.
        Object.assign(wiersz, { status: 'pending', cancellation_requested: true });
        zapisyBazy = [];
        const { POST: potwierdz } = await import('@/app/api/appointments/confirm/route');
        const r = await potwierdz(post('/api/appointments/confirm', { token: TOKEN }));
        expect(r.status).toBe(409);
        expect(zapisyBazy).toEqual([]);
    });

    it('🔴 wiersz sprzed wdrożenia z OBIEMA flagami: odwołanie wygrywa (confirm → 409, state → cancelled)', async () => {
        Object.assign(wiersz, { attendance_confirmed: true, status: 'reschedule_requested' });
        const { POST } = await import('@/app/api/appointments/confirm/route');
        const res = await POST(post('/api/appointments/confirm', { token: TOKEN }));
        expect(res.status).toBe(409);
        expect((await res.json()).code).toBe(KOD_WIZYTA_ODWOLANA);

        const { POST: stan } = await import('@/app/api/appointments/state/route');
        expect((await (await stan(post('/api/appointments/state', { token: TOKEN }))).json()).cancelled).toBe(true);
    });

    it('tekst odmowy mówi „zgłoszone” i daje numer — nie twierdzi, że wizyty nie ma', async () => {
        wiersz.status = 'reschedule_requested';
        const { POST } = await import('@/app/api/appointments/confirm/route');
        const body = await (await POST(post('/api/appointments/confirm', { token: TOKEN }))).json();
        expect(body.error).toMatch(/zgłoszone/);
        expect(body.error).toMatch(/570 270 470/);
        expect(body.error).not.toMatch(/została już odwołana/);
    });
});

describe('przegląd 18.09 — cron przypomnień nie unieważnia linków z poprzedniego przebiegu', () => {
    it('🔴 istniejący wiersz zachowuje `id` i token (piątkowy link do wizyty poniedziałkowej działa po niedzieli)', async () => {
        const { kluczeAkcjiWizyty } = await import('@/lib/kluczeAkcjiWizyty');
        const nowe = { id: 'nowe-id', token: 'NowyTokenLinku' }; // gitleaks:allow — atrapa
        const baza = { from: (t: string) => zapytanie(t) };
        const k = await kluczeAkcjiWizyty(baza, WIZYTA, String(wiersz.appointment_date), nowe);
        expect(k).toEqual({ id: WIERSZ_ID, token: TOKEN, istnial: true });

        // kontrola pozytywna: brak wiersza → nowe klucze
        wiersz.prodentis_id = 'inna-wizyta';
        expect(await kluczeAkcjiWizyty(baza, WIZYTA, String(wiersz.appointment_date), nowe)).toEqual({ ...nowe, istnial: false });

        // błąd odczytu → nowe klucze (przypomnienie ma wyjść mimo awarii odczytu)
        const zepsuta = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'x' } }) }) }) }) }) };
        expect(await kluczeAkcjiWizyty(zepsuta, WIZYTA, 'd', nowe)).toEqual({ ...nowe, istnial: false });
    });

    it('🔴 okablowanie: cron BIERZE `id` i token z `kluczeAkcjiWizyty`, a upsert wysyła właśnie je', async () => {
        const { readFileSync } = await import('node:fs');
        const zrodlo = readFileSync('src/app/api/cron/appointment-reminders/route.ts', 'utf8');
        // Asercja na PRZYPISANIE, nie na nazwę (sama wzmianka w komentarzu by przeszła).
        expect(zrodlo).toMatch(/const klucze = await kluczeAkcjiWizyty\(supabase, appointment\.id, appointment\.date,/);
        expect(zrodlo).toMatch(/const appointmentActionId = klucze\.id;/);
        expect(zrodlo).toMatch(/const confirmationToken = klucze\.token;/);
        expect(zrodlo).toMatch(/id: appointmentActionId,[\s\S]{0,700}confirmation_token: confirmationToken,/);
        expect(zrodlo).not.toMatch(/const confirmationToken = nanoid\(/);
    });
});

/**
 * 🔴 ZGŁOSZENIE WŁAŚCICIELA 18.09 (po OTA #11): push „potwierdź wizytę” w poniedziałek przychodzi
 * w piątek (~75 h wcześniej), a strefa pokazywała „Potwierdź obecność” dopiero 24 h przed wizytą —
 * pacjent, który nie tapnął pusha od razu, nie miał jak wrócić do potwierdzenia.
 */
describe('potwierdzenie w strefie po prośbie gabinetu (przypomnienie z linkiem) — okno jak link, 7 dni', () => {
    const zaGodzin = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

    it('🔴 status: prośba gabinetu (token) + 75 h → „Potwierdź obecność” widoczny + `confirmationRequested`', async () => {
        wiersz.appointment_date = zaGodzin(75);
        const { GET } = await import('@/app/api/patients/appointments/[id]/status/route');
        const st = await (await GET(get('/x'), params(WIERSZ_ID))).json();
        expect(st.canConfirmAttendance).toBe(true);
        expect(st.actions.canConfirmAttendance).toBe(true); // to pole czyta apka 1.3.x (bez OTA)
        expect(st.confirmationRequested).toBe(true);
    });

    it('🔴 potwierdzenie w strefie po prośbie, 75 h przed wizytą → zapis potwierdzenia', async () => {
        wiersz.appointment_date = zaGodzin(75);
        const { POST } = await import('@/app/api/patients/appointments/[id]/confirm-attendance/route');
        const res = await POST(post('/x', { appointmentDate: wiersz.appointment_date }), params(WIERSZ_ID));
        expect(res.status).toBe(200);
        expect(zapisyBazy.some((z) => z.attendance_confirmed === true)).toBe(true);
    });

    it('kontrola: BEZ prośby (wiersz ze strefy, bez tokenu) zostaje dotychczasowe 24 h', async () => {
        Object.assign(wiersz, { appointment_date: zaGodzin(75), confirmation_token: null });
        const { GET } = await import('@/app/api/patients/appointments/[id]/status/route');
        const st = await (await GET(get('/x'), params(WIERSZ_ID))).json();
        expect(st.canConfirmAttendance).toBe(false);
        expect(st.confirmationRequested).toBe(false);

        const { POST } = await import('@/app/api/patients/appointments/[id]/confirm-attendance/route');
        const res = await POST(post('/x', { appointmentDate: wiersz.appointment_date }), params(WIERSZ_ID));
        expect(res.status).toBe(400);
        expect(zapisyBazy).toEqual([]);

        wiersz.appointment_date = zaGodzin(10);
        expect((await (await GET(get('/x'), params(WIERSZ_ID))).json()).canConfirmAttendance).toBe(true);
    });

    it('kontrola: po prośbie, ale ponad 7 dni przed wizytą → nie (okno linku)', async () => {
        wiersz.appointment_date = zaGodzin(8 * 24);
        const { GET } = await import('@/app/api/patients/appointments/[id]/status/route');
        expect((await (await GET(get('/x'), params(WIERSZ_ID))).json()).canConfirmAttendance).toBe(false);
    });

    it('prośba nie otwiera potwierdzenia wizyty potwierdzonej ani ze zgłoszonym odwołaniem', async () => {
        const { GET } = await import('@/app/api/patients/appointments/[id]/status/route');
        for (const stan of [{ attendance_confirmed: true }, { cancellation_requested: true }]) {
            Object.assign(wiersz, { appointment_date: zaGodzin(75), attendance_confirmed: false, cancellation_requested: false }, stan);
            const st = await (await GET(get('/x'), params(WIERSZ_ID))).json();
            expect(st.canConfirmAttendance).toBe(false);
            expect(st.confirmationRequested).toBe(false);
        }
    });
});

/**
 * 🔴 ZGŁOSZENIE WŁAŚCICIELA 18.09: pacjentka przełożyła wizytę u Ilony Piechaczek na 12.10, 16:30,
 * choć Ilona przyjmuje tego dnia 09:00–15:00 — 16:30 było wolne tylko u innej lekarki. Ekrany
 * pokazywały sumę wolnych godzin wszystkich lekarzy, a trasa niczego nie sprawdzała.
 */
describe('przełożenie tylko na termin WOLNY U LEKARZA TEJ WIZYTY', () => {
    const przeloz = async (newDate: string, newStartTime: string) => {
        const { POST } = await import('@/app/api/patients/appointments/[id]/reschedule/route');
        const res = await POST(post('/x', { newDate, newStartTime }), params(WIERSZ_ID));
        return { status: res.status, body: await res.json() };
    };
    const putDoPms = () => zapisyPMS.filter((z) => /\/reschedule$/.test(z.path) && z.method === 'PUT');

    it('🔴 termin wolny WYŁĄCZNIE u innego lekarza → 409 z kodem, ZERO zapisu do PMS i bazy', async () => {
        wolneSloty = [{ doctor: '0100000036', start: '2099-02-01T16:30:00' }];
        const { status, body } = await przeloz('2099-02-01', '16:30');
        expect(status).toBe(409);
        expect(body.code).toBe('SLOT_NOT_AVAILABLE_FOR_DOCTOR');
        expect(body.error).toMatch(/570 270 470/);
        expect(putDoPms()).toEqual([]);
        expect(zapisyBazy).toEqual([]);
        // zapytanie idzie o lekarza WIZYTY
        expect(zapytaniaSlotow.some((p) => p.includes(`doctor=${LEKARZ}`))).toBe(true);
    });

    it('🔴 PMS nie odpowiada → 503 (fail-closed), ZERO zapisu do PMS', async () => {
        wolneSloty = null;
        const { status, body } = await przeloz('2099-02-01', '10:00');
        expect(status).toBe(503);
        expect(body.code).toBe('SLOT_CHECK_UNAVAILABLE');
        expect(putDoPms()).toEqual([]);
    });

    it('kontrola pozytywna: termin wolny u lekarza wizyty → przełożenie w PMS', async () => {
        const { status } = await przeloz('2099-02-01', '10:00');
        expect(status).toBe(200);
        expect(putDoPms()).toHaveLength(1);
    });

    it('lekarz zapisany bez zer wiodących to ten sam lekarz; czas trwania z PMS idzie do zapytania', async () => {
        dlugoscWizytyPms = 60;
        wolneSloty = [{ doctor: '100000024', start: '2099-02-01T10:00:00' }];
        const { status } = await przeloz('2099-02-01', '10:00');
        expect(status).toBe(200);
        expect(zapytaniaSlotow.some((p) => p.includes('duration=60'))).toBe(true);
    });

    it('🪤 wizyta 15-minutowa: zapytanie idzie z duration=30 (PMS na < 30 oddaje pustą listę → fałszywa odmowa)', async () => {
        dlugoscWizytyPms = 15;
        const { status } = await przeloz('2099-02-01', '10:00');
        expect(status).toBe(200);
        expect(zapytaniaSlotow.some((p) => p.includes('duration=30'))).toBe(true);
        expect(zapytaniaSlotow.some((p) => p.includes('duration=15'))).toBe(false);
    });

    it('inny dzień albo inna godzina u tego samego lekarza → 409', async () => {
        wolneSloty = [{ doctor: LEKARZ, start: '2099-02-02T10:00:00' }, { doctor: LEKARZ, start: '2099-02-01T10:30:00' }];
        expect((await przeloz('2099-02-01', '10:00')).status).toBe(409);
        expect(putDoPms()).toEqual([]);
    });
});
