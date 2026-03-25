import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// DensFlow Light preset — returned as default for demo mode
const DENSFLOW_LIGHT_PRESET = {
    colors: {
        background: '#F8FAFD', surface: '#FFFFFF', surfaceHover: '#EDF2F9',
        primary: '#4F8FE6', primaryLight: '#7EB3F7', primaryDark: '#2D6BC4',
        textMain: '#1E293B', textMuted: '#64748B', success: '#22C55E', error: '#EF4444',
    },
    typography: { fontBody: 'DM Sans', fontHeading: 'Outfit', baseFontSize: 16, headingScale: 1.0, lineHeight: 1.6 },
    layout: { containerMaxWidth: 1200, borderRadius: 'rounded', spacingScale: 1.0 },
    animations: { enableScrollAnimations: true, enablePageTransitions: true, animationSpeed: 0.8 },
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
        shop: true, blog: true, faq: true, knowledgeBase: true, treatmentCalculator: true,
        metamorphoses: true, youtubeSection: false, googleReviews: true, painMap: true,
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
