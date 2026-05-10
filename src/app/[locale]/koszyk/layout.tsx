import type { Metadata } from 'next';

// Cart pages should never be indexed: they expose ephemeral session state and add
// no search value. This noindex applies across all 4 locales.
export const metadata: Metadata = {
    title: 'Koszyk | Mikrostomart',
    robots: { index: false, follow: true },
};

export default function KoszykLayout({ children }: { children: React.ReactNode }) {
    return children;
}
