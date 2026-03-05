import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Oferta | Mikrostomart - Dentysta Opole',
    description: 'Pełna oferta usług stomatologicznych gabinetu Mikrostomart w Opolu. Implanty, leczenie kanałowe, stomatologia mikroskopowa, estetyka, ortodoncja.',
    keywords: 'oferta dentysta opole, usługi stomatologiczne opole, implanty opole, leczenie kanałowe opole, stomatologia estetyczna opole',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
