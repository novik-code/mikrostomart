"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { demoSanitize } from '@/lib/brandConfig';

// ===================== TYPES =====================

export interface ThemeColors {
    background: string;
    surface: string;
    surfaceHover: string;
    primary: string;
    primaryLight: string;
    primaryDark: string;
    textMain: string;
    textMuted: string;
    success: string;
    error: string;
}

export interface ThemeTypography {
    fontBody: string;
    fontHeading: string;
    baseFontSize: number;
    headingScale: number;
    lineHeight: number;
}

export interface ThemeLayout {
    containerMaxWidth: number;
    borderRadius: 'sharp' | 'soft' | 'rounded';
    spacingScale: number;
}

export interface ThemeAnimations {
    enableScrollAnimations: boolean;
    enablePageTransitions: boolean;
    animationSpeed: number;
}

export interface ThemeHero {
    minHeight: string;
    backgroundVideoId: string;
    backgroundVideoOpacity: number;
}

export interface ThemeNavbar {
    style: 'transparent' | 'solid' | 'glassmorphism';
    layout: 'hamburger' | 'inline';
    logoText: string;
}

export interface SplashScreenConfig {
    enabled: boolean;
    animationType: 'particles' | 'fade' | 'slide' | 'none';
    duration: number; // seconds (1-10)
    frequency: 'always' | 'once_session' | 'once_ever' | 'daily' | 'weekly';
    sections: {
        public: boolean;
        admin: boolean;
        employee: boolean;
        patient: boolean;
    };
}

export interface ThemeFeatures {
    splashScreen: boolean; // kept for backward compat
    splashScreenConfig: SplashScreenConfig;
    backgroundVideo: boolean;
    assistantTeaser: boolean;
    pwaInstallPrompt: boolean;
    cookieConsent: boolean;
    simulatorModal: boolean;
    opinionSurvey: boolean;
    shop: boolean;
    blog: boolean;
    faq: boolean;
    knowledgeBase: boolean;
    treatmentCalculator: boolean;
    metamorphoses: boolean;
    youtubeSection: boolean;
    googleReviews: boolean;
    painMap: boolean;
    selfie: boolean;
    comparator: boolean;
}

export interface ThemeConfig {
    colors: ThemeColors;
    typography: ThemeTypography;
    layout: ThemeLayout;
    animations: ThemeAnimations;
    hero: ThemeHero;
    navbar: ThemeNavbar;
    features: ThemeFeatures;
}

// ===================== DEFAULTS =====================

export const DEFAULT_THEME: ThemeConfig = {
    colors: {
        background: '#08090a',
        surface: '#121418',
        surfaceHover: '#1c1f26',
        primary: '#dcb14a',
        primaryLight: '#f0c975',
        primaryDark: '#a68531',
        textMain: '#f3f4f6',
        textMuted: '#9ca3af',
        success: '#10b981',
        error: '#ef4444',
    },
    typography: {
        fontBody: 'Inter',
        fontHeading: 'Playfair Display',
        baseFontSize: 16,
        headingScale: 1.0,
        lineHeight: 1.6,
    },
    layout: {
        containerMaxWidth: 1200,
        borderRadius: 'soft',
        spacingScale: 1.0,
    },
    animations: {
        enableScrollAnimations: true,
        enablePageTransitions: true,
        animationSpeed: 1.0,
    },
    hero: {
        minHeight: '90vh',
        backgroundVideoId: 'vGAu6rdJ8WQ',
        backgroundVideoOpacity: 0.3,
    },
    navbar: {
        style: 'transparent',
        layout: 'hamburger',
        logoText: 'MIKROSTOMART',
    },
    features: {
        splashScreen: true,
        splashScreenConfig: {
            enabled: true,
            animationType: 'particles',
            duration: 6,
            frequency: 'once_session',
            sections: { public: true, admin: false, employee: false, patient: false },
        },
        backgroundVideo: true,
        assistantTeaser: true,
        pwaInstallPrompt: true,
        cookieConsent: true,
        simulatorModal: true,
        opinionSurvey: true,
        shop: true,
        blog: true,
        faq: true,
        knowledgeBase: true,
        treatmentCalculator: true,
        metamorphoses: true,
        youtubeSection: true,
        googleReviews: true,
        painMap: true,
        selfie: true,
        comparator: true,
    },
};

// ===================== PRESETS =====================

