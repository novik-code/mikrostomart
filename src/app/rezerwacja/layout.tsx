import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'Rezerwacja Online | DensFlow Demo - Gabinet Demo',
            description: 'Umów wizytę u dentysty online. Szybka rezerwacja w gabinecie DensFlow Demo — wybierz specjalistę, datę i godzinę.',
        };
    }
    return {
        title: 'Rezerwacja Online | Mikrostomart - Dentysta Opole',
        description: 'Umów wizytę u dentysty w Opolu online. Szybka rezerwacja w gabinecie Mikrostomart — wybierz specjalistę, datę i godzinę.',
        keywords: 'rezerwacja dentysta opole, umów wizytę online opole, wizyta stomatolog opole, mikrostomart rezerwacja'
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
