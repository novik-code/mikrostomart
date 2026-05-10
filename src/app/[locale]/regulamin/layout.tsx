import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: `Regulamin | ${brand.name} - Dentysta ${brand.cityShort}`,
        description: `Regulamin korzystania z serwisu i usług gabinetu stomatologicznego ${brand.name} w ${brand.cityShort}.`,
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
