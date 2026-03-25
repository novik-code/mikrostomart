import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'Polityka Prywatności | DensFlow Demo Opole',
            description: 'Polityka prywatności gabinetu stomatologicznego DensFlow Demo — jak przetwarzamy Twoje dane osobowe.',
        };
    }
    return {
        title: 'Polityka Prywatności | Mikrostomart Opole',
        description: 'Polityka prywatności gabinetu stomatologicznego Mikrostomart w Opolu — jak przetwarzamy Twoje dane osobowe.',
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
