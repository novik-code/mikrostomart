import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';
import { pageMetadata } from '@/lib/seo';

// Strona wymagana przez Google Play (Data safety → account deletion URL):
// publiczna ścieżka żądania usunięcia konta BEZ zawracania do aplikacji.
// PL-only content: foreign locale URLs are noindex'd (wzorzec jak polityka-prywatnosci).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const isDefault = locale === 'pl';
    const base = pageMetadata(locale, '/usun-konto', {
        pl: {
            title: `Usunięcie konta i danych | ${brand.name} ${brand.cityShort}`,
            description: `Jak usunąć konto pacjenta i dane w aplikacji ${brand.name} — w aplikacji lub przez żądanie e-mail, bez instalowania aplikacji.`,
        },
    }, { indexableLocales: ['pl'] });
    return {
        ...base,
        robots: isDefault ? undefined : { index: false, follow: true },
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
