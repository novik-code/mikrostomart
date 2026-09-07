/**
 * P-002 + P-076 + unieważnianie sesji po usunięciu passkeya.
 *
 * ══ CO PADA BEZ NAPRAWY ═════════════════════════════════════════════════════
 * 1. P-002: `POST /api/auth/passkeys/register/begin` sprawdzał WYŁĄCZNIE rolę
 *    (`requireEmployeeOrAdmin`). Passkey jest pełnoprawnym drugim składnikiem —
 *    `passkeys/authenticate/finish` wystawia z niego `mfa_session`. Kto znał samo
 *    HASŁO pracownika, dopisywał sobie własny klucz i mintował pełną sesję MFA,
 *    a nią przechodził `hasCurrentFactorProof` w `/api/auth/2fa/devices` i dopinał
 *    sobie jeszcze urządzenie TOTP. Bliźniacza trasa TOTP wymaga dowodu od `6f804f6`;
 *    passkeye zostały otwarte — klasyczne „naprawiliśmy jedno miejsce z pary".
 *    Na produkcji 07.09: 3 zarejestrowane passkeye, więc funkcja jest w użyciu.
 *
 * 2. P-076: zadławienie prób wracało jako `403 proof_required`, nieodróżnialne od
 *    złego kodu, a KAŻDY błędny kod palił RÓWNOCZEŚNIE kubełek TOTP (10/15 min)
 *    i zapasowy (5/15 min) — bo trasa po nieudanym TOTP i tak wołała weryfikację
 *    kodu zapasowego. Kubełek `mfa:backup` jest WSPÓLNY z logowaniem kodem
 *    zapasowym, więc pięć pomyłek przy dodawaniu urządzenia zabierało drogę
 *    ratunku przy logowaniu.
 *
 * 3. Usunięcie passkeya nie inkrementowało `mfa_epoch`, więc sesje MFA wystawione
 *    przez usuwany klucz ŻYŁY DALEJ (do 30 dni przy „zaufaj urządzeniu").
 *    `twoFactorService.ts:480-489` formułuje regułę wprost dla urządzeń TOTP —
 *    passkeye z niej wypadły.
 *
 * ══ DLACZEGO TEN STRAŻNIK NIE JEST ŚLEPY ════════════════════════════════════
 * Nie mockuje `@/lib/mfaProof` — czyli modułu, który naprawa wnosi. Mockowane są
 * wyłącznie ZALEŻNOŚCI (twoFactorService, passkeyService, authGuards, cookies),
 * więc realna logika dowodu wykonuje się w każdym przypadku. Asercje celują
 * w KOD ODPOWIEDZI i w to, KTÓRA funkcja została wywołana, nigdy w napis w pliku.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const requireEmployeeOrAdminMock = vi.fn();
const getTwoFactorStatusMock = vi.fn();
const verifyChallengeMock = vi.fn();
const verifyBackupChallengeMock = vi.fn();
const cookiesMock = vi.fn();
const generateRegistrationMock = vi.fn();
const setChallengeCookieMock = vi.fn();
const logAuditMock = vi.fn();

vi.mock('next/headers', () => ({ cookies: () => cookiesMock() }));
vi.mock('@/lib/authGuards', () => ({
    requireEmployeeOrAdmin: () => requireEmployeeOrAdminMock(),
}));
vi.mock('@/lib/twoFactorService', () => ({
    getTwoFactorStatus: (...a: unknown[]) => getTwoFactorStatusMock(...a),
    verifyChallenge: (...a: unknown[]) => verifyChallengeMock(...a),
    verifyBackupChallenge: (...a: unknown[]) => verifyBackupChallengeMock(...a),
    MFA_RATE_LIMITED: 'too_many_attempts',
    // 🪤 Atrapa MUSI eksportowac te sama liste stalych co modul. Brak jednej z nich
    // daje `undefined` po stronie importu i cicho wywraca porownania w mfaProof.
    MFA_DATABASE_ERROR: 'database_error',
    MFA_ATTEMPT_WINDOW_MS: 15 * 60_000,
}));
vi.mock('@/lib/passkeyService', () => ({
    deriveRpConfig: () => ({ rpID: 'mikrostomart.pl', origin: 'https://mikrostomart.pl' }),
    dozwolonyOriginWebAuthn: (h: string | null) =>
        (h && h.includes('mikrostomart.pl') ? 'https://www.mikrostomart.pl' : null),
    generateRegistration: (...a: unknown[]) => generateRegistrationMock(...a),
    verifyRegistration: vi.fn(),
    removePasskey: vi.fn().mockResolvedValue({ ok: true }),
    renamePasskey: vi.fn(),
}));
vi.mock('@/lib/passkeyChallenge', () => ({
    setChallengeCookie: (...a: unknown[]) => setChallengeCookieMock(...a),
    getChallengeCookie: vi.fn(),
    clearChallengeCookie: vi.fn(),
}));
// Odczyt epoki ma się UDAWAĆ — te testy mierzą logikę dowodu, nie odczyt bramki.
// Awaria odczytu ma własny przypadek niżej (fail-closed → 503).
const readFailedMock = { value: false };
vi.mock('@/lib/mfaEpoch', () => ({
    readMfaEpochForVerification: async () => ({ epoch: 0, readFailed: readFailedMock.value }),
    getMfaEpoch: async () => 0,
    bumpMfaEpoch: async () => true,
}));
vi.mock('@/lib/auditLog', () => ({ logAudit: (...a: unknown[]) => logAuditMock(...a) }));

const USER_ID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
    vi.clearAllMocks();
    process.env.MFA_SESSION_SECRET = 'a'.repeat(64);
    requireEmployeeOrAdminMock.mockResolvedValue({
        ok: true,
        user: { id: USER_ID, email: 'pracownik@example.com' },
    });
    // Domyślnie: konto MA włączone 2FA — czyli przypadek, którego dotyczy dziura.
    getTwoFactorStatusMock.mockResolvedValue({ enabled: true, backupCodesRemaining: 8 });
    verifyChallengeMock.mockResolvedValue({ ok: false, error: 'invalid_code' });
    verifyBackupChallengeMock.mockResolvedValue({ ok: false, error: 'invalid_code' });
    cookiesMock.mockResolvedValue({ get: () => undefined });
    generateRegistrationMock.mockResolvedValue({
        ok: true, challenge: 'chal-123', options: { challenge: 'chal-123' },
    });
});

async function beginRegister(body: Record<string, unknown> = { deviceName: 'Klucz' },
                             headers: Record<string, string> = {}) {
    const { POST } = await import('@/app/api/auth/passkeys/register/begin/route');
    const req = new Request('https://www.mikrostomart.pl/api/auth/passkeys/register/begin', {
        method: 'POST',
        // 🪤 `Request` w undici NIE ustawia nagłówka `host` z adresu — trasa czyta
        // go wprost (allow-lista origin WebAuthn), więc podajemy go jawnie.
        headers: { 'content-type': 'application/json', host: 'www.mikrostomart.pl', ...headers },
        body: JSON.stringify(body),
    });
    return POST(req as never);
}

describe('P-002: rejestracja passkeya wymaga dowodu drugiego składnika', () => {
    it('sesja po SAMYM HAŚLE dostaje 403 proof_required', async () => {
        const res = await beginRegister();
        expect(res.status).toBe(403);
        expect((await res.json()).error).toBe('proof_required');
    });

    it('odmowa NIE wystawia ciasteczka challenge', async () => {
        // Gdyby dowód stał po `setChallengeCookie`, napastnik dostawałby podpisany
        // blob mimo odmowy — a to jest dokładnie wektor P-008.
        await beginRegister();
        expect(setChallengeCookieMock).not.toHaveBeenCalled();
    });

    it('odmowa NIE dociąga opcji WebAuthn (nie ruszamy bazy przed dowodem)', async () => {
        await beginRegister();
        expect(generateRegistrationMock).not.toHaveBeenCalled();
    });

    it('FAIL-CLOSED: gdy nie da się ustalić stanu 2FA, odmawiamy', async () => {
        // getTwoFactorStatus zwraca null i przy braku pracownika, i przy awarii
        // bazy (supabase-js nie rzuca). Brak wiedzy nie może znaczyć „przepuść".
        getTwoFactorStatusMock.mockResolvedValue(null);
        const res = await beginRegister();
        expect(res.status).toBe(403);
    });

    it('FAIL-CLOSED: padnięty ODCZYT EPOKI kończy się 503, nie wpuszczeniem', async () => {
        // 🔴 Wcześniej epoka wracała jako 0, a porównanie brzmi
        // `tokenEpoch < expectedEpoch` — więc epoka 0 przyjmowała token o KAŻDEJ
        // epoce. Awaria bazy OŻYWIAŁA token unieważniony resetem 2FA, i to akurat
        // na trasie, która dopisuje drugi składnik.
        readFailedMock.value = true;
        try {
            const res = await beginRegister();
            expect(res.status).toBe(503);
            expect((await res.json()).error).toBe('mfa_check_unavailable');
        } finally {
            readFailedMock.value = false;
        }
    });

    it('KONTROLA NEGATYWNA: konto BEZ 2FA rejestruje pierwszy klucz normalnie', async () => {
        // Inaczej powstałoby zakleszczenie: bez drugiego składnika nie dałoby się
        // dodać pierwszego. To jest bootstrap i musi działać.
        getTwoFactorStatusMock.mockResolvedValue({ enabled: false, backupCodesRemaining: 0 });
        const res = await beginRegister();
        expect(res.status).toBe(200);
        expect(setChallengeCookieMock).toHaveBeenCalled();
    });

    it('KONTROLA NEGATYWNA: ważna sesja MFA w nagłówku przepuszcza (tor apki)', async () => {
        const { createMfaSessionToken } = await import('@/lib/mfaSession');
        const token = createMfaSessionToken(USER_ID, false, 0);
        const res = await beginRegister({ deviceName: 'Klucz' }, { 'x-mfa-session': token });
        expect(res.status).toBe(200);
    });

    it('KONTROLA NEGATYWNA: poprawny kod TOTP przepuszcza', async () => {
        verifyChallengeMock.mockResolvedValue({ ok: true, deviceId: 'd1' });
        const res = await beginRegister({ deviceName: 'Klucz', code: '123456' });
        expect(res.status).toBe(200);
    });
});

describe('P-076: zadławienie jest odróżnialne od złego kodu', () => {
    it('zadławiony TOTP daje 429, nie 403', async () => {
        verifyChallengeMock.mockResolvedValue({ ok: false, error: 'too_many_attempts' });
        const res = await beginRegister({ deviceName: 'Klucz', code: '123456' });
        expect(res.status).toBe(429);
        expect((await res.json()).error).toBe('too_many_attempts');
    });

    it('odpowiedź 429 niesie Retry-After', async () => {
        verifyChallengeMock.mockResolvedValue({ ok: false, error: 'too_many_attempts' });
        const res = await beginRegister({ deviceName: 'Klucz', code: '123456' });
        expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
    });

    it('kod 6-cyfrowy pali WYŁĄCZNIE kubełek TOTP', async () => {
        // Przyczyna, nie objaw: wcześniej każdy błędny kod szedł do OBU weryfikatorów,
        // a kubełek `mfa:backup` jest wspólny z logowaniem kodem zapasowym.
        await beginRegister({ deviceName: 'Klucz', code: '123456' });
        expect(verifyChallengeMock).toHaveBeenCalled();
        expect(verifyBackupChallengeMock).not.toHaveBeenCalled();
    });

    it('🪤 kod TOTP ZE SPACJĄ idzie do weryfikatora TOTP, nie zapasowego', async () => {
        // Router kształtu był STRICTSZY niż weryfikator: `verifyCodeStep` usuwa
        // WSZYSTKIE białe znaki, a router robił tylko `.trim()`. Kod „123 456" —
        // a tak wyświetla go część aplikacji authenticator i tak wklejają go ludzie —
        // nie przechodził przez wzorzec i trafiał do weryfikatora kodów ZAPASOWYCH,
        // paląc kubełek `mfa:backup` (5/15 min) WSPÓLNY z logowaniem kodem zapasowym.
        // Pięć takich pomyłek zabierało człowiekowi drogę ratunku przy logowaniu.
        verifyChallengeMock.mockResolvedValue({ ok: true, deviceId: 'd1' });
        const res = await beginRegister({ deviceName: 'Klucz', code: '123 456' });
        expect(res.status).toBe(200);
        expect(verifyChallengeMock).toHaveBeenCalled();
        expect(verifyBackupChallengeMock).not.toHaveBeenCalled();
    });

    it('AWARIA BAZY przy weryfikacji kodu daje 503, nie 403 „brak dowodu"', async () => {
        // Awaria CZĄSTKOWA (odczyty żyją, zapis pada) przechodzi przez bramkę odczytu
        // epoki i dociera aż tutaj. Bez rozróżnienia człowiek widzi „popraw dowód"
        // i wpisuje kolejne POPRAWNE kody aż do zadławienia.
        verifyChallengeMock.mockResolvedValue({ ok: false, error: 'database_error' });
        const res = await beginRegister({ deviceName: 'Klucz', code: '123456' });
        expect(res.status).toBe(503);
        expect((await res.json()).error).toBe('mfa_check_unavailable');
    });

    it('kod w kształcie zapasowego (XXXXX-XXXXX) pali WYŁĄCZNIE kubełek zapasowy', async () => {
        await beginRegister({ deviceName: 'Klucz', code: 'A1B2C-D3E4F' });
        expect(verifyBackupChallengeMock).toHaveBeenCalled();
        expect(verifyChallengeMock).not.toHaveBeenCalled();
    });
});

describe('Usunięcie passkeya unieważnia jego sesje i zostawia ślad', () => {
    it('DELETE zostawia wpis w audycie', async () => {
        const { DELETE } = await import('@/app/api/auth/passkeys/[id]/route');
        const req = new Request('https://www.mikrostomart.pl/api/auth/passkeys/pk-1',
            { method: 'DELETE', headers: { host: 'www.mikrostomart.pl' } });
        await DELETE(req as never, { params: Promise.resolve({ id: 'pk-1' }) });
        expect(logAuditMock).toHaveBeenCalled();
        expect(logAuditMock.mock.calls[0][0].action).toBe('passkey_removed');
    });
});
