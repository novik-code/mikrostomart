import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { CartProvider } from "@/context/CartContext";
import { AssistantProvider } from "@/context/AssistantContext";
import { SimulatorProvider } from "@/context/SimulatorContext";
import { OpinionProvider } from "@/context/OpinionContext";
import ThemeLayout from "@/components/ThemeLayout";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
    metadataBase: new URL('https://mikrostomart.pl'),
    alternates: {
        canonical: './',
        languages: {
            'pl': './',
            'en': './',
            'de': './',
            'uk': './',
            'x-default': './',
        },
    },
    title: {
        default: 'Dentysta Opole - Mikrostomart | Implanty i Stomatologia Mikroskopowa',
        template: '%s | Mikrostomart - Dentysta Opole',
    },
    description: "Szukasz dentysty w Opolu? Mikrostomart to nowoczesny gabinet stomatologiczny. Specjalizujemy się w implantach, leczeniu kanałowym i estetyce. Umów wizytę w Opolu (Chmielowice).",
    keywords: "dentysta opole, stomatolog opole, implanty opole, leczenie kanałowe opole, mikrostomart, stomatologia mikroskopowa",
    manifest: "/manifest.json",
    icons: {
        icon: '/icon.png',
        shortcut: '/icon.png',
        apple: '/icon-512x512.png',
    },
    openGraph: {
        type: 'website',
        locale: 'pl_PL',
        siteName: 'Mikrostomart - Dentysta Opole',
        images: [{
            url: '/opengraph-image.png',
            width: 1200,
            height: 630,
            alt: 'Mikrostomart - Mikroskopowa Stomatologia Artystyczna w Opolu',
        }],
    },
    twitter: {
        card: 'summary_large_image',
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

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // Read locale from NEXT_LOCALE cookie (set by LanguageSwitcher)
    const locale = await getLocale();
    const messages = await getMessages();

    return (
        <html lang={locale}>
            <body className={`${inter.variable} ${playfair.variable}`}>
                {/* Dentist / LocalBusiness schema */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": ["Dentist", "MedicalBusiness"],
                            "name": "Mikrostomart - Mikroskopowa Stomatologia Artystyczna",
                            "alternateName": "Mikrostomart Gabinet Stomatologiczny",
                            "description": "Nowoczesny gabinet stomatologiczny w Opolu specjalizujący się w implantologii, stomatologii mikroskopowej, leczeniu kanałowym i estetyce. Zaawansowana technologia, indywidualne podejście.",
                            "image": "https://mikrostomart.pl/logo-transparent.png",
                            "@id": "https://mikrostomart.pl",
                            "url": "https://mikrostomart.pl",
                            "telephone": "+48570270470",
                            "priceRange": "$$",
                            "currenciesAccepted": "PLN",
                            "paymentAccepted": "Cash, Credit Card",
                            "address": {
                                "@type": "PostalAddress",
                                "streetAddress": "ul. Centralna 33a",
                                "addressLocality": "Opole",
                                "addressRegion": "opolskie",
                                "postalCode": "45-940",
                                "addressCountry": "PL"
                            },
                            "geo": {
                                "@type": "GeoCoordinates",
                                "latitude": 50.677682,
                                "longitude": 17.866163
                            },
                            "hasMap": "https://www.google.com/maps/search/?api=1&query=Mikrostomart+Opole+ul.+Centralna+33a",
                            "sameAs": [
                                "https://www.facebook.com/mikrostomart"
                            ],
                            "medicalSpecialty": [
                                "Dentistry",
                                "Endodontics",
                                "Prosthodontics",
                                "Orthodontics",
                                "DentalHygiene"
                            ],
                            "availableService": [
                                { "@type": "MedicalProcedure", "name": "Implanty zębów", "url": "https://mikrostomart.pl/oferta/implantologia" },
                                { "@type": "MedicalProcedure", "name": "Leczenie kanałowe pod mikroskopem" },
                                { "@type": "MedicalProcedure", "name": "Stomatologia estetyczna" },
                                { "@type": "MedicalProcedure", "name": "Ortodoncja" },
                                { "@type": "MedicalProcedure", "name": "Protetyka" },
                                { "@type": "MedicalProcedure", "name": "Chirurgia stomatologiczna" },
                                { "@type": "MedicalProcedure", "name": "Higienizacja i profilaktyka" }
                            ],
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
                {/* WebSite schema — enables sitelinks search in Google */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "WebSite",
                            "name": "Mikrostomart",
                            "url": "https://mikrostomart.pl",
                            "potentialAction": {
                                "@type": "SearchAction",
                                "target": "https://mikrostomart.pl/baza-wiedzy?q={search_term_string}",
                                "query-input": "required name=search_term_string"
                            }
                        })
                    }}
                />
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <CartProvider>
                        <AssistantProvider>
                            <SimulatorProvider>
                                <OpinionProvider>
                                    <ThemeLayout>
                                        {children}
                                    </ThemeLayout>
                                </OpinionProvider>
                            </SimulatorProvider>
                        </AssistantProvider>
                    </CartProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
