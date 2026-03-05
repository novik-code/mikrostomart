import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'FAQ | Mikrostomart - Dentysta Opole',
    description: 'Najczęściej zadawane pytania o leczenie stomatologiczne w gabinecie Mikrostomart w Opolu. Odpowiedzi na pytania o implanty, leczenie kanałowe i więcej.',
    keywords: 'faq dentysta opole, pytania stomatologia, implanty pytania, leczenie kanałowe faq',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
