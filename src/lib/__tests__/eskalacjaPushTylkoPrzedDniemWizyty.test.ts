/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapa łańcucha PostgREST jest z natury dynamiczna. Konwencja repo: jawne wyłączenie.
 */
/**
 * STRAŻNIK: `cron/push-escalation` dosyła SMS tylko wtedy, gdy ma to sens.
 *
 * Od migracji 204 (2026-09-14) wiersze `push_sent` naprawdę istnieją, więc ten cron
 * pierwszy raz w historii ma co robić. Przegląd przed wdrożeniem pokazał trzy pułapki:
 *  1) szkice wysłane z panelu wieczorem eskalowałyby się następnego ranka, w DNIU wizyty,
 *     SMS-em „jutro o …" — czasem już po wizycie;
 *  2) nieudany SMS zapisywał `failed`, a takie wiersze kasuje czyszczenie szkiców — znikał
 *     ślad, że push doszedł (dokładnie ta klasa, którą naprawia 204);
 *  3) (w `hasPatientResponded`, osobny strażnik) potwierdzenie pushem nie zatrzymywało SMS-a.
 *
 * Test WYKONUJE trasę na atrapach bazy i SMS-a.
 * DOWÓD, ŻE GRYZIE (cofka): usuń bramkę dnia → pada 🔴 „wizyta dziś"; przywróć
 * `status: 'failed'` przy nieudanym SMS-ie → pada 🔴 „nieudany SMS".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const wyslaneSms: string[] = [];
const zapisy: Array<{ id: string; dane: Record<string, unknown> }> = [];
let wiersze: Array<Record<string, unknown>> = [];
let zareagowal = false;
let smsUdany = true;

vi.mock('@/lib/demoMode', () => ({ isDemoMode: false }));
vi.mock('@/lib/cronHeartbeat', () => ({ logCronHeartbeat: async () => {} }));
vi.mock('@/lib/patientDelivery', () => ({ hasPatientResponded: async () => zareagowal }));
vi.mock('@/lib/smsService', () => ({
    sendSMS: async ({ to }: { to: string }) => { wyslaneSms.push(to); return smsUdany ? { success: true, messageId: 'm1' } : { success: false, error: 'SMSAPI 101' }; },
}));
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

const dzien = (przesuniecieDni: number) => {
    const d = new Date(Date.now() + przesuniecieDni * 864e5);
    return `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(d)}T15:00:00+00:00`;
};
const wiersz = (id: string, appointment_date: string) => ({
    id, appointment_date, phone: `+4860000000${id.slice(-1)}`, sms_message: 'Przypomnienie', patient_name: 'Pacjent Testowy',
    prodentis_id: '0100000001', status: 'push_sent', sms_type: 'reminder', push_sent: true,
});

beforeEach(() => {
    wyslaneSms.length = 0; zapisy.length = 0; wiersze = []; zareagowal = false; smsUdany = true;
    process.env.CRON_SECRET = 'sekret-testowy';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

async function przebieg() {
    const { GET } = await import('@/app/api/cron/push-escalation/route');
    const res = await GET(new Request('https://example.test/api/cron/push-escalation', { headers: { authorization: 'Bearer sekret-testowy' } }));
    return res.json();
}

describe('push-escalation · SMS tylko przed dniem wizyty i tylko bez reakcji', () => {
    it('KONTROLA MIERNIKA: wizyta jutro, brak reakcji → SMS idzie, kanał push+sms', async () => {
        wiersze = [wiersz('r1', dzien(1))];
        await przebieg();
        expect(wyslaneSms).toHaveLength(1);
        expect(zapisy[0].dane).toMatchObject({ status: 'sent', delivery_channel: 'push+sms' });
    });

    it('🔴 wizyta DZIŚ → żadnego SMS-a, wiersz zamknięty jako dostarczony pushem', async () => {
        wiersze = [wiersz('r2', dzien(0))];
        const wynik = await przebieg();
        expect(wyslaneSms).toEqual([]);
        expect(zapisy[0].dane).toMatchObject({ status: 'sent', delivery_channel: 'push' });
        expect(String(zapisy[0].dane.send_error)).toMatch(/^Eskalacja pominięta:/);
        expect(wynik.skipped).toBe(1);
    });

    it('🔴 wizyta, która już minęła → żadnego SMS-a', async () => {
        wiersze = [wiersz('r3', dzien(-2))];
        await przebieg();
        expect(wyslaneSms).toEqual([]);
    });

    it('pacjent zareagował → żadnego SMS-a', async () => {
        zareagowal = true;
        wiersze = [wiersz('r4', dzien(1))];
        await przebieg();
        expect(wyslaneSms).toEqual([]);
        expect(zapisy[0].dane).toMatchObject({ status: 'sent', delivery_channel: 'push' });
    });

    it('🔴 nieudany SMS NIE zmienia statusu na failed — ślad pusha zostaje, będzie ponowienie', async () => {
        smsUdany = false;
        wiersze = [wiersz('r5', dzien(1))];
        await przebieg();
        expect(zapisy[0].dane).not.toHaveProperty('status');
        expect(String(zapisy[0].dane.send_error)).toMatch(/^Push OK, SMS failed: SMSAPI 101/);
    });
});
