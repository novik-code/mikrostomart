/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST są z natury dynamiczne: builder zwraca sam siebie z dowolnej
 * metody. Zawężenie do typów SDK wywala kompilację na `TS2589`. Konwencja repo dla tej
 * klasy przypadków to jawne wyłączenie z powodem, nie ciche `any`.
 */
/**
 * STRAŻNIK PUBLICZNYCH TRAS WIZYTY — tylko token, nigdy samo id (P-088).
 *
 * 🔴 CO BYŁO ZEPSUTE. `POST /api/appointments/confirm` i `/cancel` to trasy PUBLICZNE
 * (bez sesji, dla linków z SMS-a). Obok tokenu przyjmowały `appointmentId` — surowy UUID
 * wiersza `appointment_actions` — jako „gałąź legacy z 14-dniową karencją". Karencja
 * skończyła się ponad trzy miesiące temu, a gałąź żyła dalej. UUID nie jest sekretem:
 * wraca w odpowiedziach tras pacjenta, w paczce RODO i w logach. Kto go znał, mógł
 * ODWOŁAĆ albo POTWIERDZIĆ cudzą wizytę — z alertem do recepcji, pushem do personelu
 * i ikoną w PMS. Komentarz w kodzie obiecywał „validates via appointmentId + patientId
 * matching"; `patientId` nie był porównywany z niczym.
 *
 * 🔑 POMIARY PRODUKCYJNE, NA KTÓRYCH STOI USUNIĘCIE GAŁĘZI (06.09):
 *   · **92 żywe short-linki, WSZYSTKIE z `token=`, ZERO z `appointmentId=`** — żaden
 *     działający dziś SMS nie prowadzi przez gałąź legacy;
 *   · kolumna `appointment_actions.confirmation_token` ISTNIEJE, więc fallback w cronie
 *     (`tokenInUrl = null` wyłącznie gdy upsert padnie na braku tej kolumny) jest MARTWY;
 *   · 452 z 520 wierszy z ostatnich 30 dni ma token; pozostałe 68 powstaje inną drogą
 *     (`patients/appointments/create`) i nigdy nie trafia do SMS-a jako link.
 *
 * DOWÓD, ŻE GRYZIE (cofka): przywróć w dowolnej z tras `: query.eq('id', appointmentId)`
 * → pada jej test. Zdejmij dławik → pada test limitu.
 *
 * Uruchomienie: `npx vitest run publicAppointmentToken`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const TOKEN = 'abcdef0123456789';
/**
 * 🔑 DWA RÓŻNE IDENTYFIKATORY, celowo. `ZGADNIETE_UUID` to id, które podaje NAPASTNIK
 * w ciele żądania; `REALNE_ID` to id wiersza, który trasa legalnie adresuje przy zapisie
 * i przy odświeżeniu. Gdyby były równe, asercja „nie szukano po id" nie umiałaby
 * odróżnić ataku od zwykłej pracy trasy — i padała z niewłaściwego powodu.
 */
const ZGADNIETE_UUID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const REALNE_ID = 'dddddddd-4444-4444-8444-dddddddddddd';

/**
 * 🪤 Filtry rozdzielone na ODCZYT i ZAPIS. Pierwsza wersja liczyła je razem i test
 * „z tokenem działa" padał — bo trasa po znalezieniu wiersza robi `update().eq('id', …)`,
 * co jest w pełni legalne. Pytanie brzmi wyłącznie: czy wiersz był WYSZUKANY po id.
 */
let filtry: { kolumna: string; wartosc: unknown }[] = [];
let zapisy: string[] = [];
let powiadomienia: string[] = [];
let limitPrzepuszcza = true;

