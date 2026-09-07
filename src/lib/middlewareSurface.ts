/**
 * CZYSTE decyzje ścieżkowe middleware — wyciągnięte z `src/middleware.ts`,
 * żeby dało się je WYKONAĆ w teście, a nie tylko wygrepować.
 *
 * 🪤 PO CO TEN PLIK POWSTAŁ. Do 2026-09-07 jedyny strażnik powierzchni bramki
 * (`staffAuthSurfaceWiring.test.ts`) czytał `middleware.ts` jako TEKST i asertował
 * `expect(prefixes).toContain("'/api/time'")`. Taka asercja jest ślepa: przechodzi,
 * gdy pilnowany ciąg stoi w komentarzu obok, i nie zauważa, że lista trafiła
 * do martwej gałęzi. W tym projekcie strażnik na napis przepuścił cztery regresje
 * z rzędu, a trzy razy świecił zielono przy CAŁKOWICIE zdjętej ochronie.
 * Żaden test w repo nie wykonywał `middleware()` ani `enforce2FA`.
 *
 * Moduł jest CZYSTY: zero wejścia/wyjścia, zero zależności, nigdy nie rzuca.
 */

/** Ścieżki, które nie żyją pod prefiksem języka (`/en`, `/de`, `/ua`). */
export const NON_LOCALE_PATHS = [
    '/api/',
    '/admin',
    '/pracownik',
    '/ekarta/',
    '/qr-display',
    '/zgody/',
    '/auth/',
    '/opieka/',
    '/s/',
];

export function shouldBypassIntl(pathname: string): boolean {
    return NON_LOCALE_PATHS.some(p => pathname === p || pathname.startsWith(p));
}

/** Ścieżka bez prefiksu języka — `/en/strefa-pacjenta` → `/strefa-pacjenta`. */
export function bezPrefiksuJezyka(pathname: string): string {
    const m = pathname.match(/^\/(en|de|ua)(\/.*)?$/);
    return m ? (m[2] || '/') : pathname;
}

/**
 * Strefy chronione, które ŻYJĄ POD PREFIKSEM JĘZYKA, więc `shouldBypassIntl`
 * ich nie obejmuje — a mimo to szybka ścieżka botów NIE MOŻE ich pomijać.
 *
 * 🔴 To jest sedno naprawy z 2026-09-07. `S10-3` zamknęło obejście bramki
 * nagłówkiem `User-Agent` dla `/admin` i `/pracownik`, bo te siedzą
 * w `NON_LOCALE_PATHS`. Strefa pacjenta i edytor mapy bólu przeniosły się
 * pod `[locale]`, więc dla nich `shouldBypassIntl` zwraca `false` i szybka
 * ścieżka botów kończyła żądanie ZANIM zadziałała bramka `patient_token`.
 *
 * Zmierzone na produkcji 2026-09-07, z kontrolą negatywną:
 *   curl                    /strefa-pacjenta/dashboard → 307 na login
 *   curl -A Googlebot/2.1   /strefa-pacjenta/dashboard → 200
 *   curl -A Googlebot/2.1   /pracownik                 → 307  (S10-3 działa)
 * Klasyczne „naprawiliśmy jedną trasę z pary".
 */
const CHRONIONE_POD_JEZYKIEM = [
    '/strefa-pacjenta',
    '/mapa-bolu/editor',
];

/**
 * Czy wolno zakończyć żądanie bota szybką ścieżką (bez pełnej autoryzacji).
 *
 * Szybka ścieżka istnieje dla WYDAJNOŚCI indeksowania stron publicznych.
 * Wolno z niej skorzystać wyłącznie tam, gdzie nie ma czego chronić.
 */
export function botMozeOminacAutoryzacje(pathname: string): boolean {
    if (shouldBypassIntl(pathname)) return false; // /admin, /pracownik, /api… — pełna ścieżka
    const bez = bezPrefiksuJezyka(pathname);
    return !CHRONIONE_POD_JEZYKIEM.some(p => bez === p || bez.startsWith(`${p}/`));
}
