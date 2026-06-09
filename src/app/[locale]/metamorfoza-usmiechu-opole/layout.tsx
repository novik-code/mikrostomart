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
 * Faza 2D layout (2026-06-08): /metamorfoza-usmiechu-opole — PL-only geo + foreign noindex.
 * Wzorzec implanty-opole / licowki-opole. Hreflang scoping ['pl'] (1B).
 * Schemas (SSR): BreadcrumbList + Service (Cosmetic Dentistry, areaServed Opole/woj./Poland,
 * provider Dentist @id) + MedicalProcedure (TherapeuticProcedure/Mouth, performer Physician @id)
 * + FAQPage. BEZ offers (metamorfoza wyceniana indywidualnie) + BEZ Reviews (GSC-fix).
 */

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const base = pageMetadata(locale, '/metamorfoza-usmiechu-opole', PAGE_SEO['/metamorfoza-usmiechu-opole'], { indexableLocales: ['pl'] });
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
    const t = await getTranslations({ locale, namespace: 'metamorfozaUsmiechuOpole' });
    const inLanguage = hreflangCode(locale);

    const buildUrl = (path: string) => locale === 'pl' ? `${brand.appUrl}${path}` : `${brand.appUrl}/${locale}${path}`;
    const pageUrl = buildUrl('/metamorfoza-usmiechu-opole');

    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'metamorfoza-usmiechu-opole' },
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