vi.mock('@/lib/rateLimit', () => ({
    checkRateLimit: async () => ({ allowed: limitPrzepuszcza, remaining: 0 }),
    getClientIP: () => '1.2.3.4',
}));
vi.mock('@/lib/telegram', () => ({
    sendTelegramNotification: async () => { powiadomienia.push('telegram'); return true; },
    sendTelegramMessage: async () => { powiadomienia.push('telegram'); return true; },
    notifyTelegram: async () => { powiadomienia.push('telegram'); },
}));
vi.mock('@/lib/pushService', () => ({
    // 🪤 KSZTAŁT MUSI SIĘ ZGADZAĆ: `confirm/route.ts` czyta `.sent` z wyniku bez
    // opcjonalności, więc atrapa zwracająca `undefined` wywala trasę na 500 —
    // i test „z tokenem działa" padał z niewłaściwego powodu.
    broadcastPush: async () => { powiadomienia.push('push'); return { sent: 0, failed: 0 }; },
    pushToUser: async () => { powiadomienia.push('push'); return { sent: 0, failed: 0 }; },
    pushToUsers: async () => { powiadomienia.push('push'); return { sent: 0, failed: 0 }; },
}));
vi.mock('@/lib/pushHealth', () => ({ recordPushPath: async () => {} }));
vi.mock('@/lib/careflowLifecycle', () => ({
    cancelCareflowForAppointment: async () => ({ count: 0, ambiguousEnrollmentIds: [] as string[] }),
    rescheduleCareflowForAppointment: async () => ({ count: 0, ambiguousEnrollmentIds: [] as string[] }),
    findOpenEnrollments: async () => [],
}));
vi.mock('@/lib/prodentisFetch', () => ({
    prodentisFetch: async () => ({ ok: true, status: 200, json: async () => ({ success: true }), text: async () => '' }),
    BrakKluczaPMS: class extends Error {},
    TrybDemoBezPMS: class extends Error {},
    pmsError: async () => null,
}));

/** Wiersz istnieje ZAWSZE — żeby odmowa nie mogła przejść z niewłaściwego powodu. */
const WIERSZ = {
    id: REALNE_ID,
    confirmation_token: TOKEN,
    patient_id: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
    prodentis_id: '0100234418',
    patient_name: 'Pacjent Testowy',
    patient_phone: '+48000000000',
    // 🪤 Data WZGLĘDNA, nie wpisana na sztywno. Było '2026-09-11T14:30:00.000Z' i test
    // wybuchł 11.09 po 14:30 czasu polskiego: trasa odwołania odmawia (400), gdy do wizyty
    // zostało mniej niż 2 h, więc „odwołanie na token przechodzi" zaczęło padać samo
    // z siebie — bez żadnej zmiany w kodzie. Trzy dni zapasu = zawsze poza tym oknem.
    appointment_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    doctor_name: 'Lekarz Testowy',
    status: 'pending',
};

function zapytanie(tabela: string): any {
    const q: any = {};
    /** 'select' dopóki nie padnie `update`/`delete` — wtedy filtry są już adresowaniem zapisu. */
    let tryb: 'select' | 'zapis' = 'select';
    for (const m of ['order', 'limit', 'in', 'gte', 'lte', 'is', 'neq']) q[m] = () => q;
    q.select = () => q;
    q.eq = (kolumna: string, wartosc: unknown) => {
        if (tryb === 'select') filtry.push({ kolumna, wartosc });
        return q;
    };
    q.single = async () => ({ data: { ...WIERSZ }, error: null });
    q.maybeSingle = async () => q.single();
    q.update = () => { zapisy.push(`update:${tabela}`); tryb = 'zapis'; return q; };
    q.insert = () => { zapisy.push(`insert:${tabela}`); const r: any = { select: () => r, single: async () => ({ data: WIERSZ, error: null }) }; r.then = (res: any) => Promise.resolve({ data: null, error: null }).then(res); return r; };
    q.delete = () => { zapisy.push(`delete:${tabela}`); tryb = 'zapis'; return q; };
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res);
    return q;
}
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (t: string) => zapytanie(t) }) }));

const req = (body: unknown) =>
    new NextRequest('https://example.test/api/appointments/x', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });

