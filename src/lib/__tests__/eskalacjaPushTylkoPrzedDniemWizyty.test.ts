/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapa łańcucha PostgREST jest z natury dynamiczna. Konwencja repo: jawne wyłączenie.
 */
/**
 * STRAŻNIK: `cron/push-escalation` dosyła SMS tylko wtedy, gdy ma to sens.
 *
 * Od migracji 204 (2026-09-14) wiersze `push_sent` naprawdę istnieją, więc ten cron
 * pierwszy raz w historii ma co robić. Przeglądy przed wdrożeniem pokazały pułapki:
 *  1) szkice wysłane z panelu wieczorem eskalowałyby się następnego ranka, w DNIU wizyty,
 *     SMS-em „jutro o …" — czasem już po wizycie;
 *  2) nieudany SMS zapisywał `failed`, a takie wiersze kasuje czyszczenie szkiców — znikał
 *     ślad, że push doszedł;
 *  3) recepcja mogła po pushu odwołać albo przenieść wizytę w Prodentisie — SMS szedłby
 *     do wizyty, której już nie ma. Stan sprawdzamy w PMS. Awaria PMS = „nie wiemy",
 *     więc działamy jak dawniej: SMS idzie, z adnotacją (wstrzymywanie przy całodziennej
 *     awarii kończyło się brakiem przypomnienia);
 *  4) do 50 wierszy × do 10 s na PMS przekraczało limit 60 s funkcji — ubicie między SMS-em
 *     a zapisem wiersza dałoby drugi identyczny SMS. Budżet czasu odkłada resztę.
 *
 * Test WYKONUJE trasę na atrapach bazy, SMS-a i Prodentisa.
 * DOWÓD, ŻE GRYZIE (cofki): bez bramki dnia → 🔴 „wizyta dziś"; `status: 'failed'` przy
 * nieudanym SMS-ie → 🔴 „nieudany SMS"; bez sprawdzenia PMS → 🔴 „odwołana / przeniesiona /
 * godzina / data"; wstrzymanie przy awarii PMS → 🔴 „niedostępny"; bez budżetu → 🔴 „budżet".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const wyslaneSms: string[] = [];
const zapisy: Array<{ id: string; dane: Record<string, unknown> }> = [];
let wiersze: Array<Record<string, unknown>> = [];
let zareagowal = false;
let smsUdany = true;
/** Stan wizyty w Prodentisie po identyfikatorze wiersza; brak wpisu = wizyta stoi bez zmian. */
const stanyPms = new Map<string, unknown>();
/** Ile milisekund „trwa" każde zapytanie do PMS (przesuwa zamrożony zegar). */
let czasOdpowiedziPmsMs = 0;

vi.mock('@/lib/demoMode', () => ({ isDemoMode: false }));
vi.mock('@/lib/cronHeartbeat', () => ({ logCronHeartbeat: async () => {} }));
vi.mock('@/lib/patientDelivery', () => ({ hasPatientResponded: async () => zareagowal }));
vi.mock('@/lib/smsService', () => ({
    sendSMS: async ({ to }: { to: string }) => { wyslaneSms.push(to); return smsUdany ? { success: true, messageId: 'm1' } : { success: false, error: 'SMSAPI 101' }; },
}));
vi.mock('@/lib/prodentisAppointment', async (importOriginal) => {
    const oryginal = await importOriginal<typeof import('@/lib/prodentisAppointment')>();
    return {
        ...oryginal,
        odswiezWizyte: async (prodentisId: string) => {
            if (czasOdpowiedziPmsMs) vi.setSystemTime(Date.now() + czasOdpowiedziPmsMs);
            const w = wiersze.find((x) => x.prodentis_id === prodentisId);
            if (stanyPms.has(String(w?.id))) return stanyPms.get(String(w?.id));
            const data = String(w?.appointment_date ?? '');
            return {
                ok: true,
                wizyta: { id: prodentisId, patientId: 'P1', doctorId: 'D1', doctorName: 'Lekarz', date: data.slice(0, 10), startTime: data.slice(11, 16), endTime: '', duration: 30, status: 'active', cancelDate: null },
            };
        },
    };
});
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: () => {
            const q: any = {};
            for (const m of ['select', 'eq', 'lt', 'order']) q[m] = () => q;
            q.limit = async () => ({ data: wiersze, error: null });
            q.update = (dane: Record<string, unknown>) => ({ eq: async (_k: string, id: string) => { zapisy.push({ id, dane }); return { error: null }; } });
            return q;
        },
    }),
}));

const dzien = (przesuniecieDni: number, godzina = '15:00') => {
    const d = new Date(Date.now() + przesuniecieDni * 864e5);
    return `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(d)}T${godzina}:00+00:00`;
};
const wiersz = (id: string, appointment_date: string) => ({
    id, appointment_date, phone: `+48600000${id.padStart(3, '0').slice(-3)}`, sms_message: 'Przypomnienie', patient_name: 'Pacjent Testowy',
    prodentis_id: `P-${id}`, status: 'push_sent', sms_type: 'reminder', push_sent: true,
});
const wizytaPms = (date: string, startTime: string) => ({
    ok: true,
    wizyta: { id: 'x', patientId: 'P1', doctorId: 'D1', doctorName: 'L', date, startTime, endTime: '', duration: 30, status: 'active', cancelDate: null },
});

beforeEach(() => {
    wyslaneSms.length = 0; zapisy.length = 0; wiersze = []; zareagowal = false; smsUdany = true; stanyPms.clear(); czasOdpowiedziPmsMs = 0;
    process.env.CRON_SECRET = 'sekret-testowy';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); });

