import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: `Mapa Bólu | ${brand.name} - Dentysta ${brand.cityShort}`,
        description: `Interaktywna mapa bólu zębów. Kliknij na ząb, opisz objawy i dowiedz się, co może być przyczyną. Narzędzie diagnostyczne gabinetu ${brand.name}.`,
        keywords: `mapa bólu zęba, ból zęba przyczyny, diagnostyka stomatologiczna, ból zęba co robić, ${brand.name.toLowerCase()}`
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
