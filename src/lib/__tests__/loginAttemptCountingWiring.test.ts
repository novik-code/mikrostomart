/**
 * Strażnik licznika nieudanych logowań pacjenta.
 *
 * ZMIERZONE NA PRODUKCJI 2026-08-05: nowo zarejestrowany pacjent (0100007846)
 * dostał „Zbyt wiele prób logowania. Spróbuj za 15 minut." przy PIERWSZYM
 * podejściu na już zatwierdzonym koncie. W `login_attempts` stało 5 wpisów
 * z okna 49 sekund — wszystkie sprzed zatwierdzenia konta.
 *
 * PRZYCZYNA: `bcrypt.compare` stoi WYŻEJ niż kontrola `account_status`, więc
 * gałęzie statusowe (email niezweryfikowany / czeka na akceptację / odrzucone /
 * nieaktywne) wykonywały się przy POPRAWNYM haśle — i mimo to zapisywały
 * „nieudaną próbę logowania". Pacjent, który (naturalnie) próbował się zalogować,
 * zanim gabinet zatwierdził konto, spalał cały budżet 5 prób na komunikatach
 * „konto oczekuje na zatwierdzenie", a blokada uderzała dopiero w jego pierwsze
 * realne logowanie.
 *
 * ZASADA: licznik istnieje po to, by łapać ZGADYWANIE HASŁA. Kto hasło podał
 * poprawnie, niczego nie zgaduje. Poniżej `bcrypt.compare` nie wolno już nic
 * dopisywać do `login_attempts` jako porażki.
 *
 * Zliczane zostają dokładnie dwie sytuacje:
 *   - „nie znaleziono pacjenta" — chroni przed wyliczaniem istniejących kont,
 *   - „złe hasło" — właściwy cel limitera.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/patients/login/route.ts'),
    'utf8'
);

/** Wszystko od kontroli statusu konta do udanego logowania. */
function statusRegion(): string {
    const start = src.indexOf('S10-2: account_status enforcement');
    const end = src.indexOf("[Login] Success:");
    expect(start, 'kotwica kontroli statusu zniknęła z trasy logowania').toBeGreaterThan(-1);
    expect(end, 'kotwica udanego logowania zniknęła z trasy logowania').toBeGreaterThan(start);
    return src.slice(start, end);
}

describe('licznik nieudanych logowań nie zlicza odrzuceń statusowych', () => {
    it('gałęzie statusowe NIE dopisują się do login_attempts', () => {
        // Tu hasło jest już zweryfikowane poprawnie — zapis byłby powrotem błędu.
        expect(statusRegion()).not.toMatch(/recordLoginAttempt/);
    });

    it('jako porażka zliczane są dokładnie dwie sytuacje', () => {
        const failures = src.match(/recordLoginAttempt\(loginIdentifier, ip, false\)/g) ?? [];
        expect(failures).toHaveLength(2);
    });

    it('zliczany jest brak konta (ochrona przed wyliczaniem kont)', () => {
        expect(src).toMatch(
            /\[Login\] Patient not found:[\s\S]{0,160}?recordLoginAttempt\(loginIdentifier, ip, false\)/
        );
    });

    it('zliczane jest złe hasło (właściwy cel limitera)', () => {
        expect(src).toMatch(
            /\[Login\] Invalid password for:[\s\S]{0,160}?recordLoginAttempt\(loginIdentifier, ip, false\)/
        );
    });

    it('udane logowanie nadal trafia do rejestru', () => {
        expect(src).toMatch(/recordLoginAttempt\(loginIdentifier, ip, true\)/);
    });
});

describe('limit liczy wylacznie porazki', () => {
    it('oba zapytania zliczajace filtruja success=false', () => {
        // Bez tego filtra UDANE logowanie zjadalo budzet: pacjent, ktory przelogowal sie
        // kilka razy w kwadransie, blokowal sam siebie.
        const filters = src.match(/\.eq\('success', false\)/g) ?? [];
        expect(filters.length).toBeGreaterThanOrEqual(2);
    });

    it('po udanym logowaniu porazki sa kasowane', () => {
        expect(src).toMatch(/recordLoginAttempt\(loginIdentifier, ip, true\)[\s\S]{0,200}?clearFailedAttempts\(loginIdentifier\)/);
    });
});

describe('pacjenci nie blokuja sie nawzajem przez wspolny adres IP', () => {
    it('prog per-IP jest wyrazie wyzszy niz per-identyfikator', () => {
        const perIp = Number(/MAX_ATTEMPTS_PER_IP = (\d+)/.exec(src)?.[1]);
        const perId = Number(/MAX_ATTEMPTS_PER_IDENTIFIER = (\d+)/.exec(src)?.[1]);
        expect(perId).toBeGreaterThan(0);
        // Caly gabinet siedzi za jednym NAT-em, operator komorkowy za CGNAT.
        expect(perIp).toBeGreaterThanOrEqual(50);
        expect(perIp).toBeGreaterThan(perId * 5);
    });
});

describe('komunikat blokady mowi prawde', () => {
    it('czas oczekiwania jest liczony z okna kroczacego, nie zaszyty', () => {
        expect(src).toMatch(/retryAfterFrom/);
        // Zaszyte 900 w miejscu zwracania blokady oznaczaloby staly komunikat "15 minut".
        expect(src).not.toMatch(/retryAfterSeconds: RATE_LIMIT_WINDOW_MINUTES \* 60 \}/);
    });

    it('odpowiedz 429 niesie naglowek Retry-After', () => {
        expect(src).toMatch(/'Retry-After'/);
    });
});

describe('reset hasla zapisuje adres IP w tej samej postaci co logowanie', () => {
    const reset = fs.readFileSync(
        path.join(process.cwd(), 'src/app/api/patients/reset-password/request/route.ts'),
        'utf8'
    );

    it('bierze pierwszy element listy proxy, nie surowy naglowek', () => {
        expect(reset).toMatch(/x-forwarded-for'\)\?\.split\(','\)\[0\]\?\.trim\(\)/);
    });
});
