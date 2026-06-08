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
 * L-1 layout (2026-05-21 NIGHT+1): PL-only geo page schemas + foreign noindex.
 *
 * Pattern foreign noindex z S5 (sklep, legal pages) — page content renderuje się
 * we wszystkich locale (template via useTranslations), ale foreign URL
 * (/en/implanty-opole etc.) dostają robots noindex + canonical do PL.
 *
 * Schemas (wszystkie SSR-rendered, parsable przez Googlebot):
 * - BreadcrumbList: Home → Implanty zębów w Opolu
 * - Service: dental implants (areaServed Opole + województwo opolskie + Poland;
 *   provider Dentist via @id; serviceType "Implantology")
 * - MedicalProcedure: dental implant placement (procedureType SurgicalProcedure)
 * - FAQPage: 6 geo-targeted Q&A (NFZ, ceny, czas leczenia, ból, gwarancja, raty)
 *
 * 2026-05-23 (GSC fix follow-up): usunięte fetchReviewSchemas + per-page Reviews.
 * Reviews o własnym Service (sub-entity LocalBusiness) traktowane przez Google
 * jako self-serving — ten sam violation co usunięty z homepage Dentist schema.
 * Preemptive cleanup przed Google indeksowaniem agresywnym po sitemap re-submit.
 */

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const base = pageMetadata(locale, '/implanty-opole', PAGE_SEO['/implanty-opole'], { indexableLocales: ['pl'] });
    // PL-only canonical sygnał — foreign locale noindex (PL slug nie ma intencji
    // organicznej w EN/DE/UA). Canonical wewnątrz `base.alternates` już wskazuje
    // na /implanty-opole (locale-aware), foreign będą canonical do PL.
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
    const t = await getTranslations({ locale, namespace: 'implantyOpole' });
    const inLanguage = hreflangCode(locale);

    const buildUrl = (path: string) => locale === 'pl' ? `${brand.appUrl}${path}` : `${brand.appUrl}/${locale}${path}`;
    const pageUrl = buildUrl('/implanty-opole');

    // BreadcrumbList
    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'implanty-opole' },
    ]);

    // Service schema z areaServed geo-focus
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
                "minPrice": 6000,
                "maxPrice": 8000,
                "priceCurrency": "PLN",
            },
            "availability": "https://schema.org/InStock",
        },
    };

    // MedicalProcedure (dental implant placement)
    const procedureSchema = {
        "@context": "https://schema.org",
        "@type": "MedicalProcedure",
        "@id": `${pageUrl}#procedure`,
        "name": t('heroTitle'),
        "description": t('whyIntro'),
        "procedureType": "https://schema.org/SurgicalProcedure",
        "bodyLocation": "Mouth, Tooth",
        "howPerformed": `${t('procedureStep1')} ${t('procedureStep2')} ${t('procedureStep3')} ${t('procedureStep4')} ${t('procedureStep5')}`,
        "preparation": t('procedureStep1'),
        "followup": t('procedureStep4'),
        "performer": {
            "@type": "Physician",
            "@id": `${brand.appUrl}/#marcin-nowosielski`,
        },
        "inLanguage": inLanguage,
    };

    // FAQPage z 6 Q&A
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

    // 2026-05-23: Reviews schema usunięte (self-serving violation). Reviews
    // o usługach klinki wyświetlane są tylko w UI komponencie GoogleReviews
    // na homepage — bez schema markup żadne miejsce strony.

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
