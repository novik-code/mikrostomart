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
 * L-2a layout (2026-05-21 NIGHT+1): /leczenie-kanalowe-opole-mikroskop schemas.
 *
 * Foreign noindex pattern z L-1 (PL slug bez intencji organicznej w EN/DE/UA).
 * Schemas: BreadcrumbList + Service (Endodoncja, minPrice 800) + MedicalProcedure
 * (TherapeuticProcedure, performer Physician Marcin via @id) + FAQPage (6 Q&A) +
 * Reviews (max 5 z google_reviews).
 */

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const base = pageMetadata(locale, '/leczenie-kanalowe-opole-mikroskop', PAGE_SEO['/leczenie-kanalowe-opole-mikroskop']);
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
    const t = await getTranslations({ locale, namespace: 'leczenieKanaloweOpoleMikroskop' });
    const inLanguage = hreflangCode(locale);

    const buildUrl = (path: string) => locale === 'pl' ? `${brand.appUrl}${path}` : `${brand.appUrl}/${locale}${path}`;
    const pageUrl = buildUrl('/leczenie-kanalowe-opole-mikroskop');

    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'leczenie-kanalowe-opole-mikroskop' },
    ]);

    const serviceSchema = {
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": `${pageUrl}#service`,
        "name": t('heroTitle'),
        "description": t('heroLead'),
        "url": pageUrl,
        "inLanguage": inLanguage,
        "serviceType": "Endodontics",
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
                "minPrice": 800,
                "priceCurrency": "PLN",
            },
            "availability": "https://schema.org/InStock",
        },
    };

    const procedureSchema = {
        "@context": "https://schema.org",
        "@type": "MedicalProcedure",
        "@id": `${pageUrl}#procedure`,
        "name": t('heroTitle'),
        "description": t('whyIntro'),
        "procedureType": "https://schema.org/TherapeuticProcedure",
        "bodyLocation": "Tooth, Dental Pulp",
        "howPerformed": `${t('procedureStep1')} ${t('procedureStep2')} ${t('procedureStep3')} ${t('procedureStep4')} ${t('procedureStep5')}`,
        "preparation": t('procedureStep1'),
        "followup": "Korona ostateczna w 2-4 tygodnie po endodoncji + kontrola RTG po 6 i 12 miesiącach.",
        "performer": {
            "@type": "Physician",
            "@id": `${brand.appUrl}/#marcin-nowosielski`,
        },
        "inLanguage": inLanguage,
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
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(procedureSchema) }} />
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
