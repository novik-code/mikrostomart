import type { Metadata } from 'next';
import { pageMetadata, breadcrumbSchema } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';
import { brand } from '@/lib/brandConfig';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/metamorfozy', PAGE_SEO['/metamorfozy']);
}

const breadcrumb = breadcrumbSchema([
    { name: 'Strona główna', url: brand.appUrl },
    { name: 'Metamorfozy' },
]);

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            {children}
        </>
    );
}
