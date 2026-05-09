import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
    locales: ['pl', 'en', 'de', 'ua'],
    defaultLocale: 'pl',
    // 'as-needed': PL (default) bez prefiksu (/oferta), pozostałe locale z prefiksem
    // (/en/oferta, /de/oferta, /ua/oferta). Wybrane w Fazie 2 SEO Recovery (2026-05-09)
    // żeby zachować istniejące PL backlinki bez 301-redirectów per strona.
    // Hreflang dla UA używa kodu ISO 'uk' (Ukrainian language) mimo że URL prefix to 'ua'.
    localePrefix: 'as-needed',
    // localeDetection: false (Faza C follow-up 2026-05-09):
    // Domyślnie next-intl czyta Accept-Language header i przekierowuje URL bez prefixu
    // do odpowiadającego locale (np. /oferta z Accept-Language: en → 307 → /en/oferta).
    // To psuje:
    //   1. PageSpeed Insights — Google PSI wysyła Accept-Language: en-US, więc test
    //      polskiej strony /oferta był silently przekierowywany do /en/oferta.
    //   2. SEO crawl budget — Googlebot z różnymi UA dostaje różne wersje tej samej URL.
    //   3. UX backlinków — link "mikrostomart.pl/cennik" z zagranicznego forum nie
    //      pokazywał polskiej wersji.
    // Z `false` URL bez prefixa zawsze serwuje PL (default). Użytkownicy zagraniczni
    // używają LanguageSwitcher w navie albo przychodzą z Google search wynikami które
    // już mają /en/ /de/ /ua/ prefix.
    localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
