import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'Aktualności | DensFlow Demo - Gabinet Demo',
            description: 'Najnowsze wiadomości z gabinetu DensFlow Demo . Porady stomatologiczne, nowości w ofercie, wydarzenia i promocje.',
        };
    }
    return {
        title: 'Aktualności | Mikrostomart - Dentysta Opole',
        description: 'Najnowsze wiadomości z gabinetu Mikrostomart w Opolu. Porady stomatologiczne, nowości w ofercie, wydarzenia i promocje.',
        keywords: 'aktualności dentysta opole, nowości stomatologia, mikrostomart blog, porady stomatologiczne'
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