async function przebieg() {
    const { GET } = await import('@/app/api/cron/push-escalation/route');
    const res = await GET(new Request('https://example.test/api/cron/push-escalation', { headers: { authorization: 'Bearer sekret-testowy' } }));
    return res.json();
}

describe('push-escalation · SMS tylko przed dniem wizyty i tylko bez reakcji', () => {
    it('KONTROLA MIERNIKA: wizyta jutro, stoi w PMS, brak reakcji → SMS idzie, kanał push+sms', async () => {
        wiersze = [wiersz('1', dzien(1))];
        await przebieg();
        expect(wyslaneSms).toHaveLength(1);
        expect(zapisy[0].dane).toMatchObject({ status: 'sent', delivery_channel: 'push+sms' });
        expect(String(zapisy[0].dane.send_error)).not.toContain('niedostępny');
    });

    it('🔴 wizyta DZIŚ → żadnego SMS-a, wiersz zamknięty jako dostarczony pushem', async () => {
        wiersze = [wiersz('2', dzien(0))];
        const wynik = await przebieg();
        expect(wyslaneSms).toEqual([]);
        expect(zapisy[0].dane).toMatchObject({ status: 'sent', delivery_channel: 'push' });
        expect(String(zapisy[0].dane.send_error)).toMatch(/^Eskalacja pominięta:/);
        expect(wynik.skipped).toBe(1);
    });

    it('🔴 wizyta, która już minęła → żadnego SMS-a', async () => {
        wiersze = [wiersz('3', dzien(-2))];
        await przebieg();
        expect(wyslaneSms).toEqual([]);
    });

    it('pacjent zareagował → żadnego SMS-a', async () => {
        zareagowal = true;
        wiersze = [wiersz('4', dzien(1))];
        await przebieg();
        expect(wyslaneSms).toEqual([]);
        expect(zapisy[0].dane).toMatchObject({ status: 'sent', delivery_channel: 'push' });
    });

    it('🔴 nieudany SMS NIE zmienia statusu na failed — ślad pusha zostaje, będzie ponowienie', async () => {
        smsUdany = false;
        wiersze = [wiersz('5', dzien(1))];
        await przebieg();
        expect(zapisy[0].dane).not.toHaveProperty('status');
        expect(String(zapisy[0].dane.send_error)).toMatch(/^Push OK, SMS failed: SMSAPI 101/);
    });
});

describe('push-escalation · wizyta sprawdzona w Prodentisie przed SMS-em', () => {
    it('🔴 recepcja ODWOŁAŁA wizytę po pushu → bez SMS-a, wiersz zamknięty z wyjaśnieniem', async () => {
        wiersze = [wiersz('6', dzien(1))];
        stanyPms.set('6', { ok: false, powod: 'cancelled', wizyta: {} });
        await przebieg();
        expect(wyslaneSms).toEqual([]);
        expect(zapisy[0].dane).toMatchObject({ status: 'sent', delivery_channel: 'push' });
        expect(String(zapisy[0].dane.send_error)).toContain('odwołana');
    });

    it('🔴 identyfikatora nie ma w PMS (przeniesiona = nowy rekord) → bez SMS-a', async () => {
        wiersze = [wiersz('7', dzien(1))];
        stanyPms.set('7', { ok: false, powod: 'not_found' });
        await przebieg();
        expect(wyslaneSms).toEqual([]);
        expect(String(zapisy[0].dane.send_error)).toContain('przeniesiona');
    });

    it('🔴 wizyta stoi, ale o INNEJ godzinie → bez SMS-a ze starą godziną', async () => {
        wiersze = [wiersz('8', dzien(1))];
        stanyPms.set('8', wizytaPms(dzien(1).slice(0, 10), '17:30'));
        await przebieg();
        expect(wyslaneSms).toEqual([]);
        expect(String(zapisy[0].dane.send_error)).toContain('godzina');
    });

    it('🔴 wizyta stoi o tej samej godzinie, ale INNEGO dnia → bez SMS-a ze starą datą', async () => {
        wiersze = [wiersz('10', dzien(1))];
        stanyPms.set('10', wizytaPms(dzien(3).slice(0, 10), '15:00'));
        await przebieg();
        expect(wyslaneSms).toEqual([]);
        expect(String(zapisy[0].dane.send_error)).toContain('data');
    });

    it('🔴 Prodentis NIEDOSTĘPNY → SMS idzie jak dawniej, z adnotacją, że grafiku nie sprawdzono', async () => {
        wiersze = [wiersz('9', dzien(1))];
        stanyPms.set('9', { ok: false, powod: 'unavailable' });
        const wynik = await przebieg();
        expect(wyslaneSms).toHaveLength(1);
        expect(zapisy[0].dane).toMatchObject({ status: 'sent', delivery_channel: 'push+sms' });
        expect(String(zapisy[0].dane.send_error)).toMatch(/^Escalation:.*Prodentis niedostępny/);
        expect(wynik.bezSprawdzeniaPms).toBe(1);
    });
});

describe('push-escalation · budżet czasu przebiegu', () => {
    it('🔴 wolny Prodentis: po wyczerpaniu budżetu reszta wierszy czeka na następny przebieg', async () => {
        vi.useFakeTimers({ toFake: ['Date'], now: new Date() });
        czasOdpowiedziPmsMs = 15_000; // każde zapytanie „trwa" 15 s
        wiersze = ['11', '12', '13', '14', '15'].map((id) => wiersz(id, dzien(1)));
        const wynik = await przebieg();
        // 0 s → 15 s → 30 s → 45 s: czwarty wiersz startowałby po 40 s budżetu.
        expect(wyslaneSms).toHaveLength(3);
        expect(wynik.odlozone).toBe(2);
    });
});
