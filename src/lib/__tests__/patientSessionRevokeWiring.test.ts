/**
 * Strażnik rewokacji sesji pacjenta (migracja 197).
 *
 * 🔴 CZEGO PILNUJE. Token pacjenta żyje 30 dni i nie da się go dziś unieważnić niczym
 * poza tą kolumną. KAŻDA trasa, która zmienia hasło albo kasuje konto, musi przestawić
 * `sessions_valid_from` — inaczej pacjent broniący konta (zmiana hasła po wycieku,
 * reset po przejęciu, usunięcie z RODO) zostaje z żywym tokenem napastnika.
 *
 * Ta klasa błędu wracała w tym repo TRZY razy przy pushu: naprawiono jedno wejście
 * i przeoczono pozostałe. Dlatego strażnik nie sprawdza trzech znanych plików —
 * SKANUJE DRZEWO i wymusza, żeby każdy nowy pisarz hasła też przestawiał datę.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const API = path.join(process.cwd(), 'src/app/api/patients');

/** Wszystkie trasy pacjenta zapisujące `password_hash`. */
function pisarzeHasla(dir: string, zebrane: string[] = []): string[] {
    for (const wpis of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, wpis.name);
        if (wpis.isDirectory()) pisarzeHasla(p, zebrane);
        else if (wpis.name === 'route.ts' && fs.readFileSync(p, 'utf8').includes('password_hash:')) {
            zebrane.push(path.relative(process.cwd(), p));
        }
    }
    return zebrane;
}

/** Trasy TWORZĄCE konto — nie mają starych sesji do unieważnienia. */
const TWORZACE = ['register', 'verify-email'];

describe('Strażnik: rewokacja sesji pacjenta', () => {
    it('każda trasa ZMIENIAJĄCA hasło przestawia sessions_valid_from', () => {
        const wszyscy = pisarzeHasla(API);

        // Sanity: strażnik po refaktorze musi nadal cokolwiek znajdować.
        expect(wszyscy.length, 'strażnik przestał widzieć pisarzy hasła').toBeGreaterThanOrEqual(5);

        const zmieniajacy = wszyscy.filter(p => !TWORZACE.some(t => p.includes(`/${t}/`)));
        expect(zmieniajacy.length, 'zniknęły trasy zmieniające hasło').toBeGreaterThanOrEqual(3);

        // 🪤 NIE `includes('sessions_valid_from')` — w tych plikach stoją komentarze
        //    wyjaśniające mechanizm i zawierające tę nazwę. Cofka to udowodniła:
        //    po usunięciu pola z `update()` test nadal przechodził, bo trafiał w komentarz.
        //    Wzorzec musi opisywać REALNY ZAPIS: pole z przypisaniem daty.
        const ZAPIS = /sessions_valid_from:\s*new Date\(\)\.toISOString\(\)/;
        const bez = zmieniajacy.filter(p => !ZAPIS.test(fs.readFileSync(path.join(process.cwd(), p), 'utf8')));
        expect(
            bez,
            `trasy zmieniające hasło BEZ unieważnienia sesji: ${bez.join(', ')} — pacjent broniący `
            + 'konta zostaje z żywym tokenem napastnika przez 30 dni.',
        ).toEqual([]);
    });

    it('usunięcie konta też unieważnia sesje', () => {
        // Usunięcie jest MIĘKKIE, więc `ON DELETE CASCADE` nigdy się nie odpala i token
        // wydany przed skasowaniem otwierałby dane pacjenta po jego wniosku z RODO.
        const src = fs.readFileSync(path.join(API, 'delete-account/route.ts'), 'utf8');
        expect(src).toMatch(/sessions_valid_from:\s*new Date\(\)\.toISOString\(\)/);
        expect(src, 'soft-delete zniknął — strażnik mierzy nie to co trzeba').toContain("account_status: 'deleted'");
    });

    it('🔴 ŻADNA trasa pacjenta nie weryfikuje tokenu z pominięciem rewokacji', () => {
        // Takt 3: wszystkie trasy przeszły z `verifyTokenFromRequest` na `verifyPatientSession`.
        // Powrót choćby jednej to cicha dziura — trasa działa, tylko nie sprawdza,
        // czy sesja nie została unieważniona. Nie widać tego, dopóki ktoś nie spróbuje.
        const trasy: string[] = [];
        (function skanuj(dir: string) {
            for (const w of fs.readdirSync(dir, { withFileTypes: true })) {
                const p = path.join(dir, w.name);
                if (w.isDirectory()) skanuj(p);
                else if (w.name === 'route.ts') trasy.push(p);
            }
        })(API);

        expect(trasy.length, 'strażnik przestał widzieć trasy pacjenta').toBeGreaterThanOrEqual(25);

        const stare = trasy.filter(p => {
            const src = fs.readFileSync(p, 'utf8');
            // Samo słowo bywa w komentarzu (login/route.ts) — szukamy WYWOŁANIA.
            return /\bverifyTokenFromRequest\s*\(/.test(src);
        }).map(p => path.relative(process.cwd(), p));

        expect(
            stare,
            `trasy omijające sprawdzenie rewokacji: ${stare.join(', ')}`,
        ).toEqual([]);

        // …i kontrola pozytywna: nowa funkcja jest realnie wołana, z `await`.
        const zRewokacja = trasy.filter(p => /await verifyPatientSession\s*\(/.test(fs.readFileSync(p, 'utf8')));
        expect(zRewokacja.length, 'strażnik nie widzi ANI JEDNEJ trasy z rewokacją').toBeGreaterThanOrEqual(20);
    });

    it('logowanie NIE ustawia daty — inaczej każde wejście ubijałoby inne urządzenia', () => {
        // Pacjent bywa zalogowany na telefonie i w przeglądarce naraz. Przestawienie daty
        // przy logowaniu wyrzucałoby go z drugiego urządzenia przy każdym wejściu.
        const src = fs.readFileSync(path.join(API, 'login/route.ts'), 'utf8');
        expect(src).not.toContain('sessions_valid_from');
    });
});
