import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/rezerwacja', PAGE_SEO['/rezerwacja']);
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
