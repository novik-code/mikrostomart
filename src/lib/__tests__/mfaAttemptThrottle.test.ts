/**
 * Dławik prób weryfikacji drugiego składnika.
 *
 * 🔴 DLACZEGO: do 2026-08-12 w CAŁYM `/api/auth/2fa/*` nie było ŻADNEGO ograniczenia
 * liczby prób — kto znał samo hasło pracownika, mógł zgadywać sześciocyfrowy kod bez
 * końca. Drugi składnik nie zabezpieczał wtedy niczego, tylko wydłużał atak. Od
 * 1 września opiera się na nim czternaście osób zamiast czterech.
 *
 * Test pilnuje trzech rzeczy, z których każda osobno wystarczy, żeby dławik był ozdobą:
 *  1. klucz jest PER UŻYTKOWNIK (per IP zamknąłby cały gabinet za jednym NAT-em),
 *  2. dławik stoi PRZED odczytem sekretu (inaczej wciąż liczymy TOTP przy każdej próbie),
 *  3. obejmuje WSZYSTKIE cztery wejścia weryfikujące, nie tylko `verifyChallenge`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const checkRateLimitMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/lib/rateLimit', () => ({
    checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
}));
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: (...a: unknown[]) => fromMock(...a) }),
}));

const USER = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
});

describe('Dławik: przy przekroczeniu progu odmawia PRZED odczytem sekretu', () => {
    it('verifyChallenge — klucz per użytkownik, zero zapytań do bazy', async () => {
        checkRateLimitMock.mockResolvedValue({ allowed: false, remaining: 0 });
        const { verifyChallenge, MFA_RATE_LIMITED } = await import('@/lib/twoFactorService');

        const res = await verifyChallenge(USER, '123456');

        expect(res).toEqual({ ok: false, error: MFA_RATE_LIMITED });
        // 🔑 Klucz PER UŻYTKOWNIK. Cały gabinet siedzi za jednym NAT-em — limit po IP
        // zamknąłby panel wszystkim, gdy jedna osoba pomyli kod. Ta sama pułapka
        // wywróciła limiter logowania pacjenta (`dc1e132`).
        expect(checkRateLimitMock).toHaveBeenCalledWith(`mfa:totp:${USER}`, 10, 15 * 60_000);
        // 🔑 Dławik MUSI wyprzedzić odczyt — inaczej każda próba i tak kosztuje
        // zapytanie do bazy i policzenie TOTP, czyli hamuje tylko pozornie.
        expect(fromMock, 'dławik przepuścił żądanie do bazy').not.toHaveBeenCalled();
    });

    it('verifyBackupChallenge — osobny, OSTRZEJSZY kubełek', async () => {
        checkRateLimitMock.mockResolvedValue({ allowed: false, remaining: 0 });
        const { verifyBackupChallenge } = await import('@/lib/twoFactorService');

        await verifyBackupChallenge(USER, 'ABCDE-FGHIJ');

        // Kod zapasowy jest używany wyjątkowo i wart więcej dla atakującego —
        // dlatego niższy próg i ODDZIELNY klucz (inaczej zgadywanie TOTP zjadałoby
        // budżet kodów ratunkowych i odwrotnie).
        expect(checkRateLimitMock).toHaveBeenCalledWith(`mfa:backup:${USER}`, 5, 15 * 60_000);
        expect(fromMock).not.toHaveBeenCalled();
    });

    it('poniżej progu przepuszcza dalej (dławik nie blokuje normalnej pracy)', async () => {
        checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 9 });
        fromMock.mockReturnValue({
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
        });
        const { verifyChallenge, MFA_RATE_LIMITED } = await import('@/lib/twoFactorService');

        const res = await verifyChallenge(USER, '123456');

        expect(res.ok).toBe(false);
        // Doszło do odczytu — czyli dławik przepuścił; błąd pochodzi już z logiki, nie z limitu.
        expect('error' in res && res.error).not.toBe(MFA_RATE_LIMITED);
        expect(fromMock).toHaveBeenCalled();
    });
});

describe('Strażnik okablowania — dławik obejmuje WSZYSTKIE wejścia', () => {
    const src = () => readFileSync(join(process.cwd(), 'src/lib/twoFactorService.ts'), 'utf8');

    it('każda funkcja weryfikująca kod woła guardMfaAttempts', () => {
        const s = src();
        // 🪤 Strażnik przypięty do JEDNEJ trasy powiela błąd, któremu ma zapobiegać —
        // ta klasa pomyłki wróciła w tym projekcie trzy razy przy pushu. Dlatego
        // sprawdzamy każdą funkcję z osobna, a nie „czy gdziekolwiek jest dławik".
        const funkcje = ['verifyAndEnableDevice', 'verifyChallenge', 'verifyBackupChallenge', 'verifyAndEnable'];
        const bez: string[] = [];
        for (const fn of funkcje) {
            const i = s.indexOf(`export async function ${fn}(`);
            expect(i, `nie znaleziono ${fn} — nazwa się zmieniła, strażnik oślepł`).toBeGreaterThan(-1);
            const cialo = s.slice(i, i + 900);
            if (!cialo.includes('guardMfaAttempts')) bez.push(fn);
        }
        expect(bez, `wejścia bez dławika: ${bez.join(', ')}`).toEqual([]);
    });

    it('trasy 2FA odpowiadają 429 z Retry-After, nie „nieprawidłowy kod"', () => {
        const trasy = [
            'src/app/api/auth/2fa/challenge/route.ts',
            'src/app/api/auth/2fa/verify/route.ts',
            'src/app/api/auth/2fa/devices/[id]/verify/route.ts',
        ];
        for (const t of trasy) {
            const s = readFileSync(join(process.cwd(), t), 'utf8');
            // Bez 429 klient pokazałby „nieprawidłowy kod" i kazał próbować dalej —
            // czyli człowiek wpadłby w pętlę, zamiast dowiedzieć się, że ma poczekać.
            expect(s, `${t}: brak mapowania na 429`).toContain('MFA_RATE_LIMITED ? 429');
            expect(s, `${t}: brak nagłówka Retry-After`).toContain("'Retry-After'");
        }
    });
});

describe('Tożsamość: bramka i trasa MUSZĄ rozstrzygać ją tak samo', () => {
    it('middleware bierze Bearer PRZED ciasteczkiem, jak authGuards', () => {
        const mw = readFileSync(join(process.cwd(), 'src/middleware.ts'), 'utf8');
        const guards = readFileSync(join(process.cwd(), 'src/lib/authGuards.ts'), 'utf8');

        /**
         * 🔴 Rozjazd kolejności to OBEJŚCIE 2FA, nie kosmetyka. Przy żądaniu z oboma
         * poświadczeniami bramka liczyłaby drugi składnik użytkownika A (ciasteczko),
         * a trasa działała jako użytkownik B (Bearer). Kto zna hasło B, mintuje sobie
         * Bearer — czyli robi dokładnie to, co ma zatrzymać drugi składnik.
         */
        const mwBearer = mw.indexOf('extractBearerToken(request.headers');
        const mwCookieFallback = mw.indexOf('if (!mfaUser) mfaUser = user;');
        expect(mwBearer, 'middleware nie rozwiązuje Bearera').toBeGreaterThan(-1);
        expect(mwCookieFallback, 'brak zejścia na ciasteczko').toBeGreaterThan(-1);
        expect(mwBearer, 'ciasteczko wygrywa z Bearerem — bramka i trasa rozjadą się co do tożsamości')
            .toBeLessThan(mwCookieFallback);

        // Kontrola: w authGuards Bearer też jest pierwszy — to wzorzec, do którego równamy.
        const gBearer = guards.indexOf('extractBearerToken(headerStore');
        const gCookie = guards.indexOf('const cookieStore = await cookies();');
        expect(gBearer).toBeGreaterThan(-1);
        expect(gBearer).toBeLessThan(gCookie);
    });
});
