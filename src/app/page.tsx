import type { Metadata } from "next";
import { isDemoMode } from "@/lib/demoMode";
import HomeClient from "./HomeClient";

// Server-side metadata for the homepage. The interactive content lives in HomeClient
// (a "use client" component); this wrapper exists solely so we can export `metadata`,
// which is not allowed in client components.
//
// The long SEO title here intentionally bypasses `brandConfig.titleDefault` (which stays
// 'Mikrostomart' to keep the iOS PWA install dialog name short — see brandConfig.ts).
// Subpages still get the short brand via the `titleTemplate` from the root layout.
export const metadata: Metadata = {
    title: isDemoMode
        ? 'Klinika Demo — Demonstracja systemu DensFlow.Ai'
        : 'Stomatolog, dentysta Opole | Gabinet stomatologiczny Mikrostomart',
    description: isDemoMode
        ? 'Demo systemu zarządzania gabinetem stomatologicznym DensFlow.Ai. Zobacz w działaniu kalendarz wizyt, e-kartę pacjenta, kontrolę czasu pracy, AI assistant.'
        : 'Mikrostomart — gabinet stomatologiczny w Opolu. Implanty, leczenie kanałowe pod mikroskopem, stomatologia estetyczna, ortodoncja. Zespół specjalistów: Marcin Nowosielski i in. Umów wizytę: 570 270 470.',
    openGraph: {
        title: isDemoMode
            ? 'Klinika Demo — Demonstracja DensFlow.Ai'
            : 'Stomatolog, dentysta Opole | Mikrostomart',
        description: isDemoMode
            ? 'Demo systemu zarządzania gabinetem stomatologicznym DensFlow.Ai.'
            : 'Nowoczesny gabinet stomatologiczny w Opolu. Implanty, mikroskopia, stomatologia estetyczna. Umów wizytę.',
    },
};

export default function Page() {
    return <HomeClient />;
}