export const THEME_PRESETS: Record<string, Partial<ThemeConfig>> = {
    'default-gold': {},

    // Inspired by LePerle.pl — boutique premium, white/gold, minimal features
    // Clean white background, gold accents, floating nav, team & opinie focus
    'densflow-light': {
        colors: {
            ...DEFAULT_THEME.colors,
            primary: '#9D7D5D',       // warm gold/bronze like LePerle
            primaryLight: '#B89B7A',
            primaryDark: '#7A5F42',
            background: '#FAFAFA',     // near-white
            surface: '#FFFFFF',
            surfaceHover: '#F5F0EB',   // warm cream hover
            textMain: '#1A1A1A',       // crisp black text
            textMuted: '#6B6B6B',
            success: '#22C55E',
            error: '#EF4444',
        },
        typography: {
            fontBody: 'Urbanist',      // LePerle uses Urbanist
            fontHeading: 'Urbanist',   // same for headings
            baseFontSize: 16,
            headingScale: 1.1,
            lineHeight: 1.7,
        },
        layout: {
            containerMaxWidth: 1200,
            borderRadius: 'rounded',   // LePerle uses 40px rounded cards
            spacingScale: 1.2,         // generous spacing like LePerle
        },
        animations: {
            enableScrollAnimations: true,
            enablePageTransitions: true,
            animationSpeed: 0.9,
        },
        hero: {
            minHeight: '85vh',
            backgroundVideoId: '',     // LePerle: no video, photo hero
            backgroundVideoOpacity: 0,
        },
        navbar: {
            style: 'solid',            // LePerle: white solid navbar
            layout: 'inline',          // LePerle: logo-left, links-center, CTA-right
            logoText: 'DENSFLOW',
        },
        features: {
            ...DEFAULT_THEME.features,
            splashScreen: true,
            splashScreenConfig: {
                enabled: true,
                animationType: 'fade',
                duration: 3,
                frequency: 'once_session',
                sections: { public: true, admin: false, employee: false, patient: false },
            },
            backgroundVideo: false,
            assistantTeaser: true,
            pwaInstallPrompt: true,
            cookieConsent: true,
            // LePerle: minimal — no shop, no FAQ, no blog, no pain map, no selfie
            simulatorModal: false,
            opinionSurvey: false,
            shop: false,
            blog: false,
            faq: false,
            knowledgeBase: false,
            treatmentCalculator: false,
            metamorphoses: true,      // LePerle highlights metamorfozy
            youtubeSection: false,
            googleReviews: true,      // LePerle shows client reviews
            painMap: false,
            selfie: false,
            comparator: false,
        },
    },

    // Inspired by NawrockiClinic.com — ultra-luxury dark cinema with gold
    // Full-screen video, transparent nav, thin elegant sans, ALL features maxed
    'dental-luxe': {
        colors: {
            ...DEFAULT_THEME.colors,
            primary: '#C5A55A',        // rich gold like Nawrocki
            primaryLight: '#D4BA78',
            primaryDark: '#9A7E3B',
            background: '#0A0A0A',     // deep black
            surface: '#141414',
            surfaceHover: '#1E1E1E',
            textMain: '#F5F5F5',       // crisp white on black
            textMuted: '#8A8A8A',
            success: '#10B981',
            error: '#F43F5E',
        },
        typography: {
            fontBody: 'Inter',          // thin modern sans like Nawrocki
            fontHeading: 'Cormorant Garamond', // elegant serif for luxury
            baseFontSize: 17,
            headingScale: 1.2,         // large dramatic headings
            lineHeight: 1.75,
        },
        layout: {
            containerMaxWidth: 1400,   // wide cinematic layout
            borderRadius: 'soft',
            spacingScale: 1.3,         // generous spacing = luxury feel
        },
        animations: {
            enableScrollAnimations: true,
            enablePageTransitions: true,
            animationSpeed: 1.2,       // slow elegant animations
        },
        hero: {
            minHeight: '100vh',        // Nawrocki: full viewport video
            backgroundVideoId: 'vGAu6rdJ8WQ',
            backgroundVideoOpacity: 0.35,
        },
        navbar: {
            style: 'transparent',      // Nawrocki: transparent nav over video
            layout: 'hamburger',
            logoText: 'DENTAL LUXE',
        },
        features: {
            ...DEFAULT_THEME.features,
            splashScreen: true,
            splashScreenConfig: {
                enabled: true,
                animationType: 'particles', // dramatic particle splash
                duration: 5,
                frequency: 'once_session',
                sections: { public: true, admin: false, employee: false, patient: false },
            },
            backgroundVideo: true,     // Nawrocki: full video bg
            assistantTeaser: true,
            pwaInstallPrompt: true,
            cookieConsent: true,
            // Nawrocki: everything on — premium full experience
            simulatorModal: true,
            opinionSurvey: true,
            shop: true,               // Nawrocki has voucher shop
            blog: true,               // Nawrocki has blog
            faq: true,
            knowledgeBase: true,
            treatmentCalculator: true,
            metamorphoses: true,       // Nawrocki highlights metamorfozy
            youtubeSection: true,      // Nawrocki has YouTube
            googleReviews: true,
            painMap: true,
            selfie: true,
            comparator: true,
        },
    },

    // Inspired by AmbasadaUsmiechu.pl — community-friendly, white/lavender
    // Wide service grid, educational feel, FAQ & blog prominent, no splash
    'fresh-smile': {
        colors: {
            ...DEFAULT_THEME.colors,
            primary: '#8B5CF6',        // lavender/purple like Ambasada
            primaryLight: '#A78BFA',
            primaryDark: '#7C3AED',
            background: '#FFFFFF',     // pure white
            surface: '#FAFAFE',
            surfaceHover: '#F3F0FF',   // light lavender hover
            textMain: '#1F1F1F',
            textMuted: '#6B7280',
            success: '#059669',
            error: '#DC2626',
        },
        typography: {
            fontBody: 'Poppins',       // Ambasada uses Poppins-like
            fontHeading: 'Montserrat', // bold geometric headings
            baseFontSize: 15,
            headingScale: 0.95,
            lineHeight: 1.6,
        },
        layout: {
            containerMaxWidth: 1200,
            borderRadius: 'rounded',
            spacingScale: 0.95,        // compact, informational
        },
        animations: {
            enableScrollAnimations: true,
            enablePageTransitions: false, // fast, no page transitions
            animationSpeed: 0.7,
        },
        hero: {
            minHeight: '70vh',         // Ambasada: shorter, informational hero
            backgroundVideoId: '',
            backgroundVideoOpacity: 0,
        },
        navbar: {
            style: 'solid',           // Ambasada: solid white navbar
            layout: 'hamburger',
            logoText: 'FRESH SMILE',
        },
        features: {
            ...DEFAULT_THEME.features,
            // Ambasada: No splash, educational community feel
            splashScreen: false,
            splashScreenConfig: {
                enabled: false,
                animationType: 'none',
                duration: 2,
                frequency: 'once_ever',
                sections: { public: false, admin: false, employee: false, patient: false },
            },
            backgroundVideo: false,
            assistantTeaser: false,    // Ambasada: no float widgets
            pwaInstallPrompt: true,
            cookieConsent: true,
            simulatorModal: false,
            opinionSurvey: false,
            // Ambasada: education-heavy = FAQ + blog + knowledge base
            shop: false,              // no shop
            blog: true,               // Ambasada has expert blog
            faq: true,                // Ambasada has prominent FAQ
            knowledgeBase: true,       // educational content
            treatmentCalculator: true,
            metamorphoses: false,      // Ambasada doesn't emphasize metamorfozy
            youtubeSection: false,
            googleReviews: true,       // Ambasada shows reviews
            painMap: false,
            selfie: false,
            comparator: true,         // Ambasada: service comparison
        },
    },

    // Inspired by OneandonlyClinic.pl — butique elegance, sand/serif
    // Serif headings, earthy tones, metamorfozy + holistic focus, calm sophistication
    'nordic-dental': {
        colors: {
            ...DEFAULT_THEME.colors,
            primary: '#8B7355',        // sandy/earthy brown like One&Only
            primaryLight: '#A69178',
            primaryDark: '#6D5840',
            background: '#F7F5F2',     // warm marble/sand white
            surface: '#FFFFFF',
            surfaceHover: '#EDE8E2',   // warm sand hover
            textMain: '#2C2420',       // near-black brown
            textMuted: '#7A6E64',
            success: '#0D9488',
            error: '#E11D48',
        },
        typography: {
            fontBody: 'Lato',          // clean readable sans
            fontHeading: 'Playfair Display', // elegant serif like One&Only
            baseFontSize: 16,
            headingScale: 1.1,
            lineHeight: 1.7,
        },
        layout: {
            containerMaxWidth: 1200,
            borderRadius: 'soft',     // subtle, not aggressive
            spacingScale: 1.15,        // generous, calm spacing
        },
        animations: {
            enableScrollAnimations: true,
            enablePageTransitions: true,
            animationSpeed: 1.0,
        },
        hero: {
            minHeight: '90vh',        // One&Only: near-full hero
            backgroundVideoId: '',
            backgroundVideoOpacity: 0,
        },
        navbar: {
            style: 'glassmorphism',   // One&Only: integrated top bar
            layout: 'hamburger',
            logoText: 'NORDIC DENTAL',
        },
        features: {
            ...DEFAULT_THEME.features,
            // One&Only: no splash, calm entry, focused on aesthetics
            splashScreen: false,
            splashScreenConfig: {
                enabled: false,
                animationType: 'none',
                duration: 2,
                frequency: 'once_ever',
                sections: { public: false, admin: false, employee: false, patient: false },
            },
            backgroundVideo: false,
            assistantTeaser: true,
            pwaInstallPrompt: false,
            cookieConsent: true,
            // One&Only: focused portfolio — metamorfozy + estetyka, no shop/blog/FAQ
            simulatorModal: true,      // smile simulator fits aesthetic focus
            opinionSurvey: false,
            shop: false,
            blog: false,
            faq: false,
            knowledgeBase: false,
            treatmentCalculator: true,
            metamorphoses: true,       // One&Only: strong metamorfozy focus
            youtubeSection: false,
            googleReviews: true,       // One&Only shows patient reviews
            painMap: false,
            selfie: false,
            comparator: false,
        },
    },

    // Inspired by MalottkiClinic.pl — warm, approachable, full-content
    // Beige/cream background, blue accents, rounded, all content sections visible
    'warm-care': {
        colors: {
            ...DEFAULT_THEME.colors,
            primary: '#3B82F6',        // blue accent like Malottki's CTA
            primaryLight: '#60A5FA',
            primaryDark: '#2563EB',
            background: '#F5EDE4',     // warm beige/cream like Malottki
            surface: '#FFFFFF',
            surfaceHover: '#EDE5DB',
            textMain: '#2D1F1A',       // warm dark brown
            textMuted: '#7A6A5F',
            success: '#16A34A',
            error: '#DC2626',
        },
        typography: {
            fontBody: 'Open Sans',
            fontHeading: 'Montserrat', // geometric sans like Malottki
            baseFontSize: 16,
            headingScale: 1.0,
            lineHeight: 1.65,
        },
        layout: {
            containerMaxWidth: 1200,
            borderRadius: 'rounded',   // Malottki: large border radius
            spacingScale: 1.0,
        },
        animations: {
            enableScrollAnimations: true,
            enablePageTransitions: true,
            animationSpeed: 0.9,
        },
        hero: {
            minHeight: '85vh',
            backgroundVideoId: '',     // Malottki: photo hero, no video
            backgroundVideoOpacity: 0,
        },
        navbar: {
            style: 'solid',           // Malottki: solid navbar
            layout: 'hamburger',
            logoText: 'WARM CARE',
        },
        features: {
            ...DEFAULT_THEME.features,
            // Malottki: no splash screen
            splashScreen: false,
            splashScreenConfig: {
                enabled: false,
                animationType: 'none',
                duration: 2,
                frequency: 'once_ever',
                sections: { public: false, admin: false, employee: false, patient: false },
            },
            backgroundVideo: false,
            assistantTeaser: true,
            pwaInstallPrompt: true,
            cookieConsent: true,
            // Malottki: content-rich = blog + FAQ + opinie + metamorfozy
            simulatorModal: false,
            opinionSurvey: true,
            shop: false,
            blog: true,                // Malottki has active blog
            faq: true,                 // Malottki has prominent FAQ
            knowledgeBase: true,
            treatmentCalculator: true,
            metamorphoses: true,       // Malottki highlights metamorfozy
            youtubeSection: false,
            googleReviews: true,       // Malottki shows Google reviews
            painMap: true,
            selfie: false,
            comparator: false,
        },
    },
};

