import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: `O nas | ${brand.name} - Dentysta ${brand.cityShort}`,
        description: `Poznaj gabinet ${brand.name} w ${brand.cityShort}. Nowoczesna stomatologia mikroskopowa, doświadczony zespół i indywidualne podejście do każdego pacjenta.`,
        keywords: `o nas, ${brand.name.toLowerCase()}, dentysta ${brand.cityShort.toLowerCase()}, gabinet stomatologiczny ${brand.cityShort.toLowerCase()}, stomatologia mikroskopowa`
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
