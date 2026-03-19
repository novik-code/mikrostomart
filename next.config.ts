import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from "@sentry/nextjs";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
    // Import push notification handlers into the service worker
    importScripts: ['/push-sw.js'],
    // Don't use navigation fallback for auth-sensitive pages
    navigateFallbackDenylist: [
      /^\/pracownik/,
      /^\/admin/,
      /^\/api\//,
      /^\/auth\//,
      /^\/strefa-pacjenta\/login/,
    ],
    runtimeCaching: [
      // Auth API routes: always go to network, never cache
      {
        urlPattern: /^https?:\/\/.*\/api\/auth\/.*/i,
        handler: 'NetworkOnly',
      },
      // Supabase auth endpoints: never cache
      {
        urlPattern: /^https?:\/\/.*supabase.*\/auth\/.*/i,
        handler: 'NetworkOnly',
      },
      // Login/pracownik/admin page navigations: network first, no cache
      {
        urlPattern: /^https?:\/\/.*\/(pracownik|admin)(\/.*)?$/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'staff-pages',
          expiration: {
            maxEntries: 16,
            maxAgeSeconds: 60, // 1 minute max cache
          },
          networkTimeoutSeconds: 5,
        },
      },
    ],
  },
});

// Force Deploy Timestamp: 2025-12-31 21:42

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: '*.githubusercontent.com', // Covers raw and objects
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Wrap with Sentry for error tracking and source maps
export default withSentryConfig(
  withNextIntl(withPWA(nextConfig)),
  {
    // Sentry org and project (set via SENTRY_ORG and SENTRY_PROJECT env vars)
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,

    // Silence source map upload logs during build
    silent: !process.env.CI,

    // Upload source maps for better error stack traces
    widenClientFileUpload: true,

    // Hide source maps from users (delete after upload)
    sourcemaps: {
      deleteSourcemapsAfterUpload: true,
    },

    // Disable Sentry telemetry
    disableLogger: true,

    // Only upload if token is available
    authToken: process.env.SENTRY_AUTH_TOKEN,
  }
);
