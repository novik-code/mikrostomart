import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'Oferta | DensFlow Demo - Gabinet Demo',
            description: 'Pełna oferta usług stomatologicznych gabinetu DensFlow Demo . Implanty, leczenie kanałowe, stomatologia mikroskopowa, estetyka, ortodoncja.',
        };
    }
    return {
        title: 'Oferta | Mikrostomart - Dentysta Opole',
        description: 'Pełna oferta usług stomatologicznych gabinetu Mikrostomart w Opolu. Implanty, leczenie kanałowe, stomatologia mikroskopowa, estetyka, ortodoncja.',
        keywords: 'oferta dentysta opole, usługi stomatologiczne opole, implanty opole, leczenie kanałowe opole, stomatologia estetyczna opole'
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
