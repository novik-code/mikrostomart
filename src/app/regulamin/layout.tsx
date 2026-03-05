import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Regulamin | Mikrostomart - Dentysta Opole',
    description: 'Regulamin korzystania z serwisu mikrostomart.pl i usług gabinetu stomatologicznego Mikrostomart w Opolu.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
