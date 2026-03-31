import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Status płatności',
    robots: 'noindex',
};

export default function PlatnosLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
