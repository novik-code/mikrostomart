import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'Sklep | DensFlow Demo - Gabinet Demo',
            description: 'Sklep internetowy gabinetu DensFlow Demo. Produkty do higieny jamy ustnej, szczoteczki, pasty i akcesoria rekomendowane przez dentystów.',
        };
    }
    return {
        title: 'Sklep | Mikrostomart - Dentysta Opole',
        description: 'Sklep internetowy gabinetu Mikrostomart. Produkty do higieny jamy ustnej, szczoteczki, pasty i akcesoria rekomendowane przez dentystów.',
        keywords: 'sklep stomatologiczny, produkty higiena jamy ustnej, szczoteczka dentysta, mikrostomart sklep'
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
