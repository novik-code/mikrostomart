import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: `Sklep | ${brand.name} - Dentysta ${brand.cityShort}`,
        description: `Sklep internetowy gabinetu ${brand.name}. Produkty do higieny jamy ustnej, szczoteczki, pasty i akcesoria rekomendowane przez dentystów.`,
        keywords: `sklep stomatologiczny, produkty higiena jamy ustnej, szczoteczka dentysta, ${brand.name.toLowerCase()} sklep`
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
