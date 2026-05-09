import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: `Metamorfozy | ${brand.name} ${brand.cityShort}`,
        description: `Zobacz niesamowite efekty leczenia w ${brand.name}. Galeria zdjęć przed i po zabiegach.`,
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
