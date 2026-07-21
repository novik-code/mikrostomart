import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

// S5-3 (2026-05-15): deep merge instead of shallow.
// Shallow `{...common, ...pages}` silently dropped sub-keys whenever both files
// declared the same top-level namespace (e.g. `common.aktualnosci.backToNews` +
// `pages.aktualnosci.{...}` → backToNews lost, MISSING_MESSAGE in slug page).
// Audit (2026-05-15) found 2 overlapping namespaces per locale × 2 lost sub-keys.
type MessageObject = Record<string, unknown>;
function deepMerge<T extends MessageObject>(target: T, source: T): T {
    const result: MessageObject = { ...target };
    for (const [key, value] of Object.entries(source)) {
        const existing = result[key];
        const bothObjects =
            existing &&
            typeof existing === 'object' &&
            !Array.isArray(existing) &&
            value &&
            typeof value === 'object' &&
            !Array.isArray(value);
        if (bothObjects) {
            result[key] = deepMerge(existing as MessageObject, value as MessageObject);
        } else {
            result[key] = value;
        }
    }
    return result as T;
}

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
        messages: deepMerge(common, pages),
        // UWAGA: next-intl v4 USUNĄŁ `defaultTranslationValues` — opcja była tu cicho
        // ignorowana (nie istnieje w typach 4.12, więc tsc też jej nie łapał).
        // Tokeny brandu ({brandName}, {email}, ...) są pre-bake'owane w
        // src/app/layout.tsx (deepBrandReplace) dla ścieżki klienckiej.
        // Komponenty SERWEROWE wołające getTranslations() dostają surowe wiadomości,
        // więc muszą przekazywać parametry jawnie: t('klucz', brandI18nParams()).
    };
});
