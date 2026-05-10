import type { Metadata } from 'next';
import { pageMetadata, localizedBreadcrumb, breadcrumbHref, fetchShopProductsRich, productListSchema } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/sklep', PAGE_SEO['/sklep']);
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
        { key: 'sklep' },
    ]);
    // H4: ItemList of Products with Offer.price + InStock — eligible for
    // Google Shopping / Product rich snippets in SERP.
    const products = await fetchShopProductsRich(locale);
    const list = products.length > 0 ? productListSchema(products) : null;

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
