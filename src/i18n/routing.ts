import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
    locales: ['pl', 'en', 'de', 'ua'],
    defaultLocale: 'pl',
    localePrefix: 'never', // No URL prefixes — locale is stored in NEXT_LOCALE cookie
});

export type Locale = (typeof routing.locales)[number];
