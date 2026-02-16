import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
    // This typically corresponds to the `[locale]` segment
    let locale = await requestLocale;

    // Validate that the incoming locale is valid
    if (!locale || !routing.locales.includes(locale as any)) {
        locale = routing.defaultLocale;
    }

    const common = (await import(`../../messages/${locale}/common.json`)).default;
    const pages = (await import(`../../messages/${locale}/pages.json`)).default;

    return {
        locale,
        messages: { ...common, ...pages },
    };
});
