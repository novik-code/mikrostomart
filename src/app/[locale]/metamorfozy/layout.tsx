import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { pageMetadata, localizedBreadcrumb, breadcrumbHref } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';
import { brand } from '@/lib/brandConfig';
import { METAMORPHOSES } from '@/data/metamorphoses';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/metamorfozy', PAGE_SEO['/metamorfozy']);
}

export default async function Layout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'metamorfozy' });

    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'metamorfozy' },
    ]);

    // FAQPage (2C) — 5 Q&A z namespace metamorfozy.
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [1, 2, 3, 4, 5].map((n) => ({
            "@type": "Question",
            "name": t(`faqQ${n}`),
            "acceptedAnswer": { "@type": "Answer", "text": t(`faqA${n}`) },
        })),
    };

    // ImageGallery (2C) — before/after metamorfoz jako ImageObject[]; creator = Physician Marcin @id.
    const absImg = (p: string) => (p.startsWith('http') ? p : `${brand.appUrl}${p}`);
    const gallerySchema = {
        "@context": "https://schema.org",
        "@type": "ImageGallery",
        "name": t('galleryHeading'),
        "url": `${brand.appUrl}${locale === 'pl' ? '' : `/${locale}`}/metamorfozy`,
        "image": METAMORPHOSES.flatMap((m) => [
            {
                "@type": "ImageObject",
                "contentUrl": absImg(m.before),
                "caption": `${m.title} — przed`,
                "creator": { "@type": "Physician", "@id": `${brand.appUrl}/#marcin-nowosielski` },
            },
            {
                "@type": "ImageObject",
                "contentUrl": absImg(m.after),
                "caption": `${m.title} — ${m.description}`,
                "creator": { "@type": "Physician", "@id": `${brand.appUrl}/#marcin-nowosielski` },
            },
        ]),
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gallerySchema) }} />
            {children}
        </>
    );
}
