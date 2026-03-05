import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'RODO | Mikrostomart - Dentysta Opole',
    description: 'Informacje o przetwarzaniu danych osobowych (RODO) w gabinecie stomatologicznym Mikrostomart w Opolu.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
