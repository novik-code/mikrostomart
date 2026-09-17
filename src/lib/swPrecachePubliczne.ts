/**
 * Które pliki z `/public` service worker pobiera do pamięci offline przy instalacji.
 *
 * ══ CO BYŁO ZEPSUTE (zmierzone 2026-09-17) ══════════════════════════════════
 * Wzorzec obejmował wszystkie obrazki i PDF-y z `/public`. Precache miał 1220 wpisów,
 * z czego 644 pliki publiczne ważyły 284 MB. 131 plików `.avif` i plik weryfikacyjny
 * Google `.html` nie są wyjęte z middleware, więc na produkcji zwracają 404.
 * Jeden błąd w precache wywraca CAŁĄ instalację. Skutki:
 *  - service worker nie zainstalował się u nikogo, zmierzone w Chrome i WebKit
 *    (rejestracja znika, a w przeglądarce zostaje ok. 40 MB porzuconej pamięci);
 *  - przy każdej wizycie przeglądarka zaczynała pobieranie od nowa, także na danych
 *    komórkowych pacjentów;
 *  - przeglądarka ze starszym, działającym workerem zostawała z nim na zawsze, bo nowy
 *    nie mógł go zastąpić. To główny podejrzany czarnej strony w Safari na Macu.
 *
 * Strona nie ma trybu offline dla treści, więc precache z `/public` ogranicza się do
 * tego, czego potrzebuje sam worker i instalacja PWA: manifestu oraz ikon, w tym ikony
 * powiadomień push z `sw.ts`. Obrazki ładują się normalnie, przez reguły runtime.
 *
 * 🪤 Te wzorce trafiają do `globSync` w @serwist/next i OMIJAJĄ `manifestTransforms`.
 * Każdy plik stąd musi być serwowany statycznie, czyli jego rozszerzenie musi być
 * wyjęte z `config.matcher` w `src/middleware.ts`. Pilnuje tego
 * `__tests__/swPrecacheTylkoSerwowanePliki.test.ts`.
 */
export const PUBLICZNE_PLIKI_PRECACHE: string[] = [
    'manifest.json',
    'icon-192x192.png',
    'icon-512x512.png',
];
