/**
 * Dopasowanie konta po e-mailu przy logowaniu.
 *
 * `ilike` traktuje `_` i `%` jako znaki wieloznaczne, a podkreślenie jest legalnym znakiem
 * adresu. Wzorzec pacjenta `jan_kowalski@…` dopasowuje więc także `janxkowalski@…`,
 * `.single()` zwraca przy dwóch wierszach błąd, a trasa oddaje 401 „nieprawidłowe dane
 * logowania" mimo poprawnego hasła.
 *
 * Pomiar na produkcji 2026-08-05: ZYSK 0, STRATA 0 — dziś nikogo to nie odcina. Dwa konta
 * z podwójnym trafieniem mają DOSŁOWNIE ten sam adres (duplikat), więc odmawia im też nowa
 * logika; logują się telefonem. Zmiana jest prewencyjna i zamyka enumerację przez rotację
 * wzorców. Testy niżej opisują zachowanie, nie zastaną awarię.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { pickExactEmailMatch, normalizeEmailKey } from '../emailMatch';

const row = (email: string | null, id = email ?? 'null') => ({ id, email });

describe('pickExactEmailMatch', () => {
    it('zwykły adres — jedno trafienie', () => {
        const r = pickExactEmailMatch([row('jan@example.com')], 'jan@example.com');
        expect(r.reason).toBe('ok');
        expect(r.row?.id).toBe('jan@example.com');
    });

    it('adres z podkreśleniem wybiera WŁASNE konto, nie cudze', () => {
        // Dokładnie to zwracał `ilike('email', 'jan_kowalski@example.com')`:
        // podkreślenie dopasowało też obcy adres z dowolnym znakiem w tym miejscu.
        const rows = [row('jan_kowalski@example.com'), row('janxkowalski@example.com')];
        const r = pickExactEmailMatch(rows, 'jan_kowalski@example.com');
        expect(r.reason).toBe('ok');
        expect(r.row?.id).toBe('jan_kowalski@example.com');
    });

    it('właściciel „obcego" adresu też się loguje', () => {
        const rows = [row('janxkowalski@example.com')];
        const r = pickExactEmailMatch(rows, 'janxkowalski@example.com');
        expect(r.reason).toBe('ok');
    });

    it('wzorzec zamiast adresu (%) nie trafia w cudze konto', () => {
        // `ilike('ofiara%')` zwróciłby konto ofiary — dosłowne porównanie je odrzuca.
        const rows = [row('ofiara@example.com'), row('ofiara2@example.com')];
        expect(pickExactEmailMatch(rows, 'ofiara%').reason).toBe('none');
        expect(pickExactEmailMatch(rows, '%@%').reason).toBe('none');
        expect(pickExactEmailMatch(rows, 'ofiar_@example.com').reason).toBe('none');
    });

    it('dwa konta z DOSŁOWNIE tym samym adresem = odmowa, nie zgadywanie', () => {
        const rows = [row('duplikat@example.com', 'A'), row('duplikat@example.com', 'B')];
        const r = pickExactEmailMatch(rows, 'duplikat@example.com');
        expect(r.reason).toBe('ambiguous');
        expect(r.row).toBeNull();
    });

    it('wielkość liter i spacje brzegowe nie mają znaczenia', () => {
        const rows = [row('Jan.Kowalski@Example.COM')];
        expect(pickExactEmailMatch(rows, '  jan.kowalski@example.com ').reason).toBe('ok');
    });

    it('puste wejście i puste kolumny nie dają trafienia', () => {
        expect(pickExactEmailMatch([row('a@b.pl')], '').reason).toBe('none');
        expect(pickExactEmailMatch([row(null)], 'a@b.pl').reason).toBe('none');
        expect(normalizeEmailKey(undefined)).toBe('');
    });

    it('brak wierszy = brak trafienia (nie wyjątek)', () => {
        expect(pickExactEmailMatch([], 'ktos@example.com').reason).toBe('none');
    });
});

describe('Strażnik okablowania: logowanie po e-mailu', () => {
    const src = fs.readFileSync(
        path.join(process.cwd(), 'src/app/api/patients/login/route.ts'),
        'utf8'
    );

    it('trasa logowania używa dosłownego dopasowania adresu', () => {
        expect(src).toContain('pickExactEmailMatch');
    });

    it('zapytanie po e-mailu NIE kończy się .single() — to ono zamieniało kolizję w 401', () => {
        // Kotwiczymy na samym zapytaniu, nie na `if (isEmail)`: ta zmienna występuje
        // w pliku także wcześniej (walidacja wejścia), więc szersze cięcie łapało
        // nie ten blok i test fałszywie oskarżał poprawny kod.
        const start = src.indexOf(".ilike('email'");
        expect(start, 'zniknęło zapytanie ilike po e-mailu').toBeGreaterThan(-1);
        const blok = src.slice(start, start + 400);
        expect(blok).not.toContain('.single()');
        expect(blok).toContain('EMAIL_LOOKUP_LIMIT');
    });

    it('gałąź telefonu ZACHOWUJE .single() — świadoma decyzja, nie przeoczenie', () => {
        const start = src.indexOf('phoneLookupVariants(loginIdentifier)');
        expect(start).toBeGreaterThan(-1);
        expect(src.slice(start, start + 200)).toContain('.single()');
    });
});
