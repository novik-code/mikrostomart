import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

// PL-only content: foreign locale URLs are noindex'd until translated.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const isDefault = locale === 'pl';
    return {
        title: `Polityka Prywatności | ${brand.name} ${brand.cityShort}`,
        description: `Polityka prywatności gabinetu stomatologicznego ${brand.name} w ${brand.cityShort} — jak przetwarzamy Twoje dane osobowe.`,
        alternates: { canonical: '/polityka-prywatnosci' },
        robots: isDefault ? undefined : { index: false, follow: true },
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
