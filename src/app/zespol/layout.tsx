import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: `Zespół | ${brand.name} - Dentysta ${brand.cityShort}`,
        description: `Poznaj zespół specjalistów gabinetu ${brand.name} w ${brand.cityShort}. Doświadczeni dentyści, chirurdzy i higienistki stomatologiczne.`,
        keywords: `dentysta ${brand.cityShort.toLowerCase()}, zespół stomatologów, ${brand.name.toLowerCase()} lekarze, specjaliści stomatologia`
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
