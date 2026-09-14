/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapa łańcucha PostgREST jest z natury dynamiczna. Konwencja repo: jawne wyłączenie.
 */
/**
 * STRAŻNIK: push „Wizyta za godzinę!” przychodzi PRZED wizytą i tylko do prawdziwych wizyt.
 *
 * ══ CO BYŁO ZEPSUTE (zmierzone 2026-09-14) ══════════════════════════════════
 *  1) Cron porównywał godzinę z Prodentisa (czas polski zapisany z `Z`) z prawdziwym UTC.
 *     Latem to 2 h: okno „45–75 min przed” łapało wizyty, które ZACZĘŁY SIĘ 45–75 min
 *     wcześniej. 24 z 24 pushy od 07.09 przyszło po starcie wizyty (np. wizyta 8:45 → push 9:30).
 *  2) Cron nie stosował reguły wizyt z przypomnień SMS, więc wpisy informacyjne recepcji
 *     (01:00–07:59) dostawały push — 14.09 o 4:30 i 5:30 rano.
 *
 * Test WYKONUJE cron z zamrożonym zegarem: 07:30 UTC = 09:30 czasu polskiego.
 * DOWÓD, ŻE GRYZIE (cofki): okno liczone od `now` zamiast czasu ściennego → pada 🔴 (1);
 * bez wspólnej reguły wizyt → pada 🔴 (2).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const pushePacjentow: string[] = [];

vi.mock('@/lib/demoMode', () => ({ isDemoMode: false }));
vi.mock('@/lib/cronHeartbeat', () => ({ logCronHeartbeat: async () => {} }));
vi.mock('@/lib/pushTranslations', () => ({
    getPushTranslation: (_k: string, _l: string, p: { time: string }) => ({ title: 'Wizyta za godzinę!', body: `Wizyta o ${p.time}` }),
}));
vi.mock('@/lib/appointmentReminderPush', () => ({
    loadConfirmationLink: async () => null,
    buildAppointmentReminderPush: (x: unknown) => x,
}));
vi.mock('@/lib/pushService', () => ({
    pushToPatientAll: async (patientUuid: string) => {
        pushePacjentow.push(patientUuid);
        return { sent: 1, fcm: { sent: 1, failed: 0 }, expo: { sent: 0, failed: 0 } };
    },
}));

/** Grafik na 14.09 widziany o 09:30 czasu polskiego. */
const GRAFIK = [
    // (1) zaczęła się 45 min temu — stary cron wysłałby push TERAZ
    { id: 'W-ZACZETA', date: '2026-09-14T08:45:00.000Z', patientId: 'P-ZACZETA', isWorkingHour: true, doctor: { name: 'Marcin Nowosielski' } },
    // (1) za 60 min — JEDYNA, która ma dostać push
    { id: 'W-ZA-GODZINE', date: '2026-09-14T10:30:00.000Z', patientId: 'P-ZA-GODZINE', isWorkingHour: true, doctor: { name: 'Ilona Piechaczek' } },
    // (2) za 60 min, ale szare pole (nie robocze) — reguła wizyt pomija
    { id: 'W-SZARE-POLE', date: '2026-09-14T10:30:00.000Z', patientId: 'P-SZARE-POLE', isWorkingHour: false, doctor: { name: 'Ilona Piechaczek' } },
    // (2) wpis informacyjny recepcji — w oknie STAREGO liczenia o 01:30 UTC
    { id: 'W-INFO', date: '2026-09-14T03:45:00.000Z', patientId: 'P-INFO', isWorkingHour: true, doctor: { name: 'Ilona Piechaczek' } },
];

vi.mock('@/lib/prodentisFetch', () => ({
    prodentisFetch: async () => ({ ok: true, status: 200, json: async () => ({ appointments: GRAFIK }) }),
}));

vi.mock('@supabase/supabase-js', () => {
    const budujZapytanie = (tabela: string) => {
        let prodentisId = '';
        const api: any = {
            select: () => api,
            eq: (k: string, v: string) => { if (k === 'prodentis_id') prodentisId = v; return api; },
            gte: () => api,
            limit: () => api,
            maybeSingle: async () => (tabela === 'patients'
                ? { data: { id: `uuid-${prodentisId}`, notification_preferences: null }, error: null }
                : { data: null, error: null }),
            then: (res: (v: unknown) => void) => {
                if (tabela === 'patient_push_tokens') return res({ data: [{ id: 't1' }], error: null });
                if (tabela === 'fcm_tokens') return res({ data: [], error: null });
                return res({ data: [], error: null }); // push_notifications_log: nic jeszcze nie wysłano
            },
        };
        return api;
    };
    return { createClient: () => ({ from: (t: string) => budujZapytanie(t) }) };
});

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-14T07:30:00Z') });
    pushePacjentow.length = 0;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.CRON_SECRET = 'sekret-testowy';
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); });

async function przebieg() {
    const { GET } = await import('@/app/api/cron/push-appointment-1h/route');
    return (await GET(new Request('https://example.test/api/cron/push-appointment-1h', {
        headers: { authorization: 'Bearer sekret-testowy' },
    }))).json();
}

describe('push godzinę przed wizytą · czas ścienny i reguła wizyt', () => {
    it('🔴 (1) 09:30 w Warszawie: push dostaje wizyta o 10:30, NIE ta, która zaczęła się o 8:45', async () => {
        await przebieg();
        expect(pushePacjentow).toContain('uuid-P-ZA-GODZINE');
        expect(pushePacjentow).not.toContain('uuid-P-ZACZETA');
    });

    it('🔴 (2) wpis informacyjny recepcji i szare pole nie dostają pusha', async () => {
        await przebieg();
        expect(pushePacjentow).not.toContain('uuid-P-INFO');
        expect(pushePacjentow).not.toContain('uuid-P-SZARE-POLE');
    });

    it('🔴 (2) o 02:45 wpis informacyjny z 03:45 JEST w oknie — i to reguła wizyt go odrzuca', async () => {
        // Pierwsza wersja tego testu była ślepa: o 09:30 wpis z 03:45 leżał poza oknem, więc
        // cron odrzucał go, zanim w ogóle doszło do reguły (wykrył to przegląd). Tu zegar stoi
        // na 02:45 czasu polskiego, czyli okno 03:30–04:00 obejmuje wpis.
        vi.setSystemTime(new Date('2026-09-14T00:45:00Z'));
        const logi = vi.spyOn(console, 'log');
        await przebieg();
        expect(pushePacjentow).not.toContain('uuid-P-INFO');
        // Kontrola miernika: wpis doszedł do reguły i ta go odrzuciła z właściwego powodu.
        expect(logi.mock.calls.flat().some((l) => String(l).includes('W-INFO') && String(l).includes('poza_godzinami_gabinetu'))).toBe(true);
    });

    it('KONTROLA MIERNIKA: dokładnie jeden push w tym przebiegu', async () => {
        const wynik = await przebieg();
        expect(pushePacjentow).toEqual(['uuid-P-ZA-GODZINE']);
        expect(wynik.sent).toBe(1);
    });
});
