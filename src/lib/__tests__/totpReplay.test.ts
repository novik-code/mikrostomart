/**
 * P-077 — TEN SAM KOD TOTP WOLNO PRZYJĄĆ TYLKO RAZ (RFC 6238 §5.2).
 *
 * ══ CO PADA BEZ NAPRAWY ═════════════════════════════════════════════════════
 * otplib chodzi z `window: 1`, więc ten sam sześciocyfrowy kod jest ważny przez
 * trzy kroki (delta −1/0/+1), czyli do ~90 s. Serwer zapisywał wyłącznie
 * `last_used_at` — znacznik CZASU, który nie odróżnia kodu od kodu. Kto podejrzał
 * jeden kod pracownika (ramię, kamera, zrzut) i zna jego hasło, miał ~90 s na
 * własny `POST /api/auth/2fa/challenge`. Dławik 10 prób/kwadrans tego nie łapie,
 * bo to jest JEDNA udana próba.
 *
 * Powtórzony kod kupował nie tylko sesję MFA:
 *   · `POST /api/auth/2fa/devices` oddaje w odpowiedzi `secret` nowego urządzenia
 *     (trwały własny drugi składnik na cudzym koncie),
 *   · `removeDevice` / `disableAll` ZDEJMUJĄ drugi składnik ofierze,
 *   · `POST /api/admin/2fa/reset` — najcięższa trasa w repo — kasuje wszystkie
 *     urządzenia i kody zapasowe INNEJ osoby, a ten kod jest tam JEDYNYM dowodem
 *     drugiego składnika (trasa siedzi w `SKIP_2FA_PATHS`).
 *
 * ══ DLACZEGO TEN STRAŻNIK NIE JEST ŚLEPY ════════════════════════════════════
 * 1. Atrapa tabeli REALNIE wykonuje warunkowy zapis `WHERE last_totp_step < :step`.
 *    Gdyby tylko udawała sukces, mierzylibyśmy atrapę, a nie kod.
 * 2. Pary funkcji są ZAWĘŻONE do tych, które naprawdę współdzielą urządzenie.
 *    Naiwna macierz „każdy z każdym" świeciłaby na zielono przy zdjętej ochronie:
 *    `verifyAndEnableDevice` pracuje na urządzeniu NIEAKTYWNYM, a pozostałe
 *    filtrują `enabled = true`, więc kod z jednego zbioru nigdy nie pasuje do
 *    sekretu z drugiego — para kończyłaby się `invalid_code` z powodu
 *    NIEZGODNOŚCI SEKRETU, nie z powodu ochrony, i przechodziła także przed naprawą.
 * 3. Jest kontrola negatywna na awarię bazy: `database_error` NIE MOŻE udawać
 *    `invalid_code`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticator } from 'otplib';

type Device = { id: string; employee_id: string; totp_secret: string; enabled: boolean; last_totp_step: number; last_used_at: string | null };

const EMP = { id: 'emp-1', user_id: 'user-1', totp_enabled: true, totp_backup_codes: [] as string[] };
let devices: Device[] = [];
let bladZapisu = false;
/** Symuluje stan SPRZED wgrania migracji 203 (kolumna jeszcze nie istnieje). */
let brakKolumny = false;

/** Wynik zapytania — kształt PostgREST. */
const wynik = (data: unknown, error: unknown = null) => ({ data, error });

/**
 * Atrapa tabeli `employee_2fa_devices`, która NAPRAWDĘ realizuje semantykę
 * `UPDATE … WHERE id = ? AND last_totp_step < ?`. To jest sedno tego strażnika.
 */
