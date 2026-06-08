import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
    pageMetadata,
    localizedBreadcrumb,
    breadcrumbHref,
    hreflangCode,
} from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';
import { brand } from '@/lib/brandConfig';

/**
 * Pakiet C (2026-06-01): /zahnarzt-opole — dedykowany geo-landing pod niemiecki rynek.
 *
 * Indeksowany TYLKO w DE (locale 'de'); PL/EN/UA → noindex (robots w generateMetadata).
 * Odwrotność wzorca PL-only z L-1/L-2 (tam PL indexed). Schema: BreadcrumbList +
 * Service (broad "Dentistry", areaServed DACH: Sachsen/Brandenburg/Berlin/AT/CH) +
 * FAQPage. Brak embedded Reviews (self-serving, GSC fix 2026-05-23).
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const base = pageMetadata(locale, '/zahnarzt-opole', PAGE_SEO['/zahnarzt-opole'], { indexableLocales: ['de'] });
    return {
        ...base,
        robots: locale === 'de' ? undefined : { index: false, follow: true },
    };
}

export default async function Layout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'zahnarztOpole' });
    const inLanguage = hreflangCode(locale);

    const buildUrl = (path: string) => locale === 'pl' ? `${brand.appUrl}${path}` : `${brand.appUrl}/${locale}${path}`;
    const pageUrl = buildUrl('/zahnarzt-opole');

    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { name: t('heroTitle') },
    ]);

    const serviceSchema = {
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": `${pageUrl}#service`,
        "name": t('heroTitle'),
        "description": t('heroLead'),
        "url": pageUrl,
        "inLanguage": inLanguage,
        "serviceType": "Dentistry",
        "category": "Dentistry",
        "provider": {
            "@type": "Dentist",
            "@id": brand.schemaId,
            "name": brand.schemaName,
            "url": brand.schemaUrl,
        },
        "areaServed": [
            { "@type": "City", "name": "Opole" },
            { "@type": "Country", "name": "Poland" },
            { "@type": "Country", "name": "Germany" },
            { "@type": "AdministrativeArea", "name": "Sachsen" },
            { "@type": "AdministrativeArea", "name": "Brandenburg" },
            { "@type": "AdministrativeArea", "name": "Berlin" },
            { "@type": "Country", "name": "Austria" },
            { "@type": "Country", "name": "Switzerland" },
        ],
        "offers": {
            "@type": "Offer",
            "priceSpecification": {
                "@type": "PriceSpecification",
                "minPrice": 250,
                "priceCurrency": "PLN",
                "description": "Initial consultation",
            },
            "availability": "https://schema.org/InStock",
        },
    };

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        "inLanguage": inLanguage,
        "mainEntity": [1, 2, 3, 4, 5, 6].map((n) => ({
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
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
            {children}
        </>
    );
}
