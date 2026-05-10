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
  experimental: {
    // Bundle ffmpeg-static binary with video-process function
    outputFileTracingIncludes: {
      '/api/cron/video-process': ['./node_modules/ffmpeg-static/**/*'],
    },
  } as any,
  images: {
    // Faza G3 (2026-05-09): wyłączone. Allows remote SVG to be served via next/image
    // without sanitization — XSS risk + Lighthouse Best Practices flagi. Nasze remote
    // patterns (unsplash, placehold, githubusercontent, *.supabase.co) raczej nie podają
    // SVG, a jeśli kiedyś będzie potrzebne pojedyncze SVG, lepiej użyć <img> z znaną
    // sanityzacją niż otwierać pełny dangerouslyAllowSVG.
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
      {
        protocol: 'https',
        hostname: '*.supabase.co', // Product images, news images, KB articles, blog posts
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
  // 301 redirects from old Joomla URLs (pre-Next.js migration) to current structure.
  // Source: 198 URLs flagged as 404 in Google Search Console export 2026-05-09.
  async redirects() {
    return [
      // NOTE on /aktualnosci/{ID}-{slug}:
      // Originally we had a catchall regex `/aktualnosci/:idAndSlug([0-9]+-.+)` here
      // (Faza 1, 2026-05-09) to redirect 171 old Joomla URLs to /aktualnosci listing.
      // BUG: it also caught NEW articles whose slugs happen to start with numeric ID
      // (e.g. 319-wybielanie-na-jednej-wizycie, 314-metamorfoza-3 — 13/14 PL articles
      // in `news` table use this format). Result: clicking active news cards on PL
      // listing redirected to /aktualnosci instead of opening the article.
      //
      // Fix (2026-05-09 commit): removed the regex; the article page itself handles
      // missing slugs via redirect('/aktualnosci') in its catch-all (notFound replacement).
      // This way:
      //   - existing slugs in `news` table (numeric or not) → render the article
      //   - missing slugs → page-level redirect to listing (still 308 from user POV)
      // Old Joomla tag feeds: /component/tags/... → /aktualnosci (4 URLs)
      {
        source: '/component/:rest*',
        destination: '/aktualnosci',
        permanent: true,
      },
      // Old team pages: /zespol and /zespol/{ID-slug} → /o-nas (8 URLs)
      // /o-nas already includes team info; no separate /zespol page in current structure.
      {
        source: '/zespol',
        destination: '/o-nas',
        permanent: true,
      },
      {
        source: '/zespol/:rest*',
        destination: '/o-nas',
        permanent: true,
      },
      // Old offer slugs that were renamed or merged in current structure
      {
        source: '/oferta/chirurgia-stomatologiczna',
        destination: '/oferta/chirurgia',
        permanent: true,
      },
      {
        source: '/oferta/endodoncja-mikroskopowa',
        destination: '/oferta/leczenie-kanalowe',
        permanent: true,
      },
      {
        source: '/oferta/laserowe-leczenie-zebow',
        destination: '/oferta',
        permanent: true,
      },
      {
        source: '/oferta/periodontologia',
        destination: '/oferta',
        permanent: true,
      },
      {
        source: '/oferta/stomatologia-dziecieca',
        destination: '/oferta',
        permanent: true,
      },
      {
        source: '/oferta/stomatologia-zachowawcza',
        destination: '/oferta',
        permanent: true,
      },
      // Old standalone pages from Joomla
      {
        source: '/bezbolesne-komputerowe-znieczulenie',
        destination: '/oferta',
        permanent: true,
      },
      {
        source: '/galeria',
        destination: '/metamorfozy',
        permanent: true,
      },
      {
        source: '/leczenie-pod-mikroskopem',
        destination: '/oferta/leczenie-kanalowe',
        permanent: true,
      },
      {
        source: '/nowoczesny-sprzet-stomatologiczny',
        destination: '/o-nas',
        permanent: true,
      },
      {
        source: '/pogotowie-stomatologiczne-24h',
        destination: '/kontakt',
        permanent: true,
      },
      {
        source: '/radiowizjografia-cyfrowa',
        destination: '/oferta/leczenie-kanalowe',
        permanent: true,
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
