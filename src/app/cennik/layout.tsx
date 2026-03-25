import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'Cennik | DensFlow Demo - Gabinet Demo',
            description: 'Sprawdź cennik usług stomatologicznych w gabinecie DensFlow Demo . Transparentne ceny implantów, leczenia kanałowego, wybielania i więcej.',
        };
    }
    return {
        title: 'Cennik | Mikrostomart - Dentysta Opole',
        description: 'Sprawdź cennik usług stomatologicznych w gabinecie Mikrostomart w Opolu. Transparentne ceny implantów, leczenia kanałowego, wybielania i więcej.',
        keywords: 'cennik dentysta opole, ceny implantów opole, cennik stomatolog opole, mikrostomart cennik'
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
