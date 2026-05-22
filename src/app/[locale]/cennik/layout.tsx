import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { pageMetadata, localizedBreadcrumb, breadcrumbHref, hreflangCode } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';
import { brand } from '@/lib/brandConfig';
import { CENNIK_CATEGORIES, CENNIK_FAQ_COUNT } from '@/data/cennik-categories';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/cennik', PAGE_SEO['/cennik']);
}

/**
 * Layout schemas (K-6, 2026-05-21 NIGHT+1):
 * - BreadcrumbList (pre-existing, lokalne)
 * - OfferCatalog wrapper z 8 Service entities (każda z PriceSpecification minPrice + url)
 * - FAQPage z 8 Q&A (FAQ rich snippet w SERP)
 *
 * Service `provider` linkuje do globalnej Dentist entity (@id brand.schemaId).
 * Każdy Service ma `url` do /oferta/[slug] (gdy dedykowana landing) lub /cennik#asystent-ai.
 */
export default async function Layout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'cennik' });
    const inLanguage = hreflangCode(locale);

    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'cennik' },
    ]);

    // Locale-aware URL builder
    const buildUrl = (path: string) => locale === 'pl' ? `${brand.appUrl}${path}` : `${brand.appUrl}/${locale}${path}`;
    const cennikUrl = buildUrl('/cennik');

    // OfferCatalog z 8 Service entities
    const offerCatalog = {
        "@context": "https://schema.org",
        "@type": "OfferCatalog",
        "@id": `${cennikUrl}#offercatalog`,
        "name": t('schemaOfferCatalogName'),
        "url": cennikUrl,
        "inLanguage": inLanguage,
        "provider": {
            "@type": "Dentist",
            "@id": brand.schemaId,
            "name": brand.schemaName,
            "url": brand.schemaUrl,
        },
        "itemListElement": CENNIK_CATEGORIES.map((cat, idx) => ({
            "@type": "Offer",
            "position": idx + 1,
            "itemOffered": {
                "@type": "Service",
                "name": t(`${cat.i18nKey}.title`),
                "description": t(`${cat.i18nKey}.desc`),
                "url": cat.href ? buildUrl(cat.href) : `${cennikUrl}#asystent-ai`,
                "category": "Dentistry",
                "serviceType": t(`${cat.i18nKey}.title`),
                "provider": {
                    "@type": "Dentist",
                    "@id": brand.schemaId,
                },
                "areaServed": [
                    { "@type": "City", "name": "Opole" },
                    { "@type": "Country", "name": "Poland" },
                ],
            },
            "priceSpecification": {
                "@type": "PriceSpecification",
                "minPrice": cat.priceFrom,
                ...(cat.priceTo ? { "maxPrice": cat.priceTo } : {}),
                "priceCurrency": "PLN",
            },
            "availability": "https://schema.org/InStock",
        })),
    };

    // FAQPage z 8 Q&A
    const faqPage = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${cennikUrl}#faq`,
        "inLanguage": inLanguage,
        "mainEntity": Array.from({ length: CENNIK_FAQ_COUNT }, (_, i) => i + 1).map((n) => ({
            "@type": "Question",
            "name": t(`faqQ${n}`),
            "acceptedAnswer": {
                "@type": "Answer",
                "text": t(`faqA${n}`),
            },
        })),
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offerCatalog) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
            {children}
        </>
    );
}
