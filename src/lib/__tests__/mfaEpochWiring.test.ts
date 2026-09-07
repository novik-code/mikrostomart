/**
 * Strażnik okablowania `mfa_epoch` (migracja 191, pozycja 1 planu napraw).
 *
 * 🔴 CO NAPRAWIAMY. Sesja MFA żyła 8 h, a przy „Zaufaj temu urządzeniu" 30 dni,
 * i NIC nie potrafiło jej unieważnić przed czasem. Reset 2FA po kradzieży
 * telefonu nie odbierał złodziejowi dostępu — mimo że komentarz w `mfaSession.ts`
 * twierdził, że „clearuje wszystkie sesje przy następnym middleware check".
 *
 * 🪤 DLACZEGO STRAŻNIK, A NIE SAM TEST JEDNOSTKOWY. Logika epoki jest w jednym
 * miejscu i łatwo ją przetestować, ale jest bezużyteczna, jeśli którykolwiek
 * z wołających jej NIE UŻYJE: weryfikator, który nie poda oczekiwanej epoki,
 * przepuści token sprzed resetu, a wystawca, który jej nie dociągnie, wyda token
 * z epoką 0 i zapętli człowieka na ekranie challenge'u. Oba przypadki przechodzą
 * `tsc` (argument jest opcjonalny z powodu zgodności wstecznej) i oba są ciche.
 *
 * 🪤 KAŻDA ASERCJA MÓWI „ZNALAZŁEM N MIEJSC", nie tylko „nie znalazłem naruszeń".
 * Strażnik z kruchym wzorcem, który po refaktorze przestaje cokolwiek znajdować,
 * świeci na zielono i jest gorszy niż jego brak (lekcja z 2026-08-12).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

/**
 * Wszyscy, którzy WERYFIKUJĄ dowód drugiego składnika.
 *
 * 🪤 Do 2026-09-07 stał tu `src/app/api/auth/2fa/devices/route.ts`. Dowód
 * przeniósł się stamtąd do `src/lib/mfaProof.ts`, bo mieszkając lokalnie
 * w trasie urządzeń TOTP objął tylko ją — rejestracja passkeya, czyli zapis
 * równorzędnego czynnika, została bez dowodu (P-002). Gdyby przy przenosinach
 * ktoś tylko USUNĄŁ stary wpis zamiast go podmienić, ten strażnik przeszedłby
 * „na pusto" (0 === 0) i przestał czegokolwiek pilnować.
 */
const WERYFIKATORZY = [
    'src/middleware.ts',
    'src/lib/bearerAuth.ts',
    'src/lib/mfaProof.ts',
];

/** Wszyscy, którzy WYSTAWIAJĄ sesję MFA (cookie albo token dla apki). */
const WYSTAWCY = [
    'src/app/api/auth/2fa/challenge/route.ts',
    'src/app/api/auth/2fa/verify/route.ts',
    'src/app/api/auth/2fa/devices/[id]/verify/route.ts',
    'src/app/api/auth/passkeys/authenticate/finish/route.ts',
];

/**
 * Wszystkie przejścia, w których pracownik TRACI czynnik → epoka rośnie.
 *
 * 🪤 `removePasskey` dopisane 2026-09-07. Reguła „odebrano czynnik ⇒ sesje
 * padają" była spisana i pilnowana WYŁĄCZNIE dla urządzeń TOTP, więc usunięcie
 * passkeya nie unieważniało sesji MFA, które ten passkey wystawił (8 h, a przy
 * „zaufaj urządzeniu" 30 dni). Passkey jest równorzędnym czynnikiem —
 * `passkeys/authenticate/finish` mintuje z niego pełną sesję.
 */
const ODBIERAJACY: Array<{ plik: string; fn: string }> = [
    { plik: 'src/lib/twoFactorService.ts', fn: 'disableAll' },
    { plik: 'src/lib/twoFactorService.ts', fn: 'adminReset' },
    { plik: 'src/lib/twoFactorService.ts', fn: 'removeDevice' },
    { plik: 'src/lib/passkeyService.ts', fn: 'removePasskey' },
];

