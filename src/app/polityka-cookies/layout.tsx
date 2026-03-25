import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'Polityka Cookies | DensFlow Demo Opole',
            description: 'Informacje o plikach cookies używanych na stronie gabinetu stomatologicznego DensFlow Demo .',
        };
    }
    return {
        title: 'Polityka Cookies | Mikrostomart Opole',
        description: 'Informacje o plikach cookies używanych na stronie gabinetu stomatologicznego Mikrostomart w Opolu.',
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
