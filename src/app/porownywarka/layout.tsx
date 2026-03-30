import type { Metadata } from "next";
import { brand } from '@/lib/brandConfig';

export const metadata: Metadata = {
    title: `Porównywarka Rozwiązań | ${brand.name} ${brand.cityShort}`,
    description:
        "Porównaj metody leczenia stomatologicznego: implant vs most vs proteza, bonding vs licówki vs korony. Interaktywne porównanie bez cen — sprawdź, co pasuje do Twoich priorytetów.",
};

export default function PorownywarkaLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
