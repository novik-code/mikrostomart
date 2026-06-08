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
 * Faza 2B layout (2026-06-08): /all-on-4-opole — PL-only geo page + foreign noindex.
 *
 * Wzorzec implanty-opole (L-1): content renderuje się we wszystkich locale
 * (template via useTranslations), ale foreign URL (/en/all-on-4-opole etc.) dostają
 * robots noindex + canonical do PL. Hreflang scoping `indexableLocales: ['pl']` (1B).
 *
 * Schemas (SSR, parsable przez Googlebot) — BEZ Reviews (self-serving, GSC fix 2026-05-23):
 * - BreadcrumbList: Home → All-on-4 / All-on-6 w Opolu
 * - Service: All-on-X (areaServed Opole + województwo opolskie + Poland; provider Dentist @id;
 *   serviceType "Implantology"; Offer/PriceSpecification 30000-55000 PLN)
 * - MedicalProcedure: full-arch implant restoration (SurgicalProcedure, performer Physician @id)
 * - FAQPage: 6 geo-targeted Q&A
 */

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const base = pageMetadata(locale, '/all-on-4-opole', PAGE_SEO['/all-on-4-opole'], { indexableLocales: ['pl'] });
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
    const t = await getTranslations({ locale, namespace: 'allon4Opole' });
    const inLanguage = hreflangCode(locale);

    const buildUrl = (path: string) => locale === 'pl' ? `${brand.appUrl}${path}` : `${brand.appUrl}/${locale}${path}`;
    const pageUrl = buildUrl('/all-on-4-opole');

    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'all-on-4-opole' },
    ]);

    const serviceSchema = {
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": `${pageUrl}#service`,
        "name": t('heroTitle'),
        "description": t('heroLead'),
        "url": pageUrl,
        "inLanguage": inLanguage,
        "serviceType": "Implantology",
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
                "minPrice": 30000,
                "maxPrice": 55000,
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
        "procedureType": "https://schema.org/SurgicalProcedure",
        "bodyLocation": "Mouth",
        "howPerformed": `${t('procedureStep1')} ${t('procedureStep2')} ${t('procedureStep3')} ${t('procedureStep4')} ${t('procedureStep5')}`,
        "preparation": t('procedureStep1'),
        "followup": t('procedureStep5'),
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

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(procedureSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
            {children}
        </>
    );
}
