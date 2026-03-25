import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'RODO | DensFlow Demo - Gabinet Demo',
            description: 'Informacje o przetwarzaniu danych osobowych (RODO) w gabinecie stomatologicznym DensFlow Demo .',
        };
    }
    return {
        title: 'RODO | Mikrostomart - Dentysta Opole',
        description: 'Informacje o przetwarzaniu danych osobowych (RODO) w gabinecie stomatologicznym Mikrostomart w Opolu.',
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
