import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: `Rezerwacja Online | ${brand.name} - Dentysta ${brand.cityShort}`,
        description: `Umów wizytę u dentysty w ${brand.cityShort} online. Szybka rezerwacja w gabinecie ${brand.name} — wybierz specjalistę, datę i godzinę.`,
        keywords: `rezerwacja dentysta ${brand.cityShort.toLowerCase()}, umów wizytę online ${brand.cityShort.toLowerCase()}, wizyta stomatolog ${brand.cityShort.toLowerCase()}, ${brand.name.toLowerCase()} rezerwacja`
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
