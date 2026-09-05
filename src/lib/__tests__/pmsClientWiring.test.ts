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
            // 🪤 Wąskie `[:=]` NIE ŁAPAŁO stylu `naglowki.set('X-API-Key', klucz)` — czyli
            // dokładnie idiomu, którego używa sam helper. Kopiując go do nowej trasy,
            // regresja przechodziła na zielono. Teraz łapiemy też przecinek i nawias.
            .filter(f => /['"]X-API-Key['"]\s*[:=,)]/.test(bezKomentarzy(f.txt)))
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

    it('🔴 nikt nie zaszywa LITERAŁU adresu PMS — to była największa dziura strażnika', () => {
        // 🪤 Dotąd pilnowaliśmy wyłącznie NAZW zmiennych środowiskowych. Wystarczyło skopiować
        // z `pmsConfig.ts` sam adres z prawej strony `||` i uprościć — strażnik świecił zielono,
        // `tsc` też, a żądanie leciało do PMS bez klucza.
        const winni = bezFundamentu
            .filter(f => f.wzgl !== CSP_ORIGIN)
            .filter(f => /pms\.mikrostomartapi\.com/.test(bezKomentarzy(f.txt)))
            .map(f => f.wzgl);
        expect(winni).toEqual([]);
    });

    it('🔴 klucz pobiera się TYLKO tam, gdzie to świadoma decyzja', () => {
        // Po centralizacji z 04.09 klucz wstrzykuje helper i nikt nie musi go znać. Kilka tras
        // pobiera go mimo to — ŚWIADOMIE, jako bramkę „nie zaczynaj, jeśli klucza nie ma".
        // Lista jest zamrożona: nowe wystąpienie ma być decyzją, nie odruchem kopiowania.
        // 🪤 Ta asercja powstała, bo audyt znalazł SIEDEM tras pobierających klucz, którego
        // nikt już nie czytał — martwe pozostałości po samej migracji.
        const SWIADOME_BRAMKI = [
            'app/api/patients/appointments/[id]/reschedule/route.ts',
            'app/api/cron/careflow-report/route.ts',
            'app/api/admin/careflow/report/[id]/route.ts',
            'app/api/admin/careflow/export-prodentis/[id]/route.ts',
            'app/api/employee/export-biometric/route.ts',
            'app/api/consents/sign/route.ts',
            'app/api/admin/pms-settings/route.ts',
            // ⚪ Health NIE UŻYWA klucza — tylko RAPORTUJE, czy drugi jest wpisany.
            //    Bez tego „mamy dwa klucze" byłoby twierdzeniem sprawdzalnym wyłącznie
            //    przez czytanie bazy, a to zły miernik.
            'app/api/health/route.ts',
        ];
        const winni = bezFundamentu
            .filter(f => !SWIADOME_BRAMKI.includes(f.wzgl))
            .filter(f => /getProdentisKey|getPMSConfig|getProdentisUrl/.test(bezKomentarzy(f.txt)))
            .map(f => f.wzgl);
        expect(winni).toEqual([]);
    });

    it('🔴 operacje PERSONELU idą kluczem personelu, nie pacjenckim', () => {
        // 🔑 Sens dwóch kluczy to NIEZALEŻNE UNIEWAŻNIENIE: wyciek klucza recepcji nie może
        // kłaść Strefy Pacjenta i odwrotnie. Rozdział jest wart tyle, ile jego kompletność —
        // jedno przeoczone wywołanie w panelu admina i cały podział staje się pozorny.
        // 🪤 Dopóki gabinet nie wpisze drugiego klucza, `personel` dostaje pacjencki, czyli
        // zachowanie sprzed zmiany. Ta asercja pilnuje OKABLOWANIA, nie obecności wartości.
        const winni = bezFundamentu
            .filter(f => f.wzgl.startsWith('app/api/admin/') || f.wzgl.startsWith('app/api/employee/'))
            .filter(f => /prodentisFetch\(/.test(bezKomentarzy(f.txt)))
            .filter(f => {
                const kod = bezKomentarzy(f.txt);
                const wywolan = (kod.match(/prodentisFetch\(/g) || []).length;
                const oznaczen = (kod.match(/klucz:\s*'personel'/g) || []).length;
                return oznaczen < wywolan;
            })
            .map(f => f.wzgl);
        expect(winni).toEqual([]);
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

    it('DOWÓD COFKI: nowe asercje łapią trzy regresje, które przechodziły na zielono', () => {
        // Wzorce sprawdzane WYKONANIEM tych samych wyrażeń, których używają asercje wyżej.
        const naglowek = /['"]X-API-Key['"]\s*[:=,)]/;
        const host = /pms\.mikrostomartapi\.com/;
        const klucz = /getProdentisKey|getPMSConfig|getProdentisUrl/;

        // R5 — idiom SAMEGO helpera, skopiowany do obcej trasy. Stary regex go NIE łapał.
        const r5 = "naglowki.set('X-API-Key', klucz);";
        expect(/['"]X-API-Key['"]\s*[:=]/.test(r5)).toBe(false);   // tak było
        expect(naglowek.test(r5)).toBe(true);                       // tak jest

        // R1 — literał adresu bez nazwy zmiennej środowiskowej.
        const r1 = "const res = await fetch('https://pms.mikrostomartapi.com/api/doctors');";
        expect(/PRODENTIS_TUNNEL_URL|PRODENTIS_API_URL/.test(r1)).toBe(false);  // tak było
        expect(host.test(r1)).toBe(true);                                       // tak jest

        // R4 — pobranie konfiguracji i własny fetch na jej podstawie.
        const r4 = "const { apiUrl } = await getPMSConfig(); await fetch(apiUrl + '/api/doctors');";
        expect(naglowek.test(r4) || host.test(r4)).toBe(false);  // tak było — nic go nie łapało
        expect(klucz.test(r4)).toBe(true);                       // tak jest
    });
});
