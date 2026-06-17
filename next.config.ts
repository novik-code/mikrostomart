import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from "@sentry/nextjs";

// S6-5 (2026-05-15): migracja z @ducanh2912/next-pwa do @serwist/next.
// Tego samego autora (DuCanhGH/canhdu), serwist to oficjalny successor.
// Powód: 5 high CVE w @ducanh2912/next-pwa chain (workbox-build, serialize-javascript)
// + maintainer abandonware (last release 2024-09-18).
//
// API różnice:
// - withPWAInit({ workboxOptions: {...} }) → withSerwistInit({ swSrc, swDest, ... })
// - workboxOptions.runtimeCaching + skipWaiting + clientsClaim + importScripts
//   → przeniesione do app/sw.ts (explicit Serwist instance).
// - workboxOptions.navigateFallbackDenylist → cacheOnNavigation: false (nie cache'ujemy
//   żadnych nawigacji domyślnie; staff pages mają explicit NetworkFirst w app/sw.ts).
// - worker/index.ts (auto-injection) → app/sw.ts (explicit, full control).
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: false,
  disable: process.env.NODE_ENV === "development",
  // 2026-06-17: NIE precache'uj wideo (klipy hero /hero/loop-*.mp4 — wszystkie 10 mp4 w /public to
  // właśnie one). Gramy tylko 1 LOSOWY klip per wejście; precache wszystkich 10 (~3 MB) zniweczyłby
  // oszczędność danych na mobile + dokładałby background-download przy instalacji SW.
  // Pliki /public trafiają do precache jako additionalPrecacheEntries (omijają manifestTransforms),
  // a node-glob nie wspiera negacji `!`, więc filtrujemy przez include-listę rozszerzeń BEZ mp4/webm.
  // Klipy ładują się runtime (on-demand); defaultCache (@serwist/next) cache'uje tylko ten faktycznie
  // odtworzony. .map (source maps) i tak nie muszą być precache'owane.
  globPublicPatterns: [
    "**/*.{png,webp,avif,jpg,jpeg,gif,svg,ico,txt,xml,js,mjs,json,webmanifest,ttf,otf,woff,woff2,html,pdf}",
  ],
});

// Force Deploy Timestamp: 2025-12-31 21:42

