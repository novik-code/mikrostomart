/**
 * STRAŻNIK: instalacja service workera nie może się wywrócić na pliku z `/public`.
 *
 * ══ CO BYŁO ZEPSUTE (zmierzone 2026-09-17) ══════════════════════════════════
 * Precache obejmował 644 pliki z `/public` (284 MB). 131 plików `.avif` i jeden `.html`
 * przechodziły przez middleware i dawały 404. Jeden błąd = cała instalacja pada, więc
 * worker nie instalował się u nikogo, pobierał dziesiątki MB przy każdej wizycie, a
 * przeglądarki ze starym workerem zostawały z nim na stałe.
 *
 * Test WYKONUJE to samo co @serwist/next przy buildzie (`globSync` z paczki `glob` na
 * katalogu `public`) i przepuszcza każdy plik przez PRAWDZIWY `config.matcher` middleware.
 * DOWÓD, ŻE GRYZIE (cofka): wzorzec sprzed poprawki
 * (`**\/*.{png,webp,avif,…,html,pdf}`) → pada 🔴 „serwowane statycznie" i 🔴 „rozmiar".
 * Kontrola miernika niżej wykonuje ten sam pomiar na starym wzorcu.
 */
import { describe, it, expect, vi } from 'vitest';
import { globSync } from 'glob';
import { statSync } from 'node:fs';
import path from 'node:path';
import { PUBLICZNE_PLIKI_PRECACHE } from '@/lib/swPrecachePubliczne';

// Potrzebny jest tylko `config.matcher`. Middleware next-intl sięga po `next/server`,
// którego vitest nie rozwiązuje w tej paczce, a do samego matchera nie jest potrzebny.
vi.mock('next-intl/middleware', () => ({ default: () => () => undefined }));

const KATALOG_PUBLIC = path.resolve(__dirname, '../../../public');
const LIMIT_BAJTOW = 1_000_000;

/** Te same opcje, z którymi @serwist/next woła `globSync` (dist/index.mjs). */
function plikiDoPrecache(wzorce: string[]): string[] {
    return globSync(wzorce, { nodir: true, follow: true, cwd: KATALOG_PUBLIC, ignore: ['swe-worker-*.js', 'sw.js', 'sw.js.map'] });
}

async function przechodziPrzezMiddleware(): Promise<(sciezka: string) => boolean> {
    const { config } = await import('@/middleware');
    const wyrazenia = config.matcher.map((m: string) => new RegExp(`^${m}$`));
    return (sciezka) => wyrazenia.some((w: RegExp) => w.test(sciezka));
}

const rozmiar = (pliki: string[]) => pliki.reduce((s, f) => s + statSync(path.join(KATALOG_PUBLIC, f)).size, 0);

describe('service worker · precache plików z /public', () => {
    it('obejmuje manifest i ikonę powiadomień z sw.ts', () => {
        const pliki = plikiDoPrecache(PUBLICZNE_PLIKI_PRECACHE);
        expect(pliki).toEqual(expect.arrayContaining(['manifest.json', 'icon-192x192.png']));
        // Wzorzec bez pliku na dysku po cichu znika z precache — każdy musi coś trafić.
        for (const wzorzec of PUBLICZNE_PLIKI_PRECACHE) expect(plikiDoPrecache([wzorzec]).length, wzorzec).toBeGreaterThan(0);
    });

    it('🔴 każdy plik jest serwowany statycznie, nie przez middleware (inaczej 404 i instalacja pada)', async () => {
        const middleware = await przechodziPrzezMiddleware();
        const przezMiddleware = plikiDoPrecache(PUBLICZNE_PLIKI_PRECACHE).filter((f) => middleware(`/${f}`));
        expect(przezMiddleware).toEqual([]);
    });

    it('🔴 rozmiar poniżej 1 MB (instalacja nie może ściągać galerii obrazków)', () => {
        expect(rozmiar(plikiDoPrecache(PUBLICZNE_PLIKI_PRECACHE))).toBeLessThan(LIMIT_BAJTOW);
    });

    it('KONTROLA MIERNIKA: wzorzec sprzed poprawki oblewa oba sprawdzenia', async () => {
        const middleware = await przechodziPrzezMiddleware();
        const stare = plikiDoPrecache(['**/*.{png,webp,avif,jpg,jpeg,gif,svg,ico,txt,xml,js,mjs,json,webmanifest,ttf,otf,woff,woff2,html,pdf}']);
        // Strona, która realnie przechodzi przez middleware, ma być przez miernik wykryta…
        expect(middleware('/pl/oferta')).toBe(true);
        expect(stare.filter((f) => middleware(`/${f}`)).length).toBeGreaterThan(0);
        // …a plik statyczny z wyjętym rozszerzeniem — nie.
        expect(middleware('/icon-192x192.png')).toBe(false);
        expect(rozmiar(stare)).toBeGreaterThan(LIMIT_BAJTOW);
    });
});
