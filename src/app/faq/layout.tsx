import type { Metadata } from 'next';
import { isDemoMode } from '@/lib/demoMode';

export function generateMetadata(): Metadata {
    if (isDemoMode) {
        return {
            title: 'FAQ - Najczęstsze Pytania',
            description: 'Najczęściej zadawane pytania o leczenie stomatologiczne w gabinecie DensFlow Demo . Odpowiedzi na pytania o implanty, leczenie kanałowe, licówki, ortodoncję i więcej.',
        };
    }
    return {
        title: 'FAQ - Najczęstsze Pytania',
        description: 'Najczęściej zadawane pytania o leczenie stomatologiczne w gabinecie Mikrostomart w Opolu. Odpowiedzi na pytania o implanty, leczenie kanałowe, licówki, ortodoncję i więcej.',
        keywords: 'faq dentysta opole, pytania stomatologia, implanty pytania, leczenie kanałowe faq, licówki pytania, ortodoncja faq'
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
