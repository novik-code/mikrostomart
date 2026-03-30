/**
 * Sentry configuration for the server (API routes, SSR).
 *
 * SETUP: Set SENTRY_DSN and SENTRY_AUTH_TOKEN environment variables
 * in Vercel dashboard. Get DSN from: https://sentry.io → Settings → Projects → Client Keys.
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions sampled (free tier friendly)

    // Only send errors in production
    enabled: process.env.NODE_ENV === 'production',

    // Environment tag
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

    // Filter out noisy errors
    ignoreErrors: [
        'NEXT_NOT_FOUND',
        'NEXT_REDIRECT',
        // SW registration errors from bots/crawlers
        'Failed to register a ServiceWorker',
        'Script .*/sw.js load failed',
    ],

    // Attach release for source maps
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
});