const TRASY = [
    { nazwa: 'confirm', modul: '@/app/api/appointments/confirm/route' },
    { nazwa: 'cancel', modul: '@/app/api/appointments/cancel/route' },
];

beforeEach(() => {
    vi.clearAllMocks();
    filtry = [];
    zapisy = [];
    powiadomienia = [];
    limitPrzepuszcza = true;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.PRODENTIS_API_KEY = 'klucz-testowy';
});

describe('P-088 · samo id wizyty nie wystarczy', () => {
    for (const t of TRASY) {
        it(`🔴 ${t.nazwa}: ciało z samym appointmentId → 400, ZERO zapisów, ZERO alertów`, async () => {
            const { POST } = await import(t.modul);
            const res = await POST(req({ appointmentId: ZGADNIETE_UUID, patientId: 'ktokolwiek' }));

            expect(res.status).toBe(400);
            // 🔑 Nie wystarczy status: trasa nie ma prawa nawet SZUKAĆ wiersza po id,
            // bo samo istnienie odpowiedzi 404 vs 400 byłoby wyrocznią istnienia wizyty.
            expect(filtry.some(f => f.kolumna === 'id' && f.wartosc === ZGADNIETE_UUID)).toBe(false);
            expect(zapisy).toHaveLength(0);
            expect(powiadomienia).toHaveLength(0);
        });

        it(`${t.nazwa}: ciało z tokenem → wiersz szukany po confirmation_token`, async () => {
            const { POST } = await import(t.modul);
            const res = await POST(req({ token: TOKEN }));

            expect(res.status).toBeLessThan(400);
            expect(filtry.some(f => f.kolumna === 'confirmation_token' && f.wartosc === TOKEN)).toBe(true);
            // Odczyt po `id` własnego, już znalezionego wiersza jest legalny — zakazane
            // jest wyłącznie szukanie po identyfikatorze PRZYSŁANYM przez klienta.
            expect(filtry.some(f => f.kolumna === 'id' && f.wartosc === ZGADNIETE_UUID)).toBe(false);
        });

        it(`🔴 ${t.nazwa}: przekroczony limit → 429 i ZERO odczytów bazy`, async () => {
            limitPrzepuszcza = false;
            const { POST } = await import(t.modul);
            const res = await POST(req({ token: TOKEN }));

            expect(res.status).toBe(429);
            expect(res.headers.get('Retry-After')).toBeTruthy();
            expect(filtry).toHaveLength(0);
            expect(powiadomienia).toHaveLength(0);
        });
    }
});

describe('P-088 · druga połowa kontraktu: nikt już nie wysyła id', () => {
    it('🔴 landing wizyty nie czyta parametru `appointmentId`', async () => {
        const { readFileSync } = await import('node:fs');
        const zrodlo = readFileSync('src/app/[locale]/wizyta/[type]/page.tsx', 'utf8');

        // Kontrola pozytywna miernika: plik NAPRAWDĘ czyta parametry adresu i token.
        expect(zrodlo).toContain("searchParams.get('token')");

        /**
         * 🪤 Regex, nie `toContain` — asercja na literale przechodzi po zapisaniu tego
         * samego odczytu innym cudzysłowem albo przez zmienną. To nadal grep, nie
         * wykonanie: chroni przed przypadkowym przywróceniem, nie przed uporem.
         */
        expect(zrodlo).not.toMatch(/searchParams\.get\(\s*['"`]appointmentId/);
    });

    it('🔴 cron przypomnień nie buduje już adresu z `appointmentId=`', async () => {
        const { readFileSync } = await import('node:fs');
        const zrodlo = readFileSync('src/app/api/cron/appointment-reminders/route.ts', 'utf8');

        // Kontrola pozytywna: cron nadal buduje adres landingu z tokenem.
        expect(zrodlo).toContain('token=${');

        expect(zrodlo).not.toMatch(/appointmentId=\$\{|['"`]appointmentId=['"`]\s*\+/);
    });
});
