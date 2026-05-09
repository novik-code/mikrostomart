import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
    locales: ['pl', 'en', 'de', 'ua'],
    defaultLocale: 'pl',
    // 'as-needed': PL (default) bez prefiksu (/oferta), pozostałe locale z prefiksem
    // (/en/oferta, /de/oferta, /ua/oferta). Wybrane w Fazie 2 SEO Recovery (2026-05-09)
    // żeby zachować istniejące PL backlinki bez 301-redirectów per strona.
    // Hreflang dla UA używa kodu ISO 'uk' (Ukrainian language) mimo że URL prefix to 'ua'.
    localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
