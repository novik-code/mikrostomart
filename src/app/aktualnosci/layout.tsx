import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: `Aktualności | ${brand.name} - Dentysta ${brand.cityShort}`,
        description: `Najnowsze wiadomości z gabinetu ${brand.name} w ${brand.cityShort}. Porady stomatologiczne, nowości w ofercie, wydarzenia i promocje.`,
        keywords: `aktualności dentysta ${brand.cityShort.toLowerCase()}, nowości stomatologia, ${brand.name.toLowerCase()} blog, porady stomatologiczne`
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
