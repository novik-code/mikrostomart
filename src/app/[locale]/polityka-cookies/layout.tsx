import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';
import { pageMetadata } from '@/lib/seo';

// PL-only content: foreign locale URLs are noindex'd until translated.
// hreflang circle (J-2) added for entity grouping in Google.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const isDefault = locale === 'pl';
    const base = pageMetadata(locale, '/polityka-cookies', {
        pl: {
            title: `Polityka Cookies | ${brand.name} ${brand.cityShort}`,
            description: `Informacje o plikach cookies używanych na stronie gabinetu stomatologicznego ${brand.name} w ${brand.cityShort}.`,
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
