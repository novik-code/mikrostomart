import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { isDemoMode } from "@/lib/demoMode";
import { brand } from "@/lib/brandConfig";
import { getOgLocale } from "@/lib/seo";
import { fetchYouTubeVideosForSchema, buildVideoObjectSchema } from "@/lib/youtubeSchema";
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
        title: 'Stomatolog Opole | Mikrostomart — M.Sc. RWTH Aachen, mikroskop ZEISS',
        description: 'Mikrostomart — dr Marcin Nowosielski, M.Sc. RWTH Aachen. Implanty, leczenie kanałowe pod mikroskopem ZEISS, laser Fotona. Opole, od 2016.',
        ogTitle: 'Mikrostomart Opole — Stomatologia premium | M.Sc. RWTH Aachen',
        ogDescription: 'Dr Marcin Nowosielski, drugi w Polsce z Master of Science RWTH Aachen. Mikroskop ZEISS, laser Fotona, implantologia cyfrowa. Opole.',
    },
    en: {
        title: 'Dentist in Opole, Poland | Mikrostomart — M.Sc. RWTH Aachen',
        description: 'Mikrostomart — Dr Marcin Nowosielski, M.Sc. RWTH Aachen. Dental implants, microscopic root canal, Fotona laser. Opole, Poland — since 2016.',
        ogTitle: 'Mikrostomart Opole — Premium Dental Clinic | M.Sc. RWTH Aachen',
        ogDescription: 'Dr Marcin Nowosielski — second dentist in Poland with Master of Science from RWTH Aachen. ZEISS microscope, Fotona laser, digital implantology.',
    },
    de: {
        title: 'Zahnarzt in Opole, Polen | Mikrostomart — M.Sc. RWTH Aachen',
        description: 'Mikrostomart — Dr. Marcin Nowosielski, M.Sc. RWTH Aachen. Zahnimplantate, mikroskopische Wurzelkanalbehandlung, Fotona-Laser. Opole — seit 2016.',
        ogTitle: 'Mikrostomart Opole — Premium-Zahnarztpraxis | M.Sc. RWTH Aachen',
        ogDescription: 'Dr. Marcin Nowosielski — zweiter Zahnarzt in Polen mit Master of Science der RWTH Aachen. ZEISS-Mikroskop, Fotona-Laser, digitale Implantologie.',
    },
    ua: {
        title: 'Стоматолог в Ополе, Польща | Mikrostomart — M.Sc. RWTH Aachen',
        description: 'Mikrostomart — др. Марцін Новосельський, M.Sc. RWTH Aachen. Імпланти, ендодонтія під мікроскопом ZEISS, лазер Fotona. Ополе, з 2016.',
        ogTitle: 'Mikrostomart Ополе — Преміум-стоматологія | M.Sc. RWTH Aachen',
        ogDescription: 'Др. Марцін Новосельський — другий стоматолог у Польщі з Master of Science RWTH Aachen. Мікроскоп ZEISS, лазер Fotona, цифрова імплантологія.',
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

    // VideoObject schema dla feedu YouTube (real uploadDate z YouTube API, cache 24h,
    // graceful — brak schematu jeśli API niedostępne). Patrz @/lib/youtubeSchema.
    const ytVideos = await fetchYouTubeVideosForSchema();
    const videoSchema = ytVideos.length ? buildVideoObjectSchema(ytVideos) : null;

    return (
        <>
            {videoSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }}
                />
            )}
            <HomeClient />
        </>
    );
}
