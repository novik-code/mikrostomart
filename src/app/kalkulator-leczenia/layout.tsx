import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Kalkulator Czasu Leczenia | Mikrostomart Opole",
    description:
        "Sprawdź orientacyjnie ile wizyt i ile czasu zajmie leczenie stomatologiczne: endodoncja, implanty, protetyka, bonding, wybielanie. Interaktywny kalkulator z osią czasu.",
};

export default function KalkulatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
