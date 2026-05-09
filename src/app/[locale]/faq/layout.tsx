import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { pageMetadata, breadcrumbSchema } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';
import { brand } from '@/lib/brandConfig';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/faq', PAGE_SEO['/faq']);
}

const breadcrumb = breadcrumbSchema([
    { name: 'Strona główna', url: brand.appUrl },
    { name: 'FAQ' },
]);

/**
 * Build FAQPage schema dynamically from i18n translations.
 * Page already has the questions in `pages.json` namespace `faq`. We replicate
 * the loop from the client component server-side so Google sees real Q&A.
 *
 * Faza G2: enables FAQ rich snippets (expandable accordion) in SERP.
 */
async function buildFaqSchema(locale: string) {
    const t = await getTranslations({ locale, namespace: 'faq' });
    const categoryCount = parseInt(t('categoryCount'));
    const questions: Array<{
        '@type': string;
        name: string;
        acceptedAnswer: { '@type': string; text: string };
    }> = [];

    for (let c = 0; c < categoryCount; c++) {
        const itemCountKey = `cat${c}count`;
        const itemCount = parseInt(t(itemCountKey));
        for (let q = 0; q < itemCount; q++) {
            questions.push({
                '@type': 'Question',
                name: t(`cat${c}q${q}`),
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: t(`cat${c}a${q}`),
                },
            });
        }
    }

    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: questions,
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
    const faqSchema = await buildFaqSchema(locale);

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
            {children}
        </>
    );
}
