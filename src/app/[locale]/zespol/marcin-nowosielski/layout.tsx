import type { Metadata } from 'next';
import { pageMetadata, localizedBreadcrumb, breadcrumbHref } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';
import { getMarcinSchema } from '@/lib/personSchemas';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/zespol/marcin-nowosielski', PAGE_SEO['/zespol/marcin-nowosielski']);
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
        { key: 'zespol', url: breadcrumbHref(locale, '/o-nas') }, // /zespol legacy → /o-nas (team overview)
        { key: 'marcin-nowosielski' },
    ]);
    const marcin = getMarcinSchema(locale);

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(marcin) }} />
            {children}
        </>
    );
}
