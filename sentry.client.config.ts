/**
 * Sentry configuration for the client (browser).
 *
 * SETUP: Set NEXT_PUBLIC_SENTRY_DSN environment variable.
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Replay errors (captures user action replay for error context)
    replaysSessionSampleRate: 0,    // Don't record normal sessions
    replaysOnErrorSampleRate: 0.5,  // 50% of errors get replay

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
        return event;
    },

    // Attach release
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || undefined,
});