// ===================== CONTEXT =====================

interface ThemeContextValue {
    theme: ThemeConfig;
    isLoaded: boolean;
    setTheme: React.Dispatch<React.SetStateAction<ThemeConfig>>;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: DEFAULT_THEME,
    isLoaded: false,
    setTheme: () => {},
});

export function useTheme() {
    return useContext(ThemeContext);
}

// ===================== APPLY THEME =====================

function deepMerge<T extends Record<string, any>>(defaults: T, overrides: Partial<T>): T {
    const result = { ...defaults };
    for (const key in overrides) {
        if (
            overrides[key] !== undefined &&
            typeof defaults[key] === 'object' &&
            defaults[key] !== null &&
            !Array.isArray(defaults[key]) &&
            typeof overrides[key] === 'object' &&
            overrides[key] !== null
        ) {
            result[key] = deepMerge(defaults[key], overrides[key] as any);
        } else if (overrides[key] !== undefined) {
            result[key] = overrides[key] as any;
        }
    }
    return result;
}

export function mergeTheme(overrides: Partial<ThemeConfig>): ThemeConfig {
    return deepMerge(DEFAULT_THEME, overrides);
}

const RADIUS_MAP: Record<string, { sm: string; md: string; lg: string }> = {
    sharp: { sm: '0px', md: '2px', lg: '4px' },
    soft: { sm: '2px', md: '4px', lg: '8px' },
    rounded: { sm: '6px', md: '12px', lg: '20px' },
};

