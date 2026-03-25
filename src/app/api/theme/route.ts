import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// DensFlow Light preset — returned as default for demo mode (LePerle-inspired)
const DENSFLOW_LIGHT_PRESET = {
    colors: {
        background: '#FAFAFA', surface: '#FFFFFF', surfaceHover: '#F5F0EB',
        primary: '#9D7D5D', primaryLight: '#B89B7A', primaryDark: '#7A5F42',
        textMain: '#1A1A1A', textMuted: '#6B6B6B', success: '#22C55E', error: '#EF4444',
    },
    typography: { fontBody: 'DM Sans', fontHeading: 'Outfit', baseFontSize: 16, headingScale: 1.05, lineHeight: 1.7 },
    layout: { containerMaxWidth: 1200, borderRadius: 'rounded', spacingScale: 1.1 },
    animations: { enableScrollAnimations: true, enablePageTransitions: true, animationSpeed: 0.9 },
    hero: { minHeight: '85vh', backgroundVideoId: '', backgroundVideoOpacity: 0 },
    navbar: { style: 'glassmorphism', logoText: 'DENSFLOW' },
    features: {
        splashScreen: true,
        splashScreenConfig: {
            enabled: true, animationType: 'fade', duration: 3, frequency: 'once_session',
            sections: { public: true, admin: false, employee: false, patient: false },
        },
        backgroundVideo: false, assistantTeaser: true, pwaInstallPrompt: true, cookieConsent: true,
        simulatorModal: false, opinionSurvey: false,
        shop: false, blog: false, faq: false, knowledgeBase: false, treatmentCalculator: false,
        metamorphoses: true, youtubeSection: false, googleReviews: true, painMap: false,
        selfie: false, comparator: false,
    },
};

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Public GET — returns current theme config
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'theme')
            .single();

        if (error || !data) {
            // No theme saved — return demo preset or empty
            return NextResponse.json(isDemo ? DENSFLOW_LIGHT_PRESET : {}, {
                headers: { 'Cache-Control': 'no-store, max-age=0' }
            });
        }

        return NextResponse.json(data.value, {
            headers: { 'Cache-Control': 'no-store, max-age=0' }
        });
    } catch {
        return NextResponse.json(isDemo ? DENSFLOW_LIGHT_PRESET : {});
    }
}
