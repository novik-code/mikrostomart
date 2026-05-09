import type { Metadata } from 'next';
import { brand } from '@/lib/brandConfig';

export function generateMetadata(): Metadata {
    return {
        title: `Kontakt | ${brand.name} - Dentysta ${brand.cityShort}`,
        description: `Skontaktuj się z gabinetem ${brand.name} w ${brand.cityShort}. Adres: ${brand.streetAddress}. Telefon: ${brand.phone1}. Umów wizytę online.`,
        keywords: `kontakt, dentysta ${brand.cityShort.toLowerCase()}, ${brand.name.toLowerCase()} telefon, umów wizytę ${brand.cityShort.toLowerCase()}, gabinet stomatologiczny`
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
