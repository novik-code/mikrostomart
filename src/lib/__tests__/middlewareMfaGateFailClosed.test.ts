/**
 * P-074 — AWARIA ODCZYTU BRAMKI 2FA ODMAWIA, ZAMIAST UDAWAĆ „KONTO BEZ 2FA".
 *
 * ══ CO PADA BEZ NAPRAWY ═════════════════════════════════════════════════════
 * `enforce2FA` ignorował wynik odczytu z bazy. Padnięte zapytanie PostgREST
 * (to NIE jest wyjątek — supabase-js nie rzuca) dawało `totpEnabled = false`.
 * Od 1 IX 2026 obowiązek 2FA obejmuje cały zespół — a ta data JUŻ MINĘŁA
 * (zmierzone: `MFA_MANDATORY_FROM_ISO = 2026-09-01`, dziś 7 IX) — więc każde
 * żądanie personelu w oknie awarii kończyło się FAŁSZYWYM `mfa_setup_required`:
 * apka odsyłała człowieka do Bezpieczeństwa, web na kreatora 2FA. Zamiast
 * powiedzieć „nie umiem tego teraz sprawdzić", system twierdził „nie masz 2FA".
 *
 * Decyzja właściciela 2026-09-07: fail-closed + alarm na Telegram.
 *
 * ══ DLACZEGO `readFailed`, A NIE `ok` ═══════════════════════════════════════
 * `ok` sklejał awarię z sytuacją „nie ma takiego pracownika", która jest zupełnie
 * normalna (konto pacjenta). Bramkowanie po `ok` odcięłoby ludzi bez powodu.
 * Zmierzone na produkcji 07.09: dokładnie JEDNO konto ma rolę bez wiersza
 * w `employees` i jest to rola `patient` — żaden pracownik w tę gałąź nie wpada.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const gateMock = { totpEnabled: false, epoch: 0, ok: false, readFailed: false };
const telegramWyslany: string[] = [];

vi.mock('next-intl/middleware', () => ({ default: () => () => NextResponse.next() }));
vi.mock('@/i18n/routing', () => ({ routing: { locales: ['pl'], defaultLocale: 'pl' } }));
vi.mock('@supabase/ssr', () => ({
    createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: () => ({ select: () => ({ eq: async () => ({ data: [{ role: 'employee' }] }) }) }),
    }),
}));
vi.mock('@/lib/mfaEpoch', () => ({
    readMfaGate: async () => ({ ...gateMock }),
    getMfaEpoch: async () => 0,
    readMfaEpochForVerification: async () => ({ epoch: 0, readFailed: false }),
    bumpMfaEpoch: async () => true,
}));
// Tożsamość podajemy Bearerem — to najkrótsza droga do wykonania samej bramki.
// `bearerRozpoznany = false` udaje CRONA z Vercela: `Bearer CRON_SECRET` nie jest
// tokenem Supabase, więc GoTrue go odrzuca i `getUserFromBearerToken` daje null.
const bearerRozpoznany = { value: true };
vi.mock('@/lib/bearerAuth', async (orig) => {
    const rzeczywiste = await orig<typeof import('@/lib/bearerAuth')>();
    return {
        ...rzeczywiste,
        extractBearerToken: () => 'token-testowy',
        getUserFromBearerToken: async () =>
            (bearerRozpoznany.value ? { id: 'user-1', email: 'p@example.com' } : null),
    };
});
vi.mock('@/lib/telegram', () => ({
    sendTelegramNotification: async (m: string) => { telegramWyslany.push(m); return true; },
}));

async function zadanie(sciezka: string) {
    const { middleware } = await import('@/middleware');
    const req = new NextRequest(new URL(`https://www.mikrostomart.pl${sciezka}`), {
        headers: { authorization: 'Bearer token-testowy' },
    });
    return middleware(req);
}

beforeEach(() => {
    telegramWyslany.length = 0;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'k'.repeat(40);
    process.env.MFA_SESSION_SECRET = 'a'.repeat(64);
    Object.assign(gateMock, { totpEnabled: false, epoch: 0, ok: false, readFailed: false });
    bearerRozpoznany.value = true;
});

describe('P-074: padnięty odczyt bramki 2FA', () => {
    it('kończy się 503 mfa_check_unavailable, nie fałszywym mfa_setup_required', async () => {
        gateMock.readFailed = true;
        const res = await zadanie('/api/employee/tasks');
        expect(res.status).toBe(503);
        expect((await res.json()).error).toBe('mfa_check_unavailable');
    });

    it('podnosi alarm na Telegramie', async () => {
        // Cicha odmowa jest gorsza niż głośna: zespół widzi „nie działa" i nie wie,
        // czy to awaria bazy, czy ich konto.
        gateMock.readFailed = true;
        await zadanie('/api/employee/tasks');
        expect(telegramWyslany.length).toBe(1);
        expect(telegramWyslany[0]).toContain('2FA');
    });
});

describe('P-073: trasy /api/admin/2fa/* są ZA bramką 2FA', () => {
    // 🪤 Ten opis MUSI być sprawdzany wykonaniem. Przy pierwszej próbie grep po
    // `'/api/admin/2fa/'` w bloku SKIP_2FA_PATHS znalazł ciąg… w MOIM komentarzu
    // obok. Ta sama pomyłka zdarzyła się w tym projekcie już trzy razy i za
    // każdym razem dawała strażnika świecącego zielono przy zdjętej ochronie.
    it.each([
        '/api/admin/2fa/status',
        '/api/admin/2fa/enrollment-reminder',
        '/api/admin/2fa/reset',
    ])('%s wymaga drugiego składnika', async (sciezka) => {
        gateMock.readFailed = false;
        gateMock.totpEnabled = false;
        const res = await zadanie(sciezka);
        // Konto bez 2FA po 1 IX → mfa_setup_required. Kluczowe jest to, że bramka
        // W OGÓLE wchodzi; przed naprawą zwracała `null` i trasa szła bez dowodu.
        expect(res.status).toBe(403);
        expect((await res.json()).error).toBe('mfa_setup_required');
    });

    it('KONTROLA NEGATYWNA: kreator 2FA (/api/auth/2fa/*) dalej jest pominięty', async () => {
        // Gdyby ta ścieżka też weszła pod bramkę, powstałoby ZAKLESZCZENIE:
        // bez drugiego składnika nie dałoby się go skonfigurować.
        gateMock.readFailed = false;
        gateMock.totpEnabled = false;
        const res = await zadanie('/api/auth/2fa/challenge');
        expect(res.status).not.toBe(403);
    });

    it('KONTROLA NEGATYWNA: strona kreatora /pracownik/security nie wpada w bramkę 2FA', async () => {
        // ⚠️ Zawężone świadomie. Ta ścieżka i tak dostaje 307 z bramki LOGOWANIA
        // Supabase (w tym teście nie ma ciasteczka sesji) — to inna warstwa
        // i nie jest przedmiotem tej pozycji. Sprawdzamy wyłącznie, że NIE odbija
        // jej bramka 2FA, bo to oznaczałoby zakleszczenie kreatora.
        gateMock.readFailed = false;
        gateMock.totpEnabled = false;
        const res = await zadanie('/pracownik/security');
        expect(res.status).not.toBe(403);
        const cel = res.headers.get('location') ?? '';
        expect(cel, 'kreator nie może być odbijany na challenge ani na samego siebie')
            .not.toContain('2fa-challenge');
    });
});

describe('P-004: nowe prefiksy bramki', () => {
    it.each([
        '/api/social/publish',
        '/api/short-links',
        '/api/health/ai',
        '/api/fix-db-images',
        '/api/cron/post-visit-sms',
    ])('%s wymaga drugiego składnika przy wejściu z panelu', async (sciezka) => {
        gateMock.readFailed = false;
        gateMock.totpEnabled = false;
        const res = await zadanie(sciezka);
        expect(res.status).toBe(403);
    });

    it('🔴 KONTROLA NEGATYWNA: CRON Z VERCELA nie jest ruszany', async () => {
        // Najważniejszy przypadek tej pozycji. Cron leci z `Bearer CRON_SECRET`,
        // którego GoTrue nie rozpoznaje → `getUserFromBearerToken` daje null →
        // `mfaUser` puste → bramka NIE wchodzi. Gdyby ta ścieżka zaczęła dostawać
        // 403, przypomnienia, SMS-y do pacjentów i retencja przestałyby chodzić
        // PO CICHU — a cisza w tym projekcie kosztowała już najwięcej.
        bearerRozpoznany.value = false;
        gateMock.readFailed = false;
        const res = await zadanie('/api/cron/post-visit-sms');
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(503);
        expect(res.status).not.toBe(401);
    });

    it('KONTROLA NEGATYWNA: awaria odczytu też nie rusza crona z Vercela', async () => {
        bearerRozpoznany.value = false;
        gateMock.readFailed = true;
        const res = await zadanie('/api/cron/appointment-reminders');
        expect(res.status).not.toBe(503);
    });
});

describe('P-074: kontrole negatywne — nie zamykamy strefy bez powodu', () => {
    it('BRAK WIERSZA pracownika (ok:false) NIE jest awarią i nie daje 503', async () => {
        // To jest stan normalny, np. konto pacjenta. Bramkowanie po `ok` odcinałoby
        // ludzi bez powodu — dlatego naprawa patrzy na `readFailed`, nie na `ok`.
        gateMock.ok = false;
        gateMock.readFailed = false;
        const res = await zadanie('/api/employee/tasks');
        expect(res.status).not.toBe(503);
        expect(telegramWyslany.length).toBe(0);
    });

    it('udany odczyt przy koncie BEZ 2FA dalej prowadzi do kreatora, nie do 503', async () => {
        gateMock.readFailed = false;
        gateMock.totpEnabled = false;
        const res = await zadanie('/api/employee/tasks');
        expect(res.status).toBe(403);
        expect((await res.json()).error).toBe('mfa_setup_required');
    });

    it('ścieżka spoza bramki nie jest ruszana nawet przy awarii odczytu', async () => {
        gateMock.readFailed = true;
        const res = await zadanie('/api/patients/me');
        expect(res.status).not.toBe(503);
    });
});
