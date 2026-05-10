import type { Metadata } from 'next';
import { pageMetadata, localizedBreadcrumb, breadcrumbHref } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';
import { buildServicePageSchemas } from '@/lib/serviceSchemas';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/oferta/implantologia', PAGE_SEO['/oferta/implantologia']);
}

export default async function ImplantologiaLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'oferta', url: breadcrumbHref(locale, '/oferta') },
        { key: 'implantologia' },
    ]);
    const schemas = buildServicePageSchemas('/oferta/implantologia', locale);

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            {schemas && (
                <>
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.faqSchema) }} />
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.procedureSchema) }} />
                </>
            )}
            {children}
        </>
    );
}
