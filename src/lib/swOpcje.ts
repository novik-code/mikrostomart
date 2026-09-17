/**
 * Opcje service workera (Serwist) w module, który da się wykonać w teście.
 * `src/app/sw.ts` robi wyłącznie `new Serwist(opcjeSerwista(self.__SW_MANIFEST))`.
 *
 * ══ PO CO (2026-09-17) ══════════════════════════════════════════════════════
 * Do 17.09 worker nie instalował się u nikogo (precache z 404, zob. swPrecachePubliczne.ts),
 * więc reguły `defaultCache` z @serwist/next nigdy nie działały na produkcji. Po naprawie
 * precache przegląd pokazał, co się włączyło:
 *  1) reguła `apis` zapisywała KAŻDĄ odpowiedź GET z `/api/*` (także zalogowanego pacjenta
 *     i personelu) w Cache Storage na 24 h, nie czyściła jej przy wylogowaniu, a po 10 s
 *     czekania oddawała starą kopię, choć serwer dalej pracował (przyciski panelu wołające
 *     GET wyglądały na niewykonane i klikało się drugi raz);
 *  2) reguła `staff-pages` łapała też `/api/admin/*` (`.*` przed `admin`);
 *  3) Vercel dokleja `?dpl=` do każdego pliku z `/_next/static`, a precache nie ignorował
 *     tego parametru — 576 pobranych plików nigdy nie było trafianych;
 *  4) stary precache next-pwa sprzed maja zostawał w przeglądarkach na zawsze.
 */
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, RuntimeCaching, SerwistOptions } from 'serwist';
import { NetworkFirst, NetworkOnly, ExpirationPlugin } from 'serwist';

/** Strony personelu: `/pracownik`, `/admin` i ich podstrony (także z prefiksem języka). */
const STRONA_PERSONELU = /(^|\/)(pracownik|admin)(\/|$)/i;

export const REGULY_WLASNE: RuntimeCaching[] = [
    // API tej domeny zawsze z sieci. Odpowiedzi niosą dane pacjentów i personelu, a część
    // GET-ów uruchamia działania — kopia z pamięci jest tu zawsze błędem. Reguła stoi PRZED
    // `defaultCache`, bo ta ma własną regułę `apis` (NetworkFirst, 24 h).
    {
        matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/api/'),
        handler: new NetworkOnly(),
    },
    // Logowanie w Supabase: nigdy z pamięci.
    {
        matcher: /^https?:\/\/.*supabase.*\/auth\/.*/i,
        handler: new NetworkOnly(),
    },
    // Strony personelu: sieć z krótkim limitem, minutowa kopia na wypadek awarii.
    {
        matcher: ({ sameOrigin, url }) => sameOrigin && STRONA_PERSONELU.test(url.pathname),
        handler: new NetworkFirst({
            cacheName: 'staff-pages',
            networkTimeoutSeconds: 5,
            plugins: [new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 60 })],
        }),
    },
];

/** Pamięci, których nic już nie używa: `apis` (zob. pkt 1) i `start-url` ze starego next-pwa. */
export const PAMIECI_DO_USUNIECIA = ['apis', 'start-url'];

export function opcjeSerwista(precacheEntries: (PrecacheEntry | string)[] | undefined): SerwistOptions {
    return {
        precacheEntries,
        precacheOptions: {
            cleanupOutdatedCaches: true,
            // Domyślna lista Serwista (utm_*, fbclid) + `dpl` doklejany przez Vercel.
            ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^dpl$/],
        },
        skipWaiting: true,
        clientsClaim: true,
        navigationPreload: true,
        runtimeCaching: [...REGULY_WLASNE, ...defaultCache],
    };
}
