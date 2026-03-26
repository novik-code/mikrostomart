import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { CartProvider } from "@/context/CartContext";
import { AssistantProvider } from "@/context/AssistantContext";
import { SimulatorProvider } from "@/context/SimulatorContext";
import { OpinionProvider } from "@/context/OpinionContext";
import { VisualEditorProvider } from "@/context/VisualEditorContext";
import ThemeLayout from "@/components/ThemeLayout";
import DemoBanner from "@/components/DemoBanner";
import AdminFloatingBar from "@/components/AdminFloatingBar";
import VisualEditorOverlay from "@/components/editor/VisualEditorOverlay";
import PageOverridesApplier from "@/components/editor/PageOverridesApplier";
import { isDemoMode } from "@/lib/demoMode";
import { brand, demoSanitize } from "@/lib/brandConfig";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-heading" });

export function generateMetadata(): Metadata {
    return {
        metadataBase: new URL(brand.metadataBase),
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
            default: brand.titleDefault,
            template: brand.titleTemplate,
        },
        description: brand.description,
        keywords: brand.keywords,
        manifest: "/manifest.json",
        icons: {
            icon: '/icon.png',
            shortcut: '/icon.png',
            apple: '/icon-512x512.png',
        },
        openGraph: {
            type: 'website',
            locale: 'pl_PL',
            siteName: brand.ogSiteName,
            images: [{
                url: '/opengraph-image.png',
                width: 1200,
                height: 630,
                alt: brand.ogImageAlt,
            }],
        },
        twitter: {
            card: 'summary_large_image',
            images: ['/opengraph-image.png'],
        },
        other: isDemoMode ? undefined : {
            "geo.region": brand.geoRegion,
            "geo.placename": brand.geoPlacename,
            "geo.position": brand.geoPosition,
            "ICBM": brand.icbm,
        },
    };
}

export const viewport: Viewport = {
    themeColor: "#0f1115",
};

function SchemaOrg() {
    return (
        <>
            {/* Dentist / LocalBusiness schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": ["Dentist", "MedicalBusiness"],
                        "name": brand.schemaName,
                        "alternateName": brand.schemaAlternateName,
                        "description": brand.schemaDescription,
                        "image": brand.schemaImage,
                        "@id": brand.schemaId,
                        "url": brand.schemaUrl,
                        "telephone": isDemoMode ? undefined : `+48${brand.phone1.replace(/-/g, '')}`,
                        "priceRange": "$$",
                        "currenciesAccepted": "PLN",
                        "paymentAccepted": "Cash, Credit Card",
                        "address": {
                            "@type": "PostalAddress",
                            "streetAddress": brand.streetAddress,
                            "addressLocality": brand.city,
                            "addressRegion": brand.region,
                            "postalCode": brand.postalCode,
                            "addressCountry": brand.country,
                        },
                        "geo": {
                            "@type": "GeoCoordinates",
                            "latitude": parseFloat(brand.geoPosition.split(';')[0]),
                            "longitude": parseFloat(brand.geoPosition.split(';')[1]),
                        },
                        "hasMap": `https://www.google.com/maps/search/?api=1&query=${brand.mapQuery}`,
                        "sameAs": brand.facebookUrl ? [brand.facebookUrl] : [],
                        "medicalSpecialty": [
                            "Dentistry",
                            "Endodontics",
                            "Prosthodontics",
                            "Orthodontics",
                            "DentalHygiene"
                        ],
                        "availableService": [
                            { "@type": "MedicalProcedure", "name": "Implanty zębów", "url": `${brand.schemaUrl}/oferta/implantologia` },
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
                        "name": brand.name,
                        "url": brand.schemaUrl,
                        "potentialAction": {
                            "@type": "SearchAction",
                            "target": `${brand.schemaUrl}/baza-wiedzy?q={search_term_string}`,
                            "query-input": "required name=search_term_string"
                        }
                    })
                }}
            />
        </>
    );
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // Read locale from NEXT_LOCALE cookie (set by LanguageSwitcher)
    const locale = await getLocale();
    const rawMessages = await getMessages();

    // Recursively sanitize all translation strings for demo mode
    function deepSanitize(obj: any): any {
        if (typeof obj === 'string') return demoSanitize(obj);
        if (Array.isArray(obj)) return obj.map(deepSanitize);
        if (obj && typeof obj === 'object') {
            const result: any = {};
            for (const key of Object.keys(obj)) result[key] = deepSanitize(obj[key]);
            return result;
        }
        return obj;
    }
    const messages = isDemoMode ? deepSanitize(rawMessages) : rawMessages;

    return (
        <html lang={locale}>
            <body className={`${inter.variable} ${playfair.variable}`} style={isDemoMode ? { paddingTop: '2rem' } : undefined}>
                {/* Blocking script: Apply cached theme CSS vars BEFORE React hydrates to prevent flash */}
                <script dangerouslySetInnerHTML={{ __html: `
                    (function(){
                        try {
                            var c = null;
                            var raw = localStorage.getItem('densflow_theme');
                            if (raw) {
                                var t = JSON.parse(raw);
                                if (t && t.colors) c = t.colors;
                            }
                            ${isDemoMode ? `
                            if (!c) {
                                c = {background:'#FAFAFA',surface:'#FFFFFF',surfaceHover:'#F5F0EB',primary:'#9D7D5D',primaryLight:'#B89B7A',primaryDark:'#7A5F42',textMain:'#1A1A1A',textMuted:'#6B6B6B',success:'#22C55E',error:'#EF4444'};
                            }` : ''}
                            if (!c) return;
                            var r = document.documentElement.style;
                            function hexRgb(h) {
                                h = h.replace('#','');
                                return parseInt(h.substring(0,2),16)+','+parseInt(h.substring(2,4),16)+','+parseInt(h.substring(4,6),16);
                            }
                            if(c.background) r.setProperty('--color-background', c.background);
                            if(c.surface) r.setProperty('--color-surface', c.surface);
                            if(c.surfaceHover) r.setProperty('--color-surface-hover', c.surfaceHover);
                            if(c.primary) { r.setProperty('--color-primary', c.primary); r.setProperty('--color-primary-rgb', hexRgb(c.primary)); }
                            if(c.primaryLight) r.setProperty('--color-primary-light', c.primaryLight);
                            if(c.primaryDark) { r.setProperty('--color-primary-dark', c.primaryDark); r.setProperty('--color-primary-dark-rgb', hexRgb(c.primaryDark)); }
                            if(c.textMain) r.setProperty('--color-text-main', c.textMain);
                            if(c.textMuted) r.setProperty('--color-text-muted', c.textMuted);
                            if(c.success) r.setProperty('--color-success', c.success);
                            if(c.error) r.setProperty('--color-error', c.error);
                        } catch(e){}
                    })();
                ` }} />
                <DemoBanner />
                <SchemaOrg />
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <VisualEditorProvider>
                        <CartProvider>
                            <AssistantProvider>
                                <SimulatorProvider>
                                    <OpinionProvider>
                                        <ThemeLayout>
                                            {children}
                                            <PageOverridesApplier />
                                        </ThemeLayout>
                                    </OpinionProvider>
                                </SimulatorProvider>
                            </AssistantProvider>
                        </CartProvider>
                        <AdminFloatingBar />
                        <VisualEditorOverlay />
                    </VisualEditorProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
