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

    const content = (
        <>
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
