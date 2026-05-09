import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: `RODO | ${brand.name} - Dentysta ${brand.cityShort}`,
        description: `Informacje o przetwarzaniu danych osobowych (RODO) w gabinecie stomatologicznym ${brand.name} w ${brand.cityShort}.`,
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
