import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Porównywarka Rozwiązań | Mikrostomart Opole",
    description:
        "Porównaj metody leczenia stomatologicznego: implant vs most vs proteza, bonding vs licówki vs korony. Interaktywne porównanie bez cen — sprawdź, co pasuje do Twoich priorytetów.",
};

export default function PorownywarkaLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
