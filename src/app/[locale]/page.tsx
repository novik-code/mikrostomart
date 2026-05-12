import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { isDemoMode } from "@/lib/demoMode";
import { brand } from "@/lib/brandConfig";
import { getOgLocale } from "@/lib/seo";
import HomeClient from "./HomeClient";

// Per-locale SEO metadata for the homepage. The interactive content lives in HomeClient
// (a "use client" component); this wrapper exists solely so we can export metadata,
// which is not allowed in client components.
//
// title.absolute bypasses the template `%s | Mikrostomart - Dentysta Opole` from root
// layout — homepage doesn't need the brand suffix duplicated.
// brandConfig.titleDefault stays 'Mikrostomart' (PWA install name on iOS).

// Meta description SEO best practice: 150–160 chars (Google truncates longer ones in SERP).
// Each locale below stays within ~155 chars while preserving primary keywords + CTA.
const HOMEPAGE_SEO: Record<string, { title: string; description: string; ogTitle: string; ogDescription: string }> = {
    pl: {
        title: 'Stomatolog, dentysta Opole | Gabinet stomatologiczny Mikrostomart',
        description: 'Mikrostomart — gabinet stomatologiczny w Opolu. Implanty, leczenie kanałowe pod mikroskopem, estetyka, ortodoncja. Umów wizytę: 570 270 470.',
        ogTitle: 'Stomatolog, dentysta Opole | Mikrostomart',
        ogDescription: 'Nowoczesny gabinet stomatologiczny w Opolu. Implanty, mikroskopia, stomatologia estetyczna. Umów wizytę.',
    },
    en: {
        title: 'Dentist in Opole, Poland | Mikrostomart Dental Clinic',
        description: 'Mikrostomart — modern dental clinic in Opole, Poland. Dental implants, microscopic root canal, aesthetic dentistry, orthodontics. Book: +48 570 270 470.',
        ogTitle: 'Dentist in Opole | Mikrostomart',
        ogDescription: 'Modern dental clinic in Opole, Poland. Implants, microscopy, aesthetic dentistry. Book your appointment.',
    },
    de: {
        title: 'Zahnarzt in Opole, Polen | Zahnklinik Mikrostomart',
        description: 'Mikrostomart — moderne Zahnklinik in Opole, Polen. Implantate, mikroskopische Wurzelkanalbehandlung, ästhetische Zahnmedizin. Termin: +48 570 270 470.',
        ogTitle: 'Zahnarzt in Opole | Mikrostomart',
        ogDescription: 'Moderne Zahnklinik in Opole, Polen. Implantate, Mikroskopie, ästhetische Zahnmedizin. Termin online buchen.',
    },
    ua: {
        title: 'Стоматолог в Ополе, Польща | Стоматологічна клініка Mikrostomart',
        description: 'Mikrostomart — сучасна стоматологічна клініка в Ополе. Імпланти, мікроскопічне ендодонтичне лікування, естетика, ортодонтія. Запис: +48 570 270 470.',
        ogTitle: 'Стоматолог в Ополе | Mikrostomart',
        ogDescription: 'Сучасна стоматологічна клініка в Ополе. Імпланти, мікроскопія, естетична стоматологія. Запис на прийом.',
    },
};

const DEMO_SEO = {
    title: 'Klinika Demo — Demonstracja systemu DensFlow.Ai',
    description: 'Demo systemu zarządzania gabinetem stomatologicznym DensFlow.Ai. Zobacz w działaniu kalendarz wizyt, e-kartę pacjenta, kontrolę czasu pracy, AI assistant.',
    ogTitle: 'Klinika Demo — Demonstracja DensFlow.Ai',
    ogDescription: 'Demo systemu zarządzania gabinetem stomatologicznym DensFlow.Ai.',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const seo = isDemoMode ? DEMO_SEO : (HOMEPAGE_SEO[locale] || HOMEPAGE_SEO.pl);

    return {
        title: { absolute: seo.title },
        description: seo.description,
        openGraph: {
            // J-5 follow-up (2026-05-12): Next 16 fully REPLACES openGraph
            // when a child segment declares it (not the per-key shallow merge
            // I assumed in J-4). So the J-3 og:image, og:type, og:site_name
            // declared at the root layout were vanishing on homepage. Every
            // field now lives here explicitly. Verified post-fix that all
            // og:* tags appear in /, /en, /de, /ua HTML.
            type: 'website',
            title: seo.ogTitle,
            description: seo.ogDescription,
            locale: getOgLocale(locale),
            siteName: brand.ogSiteName,
            url: locale === 'pl' ? brand.appUrl : `${brand.appUrl}/${locale}`,
            images: [{
                url: '/og-home.webp',
                width: 1200,
                height: 630,
                alt: brand.ogImageAlt,
            }],
        },
        twitter: {
            card: 'summary_large_image',
            title: seo.ogTitle,
            description: seo.ogDescription,
            images: ['/og-home.webp'],
        },
        alternates: {
            canonical: locale === 'pl' ? '/' : `/${locale}`,
            languages: {
                'pl': '/',
                'en': '/en',
                'de': '/de',
                // hreflang uses ISO 639-1 'uk' for Ukrainian language while our URL prefix is 'ua' (Ukraine country)
                'uk': '/ua',
                'x-default': '/',
            },
        },
    };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <HomeClient />;
}
