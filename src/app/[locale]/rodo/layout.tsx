import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';
import { pageMetadata } from '@/lib/seo';

// PL-only content: foreign locale URLs are noindex'd until translated.
// hreflang circle (J-2) added for entity grouping in Google.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const isDefault = locale === 'pl';
    const base = pageMetadata(locale, '/rodo', {
        pl: {
            title: `RODO | ${brand.name} - Dentysta ${brand.cityShort}`,
            description: `Informacje o przetwarzaniu danych osobowych (RODO) w gabinecie stomatologicznym ${brand.name} w ${brand.cityShort}.`,
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