function hexToRgb(hex: string): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}

export function applyThemeToDOM(theme: ThemeConfig) {
    const root = document.documentElement;

    // Colors
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-surface-hover', theme.colors.surfaceHover);
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-primary-rgb', hexToRgb(theme.colors.primary));
    root.style.setProperty('--color-primary-light', theme.colors.primaryLight);
    root.style.setProperty('--color-primary-dark', theme.colors.primaryDark);
    root.style.setProperty('--color-primary-dark-rgb', hexToRgb(theme.colors.primaryDark));
    root.style.setProperty('--color-text-main', theme.colors.textMain);
    root.style.setProperty('--color-text-muted', theme.colors.textMuted);
    root.style.setProperty('--color-success', theme.colors.success);
    root.style.setProperty('--color-error', theme.colors.error);

    // Typography
    root.style.setProperty('--font-size-base', `${theme.typography.baseFontSize}px`);
    root.style.setProperty('--heading-scale', String(theme.typography.headingScale));
    root.style.fontSize = `${theme.typography.baseFontSize}px`;

    // Layout
    const radius = RADIUS_MAP[theme.layout.borderRadius] || RADIUS_MAP.soft;
    root.style.setProperty('--radius-sm', radius.sm);
    root.style.setProperty('--radius-md', radius.md);
    root.style.setProperty('--radius-lg', radius.lg);

    const scale = theme.layout.spacingScale;
    root.style.setProperty('--spacing-xs', `${0.5 * scale}rem`);
    root.style.setProperty('--spacing-sm', `${1.5 * scale}rem`);
    root.style.setProperty('--spacing-md', `${3 * scale}rem`);
    root.style.setProperty('--spacing-lg', `${5 * scale}rem`);
    root.style.setProperty('--spacing-xl', `${8 * scale}rem`);

    // Animations
    const speed = theme.animations.animationSpeed;
    root.style.setProperty('--transition-fast', `${0.2 * speed}s ease`);
    root.style.setProperty('--transition-smooth', `${0.4 * speed}s cubic-bezier(0.4, 0, 0.2, 1)`);

    if (!theme.animations.enableScrollAnimations) {
        root.style.setProperty('--anim-duration', '0s');
    } else {
        root.style.setProperty('--anim-duration', `${0.8 * speed}s`);
    }
}

