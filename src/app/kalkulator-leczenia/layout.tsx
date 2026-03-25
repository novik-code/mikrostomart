import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'Kalkulator Czasu Leczenia | DensFlow Demo Opole',
            description: 'Sprawdź orientacyjnie ile wizyt i ile czasu zajmie leczenie stomatologiczne: endodoncja, implanty, protetyka, bonding, wybielanie. Interaktywny kalkulator z osią czasu.',
        };
    }
    return {
        title: 'Kalkulator Czasu Leczenia | Mikrostomart Opole',
        description: 'Sprawdź orientacyjnie ile wizyt i ile czasu zajmie leczenie stomatologiczne: endodoncja, implanty, protetyka, bonding, wybielanie. Interaktywny kalkulator z osią czasu.',
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
