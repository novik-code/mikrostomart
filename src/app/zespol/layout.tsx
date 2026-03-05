import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Zespół | Mikrostomart - Dentysta Opole',
    description: 'Poznaj zespół specjalistów gabinetu Mikrostomart w Opolu. Doświadczeni dentyści, chirurdzy i higienistki stomatologiczne.',
    keywords: 'zespół dentysta opole, lekarze mikrostomart, specjaliści stomatologia opole',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
