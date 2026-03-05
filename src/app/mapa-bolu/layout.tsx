import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Mapa Bólu | Mikrostomart - Dentysta Opole',
    description: 'Interaktywna mapa bólu zębów. Kliknij na ząb, opisz objawy i dowiedz się, co może być przyczyną. Narzędzie diagnostyczne gabinetu Mikrostomart.',
    keywords: 'mapa bólu zęba, ból zęba przyczyny, diagnostyka stomatologiczna, ból zęba co robić, mikrostomart',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
