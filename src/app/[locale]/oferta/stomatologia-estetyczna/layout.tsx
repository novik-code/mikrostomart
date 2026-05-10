import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';
import { pageMetadata, breadcrumbSchema } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';
import { buildServicePageSchemas } from '@/lib/serviceSchemas';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/oferta/stomatologia-estetyczna', PAGE_SEO['/oferta/stomatologia-estetyczna']);
}

const breadcrumb = breadcrumbSchema([
    { name: 'Strona główna', url: brand.appUrl },
    { name: 'Oferta', url: `${brand.appUrl}/oferta` },
    { name: 'Stomatologia Estetyczna' },
]);

export default async function Layout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const schemas = buildServicePageSchemas('/oferta/stomatologia-estetyczna', locale);

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
