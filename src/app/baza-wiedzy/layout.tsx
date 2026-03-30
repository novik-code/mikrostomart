import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: `Baza Wiedzy | ${brand.name} - Dentysta ${brand.cityShort}`,
        description: `Baza wiedzy stomatologicznej gabinetu ${brand.name}. Artykuły o implantach, leczeniu kanałowym, higienie i profilaktyce.`,
        keywords: 'baza wiedzy stomatologia, artykuły dentysta, implanty wiedza, higiena zębów porady'
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
