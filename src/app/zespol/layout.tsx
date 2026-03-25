import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'Zespół | DensFlow Demo - Gabinet Demo',
            description: 'Poznaj zespół specjalistów gabinetu DensFlow Demo . Doświadczeni dentyści, chirurdzy i higienistki stomatologiczne.',
        };
    }
    return {
        title: 'Zespół | Mikrostomart - Dentysta Opole',
        description: 'Poznaj zespół specjalistów gabinetu Mikrostomart w Opolu. Doświadczeni dentyści, chirurdzy i higienistki stomatologiczne.',
        keywords: 'zespół dentysta opole, lekarze mikrostomart, specjaliści stomatologia opole'
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
