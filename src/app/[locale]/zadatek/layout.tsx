import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';
import { pageMetadata } from '@/lib/seo';

// Transactional deposit/payment page reached from booking flow with URL params
// (?name=...&email=...&phone=...). Translated in all 4 locales via next-intl
// `zadatek` namespace. noindex (J-2): thin content + URL params would fragment
// Google's view of the page; canonical points to `/zadatek` so any inbound link
// rolls up to one entity. hreflang circle preserved for grouping signals.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const base = pageMetadata(locale, '/zadatek', {
        pl: {
            title: `Zadatek | ${brand.name} - Dentysta ${brand.cityShort}`,
            description: `Zapłać zadatek za rezerwację wizyty w gabinecie stomatologicznym ${brand.name} w ${brand.cityShort}.`,
        },
        en: {
            title: `Deposit | ${brand.name} - Dentist ${brand.cityShort}`,
            description: `Pay your appointment deposit for ${brand.name} dental clinic in ${brand.cityShort}.`,
        },
        de: {
            title: `Anzahlung | ${brand.name} - Zahnarzt ${brand.cityShort}`,
            description: `Zahlen Sie die Anzahlung für Ihren Termin in der Zahnarztpraxis ${brand.name} in ${brand.cityShort}.`,
        },
        ua: {
            title: `Завдаток | ${brand.name} - Стоматолог ${brand.cityShort}`,
            description: `Сплатіть завдаток за бронювання візиту в стоматологічну клініку ${brand.name} в ${brand.cityShort}.`,
        },
    });
    return {
        ...base,
        robots: { index: false, follow: true },
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
