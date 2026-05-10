import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

// PL-only content: foreign locale URLs are noindex'd until translated.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const isDefault = locale === 'pl';
    return {
        title: `RODO | ${brand.name} - Dentysta ${brand.cityShort}`,
        description: `Informacje o przetwarzaniu danych osobowych (RODO) w gabinecie stomatologicznym ${brand.name} w ${brand.cityShort}.`,
        alternates: { canonical: '/rodo' },
        robots: isDefault ? undefined : { index: false, follow: true },
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
