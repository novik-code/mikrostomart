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
 * Pakiet C (2026-06-01): /dentist-opole — dedykowany geo-landing pod EN rynek
 * (international dental tourism). Indeksowany TYLKO w EN; PL/DE/UA → noindex.
 * Schema: BreadcrumbList + Service (areaServed Opole/Poland/EU/UK/Ireland) + FAQPage.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const base = pageMetadata(locale, '/dentist-opole', PAGE_SEO['/dentist-opole'], { indexableLocales: ['en'] });
    return {
        ...base,
        robots: locale === 'en' ? undefined : { index: false, follow: true },
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
    const t = await getTranslations({ locale, namespace: 'dentistOpole' });
    const inLanguage = hreflangCode(locale);

    const buildUrl = (path: string) => locale === 'pl' ? `${brand.appUrl}${path}` : `${brand.appUrl}/${locale}${path}`;
    const pageUrl = buildUrl('/dentist-opole');

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
            { "@type": "AdministrativeArea", "name": "European Union" },
            { "@type": "Country", "name": "United Kingdom" },
            { "@type": "Country", "name": "Ireland" },
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
                "text": t(`faqA${n}`, { phone1: brand.phone1, email: brand.email }),
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
