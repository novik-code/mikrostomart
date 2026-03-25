"use client";

import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { ReactNode } from 'react';
import BackgroundVideo from '@/components/BackgroundVideo';
import CookieConsent from '@/components/CookieConsent';
import SplashScreen from '@/components/SplashScreen';
import AssistantTeaser from '@/components/AssistantTeaser';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import SimulatorModal from '@/components/SimulatorModal';
import OpinionSurvey from '@/components/OpinionSurvey';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

function ThemedContent({ children }: { children: ReactNode }) {
    const { theme } = useTheme();
    const f = theme.features;

    // Dynamically load Google Fonts based on theme typography
    const fontsToLoad = new Set([theme.typography.fontBody, theme.typography.fontHeading]);
    const googleFontsUrl = `https://fonts.googleapis.com/css2?${[...fontsToLoad].map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700`).join('&')}&display=swap`;

    const content = (
        <>
            {/* Dynamic Google Font loader */}
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link rel="stylesheet" href={googleFontsUrl} />
            <style>{`
                :root {
                    --font-body: '${theme.typography.fontBody}', sans-serif;
                    --font-heading: '${theme.typography.fontHeading}', sans-serif;
                }
                body { font-family: var(--font-body); }
                h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); }
            `}</style>
            {f.backgroundVideo && <BackgroundVideo videoId={theme.hero.backgroundVideoId} />}
            {f.cookieConsent && <CookieConsent />}
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Navbar />
                {children}
                {f.assistantTeaser && <AssistantTeaser />}
                {f.pwaInstallPrompt && <PWAInstallPrompt />}
                <Footer />
                {f.simulatorModal && <SimulatorModal />}
                {f.opinionSurvey && <OpinionSurvey />}
            </div>
        </>
    );

    if (f.splashScreen) {
        return <SplashScreen>{content}</SplashScreen>;
    }

    return content;
}

export default function ThemeLayout({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider>
            <ThemedContent>{children}</ThemedContent>
        </ThemeProvider>
    );
}
