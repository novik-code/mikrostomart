/**
 * Crony nie odpowiadają anonimowi NICZYM poza odmową.
 *
 * ══ CO PADA BEZ NAPRAWY ═════════════════════════════════════════════════════
 * `post-visit-sms` i `week-after-visit-sms` sprawdzały `isSmsTypeEnabled()`
 * PRZED autoryzacją. Przy wyłączonym kanale zwracały anonimowi:
 *
 *     200 {"success":true,"skipped":true,"reason":"SMS type disabled"}
 *
 * czyli wyrocznię stanu konfiguracji gabinetu plus zapytanie do bazy bez
 * uwierzytelnienia. Zmierzone na produkcji 2026-09-09 — te dwie trasy oddawały
 * 200, a pozostałe crony tej samej rodziny poprawne 401.
 *
 * ══ DLACZEGO STRAŻNIK PATRZY NA KOLEJNOŚĆ, A NIE NA OBECNOŚĆ BRAMKI ═════════
 * Bramka BYŁA na miejscu i grep po `requireAdmin` znajdował ją bez trudu.
 * Wadą była KOLEJNOŚĆ — a tego napis w pliku nie pokazuje. Dlatego test
 * porównuje pozycje: pierwszy odczyt stanu z bazy nie może wyprzedzać bramki.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const KATALOG = path.join(process.cwd(), 'src/app/api/cron');

/** Odczyty stanu, które NIE MOGĄ wyprzedzać bramki (dotykają bazy/konfiguracji). */
const ODCZYTY_STANU = /await\s+(isSmsTypeEnabled|isSmsEnabled|getClinicSettings|readClinicSettings)\s*\(/;

/** Bramka: dowód crona albo dowód admina. */
const BRAMKA = /const\s+isCronAuth\s*=|await\s+requireAdmin\s*\(/;

function cronyZBramka(): string[] {
    return fs.readdirSync(KATALOG, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => path.join(KATALOG, d.name, 'route.ts'))
        .filter(p => fs.existsSync(p) && BRAMKA.test(fs.readFileSync(p, 'utf8')))
        .sort();
}

describe('cron: autoryzacja stoi PRZED odczytem stanu z bazy', () => {
    const crony = cronyZBramka();

    it('inwentarz w ogóle coś znajduje (wzorzec nie zmurszał)', () => {
        // Strażnik, który po refaktorze przestaje cokolwiek znajdować, świeci
        // na zielono i jest gorszy niż jego brak.
        expect(crony.length).toBeGreaterThan(10);
    });

    it('żaden cron nie czyta stanu przed bramką', () => {
        const naruszenia: string[] = [];
        for (const plik of crony) {
            const src = fs.readFileSync(plik, 'utf8');
            const odczyt = src.search(ODCZYTY_STANU);
            if (odczyt === -1) continue;
            const bramka = src.search(BRAMKA);
            if (bramka === -1) continue;
            if (odczyt < bramka) {
                naruszenia.push(path.relative(process.cwd(), plik));
            }
        }
        expect(
            naruszenia,
            'crony czytające stan PRZED autoryzacją (anonim dostaje wyrocznię konfiguracji):\n  '
            + naruszenia.join('\n  '),
        ).toEqual([]);
    });
});
