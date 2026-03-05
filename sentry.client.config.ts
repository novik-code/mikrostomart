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

    // Filter noise
    ignoreErrors: [
        'ResizeObserver loop',
        'Non-Error promise rejection',
        'ChunkLoadError',
        'Loading chunk',
    ],

    // Attach release
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || undefined,
});
