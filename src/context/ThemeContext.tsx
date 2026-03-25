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
    'ocean-blue': {
        colors: {
            ...DEFAULT_THEME.colors,
            primary: '#3b82f6',
            primaryLight: '#60a5fa',
            primaryDark: '#2563eb',
            background: '#0a0e1a',
            surface: '#111827',
            surfaceHover: '#1f2937',
        },
    },
    'forest-green': {
        colors: {
            ...DEFAULT_THEME.colors,
            primary: '#22c55e',
            primaryLight: '#4ade80',
            primaryDark: '#16a34a',
            background: '#0a1208',
            surface: '#14201a',
            surfaceHover: '#1e3026',
        },
    },
    'minimalist-white': {
        colors: {
            ...DEFAULT_THEME.colors,
            primary: '#1a1a1a',
            primaryLight: '#444444',
            primaryDark: '#000000',
            background: '#ffffff',
            surface: '#f5f5f5',
            surfaceHover: '#e8e8e8',
            textMain: '#1a1a1a',
            textMuted: '#6b7280',
        },
    },
    'rose-gold': {
        colors: {
            ...DEFAULT_THEME.colors,
            primary: '#e8998d',
            primaryLight: '#f0b5ab',
            primaryDark: '#c07068',
            background: '#1a0f0f',
            surface: '#231818',
            surfaceHover: '#2e2020',
        },
    },
    'densflow-light': {
        colors: {
            ...DEFAULT_THEME.colors,
            primary: '#4F8FE6',
            primaryLight: '#7EB3F7',
            primaryDark: '#2D6BC4',
            background: '#F8FAFD',
            surface: '#FFFFFF',
            surfaceHover: '#EDF2F9',
            textMain: '#1E293B',
            textMuted: '#64748B',
            success: '#22C55E',
            error: '#EF4444',
        },
        typography: {
            fontBody: 'DM Sans',
            fontHeading: 'Outfit',
            baseFontSize: 16,
            headingScale: 1.0,
            lineHeight: 1.6,
        },
        layout: {
            containerMaxWidth: 1200,
            borderRadius: 'rounded',
            spacingScale: 1.0,
        },
        hero: {
            minHeight: '85vh',
            backgroundVideoId: 'dQw4w9WgXcQ', // neutral placeholder — admin can change
            backgroundVideoOpacity: 0.08,
        },
        navbar: {
            style: 'glassmorphism',
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
            simulatorModal: false,
            opinionSurvey: false,
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
