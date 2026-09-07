/**
 * Sentry configuration for the client (browser).
 *
 * SETUP: Set NEXT_PUBLIC_SENTRY_DSN environment variable.
 */

import * as Sentry from "@sentry/nextjs";
import { wyczyscAdresZSekretow } from '@/lib/sentryScrubUrl';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Faza C (SEO/perf 2026-05-09): performance monitoring + Replay disabled to shrink
    // client bundle (~85 KiB Replay + ~30 KiB BrowserTracing). Replay was capturing 50%
    // of errors with user action replay — useful but expensive for a public dental clinic
    // site where errors are infrequent and server-side stack traces are usually enough.
    // Flip back if visual debugging of customer-reported issues becomes important.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Strip heavy default integrations from the client bundle while keeping error
    // tracking essentials (GlobalHandlers, InboundFilters, Dedupe, LinkedErrors,
    // Breadcrumbs etc.). This is the documented Sentry pattern for opting out of
    // specific defaults — preferred over `integrations: []` which would also drop
    // window.onerror/unhandledrejection capture.
    integrations: (defaultIntegrations) =>
        defaultIntegrations.filter((i) =>
            i.name !== 'Replay' &&
            i.name !== 'BrowserTracing' &&
            i.name !== 'BrowserProfiling'
        ),

    // Only in production
    enabled: process.env.NODE_ENV === 'production',

    // Filter noise — SW errors from bots and browser quirks
    ignoreErrors: [
        'ResizeObserver loop',
        'Non-Error promise rejection',
        'ChunkLoadError',
        'Loading chunk',
        // Service Worker registration errors (common from bots + restricted browsers)
        'Failed to register a ServiceWorker',
        'Script .*/sw.js load failed',
        'Failed writing data to the file system',
        // Bot-specific errors (Google-Read-Aloud, crawlers)
        'enableDidUserTypeOnKeyboardLogging',
        // Safari/iOS storage errors in private mode
        'The operation is insecure',
        // Network errors from unstable connections
        'NetworkError: Failed to execute',
    ],

    // Drop events from known bots before sending to Sentry
    beforeSend(event) {
        const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '') ||
            (event.request?.headers?.['user-agent'] as string) || '';
        const botPatterns = ['Google-Read-Aloud', 'Googlebot', 'AdsBot', 'Bingbot', 'facebookexternalhit'];
        if (botPatterns.some(b => ua.includes(b))) return null;

        /**
         * 🔴 ŻYWE POŚWIADCZENIA NIE JADĄ DO SENTRY (07.09). Sześć stron trzyma sekret
         * wprost w ŚCIEŻCE (`/zgody/<token>`, `/ekarta/<token>`, `/opieka/<token>`,
         * `/s/<code>`, `/reset-password/<token>`, `/verify-email/<token>`), a landing
         * wizyty w query. Każdy nieobsłużony błąd JS wysyłał je do zewnętrznej usługi —
         * przy resecie hasła i weryfikacji e-maila to poświadczenie PRZEJMUJĄCE KONTO.
         * Maskujemy WARTOŚĆ, nie adres: domena i trasa zostają, bo zgłoszenie bez adresu
         * jest bezużyteczne — a wtedy ktoś wyłączy całe czyszczenie.
         */
        if (event.request?.url) {
            event.request.url = wyczyscAdresZSekretow(event.request.url);
        }
        if (event.breadcrumbs) {
            for (const okruch of event.breadcrumbs) {
                if (typeof okruch.data?.url === 'string') {
                    okruch.data.url = wyczyscAdresZSekretow(okruch.data.url);
                }
                // Nawigacje niosą adres w `from`/`to`, nie w `url`.
                for (const pole of ['from', 'to'] as const) {
                    if (typeof okruch.data?.[pole] === 'string') {
                        okruch.data[pole] = wyczyscAdresZSekretow(okruch.data[pole] as string);
                    }
                }
            }
        }

        return event;
    },

    // Attach release
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || undefined,
});
