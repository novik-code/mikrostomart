import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Polityka Cookies | Mikrostomart Opole",
    description: "Informacje o plikach cookies używanych na stronie gabinetu stomatologicznego Mikrostomart w Opolu.",
};

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
    return children;
}
