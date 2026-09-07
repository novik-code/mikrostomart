/**
 * STRAŻNIK WIĄZANIA `state` W OAUTH KALENDARZA (P-038).
 *
 * 🔴 CO BYŁO ZEPSUTE. Callback dostawał w `state` GOŁY `user.id` i sprawdzał go tylko
 * na NIEPUSTOŚĆ, a tokeny zapisywał pod tożsamością z cookie. Napastnik mógł wygenerować
 * własny `code` i podsunąć zalogowanemu pracownikowi link — JEGO konto Google podpinało
 * się do konta OFIARY. Asystent tworzył potem w cudzym kalendarzu wydarzenia z nazwiskiem
 * pacjenta, a interfejs pokazywał tylko „połączono".
 *
 * DOWÓD, ŻE GRYZIE (cofka): przywróć sprawdzenie samej niepustości `state` → pada
 * pierwszy test okablowania.
 *
 * Uruchomienie: `npx vitest run oauthStateBinding`
 */

/* eslint-disable @typescript-eslint/no-explicit-any --
 * Rzutowanie `Request` na typ handlera Next — konwencja repo: jawne wyłączenie z powodem.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { utworzStateOauth, odczytajStateOauth } from '@/lib/oauthState';

const JA = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

let wymiany: { code: string; userId: string }[] = [];
let ktoWSesji: string | null = JA;

vi.mock('@/lib/auth', () => ({ verifyAdmin: async () => (ktoWSesji ? { id: ktoWSesji, email: 'p@example.test' } : null) }));
vi.mock('@/lib/roles', () => ({ hasRole: async () => true }));
vi.mock('@/lib/googleCalendar', () => ({
    exchangeCode: async (code: string, userId: string) => { wymiany.push({ code, userId }); return { success: true }; },
    getAuthUrl: (state?: string) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`,
    disconnectCalendar: async () => ({ success: true }),
    isCalendarConnected: async () => false,
}));

beforeEach(() => {
    vi.clearAllMocks();
    wymiany = [];
    ktoWSesji = JA;
    process.env.JWT_SECRET = 'sekret-testowy-dla-state';
});

describe('P-038 · sam podpis', () => {
    it('own state przechodzi i oddaje tożsamość', () => {
        expect(odczytajStateOauth(utworzStateOauth(JA))).toBe(JA);
    });

    it('🔴 goły identyfikator (dawny format) NIE przechodzi', () => {
        expect(odczytajStateOauth(JA)).toBeNull();
    });

    it('🔴 podrobiony podpis odrzucony', () => {
        const s = utworzStateOauth(JA);
        expect(odczytajStateOauth(s.slice(0, -4) + 'AAAA')).toBeNull();
    });

    it('🔴 state podpisany INNYM sekretem odrzucony', () => {
        const s = utworzStateOauth(JA);
        process.env.JWT_SECRET = 'zupelnie-inny-sekret';
        expect(odczytajStateOauth(s)).toBeNull();
    });

    it('🪤 przeterminowany state odrzucony', () => {
        const s = utworzStateOauth(JA);
        const [id, , los, ] = s.split('.');
        const stary = `${id}.${Date.now() - 60 * 60_000}.${los}`;
        expect(odczytajStateOauth(`${stary}.cokolwiek`)).toBeNull();
    });

    it('🪤 śmieci nie wywracają weryfikacji', () => {
        for (const smiec of [null, '', 'a.b', 'a.b.c.d.e']) {
            expect(() => odczytajStateOauth(smiec)).not.toThrow();
            expect(odczytajStateOauth(smiec)).toBeNull();
        }
    });
});

describe('P-038 · okablowanie callbacku', () => {
    const req = (state: string) =>
        new Request(`https://example.test/api/employee/calendar/auth/callback?code=kod123&state=${encodeURIComponent(state)}`) as any;

    it('🔴 SEDNO: state nie z naszego podpisu → ZERO wymiany kodu', async () => {
        const { GET } = await import('@/app/api/employee/calendar/auth/callback/route');
        await GET(req(JA)); // dawny format: goły identyfikator
        expect(wymiany).toHaveLength(0);
    });

    it('🔴 state podpisany dla KOGOŚ INNEGO niż sesja → ZERO wymiany', async () => {
        const { GET } = await import('@/app/api/employee/calendar/auth/callback/route');
        await GET(req(utworzStateOauth('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb')));
        expect(wymiany).toHaveLength(0);
    });

    it('własny, świeży state przechodzi i zapisuje pod TOŻSAMOŚCIĄ Z SESJI', async () => {
        const { GET } = await import('@/app/api/employee/calendar/auth/callback/route');
        await GET(req(utworzStateOauth(JA)));
        expect(wymiany).toHaveLength(1);
        expect(wymiany[0].userId).toBe(JA);
    });
});
