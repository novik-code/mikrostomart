import type { Metadata } from 'next';
import { pageMetadata, localizedBreadcrumb, breadcrumbHref } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';
import { buildServicePageSchemas } from '@/lib/serviceSchemas';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/oferta/all-on-4', PAGE_SEO['/oferta/all-on-4']);
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
        { key: 'oferta', url: breadcrumbHref(locale, '/oferta') },
        { key: 'allon4' },
    ]);
    const schemas = buildServicePageSchemas('/oferta/all-on-4', locale);

    // Faza 2A: All-on-X ma konkretne widełki cenowe (All-on-4 od 30 000 zł … All-on-6 do 55 000 zł),
    // więc — w przeciwieństwie do generycznego Service z buildServicePageSchemas — dodajemy Offer
    // z PriceSpecification (minPrice/maxPrice, PLN). Wzorzec minPrice jak na geo-stronach.
    const serviceWithOffer = schemas
        ? {
              ...schemas.serviceSchema,
              offers: {
                  '@type': 'Offer',
                  priceCurrency: 'PLN',
                  availability: 'https://schema.org/InStock',
                  priceSpecification: {
                      '@type': 'PriceSpecification',
                      priceCurrency: 'PLN',
                      minPrice: 30000,
                      maxPrice: 55000,
                  },
              },
          }
        : null;

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            {schemas && (
                <>
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.faqSchema) }} />
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.procedureSchema) }} />
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceWithOffer) }} />
                </>
            )}
            {children}
        </>
    );
}
