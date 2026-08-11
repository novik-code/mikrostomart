import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { PAGE_SEO } from '@/lib/seoTranslations';

/**
 * Polityka prywatności aplikacji dziecięcej „Perłowa Kraina".
 *
 * 🔴 To jest URL wpisywany w pole „Privacy Policy URL" w OBU konsolach.
 * Google Play wymaga polityki w listingu ORAZ w aplikacji, Apple wymaga jej
 * „within the app in an easily accessible manner" — apka ma pełny tekst na
 * ekranie `/kids/prywatnosc`, a ta strona jest jego publicznym odpowiednikiem.
 *
 * 🔴 NIE MYLIĆ z `/polityka-prywatnosci` gabinetu. Tamten dokument opisuje
 * dokumentację medyczną, sklep i płatności — apka dla dzieci nie robi żadnej
 * z tych rzeczy, a rozjazd między dokumentem a zawartością to w programie dla
 * dzieci sprawa wiarygodności dewelopera, nie kosmetyka.
 *
 * Tekst jest PORTOWANY 1:1 z aplikacji (gałąź `kids.privacy` w jej locale),
 * żeby dwie wersje tego samego dokumentu nie zaczęły się rozjeżdżać.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return pageMetadata(locale, '/perlowa-kraina/prywatnosc', PAGE_SEO['/perlowa-kraina/prywatnosc']);
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