function tabelaUrzadzen() {
    const filtry: Array<(d: Device) => boolean> = [];
    let ltStep: number | null = null;

    const api: Record<string, unknown> = {
        select: () => api,
        eq: (kol: string, val: unknown) => { filtry.push(d => (d as never as Record<string, unknown>)[kol] === val); return api; },
        lt: (kol: string, val: number) => { if (kol === 'last_totp_step') ltStep = val; return api; },
        update: (patch: Partial<Device>) => {
            api.__patch = patch;
            return api;
        },
        delete: () => { api.__delete = true; return api; },
        maybeSingle: async () => {
            const r = devices.filter(d => filtry.every(f => f(d)));
            return wynik(r[0] ?? null);
        },
        then: (res: (v: unknown) => void) => {
            // 🪤 Awaria dotyczy WYŁĄCZNIE zapisu kroku (UPDATE), nigdy DELETE.
            // Przy szerszym zakresie test „awaria przy disableAll" przechodził
            // z NIEWŁAŚCIWEGO POWODU: stary kod przepuszczał weryfikację, a błąd
            // brał się z padniętego kasowania urządzeń — czyli asercja świeciła
            // na zielono także przy zdjętej ochronie.
            if (brakKolumny && api.__patch && 'last_totp_step' in (api.__patch as object)) {
                return res(wynik(null, { code: '42703', message: 'column does not exist' }));
            }
            if (bladZapisu && api.__patch) {
                return res(wynik(null, { code: '08006', message: 'connection failure' }));
            }
            let trafione = devices.filter(d => filtry.every(f => f(d)));
            if (ltStep !== null) trafione = trafione.filter(d => d.last_totp_step < ltStep!);

            if (api.__delete) {
                devices = devices.filter(d => !trafione.includes(d));
                return res(wynik(trafione.map(d => ({ id: d.id }))));
            }
            if (api.__patch) {
                for (const d of trafione) Object.assign(d, api.__patch);
                return res(wynik(trafione.map(d => ({ id: d.id }))));
            }
            return res(wynik(trafione));
        },
    };
    return api;
}

function tabelaPracownikow() {
    const api: Record<string, unknown> = {
        select: () => api,
        eq: () => api,
        update: () => api,
        maybeSingle: async () => wynik({ ...EMP }),
        then: (res: (v: unknown) => void) => res(wynik([{ ...EMP }])),
    };
    return api;
}

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: (t: string) => (t === 'employee_2fa_devices' ? tabelaUrzadzen() : tabelaPracownikow()),
    }),
}));
// Dławik prób musi przepuszczać — mierzymy ochronę przed powtórzeniem, nie limit.
vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: async () => ({ allowed: true }) }));
vi.mock('@/lib/mfaEpoch', () => ({ bumpMfaEpoch: async () => true, getMfaEpoch: async () => 0 }));

const SEKRET_A = authenticator.generateSecret();
const SEKRET_B = authenticator.generateSecret();

beforeEach(() => {
    bladZapisu = false;
    brakKolumny = false;
    devices = [
        { id: 'dev-a', employee_id: 'emp-1', totp_secret: SEKRET_A, enabled: true, last_totp_step: 0, last_used_at: null },
    ];
});

/** Świeży kod z sekretu urządzenia A. */
const kodA = () => authenticator.generate(SEKRET_A);

describe('P-077: powtórzony kod TOTP jest odrzucany', () => {
    it('drugie `verifyChallenge` tym samym kodem pada', async () => {
        const { verifyChallenge } = await import('@/lib/twoFactorService');
        const kod = kodA();
        expect((await verifyChallenge('user-1', kod)).ok, 'pierwszy raz ma przejść').toBe(true);
        const drugi = await verifyChallenge('user-1', kod);
        expect(drugi.ok).toBe(false);
        expect((drugi as { error: string }).error).toBe('invalid_code');
    });

    it('kod zużyty na `verifyChallenge` nie przechodzi w `regenerateBackupCodes`', async () => {
        const { verifyChallenge, regenerateBackupCodes } = await import('@/lib/twoFactorService');
        const kod = kodA();
        expect((await verifyChallenge('user-1', kod)).ok).toBe(true);
        expect((await regenerateBackupCodes('user-1', kod)).ok).toBe(false);
    });

    it('kod zużyty na `regenerateBackupCodes` nie przechodzi w `verifyChallenge`', async () => {
        const { verifyChallenge, regenerateBackupCodes } = await import('@/lib/twoFactorService');
        const kod = kodA();
        expect((await regenerateBackupCodes('user-1', kod)).ok).toBe(true);
        expect((await verifyChallenge('user-1', kod)).ok).toBe(false);
    });

    it('kod zużyty na `verifyChallenge` nie usuwa urządzenia (`removeDevice`)', async () => {
        // Operacja NISZCZĄCA drugi składnik — tu powtórzenie boli najbardziej.
        const { verifyChallenge, removeDevice } = await import('@/lib/twoFactorService');
        const kod = kodA();
        expect((await verifyChallenge('user-1', kod)).ok).toBe(true);
        const usun = await removeDevice('user-1', 'dev-a', kod);
        expect(usun.ok).toBe(false);
        expect(devices.find(d => d.id === 'dev-a'), 'urządzenie miało zostać').toBeTruthy();
    });

    it('kod zużyty na `verifyChallenge` nie wyłącza całego 2FA (`disableAll`)', async () => {
        const { verifyChallenge, disableAll } = await import('@/lib/twoFactorService');
        const kod = kodA();
        expect((await verifyChallenge('user-1', kod)).ok).toBe(true);
        expect((await disableAll('user-1', kod)).ok).toBe(false);
        expect(devices.length, 'urządzenia miały zostać').toBeGreaterThan(0);
    });

    it('kod użyty do AKTYWACJI urządzenia nie przechodzi zaraz potem w `verifyChallenge`', async () => {
        // Jedyne przejście „nieaktywne → aktywne" w oknie 90 s. To dla niego
        // `verifyAndEnableDevice` MUSI zapisać krok, choć go nie bramkuje.
        devices = [{ id: 'dev-n', employee_id: 'emp-1', totp_secret: SEKRET_B, enabled: false, last_totp_step: 0, last_used_at: null }];
        const { verifyAndEnableDevice, verifyChallenge } = await import('@/lib/twoFactorService');
        const kod = authenticator.generate(SEKRET_B);
        expect((await verifyAndEnableDevice('user-1', 'dev-n', kod)).ok).toBe(true);
        expect(devices[0].last_totp_step, 'aktywacja miała zapisać krok').toBeGreaterThan(0);
        expect((await verifyChallenge('user-1', kod)).ok).toBe(false);
    });
});

