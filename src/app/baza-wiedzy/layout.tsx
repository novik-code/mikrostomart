import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Baza Wiedzy | Mikrostomart - Dentysta Opole',
    description: 'Baza wiedzy stomatologicznej gabinetu Mikrostomart. Artykuły o implantach, leczeniu kanałowym, higienie i profilaktyce.',
    keywords: 'baza wiedzy stomatologia, artykuły dentysta, implanty wiedza, higiena zębów porady',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
