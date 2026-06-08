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
 * L-4 layout (2026-05-21): /gwarancje warranty hub schemas.
 *
 * Multi-locale indexable (unlike L-1/L-2 PL-only geo pages). Warranty terms
 * to trust signal dla foreign dental tourism — DE/EN szukają gwarancji przed
 * wyborem zagranicznego dentysty. DE locale ma rozszerzoną sekcję Kostenerstattung.
 *
 * Schemas: BreadcrumbList + FAQPage (8 Q&A) + WebPage.
 * Bez Service entities (warranty terms to meta-info o usługach, nie sama usługa).
 */

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/gwarancje', PAGE_SEO['/gwarancje']);
}

export default async function Layout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'gwarancje' });
    const inLanguage = hreflangCode(locale);

    const buildUrl = (path: string) => locale === 'pl' ? `${brand.appUrl}${path}` : `${brand.appUrl}/${locale}${path}`;
    const pageUrl = buildUrl('/gwarancje');

    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'gwarancje' },
    ]);

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        "inLanguage": inLanguage,
        "mainEntity": [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
            "@type": "Question",
            "name": t(`faqQ${n}`),
            "acceptedAnswer": {
                "@type": "Answer",
                "text": t(`faqA${n}`, { phone1: brand.phone1, email: brand.email }),
            },
        })),
    };

    const webPageSchema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": pageUrl,
        "name": t('heroTitle'),
        "description": t('heroLead'),
        "url": pageUrl,
        "inLanguage": inLanguage,
        "isPartOf": {
            "@type": "WebSite",
            "@id": `${brand.appUrl}/#website`,
        },
        "publisher": {
            "@type": "Dentist",
            "@id": brand.schemaId,
        },
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
            {children}
        </>
    );
}
