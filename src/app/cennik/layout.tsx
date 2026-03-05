import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Cennik | Mikrostomart - Dentysta Opole',
    description: 'Sprawdź cennik usług stomatologicznych w gabinecie Mikrostomart w Opolu. Transparentne ceny implantów, leczenia kanałowego, wybielania i więcej.',
    keywords: 'cennik dentysta opole, ceny implantów opole, cennik stomatolog opole, mikrostomart cennik',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
