import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Sklep | Mikrostomart - Dentysta Opole',
    description: 'Sklep internetowy gabinetu Mikrostomart. Produkty do higieny jamy ustnej, szczoteczki, pasty i akcesoria rekomendowane przez dentystów.',
    keywords: 'sklep stomatologiczny, produkty higiena jamy ustnej, szczoteczka dentysta, mikrostomart sklep',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