describe('P-077: kontrole negatywne — nie zepsuliśmy normalnego logowania', () => {
    it('kod z NOWEGO kroku przechodzi po zużyciu poprzedniego', async () => {
        // Gdyby ochrona blokowała krok `<=` zamiast `<`, albo zapisywała krok
        // o jeden za duży, pracownik straciłby NASTĘPNY, poprawny kod.
        const { verifyChallenge } = await import('@/lib/twoFactorService');
        expect((await verifyChallenge('user-1', kodA())).ok).toBe(true);
        // Symulacja upływu jednego okna: cofamy zapisany krok o 1, jakby nowy kod
        // pochodził z kroku o 1 wyższego niż zużyty.
        devices[0].last_totp_step -= 1;
        expect((await verifyChallenge('user-1', kodA())).ok, 'kolejny kod musi przejść').toBe(true);
    });

    it('DRUGIE urządzenie tej samej osoby nie jest blokowane krokiem pierwszego', async () => {
        // Zmierzone na produkcji 07.09: dwie osoby mają po kilka urządzeń, a konto
        // gabinetu obsługuje kilka osób. Licznik per PRACOWNIK zamknąłby recepcję.
        devices.push({ id: 'dev-b', employee_id: 'emp-1', totp_secret: SEKRET_B, enabled: true, last_totp_step: 0, last_used_at: null });
        const { verifyChallenge } = await import('@/lib/twoFactorService');
        expect((await verifyChallenge('user-1', kodA())).ok).toBe(true);
        expect((await verifyChallenge('user-1', authenticator.generate(SEKRET_B))).ok,
            'kod drugiego urządzenia musi przejść').toBe(true);
    });

    it('AWARIA BAZY zwraca `database_error`, nie `invalid_code`', async () => {
        // Jeden kod błędu na dwie przyczyny ukrywał w tym projekcie awarię
        // przez miesiące. Awaria ma krzyczeć, brak ma milczeć.
        const { verifyChallenge } = await import('@/lib/twoFactorService');
        bladZapisu = true;
        const r = await verifyChallenge('user-1', kodA());
        expect(r.ok).toBe(false);
        expect((r as { error: string }).error).toBe('database_error');
    });

    it('KOLEJNOŚĆ WDROŻENIA: kod wdrożony PRZED migracją 203 nie zamyka panelu', async () => {
        // 🔴 Push do `main` wdraża kod natychmiast, a migracje wgrywa się osobno.
        // Gdyby brak kolumny był twardym błędem, KAŻDA weryfikacja drugiego
        // składnika zwracałaby błąd i cały zespół straciłby dostęp do panelu.
        // Ta sama pułapka co przy migracji 191 (patrz `mfaEpoch.readMfaGate`).
        brakKolumny = true;
        const { verifyChallenge } = await import('@/lib/twoFactorService');
        expect((await verifyChallenge('user-1', kodA())).ok,
            'logowanie 2FA musi działać także przed wgraniem migracji').toBe(true);
    });

    it('awaria przy `disableAll` też nie udaje złego kodu', async () => {
        const { disableAll } = await import('@/lib/twoFactorService');
        bladZapisu = true;
        const r = await disableAll('user-1', kodA());
        expect(r.ok).toBe(false);
        expect((r as { error: string }).error).toBe('database_error');
    });
});
