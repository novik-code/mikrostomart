import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: `Cennik | ${brand.name} - Dentysta ${brand.cityShort}`,
        description: `Sprawdź cennik usług stomatologicznych w gabinecie ${brand.name} w ${brand.cityShort}. Transparentne ceny implantów, leczenia kanałowego, wybielania i więcej.`,
        keywords: `cennik dentysta ${brand.cityShort.toLowerCase()}, ceny implantów ${brand.cityShort.toLowerCase()}, cennik stomatolog ${brand.cityShort.toLowerCase()}, ${brand.name.toLowerCase()} cennik`
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
