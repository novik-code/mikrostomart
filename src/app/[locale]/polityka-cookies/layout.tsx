import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: `Polityka Cookies | ${brand.name} ${brand.cityShort}`,
        description: `Informacje o plikach cookies używanych na stronie gabinetu stomatologicznego ${brand.name} w ${brand.cityShort}.`,
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