// ===================== PROVIDER =====================

export function ThemeProvider({ children }: { children: ReactNode }) {
    // Demo mode uses DensFlow Light preset as default
    const isDemo = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const DEMO_DEFAULT = isDemo ? mergeTheme(THEME_PRESETS['densflow-light'] || {}) : DEFAULT_THEME;

    const [theme, setTheme] = useState<ThemeConfig>(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem('densflow_theme');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed && typeof parsed === 'object' && parsed.colors) {
                        return mergeTheme(parsed);
                    }
                }
            } catch { /* use defaults */ }
        }
        return DEMO_DEFAULT;
    });
    const [isLoaded, setIsLoaded] = useState(false);

    // Apply theme to DOM immediately on first render
    useEffect(() => {
        applyThemeToDOM(theme);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch latest from API and update
    useEffect(() => {
        async function loadTheme() {
            try {
                const res = await fetch('/api/theme', { cache: 'no-store' });
                if (res.ok) {
                    const overrides = await res.json();
                    if (overrides && Object.keys(overrides).length > 0) {
                        const merged = mergeTheme(overrides);
                        setTheme(merged);
                        applyThemeToDOM(merged);
                        // Cache for next page load
                        try { localStorage.setItem('densflow_theme', JSON.stringify(overrides)); } catch {}
                    }
                }
            } catch {
                // Use defaults/cached silently
            }
            setIsLoaded(true);
        }
        loadTheme();
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, isLoaded, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
