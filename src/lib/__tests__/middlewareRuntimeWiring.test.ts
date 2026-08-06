/**
 * Strażnik: middleware MUSI działać w runtime Node.js.
 *
 * 🔴 CO SIĘ STAŁO (znalezione 2026-08-06 w logach produkcyjnych, NIE w kodzie).
 * Middleware działał w runtime EDGE, który nie ma modułu `crypto` z Node. `enforce2FA`
 * weryfikuje dowód drugiego składnika przez `verifyMfaSessionToken` → `crypto.createHmac`,
 * więc w edge ta weryfikacja rzucała wyjątek ZAWSZE — niezależnie od poprawności
 * ciasteczka. Wyjątek wpadał w `catch` na końcu `enforce2FA`, a ten jest FAIL-OPEN
 * (`return null` = przepuść). Skutek: konto z WŁĄCZONYM 2FA wchodziło na /admin
 * i /api/admin/* bez podania kodu. Drugi składnik nie był sprawdzany ani razu.
 *
 * Z samego kodu widać było tylko „fail-open przy błędzie" — audyt tak to zresztą zgłosił.
 * Że błąd występuje ZAWSZE, dało się zobaczyć wyłącznie w logach produkcyjnych:
 * `[middleware 2FA] enforce error: The edge runtime does not support Node.js 'crypto' module`
 * przy KAŻDYM żądaniu do tras admina.
 *
 * Ten test pilnuje trzech rzeczy naraz, bo naprawa wisi na wszystkich:
 *  1. middleware deklaruje `runtime: 'nodejs'`,
 *  2. nadal woła `verifyMfaSessionToken` (czyli bramka istnieje),
 *  3. `enforce2FA` nadal ma świadomy fail-open — jeśli ktoś go kiedyś zmieni na
 *     fail-closed, musi to być decyzja, a nie przypadek (patrz sesja 4 planu napraw).
 *
 * 🪤 Dowód, że runtime realnie się przełącza, jest w ARTEFAKTACH builda, nie w typach:
 * bez flagi `next build` produkuje `.next/server/edge-runtime-webpack.js` i NIE tworzy
 * `.next/server/middleware.js`; z flagą — odwrotnie. Zmierzone porównawczo 2026-08-06.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const MW = path.join(process.cwd(), 'src/middleware.ts');
const src = fs.readFileSync(MW, 'utf8');

describe('Strażnik: runtime middleware', () => {
    it('middleware deklaruje runtime Node.js', () => {
        // Bez tego `crypto.createHmac` w weryfikacji 2FA rzuca przy każdym żądaniu.
        expect(
            /runtime:\s*['"]nodejs['"]/.test(src),
            'Middleware wrócił do runtime edge — weryfikacja 2FA znów będzie rzucać, '
            + 'a fail-open ją przepuści. To otwiera /admin dla kont znających samo hasło.'
        ).toBe(true);
    });

    it('deklaracja runtime stoi w eksportowanym obiekcie config', () => {
        const cfg = src.indexOf('export const config');
        expect(cfg).toBeGreaterThan(-1);
        // runtime musi być w tym samym obiekcie co matcher, nie w komentarzu obok
        const blok = src.slice(cfg, cfg + 1800);
        expect(blok).toMatch(/runtime:\s*['"]nodejs['"]/);
        expect(blok).toContain('matcher');
    });

    it('bramka 2FA nadal istnieje w middleware', () => {
        // Gdyby ktoś "naprawił" problem usuwając weryfikację zamiast runtime.
        expect(src).toContain('verifyMfaSessionToken');
        expect(src).toContain('evaluateStaffMfa');
    });

    it('fail-open w enforce2FA jest nadal ŚWIADOMY i opisany', () => {
        // Nie wymuszamy fail-closed — to osobna decyzja właściciela (sesja 4 planu),
        // bo 10 z 14 pracowników nie ma dziś 2FA. Wymuszamy tylko, żeby zostało to
        // jawnie opisane, a nie zamienione w cichy przypadek.
        const idx = src.indexOf('enforce error');
        expect(idx).toBeGreaterThan(-1);
        expect(src.slice(idx, idx + 400)).toMatch(/Fail open|fail-open|FAIL-OPEN/i);
    });
});
