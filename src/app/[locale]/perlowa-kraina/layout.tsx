import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';

/**
 * Strona wsparcia aplikacji dziecięcej „Perłowa Kraina".
 *
 * 🔴 To jest URL, który wpisujemy w App Store Connect (Support URL) i w Play
 * Console (Website). Musi żyć na produkcji ZANIM złożymy wniosek — obie konsole
 * odpytują go automatycznie, a martwy adres blokuje wysyłkę.
 *
 * Indeksowalna we WSZYSTKICH czterech locale (bez `indexableLocales`), inaczej
 * niż strony prawne gabinetu: tam PL-only, bo foreign locale renderują polski
 * tekst i konkurują jako duplikat. Tu treść jest realnie przetłumaczona, a apka
 * wychodzi globalnie i mówi w czterech językach.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/perlowa-kraina', PAGE_SEO['/perlowa-kraina']);
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
