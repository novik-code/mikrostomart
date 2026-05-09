import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { brandI18nParams } from '@/lib/brandConfig';

export default getRequestConfig(async ({ requestLocale }) => {
    // URL-based locale resolution (Faza 2 SEO Recovery 2026-05-09):
    // requestLocale comes from the [locale] segment in the URL. next-intl middleware
    // populates it via the URL path (e.g. /en/oferta → 'en'). For PL (default, no prefix)
    // requestLocale will be 'pl' or undefined, falling back to defaultLocale.
    const requested = await requestLocale;
    const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

    const common = (await import(`../../messages/${locale}/common.json`)).default;
    const pages = (await import(`../../messages/${locale}/pages.json`)).default;

    return {
        locale,
        messages: { ...common, ...pages },
        // Auto-inject brand tokens into ALL translations so {brandName} etc. resolve
        // without needing manual brandI18nParams() in every component
        defaultTranslationValues: brandI18nParams(),
    };
});