const nextConfig: NextConfig = {
  experimental: {
    // Bundle ffmpeg-static binary with video-process function
    outputFileTracingIncludes: {
      '/api/cron/video-process': ['./node_modules/ffmpeg-static/**/*'],
    },
  } as any,
  // Option C perf 2026-05-21: próba wykluczenia polyfill-nomodule.js z client bundle
  // (Array.at, Array.flat, Object.hasOwn, etc.) ABANDONED.
  // Webpack alias + NormalModuleReplacementPlugin nie zadziałały — Next 16 injectuje
  // polyfille innym mechanizmem (prawdopodobnie raw build-pipeline file include
  // zamiast standardowego ES import). Wymaga deeper investigation Next 16 internals
  // (post-build script patching lub fork Next config). Save ROI ~13 KB vs ryzyko
  // regresji wysoki. Odłożone — można wrócić gdy Next 17 doda official config option.
  images: {
    // Faza G3 (2026-05-09): wyłączone. Allows remote SVG to be served via next/image
    // without sanitization — XSS risk + Lighthouse Best Practices flagi. Nasze remote
    // patterns (unsplash, placehold, githubusercontent, *.supabase.co) raczej nie podają
    // SVG, a jeśli kiedyś będzie potrzebne pojedyncze SVG, lepiej użyć <img> z znaną
    // sanityzacją niż otwierać pełny dangerouslyAllowSVG.
    // H5 (2026-05-10): pin AVIF + WebP formats. Defaults to ['image/webp'] in Next 16,
    // explicit ['image/avif', 'image/webp'] saves ~30% additional bytes for browsers
    // that support AVIF (most evergreens 2024+). Order matters: AVIF preferred, WebP fallback.
    formats: ['image/avif', 'image/webp'],
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
    // H5 (2026-05-10): per-extension Cache-Control (path-to-regexp doesn't
    // support brace alternation, so each extension needs its own route).
    // 1-year immutable cache for content-stable static assets in /public.
    // If you swap a hero photo, rename the file (cache busting).
    const cache1y = [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }];
    const cacheExts = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'ico', 'mp4', 'webm', 'mp3', 'woff', 'woff2'];
    const cacheRoutes = cacheExts.map((ext) => ({
      source: `/:path*.${ext}`,
      headers: cache1y,
    }));
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // camera/microphone=(self) pozwala wlasnej domenie uzywac kamery/mikrofonu
          // (KCP skaner QR, /selfie, /symulator, Voice Assistant). Pusty () = deny dla
          // wszystkich w tym self — Android Chrome scisle egzekwowal i blokowal skaner.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      },
      ...cacheRoutes,
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
      // Batch SEO-2 (2026-05-21): /zespol/marcin-nowosielski + /zespol/elzbieta-nowosielska
      // teraz są DEDYKOWANYMI stronami (audyt P1). Stare URL-e Joomla z numerycznym
      // ID-slug (np. /zespol/12-marcin-nowosielski) redirectujemy na /o-nas
      // jako "team overview" fallback. Czyste /zespol bez slug (legacy index) też.
      {
        source: '/zespol',
        destination: '/o-nas',
        permanent: true,
      },
      // Stare Joomla URLs `/zespol/{cyfra-cyfra-slug}` (np. `/zespol/12-marcin-nowosielski`)
      // redirectują na /o-nas. Nowe nie-numeryczne /zespol/marcin-nowosielski itd.
      // NIE są łapane bo regex `[0-9]+-` wymaga prefixu numerycznego.
      {
        source: '/zespol/:idSlug([0-9]+-.+)',
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
        destination: '/oferta/laser',
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

      // ── KB cleanup (2026-06-15, GEO audyt 5.3) ──
      // Grupa A: artykuły "domowe wybielanie / bez dentysty" (treść anty-gabinetowa,
      // GEO-szkodliwa) USUNIĘTE z DB (migracja 167) → 301 na tematyczną usługę lub hub.
      // Grupa B: duplikaty SCALONE — losery USUNIĘTE → 301 na 1 best z klastra.
      // Źródło = slug PL (foreign rows mają inne slugi i zostały usunięte → 404 OK
      // dla cienkiej, usuwanej treści). Pełna lista decyzji: PLAN_GEO_KB_CLEANUP_2026-06-15.md.

      // Grupa A → /oferta/stomatologia-estetyczna (tematyka: wybielanie/rozjaśnianie)
      { source: '/baza-wiedzy/snieznobialy-usmiech-domowe-sposoby-na-naturalne-wybielanie-zebow-bez-dentysty', destination: '/oferta/stomatologia-estetyczna', permanent: true },
      { source: '/baza-wiedzy/zeby-w-roli-glownej-jak-utrzymac-snieznobialy-usmiech-bez-wizyty-u-stomatologa', destination: '/oferta/stomatologia-estetyczna', permanent: true },
      { source: '/baza-wiedzy/usmiech-pelen-blasku-naturalne-sposoby-na-wybielanie-zebow-w-domowym-zaciszu', destination: '/oferta/stomatologia-estetyczna', permanent: true },
      { source: '/baza-wiedzy/usmiech-pelen-blasku-sekrety-naturalnego-wybielania-zebow-w-kuchni', destination: '/oferta/stomatologia-estetyczna', permanent: true },
      { source: '/baza-wiedzy/usmiech-pelen-blasku-naturalne-sposoby-na-rozjasnienie-zebow', destination: '/oferta/stomatologia-estetyczna', permanent: true },
      { source: '/baza-wiedzy/5-sposobow-na-naturalne-rozjasnianie-zebow-w-domowym-zaciszu', destination: '/oferta/stomatologia-estetyczna', permanent: true },
      { source: '/baza-wiedzy/zeby-jak-diamenty-sekrety-domowego-wybielania', destination: '/oferta/stomatologia-estetyczna', permanent: true },
      { source: '/baza-wiedzy/usmiech-bez-tajemnic-domowe-metody-wybielanie-zebow', destination: '/oferta/stomatologia-estetyczna', permanent: true },
      { source: '/baza-wiedzy/magia-usmiechu-sekrety-naturalnych-sposobow-na-bielsze-zeby', destination: '/oferta/stomatologia-estetyczna', permanent: true },
      { source: '/baza-wiedzy/usmiechnij-sie-szeroko-7-tajemnic-domowych-srodkow-na-biale-zeby-bez-ryzyka', destination: '/oferta/stomatologia-estetyczna', permanent: true },
      // Grupa A → /oferta/stomatologia-zachowawcza (próchnica / remineralizacja / nadwrażliwość)
      { source: '/baza-wiedzy/zapomnij-o-borowaniu-przewodnik-po-naturalnych-metodach-remineralizacja-zebow', destination: '/oferta/stomatologia-zachowawcza', permanent: true },
      { source: '/baza-wiedzy/zdrowy-usmiech-lzejszy-portfel-domowe-sposoby-na-zapobieganie-prochnicy', destination: '/oferta/stomatologia-zachowawcza', permanent: true },
      { source: '/baza-wiedzy/usmiech-bez-bolu-domowe-sposoby-na-nadwrazliwosc-zebow', destination: '/oferta/stomatologia-zachowawcza', permanent: true },
      // Grupa A → /baza-wiedzy (ogólna pielęgnacja domowa / "bez dentysty")
      { source: '/baza-wiedzy/zeby-w-30-dni-plan-na-zdrowy-usmiech-bez-dentysty', destination: '/baza-wiedzy', permanent: true },
      { source: '/baza-wiedzy/usmiech-pelen-blasku-10-domowych-sposobow-na-zdrowe-i-lsniace-zeby', destination: '/baza-wiedzy', permanent: true },
      { source: '/baza-wiedzy/usmiech-pelen-blasku-sekrety-domowej-pielegnacji-zebow', destination: '/baza-wiedzy', permanent: true },
      { source: '/baza-wiedzy/usmiech-przez-lata-sekrety-domowej-pielegnacji-zebow', destination: '/baza-wiedzy', permanent: true },
      { source: '/baza-wiedzy/usmiech-w-rytmie-natury-naturalne-remedia-na-zeby', destination: '/baza-wiedzy', permanent: true },
      { source: '/baza-wiedzy/sekrety-zdrowego-usmiechu-naturalne-metody-wzmocnienie-zebow-dziasel', destination: '/baza-wiedzy', permanent: true },

      // Grupa B losery → winner klastra (301, konsolidacja)
      // klaster "nawyki niszczące zęby" → 10-niespodziewanych-nawykow-ktore-niszcza-zeby
      { source: '/baza-wiedzy/10-zaskakujacych-nawykow-jedzeniowych-niszczacych-zeby', destination: '/baza-wiedzy/10-niespodziewanych-nawykow-ktore-niszcza-zeby', permanent: true },
      { source: '/baza-wiedzy/10-zaskakujacych-nawykow-ktore-niszcza-twoje-zeby', destination: '/baza-wiedzy/10-niespodziewanych-nawykow-ktore-niszcza-zeby', permanent: true },
      { source: '/baza-wiedzy/5-zaskakujacych-nawykow-ktore-niszczyly-twoje-zeby-a-teraz-moga-je-uratowac', destination: '/baza-wiedzy/10-niespodziewanych-nawykow-ktore-niszcza-zeby', permanent: true },
      { source: '/baza-wiedzy/7-zaskakujacych-nawykow-ktore-moga-szkodzic-twoim-zebom', destination: '/baza-wiedzy/10-niespodziewanych-nawykow-ktore-niszcza-zeby', permanent: true },
      { source: '/baza-wiedzy/7-zaskakujacych-nawykow-ktore-niszcza-twoj-usmiech', destination: '/baza-wiedzy/10-niespodziewanych-nawykow-ktore-niszcza-zeby', permanent: true },
      { source: '/baza-wiedzy/7-zaskakujacych-nawykow-ktore-niszczy-twoje-zeby-kazdego-dnia', destination: '/baza-wiedzy/10-niespodziewanych-nawykow-ktore-niszcza-zeby', permanent: true },
      // klaster "uśmiech przez sen" → usmiech-przez-sen-jak-nocna-rutyna-...
      { source: '/baza-wiedzy/usmiech-przez-sen-jak-nocne-nawyki-wplywaja-na-zdrowie-twoich-zebow', destination: '/baza-wiedzy/usmiech-przez-sen-jak-nocna-rutyna-wplywa-na-zdrowie-twoich-zebow', permanent: true },
      { source: '/baza-wiedzy/usmiech-przez-sen-jak-nocne-nawykowe-zachowania-wplywaja-na-zdrowie-twoich-zebow', destination: '/baza-wiedzy/usmiech-przez-sen-jak-nocna-rutyna-wplywa-na-zdrowie-twoich-zebow', permanent: true },
      { source: '/baza-wiedzy/usmiech-przez-sen-jak-nocne-rutyny-moga-poprawic-zdrowie-twoich-zebow', destination: '/baza-wiedzy/usmiech-przez-sen-jak-nocna-rutyna-wplywa-na-zdrowie-twoich-zebow', permanent: true },
      // klaster "magia uśmiechu" → magia-...regularne-wizyty-u-dentysty (pro-wizyta)
      { source: '/baza-wiedzy/magia-usmiechu-10-codziennych-nawykow-ktore-odmlodza-twoje-zeby', destination: '/baza-wiedzy/magia-usmiechu-jak-regularne-wizyty-u-dentysty-moga-odmienic-twoje-zycie', permanent: true },
      { source: '/baza-wiedzy/magia-usmiechu-jak-twoje-zeby-moga-wplynac-na-pierwsze-wrazenie-i-jak-o-nie-dbac', destination: '/baza-wiedzy/magia-usmiechu-jak-regularne-wizyty-u-dentysty-moga-odmienic-twoje-zycie', permanent: true },
      // klaster "produkty z kuchni" → 5-zaskakujacych-produktow-z-kuchni-zdrowie-zebow
      { source: '/baza-wiedzy/5-niezwyklych-znajdzki-z-kuchni-ktore-moga-uratowac-twoje-zeby-i-dziasla', destination: '/baza-wiedzy/5-zaskakujacych-produktow-z-kuchni-zdrowie-zebow', permanent: true },
      { source: '/baza-wiedzy/zdrowe-zeby-zdrowsze-zycie-5-niezwyklych-produktow-w-kuchni', destination: '/baza-wiedzy/5-zaskakujacych-produktow-z-kuchni-zdrowie-zebow', permanent: true },
      // klaster "ślina" → sekretne-zycie-sliny-...
      { source: '/baza-wiedzy/zaskakujace-fakty-o-twojej-slinie-jak-wplywa-na-zdrowie-jamy-ustnej', destination: '/baza-wiedzy/sekretne-zycie-sliny-jak-produkcja-i-sklad-sliny-wplywaja-na-zdrowie-jamy-ustnej', permanent: true },
      // klaster "pasta/etykiety" → sekrety-pasty-do-zebow-jak-wybrac-produkt-idealny-...
      { source: '/baza-wiedzy/sekrety-zdrowego-usmiechu-etykiety-pasta-do-zebow', destination: '/baza-wiedzy/sekrety-pasty-do-zebow-jak-wybrac-produkt-idealny-dla-twojego-usmiechu', permanent: true },
      { source: '/baza-wiedzy/sekrety-bialego-usmiechu-nawyki-zmieniajace-zeby', destination: '/baza-wiedzy/sekrety-pasty-do-zebow-jak-wybrac-produkt-idealny-dla-twojego-usmiechu', permanent: true },
    ];
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Wrap with Sentry for error tracking and source maps
export default withSentryConfig(
  withNextIntl(withSerwist(nextConfig)),
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
