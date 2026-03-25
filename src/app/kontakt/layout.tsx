import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'Kontakt | DensFlow Demo - Gabinet Demo',
            description: 'Skontaktuj się z gabinetem demonstracyjnym DensFlow. Umów wizytę online.',
        };
    }
    return {
        title: 'Kontakt | Mikrostomart - Dentysta Opole',
        description: 'Skontaktuj się z gabinetem Mikrostomart w Opolu. Adres: ul. Centralna 33a, Opole-Chmielowice. Telefon: 570-270-470. Umów wizytę online.',
        keywords: 'kontakt, dentysta opole, mikrostomart telefon, umów wizytę opole, gabinet stomatologiczny chmielowice'
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
