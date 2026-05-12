import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { pageMetadata, localizedBreadcrumb, breadcrumbHref } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/dla-pacjentow-przyjezdnych', PAGE_SEO['/dla-pacjentow-przyjezdnych']);
}

export default async function PrzyjezdniLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'przyjezdni' },
    ]);

    // J-4: FAQPage schema sourced from the `faq.cat10*` keys (H6 sprint added
    // 5 questions × 4 locales answering "Czy macie parking?", "Jakie języki?",
    // hotels, A4 access, etc. — the exact pain points the /dla-pacjentow-
    // przyjezdnych page already covers visually). Mirroring them as JSON-LD
    // lets Google show the rich-snippet accordion in SERP for foreign visitors
    // searching "Zahnarzt Opole parken" or "dentist Opole English".
    const t = await getTranslations('faq');
    const faqEntries = [0, 1, 2, 3, 4]
        .map((i) => {
            const q = t(`cat10q${i}`);
            const a = t(`cat10a${i}`);
            return q && a && !q.startsWith('cat10q') ? { q, a } : null;
        })
        .filter((entry): entry is { q: string; a: string } => entry !== null);

    const faqSchema = faqEntries.length > 0
        ? {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqEntries.map(({ q, a }) => ({
                '@type': 'Question',
                name: q,
                acceptedAnswer: { '@type': 'Answer', text: a },
            })),
        }
        : null;

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
            />
            {faqSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
                />
            )}
            {children}
        </>
    );
}
