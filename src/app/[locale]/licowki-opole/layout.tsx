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
 * Faza 2D layout (2026-06-08): /licowki-opole — PL-only geo page + foreign noindex.
 *
 * Wzorzec implanty-opole / all-on-4-opole. Hreflang scoping `indexableLocales: ['pl']` (1B).
 * Schemas (SSR): BreadcrumbList + Service (Cosmetic Dentistry, areaServed Opole/woj./Poland,
 * provider Dentist @id) + MedicalProcedure (TherapeuticProcedure/Tooth, performer Physician @id)
 * + FAQPage. BEZ offers — licówki wyceniane indywidualnie (brak fikcyjnej ceny). BEZ Reviews
 * (self-serving, GSC fix 2026-05-23).
 */

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const base = pageMetadata(locale, '/licowki-opole', PAGE_SEO['/licowki-opole'], { indexableLocales: ['pl'] });
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
    const t = await getTranslations({ locale, namespace: 'licowkiOpole' });
    const inLanguage = hreflangCode(locale);

    const buildUrl = (path: string) => locale === 'pl' ? `${brand.appUrl}${path}` : `${brand.appUrl}/${locale}${path}`;
    const pageUrl = buildUrl('/licowki-opole');

    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'licowki-opole' },
    ]);

    const serviceSchema = {
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": `${pageUrl}#service`,
        "name": t('heroTitle'),
        "description": t('heroLead'),
        "url": pageUrl,
        "inLanguage": inLanguage,
        "serviceType": "Cosmetic Dentistry",
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
    };

    const procedureSchema = {
        "@context": "https://schema.org",
        "@type": "MedicalProcedure",
        "@id": `${pageUrl}#procedure`,
        "name": t('heroTitle'),
        "description": t('whyIntro'),
        "procedureType": "https://schema.org/TherapeuticProcedure",
        "bodyLocation": "Tooth",
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
            "acceptedAnswer": { "@type": "Answer", "text": t(`faqA${n}`) },
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
