import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/oferta', PAGE_SEO['/oferta']);
}

/**
 * Faza G6 (2026-05-10): brak BreadcrumbList tutaj. Layout dziedziczy też dla
 * sub-pages /oferta/implantologia etc., które mają własne 3-level breadcrumby.
 * Renderowanie 2-level breadcrumb tutaj powodowałoby konflikt schemas (Google
 * widziałby DWA BreadcrumbList na sub-page). Landing /oferta ma własny breadcrumb
 * w `/oferta/page.tsx` (server wrapper).
 */
export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
