import type { Metadata } from 'next';
import { pageMetadata, localizedBreadcrumb, breadcrumbHref, itemListSchema, fetchNewsItems } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/aktualnosci', PAGE_SEO['/aktualnosci']);
}

export default async function Layout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'aktualnosci' },
    ]);
    // Faza G5: ItemList schema dla listing
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
