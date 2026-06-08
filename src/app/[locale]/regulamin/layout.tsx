import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';
import { pageMetadata } from '@/lib/seo';

// PL-only content: foreign locale URLs serve the same PL text. EN/DE/UA are
// noindex'd to avoid duplicate content signals; PL canonical applies to all
// variants. hreflang circle (J-2) lets Google group the 4 URLs as one entity.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const isDefault = locale === 'pl';
    const base = pageMetadata(locale, '/regulamin', {
        pl: {
            title: `Regulamin | ${brand.name} - Dentysta ${brand.cityShort}`,
            description: `Regulamin korzystania z serwisu i usług gabinetu stomatologicznego ${brand.name} w ${brand.cityShort}.`,
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
