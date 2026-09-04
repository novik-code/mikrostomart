import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * STRAŻNIK OKABLOWANIA PMS — pilnuje wyniku migracji z 2026-09-04.
 *
 * 🔑 Po co. Audyt dostawcy wykazał, że jego trasy ODCZYTU są publiczne (PESEL, notatki
 * kliniczne). Zamknięcia nie dało się zaplanować, bo u nas **59 z 86 wywołań szło BEZ klucza** —
 * nie z decyzji, tylko dlatego, że nie było jednego miejsca, które go wstrzykuje. Migracja
 * to naprawiła; ten plik pilnuje, żeby nie odrosło.
 *
 * 🪤 Dlaczego strażnik TEKSTOWY tu wystarcza, a gdzie indziej nie: badane zachowanie to
 * „czy istnieje wywołanie omijające helper", czyli własność STRUKTURY kodu, nie wykonania.
 * Testu wykonaniowego nie da się tu napisać — nie odpalimy 86 tras przeciw produkcji PMS.
 * Dlatego asercje są na wzorcach, ale KAŻDA ma dowód cofki niżej.
 */

const SRC = join(process.cwd(), 'src');
const HELPER = join(SRC, 'lib', 'prodentisFetch.ts');

/** Pliki, w których klucz i adres MAJĄ prawo występować. */
const FUNDAMENT = [
    'lib/prodentisFetch.ts',
    'lib/pmsConfig.ts',
    'lib/__tests__/pmsClientWiring.test.ts', // sam strażnik cytuje wzorce, których szuka
];

/**
 * `middleware.ts` potrzebuje ORIGINU PMS do nagłówka CSP — nie wykonuje żadnego żądania.
 * Helper jest asynchroniczny i czyta bazę, więc w middleware byłby nie na miejscu.
 * 🪤 Wyjątek dotyczy WYŁĄCZNIE adresu; gdyby ktoś dopisał tu klucz albo `fetch`, złapią to
 * pozostałe asercje, bo `middleware.ts` nie jest wyłączone z nich.
 */
const CSP_ORIGIN = 'middleware.ts';

/**
 * Usuwa CAŁE linie komentarza. Świadomie nie tniemy od pierwszego `//` w linii —
 * to zjadałoby `https://` w zwykłym kodzie i strażnik przestałby widzieć realne adresy.
 */
const bezKomentarzy = (txt: string) =>
    txt
        .split('\n')
        .filter(l => {
            const t = l.trim();
            return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
        })
        .join('\n');

/**
 * Panel admina testuje KANDYDATA na klucz, zanim zostanie zapisany — z definicji nie może
 * użyć klucza z konfiguracji, bo sprawdza inny. To jedyne uzasadnione obejście helpera.
 */
const UZASADNIONE_OBEJSCIA = ['app/api/admin/pms-settings/route.ts'];

function plikiZrodlowe(dir: string, out: string[] = []): string[] {
    for (const wpis of readdirSync(dir)) {
        const p = join(dir, wpis);
        if (statSync(p).isDirectory()) plikiZrodlowe(p, out);
        else if (/\.(ts|tsx)$/.test(wpis) && !/\.(bak|backup\d*)$/.test(wpis)) out.push(p);
    }
    return out;
}

const PLIKI = plikiZrodlowe(SRC).map(p => ({ p, wzgl: p.slice(SRC.length + 1), txt: readFileSync(p, 'utf8') }));
const bezFundamentu = PLIKI.filter(f => !FUNDAMENT.includes(f.wzgl));

describe('okablowanie klienta PMS', () => {
    it('🔴 nikt poza helperem nie ustawia nagłówka X-API-Key', () => {
        const winni = bezFundamentu
            .filter(f => !UZASADNIONE_OBEJSCIA.includes(f.wzgl))
            // interesuje nas USTAWIANIE nagłówka, nie wzmianka w komentarzu ani etykieta w UI
            .filter(f => /['"]X-API-Key['"]\s*[:=]/.test(bezKomentarzy(f.txt)))
            .map(f => f.wzgl);
        expect(winni).toEqual([]);
    });

    it('🔴 nigdzie nie ma ścieżki zapasowej na surowy adres IP', () => {
        const winni = bezFundamentu
            .filter(f => /83\.230\.40\.14|192\.168\.1\.5:3000/.test(bezKomentarzy(f.txt)))
            .map(f => f.wzgl);
        expect(winni).toEqual([]);
    });

    it('🔴 nikt nie skleja adresu PMS sam — od tego jest helper', () => {
        const winni = bezFundamentu
            .filter(f => f.wzgl !== CSP_ORIGIN)
            .filter(f => /PRODENTIS_TUNNEL_URL|PRODENTIS_API_URL/.test(bezKomentarzy(f.txt)))
            .map(f => f.wzgl);
        expect(winni).toEqual([]);
    });

    it('🪤 helper NIE MOŻE wysłać pustego nagłówka zamiast klucza', () => {
        const txt = readFileSync(HELPER, 'utf8');
        // Brak klucza ma być wyjątkiem, nie pustym stringiem doklejonym do nagłówka.
        expect(txt).toMatch(/throw new BrakKluczaPMS\(\)/);
        expect(txt).not.toMatch(/apiKey\s*\?\?\s*['"]{2}/);
    });

    it('DOWÓD COFKI: strażnik ŁAPIE wywołanie omijające helper', () => {
        // Tak wyglądał typowy z tych 59 keyless odczytów przed migracją.
        const regresja = [
            "const PRODENTIS_API = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';",
            "const res = await fetch(`${PRODENTIS_API}/api/patient/${id}/details`);",
        ].join('\n');
        expect(/PRODENTIS_TUNNEL_URL|PRODENTIS_API_URL/.test(bezKomentarzy(regresja))).toBe(true);

        // A tak wyglądał wzorzec pustego nagłówka.
        const pusty = "headers: { 'X-API-Key': (await getProdentisKey()) ?? '' }";
        expect(/['"]X-API-Key['"]\s*[:=]/.test(bezKomentarzy(pusty))).toBe(true);

        // 🔑 Kontrola, że filtr komentarzy NIE oślepia strażnika: adres w zwykłym kodzie
        // musi zostać widoczny, choć zawiera `//`.
        expect(bezKomentarzy("const u = 'https://pms.mikrostomartapi.com';")).toContain('https://');
    });
});
