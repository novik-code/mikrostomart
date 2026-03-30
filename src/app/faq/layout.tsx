import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: 'FAQ - Najczęstsze Pytania',
        description: `Najczęściej zadawane pytania o leczenie stomatologiczne w gabinecie ${brand.name} w ${brand.cityShort}. Odpowiedzi na pytania o implanty, leczenie kanałowe, licówki, ortodoncję i więcej.`,
        keywords: `faq dentysta ${brand.cityShort.toLowerCase()}, pytania stomatologia, implanty pytania, leczenie kanałowe faq, licówki pytania, ortodoncja faq`
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
