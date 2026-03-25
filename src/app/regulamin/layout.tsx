import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'Regulamin | DensFlow Demo - Gabinet Demo',
            description: 'Regulamin korzystania z serwisu mikrostomart.pl i usług gabinetu stomatologicznego DensFlow Demo .',
        };
    }
    return {
        title: 'Regulamin | Mikrostomart - Dentysta Opole',
        description: 'Regulamin korzystania z serwisu mikrostomart.pl i usług gabinetu stomatologicznego Mikrostomart w Opolu.',
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
