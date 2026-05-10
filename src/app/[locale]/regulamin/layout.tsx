import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

// Legal page text is Polish-only — EN/DE/UA URLs serve the same PL content. Foreign
// locale versions are noindex'd and pointed at the PL canonical to avoid duplicate
// content signals. Translate all four legal pages to fully internationalize.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const isDefault = locale === 'pl';
    return {
        title: `Regulamin | ${brand.name} - Dentysta ${brand.cityShort}`,
        description: `Regulamin korzystania z serwisu i usług gabinetu stomatologicznego ${brand.name} w ${brand.cityShort}.`,
        alternates: { canonical: '/regulamin' },
        robots: isDefault ? undefined : { index: false, follow: true },
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
