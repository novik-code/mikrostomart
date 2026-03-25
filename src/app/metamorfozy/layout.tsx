import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'Metamorfozy | DensFlow Demo Opole',
            description: 'Zobacz niesamowite efekty leczenia w DensFlow Demo. Galeria zdjęć przed i po zabiegach.',
        };
    }
    return {
        title: 'Metamorfozy | Mikrostomart Opole',
        description: 'Zobacz niesamowite efekty leczenia w Mikrostomart. Galeria zdjęć przed i po zabiegach.',
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
