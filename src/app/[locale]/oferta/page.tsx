import { setRequestLocale } from 'next-intl/server';
import { localizedBreadcrumb, breadcrumbHref } from '@/lib/seo';
import OfertaClient from './OfertaClient';

/**
 * Server wrapper for /oferta landing page.
 *
 * Faza G6 (2026-05-10): Breadcrumb przeniesiony tutaj (z /oferta/layout.tsx)
 * żeby był renderowany TYLKO dla landing /oferta. Sub-pages (/oferta/implantologia
 * etc.) mają własne 3-level breadcrumby w swoich layoutach. Bez tego separation
 * sub-pages dostawały DWA BreadcrumbList schemas — niespójny sygnał dla Google.
 */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);

    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'oferta' },
    ]);

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            <OfertaClient />
        </>
    );
}
