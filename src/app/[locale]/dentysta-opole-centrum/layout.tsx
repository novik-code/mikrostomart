import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
    pageMetadata,
    localizedBreadcrumb,
    breadcrumbHref,
    hreflangCode,
    fetchReviewSchemas,
} from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';
import { brand } from '@/lib/brandConfig';

/**
 * L-2b layout (2026-05-21 NIGHT+1): /dentysta-opole-centrum schemas.
 *
 * Foreign noindex pattern z L-1. Schema: BreadcrumbList + Service (broad-scope
 * "Dentistry", minPrice 250 = konsultacja) + FAQPage (6 generic Q&A) + Reviews.
 * Brak MedicalProcedure (broad scope — nie ma jednej procedury jak w L-1/L-2a).
 */

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const base = pageMetadata(locale, '/dentysta-opole-centrum', PAGE_SEO['/dentysta-opole-centrum']);
    return {
        ...base,
        robots: locale === 'pl' ? undefined : { index: false, follow: true },
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
    const t = await getTranslations({ locale, namespace: 'dentystaOpoleCentrum' });
    const inLanguage = hreflangCode(locale);

    const buildUrl = (path: string) => locale === 'pl' ? `${brand.appUrl}${path}` : `${brand.appUrl}/${locale}${path}`;
    const pageUrl = buildUrl('/dentysta-opole-centrum');

    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'dentysta-opole-centrum' },
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
            { "@type": "AdministrativeArea", "name": "województwo opolskie" },
            { "@type": "Country", "name": "Poland" },
        ],
        "offers": {
            "@type": "Offer",
            "priceSpecification": {
                "@type": "PriceSpecification",
                "minPrice": 250,
                "priceCurrency": "PLN",
                "description": "Pierwsza konsultacja",
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

    const reviews = await fetchReviewSchemas(5);

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
            {reviews.length > 0 && reviews.map((r, i) => (
                <script
                    key={`review-${i}`}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify({ ...r, itemReviewed: { "@type": "Service", "@id": `${pageUrl}#service` } }) }}
                />
            ))}
            {children}
        </>
    );
}
