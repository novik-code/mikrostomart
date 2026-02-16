import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Polityka Prywatności | Mikrostomart Opole",
    description: "Polityka prywatności gabinetu stomatologicznego Mikrostomart w Opolu — jak przetwarzamy Twoje dane osobowe.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
