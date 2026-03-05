import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'O nas | Mikrostomart - Dentysta Opole',
    description: 'Poznaj gabinet Mikrostomart w Opolu. Nowoczesna stomatologia mikroskopowa, doświadczony zespół i indywidualne podejście do każdego pacjenta.',
    keywords: 'o nas, mikrostomart, dentysta opole, gabinet stomatologiczny opole, stomatologia mikroskopowa',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
