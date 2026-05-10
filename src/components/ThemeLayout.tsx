"use client";

import { ThemeProvider, useTheme, usePresetId } from '@/context/ThemeContext';
import { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Faza G4 (2026-05-10): CookieConsent przeniesiony do root layout (server component
// czytający HTTP cookie). Theme feature flag `f.cookieConsent` nie jest już
// honorowany — banner jest teraz infrastrukturą prawnie wymaganą, nie opcją theme.

// Faza G4 (2026-05-10): SplashScreen wyłączony globalnie, zostaje wyłącznie do
// opt-in przez ThemeEditor (wymaga jawnego ustawienia w localStorage). Powód:
// 6-sekundowa cinematic intro animation na pierwszym wejściu sesji była głównym
// wkładem do mobile LCP 6.0s (CookieConsent jako LCP element musiał czekać na
// splash sequence). Dla returning visitors splash był pomijany ale dla nowych
// = pełne 6s blank screen przed widocznym content. Marcin zaakceptował kasację.
//
// Komponent SplashScreen.tsx nie jest usunięty — może być reaktywowany w
// przyszłości przez ThemeEditor jeśli potrzeba wróci.

// Faza C (SEO/perf): non-critical UI lazy-loaded after hydration to shrink initial bundle.
// All wrapped components are conditional or user-triggered (modals, banners, teasers).
// SplashScreen stays static because it wraps `children` — dynamic with ssr:false would
// blank the SSR HTML.
//
// Faza E (2026-05-09): CookieConsent przeniesiony z dynamic z powrotem do static.
// PSI mobile pokazał LCP=25s a desktop LCP=5.2s z LCP element = "Strona korzysta z
// plików cookies..." — czyli CookieConsent banner. Dynamic z ssr:false sprawiał że
// musiał czekać na hydration + lazy chunk → stał się LCP element. Static import
// ładuje go w SSR HTML od razu, więc nie blokuje wskaźnika.
const BackgroundVideo = dynamic(() => import('@/components/BackgroundVideo'), { ssr: false });
const AssistantTeaser = dynamic(() => import('@/components/AssistantTeaser'), { ssr: false });
const PWAInstallPrompt = dynamic(() => import('@/components/PWAInstallPrompt'), { ssr: false });
const SimulatorModal = dynamic(() => import('@/components/SimulatorModal'), { ssr: false });
const OpinionSurvey = dynamic(() => import('@/components/OpinionSurvey'), { ssr: false });

function ThemedContent({ children }: { children: ReactNode }) {
    const { theme } = useTheme();
    const f = theme.features;
    const presetId = usePresetId();

    // Standalone templates render their own nav/footer — skip global ones
    const STANDALONE_TEMPLATES = ['dental-luxe', 'fresh-smile', 'nordic-dental', 'warm-care'];
    const skipGlobalChrome = STANDALONE_TEMPLATES.includes(presetId);

    // Dynamically load Google Fonts ONLY for custom theme fonts.
    // Inter + Playfair Display are already statically loaded via next/font in
    // app/layout.tsx (preloaded, optimized, self-hosted). Loading them again here
    // as a runtime <link> caused FOUT (Flash of Unstyled Text) — browser would
    // render with the next/font version, then re-flow when the duplicate
    // Google Fonts CDN copy resolved. Major contributor to the "flicker on load"
    // issue reported 2026-05-09.
    const STATIC_FONTS = new Set(['Inter', 'Playfair Display']);
    const customFonts = [theme.typography.fontBody, theme.typography.fontHeading]
        .filter((f) => f && !STATIC_FONTS.has(f));
    const customFontsUnique = Array.from(new Set(customFonts));
    const needsCustomFontLoad = customFontsUnique.length > 0;
    const googleFontsUrl = needsCustomFontLoad
        ? `https://fonts.googleapis.com/css2?${customFontsUnique.map((f) => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700`).join('&')}&display=swap`
        : null;

    const content = (
        <>
            {/* Dynamic Google Font loader — only for non-default theme fonts */}
            {googleFontsUrl && (
                <>
                    {/* eslint-disable-next-line @next/next/no-page-custom-font */}
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                    {/* eslint-disable-next-line @next/next/no-page-custom-font */}
                    <link rel="stylesheet" href={googleFontsUrl} />
                </>
            )}
            {/* Font CSS variables — only override defaults (next/font Inter+Playfair) when theme uses custom fonts */}
            {needsCustomFontLoad && (
                <style>{`
                    :root {
                        --font-body: '${theme.typography.fontBody}', var(--font-sans);
                        --font-heading: '${theme.typography.fontHeading}', var(--font-heading-fallback, serif);
                    }
                    body { font-family: var(--font-body); }
                    h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); }
                `}</style>
            )}
            {!skipGlobalChrome && f.backgroundVideo && <BackgroundVideo videoId={theme.hero.backgroundVideoId} />}
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                {!skipGlobalChrome && <Navbar />}
                {children}
                {f.assistantTeaser && <AssistantTeaser />}
                {f.pwaInstallPrompt && <PWAInstallPrompt />}
                {!skipGlobalChrome && <Footer />}
                {f.simulatorModal && <SimulatorModal />}
                {f.opinionSurvey && <OpinionSurvey />}
            </div>
        </>
    );

    // Faza G4 (2026-05-10): SplashScreen disabled globally — return content directly.
    // To re-enable: edit ThemeContext DEFAULT_THEME.features.splashScreen + uncomment
    // the SplashScreen import and wrapper above.
    return content;
}

export default function ThemeLayout({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider>
            <ThemedContent>{children}</ThemedContent>
        </ThemeProvider>
    );
}
