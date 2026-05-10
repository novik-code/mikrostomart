import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';
import { pageMetadata, breadcrumbSchema } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';
import { buildServicePageSchemas } from '@/lib/serviceSchemas';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/oferta/implantologia', PAGE_SEO['/oferta/implantologia']);
}

const breadcrumb = breadcrumbSchema([
    { name: 'Strona główna', url: brand.appUrl },
    { name: 'Oferta', url: `${brand.appUrl}/oferta` },
    { name: 'Implantologia' },
]);

export default async function ImplantologiaLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    // Faza G5: per-locale FAQ + MedicalProcedure z `serviceSchemas.ts`.
    // Rich snippets (FAQ accordion + MedicalProcedure) wyświetlane w lokalnym
    // języku w SERP — działa w PL/EN/DE/UA (przed G5 tylko PL).
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
