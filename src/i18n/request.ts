import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { routing } from './routing';

export default getRequestConfig(async () => {
    // Read locale from NEXT_LOCALE cookie (set by LanguageSwitcher)
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;

    // Validate the locale, fall back to default
    const locale = cookieLocale && routing.locales.includes(cookieLocale as any)
        ? cookieLocale
        : routing.defaultLocale;

    const common = (await import(`../../messages/${locale}/common.json`)).default;
    const pages = (await import(`../../messages/${locale}/pages.json`)).default;

    return {
        locale,
        messages: { ...common, ...pages },
    };
});
