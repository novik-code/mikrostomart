import type { Metadata } from 'next';
import { buildHreflangAlternates, buildCanonical } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'akredytacje' });

    return {
        title: { absolute: t('indexHeading') + ' | Mikrostomart' },
        description: t('indexLead'),
        alternates: {
            canonical: buildCanonical(locale, '/akredytacje'),
            languages: buildHreflangAlternates('/akredytacje'),
        },
        openGraph: {
            title: t('indexHeading'),
            description: t('indexLead'),
            url: buildCanonical(locale, '/akredytacje'),
            type: 'website',
        },
    };
}

/**
 * Faza G6 pattern: parent layout NIE renderuje BreadcrumbList. Index page renderuje
 * 2-level breadcrumb w `page.tsx`, slug detail renderuje 3-level w `[slug]/layout.tsx`.
 * Inaczej Google widzi DWA BreadcrumbList na slug pages → niespójny sygnał.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
