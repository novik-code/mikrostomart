import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: `Oferta | ${brand.name} - Dentysta ${brand.cityShort}`,
        description: `Pełna oferta usług stomatologicznych gabinetu ${brand.name} w ${brand.cityShort}. Implanty, leczenie kanałowe, stomatologia mikroskopowa, estetyka, ortodoncja.`,
        keywords: `oferta dentysta ${brand.cityShort.toLowerCase()}, usługi stomatologiczne ${brand.cityShort.toLowerCase()}, implanty ${brand.cityShort.toLowerCase()}, leczenie kanałowe ${brand.cityShort.toLowerCase()}, stomatologia estetyczna ${brand.cityShort.toLowerCase()}`
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
