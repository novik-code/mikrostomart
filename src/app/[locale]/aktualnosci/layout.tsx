import type { Metadata } from 'next';
import { pageMetadata, breadcrumbSchema, itemListSchema, fetchNewsItems } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';
import { brand } from '@/lib/brandConfig';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/aktualnosci', PAGE_SEO['/aktualnosci']);
}

const breadcrumb = breadcrumbSchema([
    { name: 'Strona główna', url: brand.appUrl },
    { name: 'Aktualności' },
]);

export default async function Layout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    // Faza G5: ItemList schema dla listing — pomaga Google rozumieć strukturę
    // i pokazać sitelinks w SERP. Schema renderowana także na sub-pages
    // (/aktualnosci/[slug]) — Google rozumie i preferuje NewsArticle schema
    // tam zdefiniowaną. Brak konfliktu.
    const items = await fetchNewsItems(locale);
    const list = items.length > 0 ? itemListSchema(items) : null;

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            {list && (
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(list) }} />
            )}
            {children}
        </>
    );
}
