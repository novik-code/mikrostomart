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
