/**
 * Bramka crona NIE MOŻE być warunkowana środowiskiem.
 *
 * ══ CO PADA BEZ NAPRAWY ═════════════════════════════════════════════════════
 * Dwadzieścia jeden cronów miało odmowę w kształcie:
 *
 *     if (authHeader !== `Bearer ${CRON_SECRET}` && process.env.NODE_ENV === 'production')
 *
 * co znaczy dosłownie: **poza produkcją bramki NIE MA WCALE**. Podglądy Vercela
 * bywają publiczne i chodzą na tym samym kodzie oraz tej samej bazie, więc
 * „poza produkcją" nie znaczy „tylko na moim laptopie" — anonim z adresem
 * podglądu odpalał crony wysyłające SMS-y, kasujące dziennik audytu i zamykające
 * dzień w ewidencji czasu pracy.
 *
 * Ta sama klasa zamknięta wcześniej w P-021 (ręczna gałąź `daily-article`,
 * `youtube-sync`, `fix-db-images`) — wtedy w trzech trasach, teraz w dwudziestu
 * jeden. 🔑 Zdjęcie warunku NIE zmienia zachowania produkcji: tam koniunkcja
 * i tak była prawdziwa, więc bramka działała. Zmienia wyłącznie podglądy.
 *
 * ══ DLACZEGO BEZ KOMENTARZY ═════════════════════════════════════════════════
 * 🪤 Pierwszy pomiar po naprawie DALEJ znajdował `NODE_ENV === 'production'` —
 * w MOIM własnym komentarzu opisującym naprawę. Ta pomyłka wystąpiła w tym
 * projekcie już pięć razy. Dlatego test wycina komentarze, zanim cokolwiek liczy.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const KATALOG = path.join(process.cwd(), 'src/app/api/cron');

/** Kod bez komentarzy blokowych i liniowych — żeby nie mierzyć własnych opisów. */
function bezKomentarzy(src: string): string {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function cronyZBramka(): Array<{ nazwa: string; kod: string }> {
    return fs.readdirSync(KATALOG, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => ({ nazwa: d.name, plik: path.join(KATALOG, d.name, 'route.ts') }))
        .filter(x => fs.existsSync(x.plik))
        .map(x => ({ nazwa: x.nazwa, kod: bezKomentarzy(fs.readFileSync(x.plik, 'utf8')) }))
        .filter(x => /CRON_SECRET|requireAdmin\s*\(/.test(x.kod));
}

describe('bramka crona działa w KAŻDYM środowisku', () => {
    const crony = cronyZBramka();

    it('inwentarz w ogóle coś znajduje (wzorzec nie zmurszał)', () => {
        expect(crony.length).toBeGreaterThan(15);
    });

    it('żadna bramka nie jest warunkowana NODE_ENV', () => {
        const naruszenia = crony
            .filter(c => /NODE_ENV/.test(c.kod))
            .map(c => c.nazwa);
        expect(
            naruszenia,
            'crony z bramką warunkowaną środowiskiem — poza produkcją nie chronią NICZEGO:\n  '
            + naruszenia.join('\n  '),
        ).toEqual([]);
    });

    it('KONTROLA POZYTYWNA: crony nadal sprawdzają sekret albo rolę', () => {
        // Gdyby „naprawa" polegała na usunięciu całej bramki, poprzedni przypadek
        // też by przeszedł. Ten pilnuje, że zostało czym odmawiać.
        const bezBramki = crony.filter(c => !/CRON_SECRET|requireAdmin\s*\(/.test(c.kod));
        expect(bezBramki.map(c => c.nazwa)).toEqual([]);
    });
});
