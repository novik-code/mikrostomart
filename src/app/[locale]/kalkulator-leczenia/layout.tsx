import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export const metadata: Metadata = {
    title: `Kalkulator Czasu Leczenia | ${brand.name} ${brand.cityShort}`,
    description: 'Sprawdź orientacyjnie ile wizyt i ile czasu zajmie leczenie stomatologiczne: endodoncja, implanty, protetyka, bonding, wybielanie. Interaktywny kalkulator z osią czasu.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
