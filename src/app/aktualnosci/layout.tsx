import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Aktualności | Mikrostomart - Dentysta Opole',
    description: 'Najnowsze wiadomości z gabinetu Mikrostomart w Opolu. Porady stomatologiczne, nowości w ofercie, wydarzenia i promocje.',
    keywords: 'aktualności dentysta opole, nowości stomatologia, mikrostomart blog, porady stomatologiczne',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
