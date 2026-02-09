import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { CartProvider } from "@/context/CartContext";
import { AssistantProvider } from "@/context/AssistantContext";
import { SimulatorProvider } from "@/context/SimulatorContext";
import SimulatorModal from "@/components/SimulatorModal";
import AssistantTeaser from "@/components/AssistantTeaser";
import BackgroundVideo from "@/components/BackgroundVideo";
import CookieConsent from "@/components/CookieConsent";
import SplashScreen from "@/components/SplashScreen";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
    title: "Dentysta Opole - Mikrostomart | Implanty i Stomatologia Mikroskopowa",
    description: "Szukasz dentysty w Opolu? Mikrostomart to nowoczesny gabinet stomatologiczny. Specjalizujemy się w implantach, leczeniu kanałowym i estetyce. Umów wizytę w Opolu (Chmielowice).",
    keywords: "dentysta opole, stomatolog opole, implanty opole, leczenie kanałowe opole, mikrostomart, stomatologia mikroskopowa",
    manifest: "/manifest.json",
    icons: {
        icon: '/icon.png',
        shortcut: '/icon.png',
        apple: '/icon-512x512.png',
    },
    openGraph: {
        images: ['/opengraph-image.png'],
    },
    other: {
        "geo.region": "PL-OP",
        "geo.placename": "Opole",
        "geo.position": "50.677682;17.866163",
        "ICBM": "50.677682, 17.866163",
    },
};

export const viewport: Viewport = {
    themeColor: "#0f1115",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pl">
            <body className={`${inter.variable} ${playfair.variable}`}>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "Dentist",
                            "name": "Mikrostomart - Mikroskopowa Stomatologia Artystyczna",
                            "image": "https://mikrostomart.pl/logo-transparent.png",
                            "@id": "https://mikrostomart.pl",
                            "url": "https://mikrostomart.pl",
                            "telephone": "570270470",
                            "priceRange": "$$",
                            "address": {
                                "@type": "PostalAddress",
                                "streetAddress": "ul. Centralna 33a",
                                "addressLocality": "Opole",
                                "postalCode": "45-940",
                                "addressCountry": "PL"
                            },
                            "geo": {
                                "@type": "GeoCoordinates",
                                "latitude": 50.677682,
                                "longitude": 17.866163
                            },
                            "openingHoursSpecification": [
                                {
                                    "@type": "OpeningHoursSpecification",
                                    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday"],
                                    "opens": "09:00",
                                    "closes": "20:00"
                                },
                                {
                                    "@type": "OpeningHoursSpecification",
                                    "dayOfWeek": "Friday",
                                    "opens": "09:00",
                                    "closes": "16:00"
                                }
                            ]
                        })
                    }}
                />
                <CartProvider>
                    <AssistantProvider>
                        <SimulatorProvider>
                            <SplashScreen>
                                <BackgroundVideo videoId="vGAu6rdJ8WQ" />
                                <CookieConsent />
                                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                                    <Navbar />
                                    {children}
                                    <AssistantTeaser />
                                    <PWAInstallPrompt />
                                    <Footer />
                                    <SimulatorModal />
                                </div>
                            </SplashScreen>
                        </SimulatorProvider>
                    </AssistantProvider>
                </CartProvider>
            </body>
        </html>
    );
}
