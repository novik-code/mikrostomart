import type { Metadata } from 'next';
import { pageMetadata, localizedBreadcrumb, breadcrumbHref } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/baza-wiedzy', PAGE_SEO['/baza-wiedzy']);
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
        { key: 'baza-wiedzy' },
    ]);

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            {children}
        </>
    );
}