describe('Strażnik: okablowanie mfa_epoch', () => {
    it('wszystkie trzy tory weryfikacji podają oczekiwaną epokę', () => {
        // Wzorzec: verifyMfaSessionToken(<cokolwiek>, <drugi argument>)
        //          albo evaluateStaffMfa({ … epoch … })
        const zTokenem = /verifyMfaSessionToken\(\s*[^),]+,\s*[^)]+\)/g;
        const znalezione: string[] = [];

        for (const plik of WERYFIKATORZY) {
            const src = read(plik);
            const wywolania = src.match(/verifyMfaSessionToken\(/g)?.length ?? 0;
            const zEpoka = src.match(zTokenem)?.length ?? 0;
            // Każde wywołanie w kodzie produkcyjnym musi mieć drugi argument.
            expect(
                zEpoka,
                `${plik}: ${wywolania} wywołań verifyMfaSessionToken, z epoką tylko ${zEpoka}. `
                + 'Wywołanie bez drugiego argumentu przepuszcza token sprzed resetu 2FA.',
            ).toBe(wywolania);
            if (wywolania > 0) znalezione.push(plik);
        }

        // bearerAuth ma jedno wywołanie, middleware jedno, devices dwa (nagłówek + cookie)
        expect(znalezione, 'strażnik przestał znajdować weryfikatory — wzorzec zmurszał').toEqual(
            WERYFIKATORZY,
        );
        // Dwa tory dowodu w jednym module: nagłówek (apka) i cookie (web).
        expect(read('src/lib/mfaProof.ts').match(/verifyMfaSessionToken\(/g))
            .toHaveLength(2);
    });

    it('middleware przekazuje epokę na OBA tory (cookie i Bearer)', () => {
        const src = read('src/middleware.ts');
        expect(src).toContain('readMfaGate');
        // tor natywny
        expect(src).toMatch(/evaluateStaffMfa\(\{[\s\S]{0,400}?epoch:\s*mfaEpoch/);
        // tor webowy
        expect(src).toMatch(/verifyMfaSessionToken\(cookie,\s*mfaEpoch\)/);
    });

    it('epoka w bramce natywnej jest WYMAGANA (nie opcjonalna)', () => {
        // `epoch?: number` = nowy wołający pominie ją bez ostrzeżenia.
        const src = read('src/lib/bearerAuth.ts');
        expect(src).toMatch(/epoch:\s*number;/);
        expect(src).not.toMatch(/epoch\?:\s*number/);
    });

    it('żadna trasa nie wystawia tokenu z pominięciem odczytu epoki', () => {
        // createMfaSessionToken jest CZYSTE i domyślnie daje epokę 0 — wolno go
        // wołać wyłącznie w mfaSession.ts i w testach. Trasy używają
        // mintMfaSessionToken / setMfaSessionCookie, które czytają bazę.
        const naruszenia = WYSTAWCY.filter(p => read(p).includes('createMfaSessionToken'));
        expect(
            naruszenia,
            `trasy wołające createMfaSessionToken wprost: ${naruszenia.join(', ')} — `
            + 'wystawią token z epoką 0, czyli natychmiast odrzucany na koncie po resecie.',
        ).toEqual([]);

        // …i sanity: te trasy naprawdę wystawiają sesję (wzorzec nie zmurszał).
        const wystawiajace = WYSTAWCY.filter(p =>
            /mintMfaSessionToken|setMfaSessionCookie/.test(read(p)),
        );
        expect(wystawiajace, 'strażnik przestał widzieć wystawców sesji MFA').toEqual(WYSTAWCY);
    });

    it('setMfaSessionCookie dociąga epokę z bazy', () => {
        const src = read('src/lib/mfaSession.ts');
        expect(src).toContain('getMfaEpoch');
        expect(src).toMatch(/mintMfaSessionToken[\s\S]{0,300}?getMfaEpoch\(userId\)/);
        expect(src).toMatch(/setMfaSessionCookie[\s\S]{0,400}?await mintMfaSessionToken/);
    });

    it('każde odebranie czynnika inkrementuje epokę', () => {
        // Licznik per plik — sam sumaryczny licznik nie dowodzi rozmieszczenia.
        for (const plik of [...new Set(ODBIERAJACY.map(o => o.plik))]) {
            const oczekiwane = ODBIERAJACY.filter(o => o.plik === plik).length;
            const bumpy = read(plik).match(/bumpMfaEpoch\(/g)?.length ?? 0;
            expect(
                bumpy,
                `${plik}: bumpMfaEpoch wywołane ${bumpy} razy, oczekiwane ${oczekiwane}. `
                + 'Brakujące wywołanie = stary token przeżywa odebranie czynnika.',
            ).toBe(oczekiwane);
        }

        // Każde wywołanie w SWOJEJ funkcji.
        for (const { plik, fn } of ODBIERAJACY) {
            const src = read(plik);
            const start = src.indexOf(`export async function ${fn}(`);
            expect(start, `nie ma funkcji ${fn} w ${plik} — strażnik zmurszał`).toBeGreaterThan(-1);
            const koniec = src.indexOf('\nexport ', start + 1);
            const cialo = src.slice(start, koniec === -1 ? undefined : koniec);
            expect(cialo, `${fn} nie unieważnia sesji MFA`).toContain('bumpMfaEpoch(');
        }
    });

    it('odczyt bramki ma fallback na czasy sprzed migracji 191', () => {
        // Bez tego brak kolumny wywala CAŁY select → totp_enabled=false →
        // bramka 2FA przestaje działać dla nie-adminów (fail-open przez literówkę w kolejności wdrożenia).
        const src = read('src/lib/mfaEpoch.ts');
        expect(src).toContain('42703');
        expect(src).toMatch(/select\('totp_enabled'\)/);
    });
});
