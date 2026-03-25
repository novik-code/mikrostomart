import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'O nas | DensFlow Demo - Gabinet Demo',
            description: 'Poznaj gabinet DensFlow Demo . Nowoczesna stomatologia mikroskopowa, doświadczony zespół i indywidualne podejście do każdego pacjenta.',
        };
    }
    return {
        title: 'O nas | Mikrostomart - Dentysta Opole',
        description: 'Poznaj gabinet Mikrostomart w Opolu. Nowoczesna stomatologia mikroskopowa, doświadczony zespół i indywidualne podejście do każdego pacjenta.',
        keywords: 'o nas, mikrostomart, dentysta opole, gabinet stomatologiczny opole, stomatologia mikroskopowa'
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
