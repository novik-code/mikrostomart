import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'Baza Wiedzy | DensFlow Demo - Gabinet Demo',
            description: 'Baza wiedzy stomatologicznej gabinetu DensFlow Demo. Artykuły o implantach, leczeniu kanałowym, higienie i profilaktyce.',
        };
    }
    return {
        title: 'Baza Wiedzy | Mikrostomart - Dentysta Opole',
        description: 'Baza wiedzy stomatologicznej gabinetu Mikrostomart. Artykuły o implantach, leczeniu kanałowym, higienie i profilaktyce.',
        keywords: 'baza wiedzy stomatologia, artykuły dentysta, implanty wiedza, higiena zębów porady'
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
