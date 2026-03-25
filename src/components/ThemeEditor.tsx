"use client";

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
    ThemeConfig,
    DEFAULT_THEME,
    THEME_PRESETS,
    mergeTheme,
    applyThemeToDOM,
} from '@/context/ThemeContext';
import { Save, RotateCcw, Palette, Type, Layout, Sparkles, Monitor, Navigation, ToggleLeft, Eye } from 'lucide-react';

// ===================== HELPERS =====================

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{ width: '40px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
            />
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '2px' }}>{label}</div>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.35rem 0.5rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        color: 'white',
                        fontSize: '0.85rem',
                        fontFamily: 'monospace',
                    }}
                />
            </div>
        </div>
    );
}

function RangeInput({ label, value, onChange, min, max, step, unit }: {
    label: string; value: number; onChange: (v: number) => void;
    min: number; max: number; step: number; unit?: string;
}) {
    return (
        <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>{label}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                    {value}{unit || ''}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
            />
        </div>
    );
}

function ToggleSwitch({ label, description, value, onChange }: {
    label: string; description?: string; value: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <div
            onClick={() => onChange(!value)}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.6rem 0.75rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '6px',
                cursor: 'pointer',
                marginBottom: '0.4rem',
                border: '1px solid rgba(255,255,255,0.05)',
                transition: 'all 0.15s',
            }}
        >
            <div>
                <div style={{ fontSize: '0.85rem', color: 'white' }}>{label}</div>
                {description && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{description}</div>}
            </div>
            <div style={{
                width: '40px',
                height: '22px',
                borderRadius: '11px',
                background: value ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
                marginLeft: '0.75rem',
            }}>
                <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '3px',
                    left: value ? '21px' : '3px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
            </div>
        </div>
    );
}

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
    return (
        <h3 style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '1rem',
            color: 'var(--color-primary)',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
            <Icon size={18} />
            {title}
        </h3>
    );
}

// ===================== MAIN COMPONENT =====================

export default function ThemeEditor() {
    const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
    const [originalTheme, setOriginalTheme] = useState<ThemeConfig>(DEFAULT_THEME);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [activeSection, setActiveSection] = useState<string>('colors');
    const [hasChanges, setHasChanges] = useState(false);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Load current theme
    useEffect(() => {
        async function load() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const res = await fetch('/api/admin/theme', {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data?.value && Object.keys(data.value).length > 0) {
                        const merged = mergeTheme(data.value);
                        setTheme(merged);
                        setOriginalTheme(merged);
                    }
                }
            } catch (err) {
                console.error('Failed to load theme:', err);
            }
        }
        load();
    }, []);

    // Live preview
    useEffect(() => {
        applyThemeToDOM(theme);
        setHasChanges(JSON.stringify(theme) !== JSON.stringify(originalTheme));
    }, [theme]);

    // Update helpers
    const updateColors = useCallback((key: keyof ThemeConfig['colors'], value: string) => {
        setTheme(prev => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
    }, []);

    const updateTypography = useCallback((key: keyof ThemeConfig['typography'], value: any) => {
        setTheme(prev => ({ ...prev, typography: { ...prev.typography, [key]: value } }));
    }, []);

    const updateLayout = useCallback((key: keyof ThemeConfig['layout'], value: any) => {
        setTheme(prev => ({ ...prev, layout: { ...prev.layout, [key]: value } }));
    }, []);

    const updateAnimations = useCallback((key: keyof ThemeConfig['animations'], value: any) => {
        setTheme(prev => ({ ...prev, animations: { ...prev.animations, [key]: value } }));
    }, []);

    const updateHero = useCallback((key: keyof ThemeConfig['hero'], value: any) => {
        setTheme(prev => ({ ...prev, hero: { ...prev.hero, [key]: value } }));
    }, []);

    const updateNavbar = useCallback((key: keyof ThemeConfig['navbar'], value: any) => {
        setTheme(prev => ({ ...prev, navbar: { ...prev.navbar, [key]: value } }));
    }, []);

    const updateFeature = useCallback((key: keyof ThemeConfig['features'], value: boolean) => {
        setTheme(prev => ({ ...prev, features: { ...prev.features, [key]: value } }));
    }, []);

    // Save
    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            // Build partial config — only include non-default values
            const partial: any = {};
            for (const section of Object.keys(theme) as (keyof ThemeConfig)[]) {
                const current = theme[section];
                const defaults = DEFAULT_THEME[section];
                if (JSON.stringify(current) !== JSON.stringify(defaults)) {
                    partial[section] = current;
                }
            }

            const res = await fetch('/api/admin/theme', {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(partial),
            });

            if (!res.ok) throw new Error('Failed to save');

            setOriginalTheme(theme);
            setHasChanges(false);
            setMessage({ text: '✅ Motyw zapisany!', type: 'success' });
        } catch (err: any) {
            setMessage({ text: `❌ Błąd: ${err.message}`, type: 'error' });
        }
        setSaving(false);
        setTimeout(() => setMessage(null), 3000);
    };

    // Reset
    const handleReset = async () => {
        if (!confirm('Czy na pewno chcesz przywrócić domyślny motyw?')) return;
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const res = await fetch('/api/admin/theme', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (!res.ok) throw new Error('Failed to reset');

            setTheme(DEFAULT_THEME);
            setOriginalTheme(DEFAULT_THEME);
            applyThemeToDOM(DEFAULT_THEME);
            setHasChanges(false);
            setMessage({ text: '✅ Motyw przywrócony do domyślnego!', type: 'success' });
        } catch (err: any) {
            setMessage({ text: `❌ Błąd: ${err.message}`, type: 'error' });
        }
        setSaving(false);
        setTimeout(() => setMessage(null), 3000);
    };

    // Apply preset
    const applyPreset = (presetName: string) => {
        const preset = THEME_PRESETS[presetName];
        if (!preset) return;
        const merged = mergeTheme(preset);
        setTheme(merged);
    };

    const sections = [
        { id: 'colors', label: '🎨 Kolory', icon: Palette },
        { id: 'typography', label: '📝 Typografia', icon: Type },
        { id: 'layout', label: '📐 Układ', icon: Layout },
        { id: 'animations', label: '✨ Animacje', icon: Sparkles },
        { id: 'hero', label: '🏠 Hero', icon: Monitor },
        { id: 'navbar', label: '🧭 Nawigacja', icon: Navigation },
        { id: 'features', label: '⚙️ Funkcje', icon: ToggleLeft },
        { id: 'presets', label: '🎭 Szablony', icon: Eye },
    ];

    return (
        <div>
            {/* Message toast */}
            {message && (
                <div style={{
                    position: 'fixed',
                    top: '1rem',
                    right: '1rem',
                    padding: '0.75rem 1.25rem',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: '8px',
                    color: 'white',
                    zIndex: 1000,
                    fontWeight: '500',
                    backdropFilter: 'blur(10px)',
                }}>
                    {message.text}
                </div>
            )}

            {/* Top bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
            }}>
                <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.7rem 1.5rem',
                        background: hasChanges ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                        color: hasChanges ? '#000' : 'rgba(255,255,255,0.4)',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '700',
                        cursor: hasChanges ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                    }}
                >
                    <Save size={16} />
                    {saving ? 'Zapisywanie...' : 'Zapisz motyw'}
                </button>
                <button
                    onClick={handleReset}
                    disabled={saving}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.7rem 1.25rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    <RotateCcw size={16} />
                    Przywróć domyślny
                </button>
                {hasChanges && (
                    <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>● Niezapisane zmiany</span>
                )}
            </div>

            {/* Section tabs */}
            <div style={{
                display: 'flex',
                gap: '0.3rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '0.75rem',
            }}>
                {sections.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        style={{
                            padding: '0.5rem 0.85rem',
                            background: activeSection === s.id ? 'rgba(var(--color-primary-rgb),0.15)' : 'transparent',
                            color: activeSection === s.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.5)',
                            border: activeSection === s.id ? '1px solid rgba(var(--color-primary-rgb),0.3)' : '1px solid transparent',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: activeSection === s.id ? '600' : '400',
                            transition: 'all 0.15s',
                        }}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '1.5rem',
            }}>

                {/* COLORS */}
                {activeSection === 'colors' && (
                    <div>
                        <SectionHeader icon={Palette} title="Paleta kolorów" />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                            <div>
                                <h4 style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Główne</h4>
                                <ColorInput label="Kolor główny (primary)" value={theme.colors.primary} onChange={(v) => updateColors('primary', v)} />
                                <ColorInput label="Primary jaśniejszy" value={theme.colors.primaryLight} onChange={(v) => updateColors('primaryLight', v)} />
                                <ColorInput label="Primary ciemniejszy" value={theme.colors.primaryDark} onChange={(v) => updateColors('primaryDark', v)} />
                            </div>
                            <div>
                                <h4 style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tła</h4>
                                <ColorInput label="Tło strony" value={theme.colors.background} onChange={(v) => updateColors('background', v)} />
                                <ColorInput label="Tło kart / sekcji" value={theme.colors.surface} onChange={(v) => updateColors('surface', v)} />
                                <ColorInput label="Tło hover" value={theme.colors.surfaceHover} onChange={(v) => updateColors('surfaceHover', v)} />
                            </div>
                            <div>
                                <h4 style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tekst & Status</h4>
                                <ColorInput label="Tekst główny" value={theme.colors.textMain} onChange={(v) => updateColors('textMain', v)} />
                                <ColorInput label="Tekst wyciszony" value={theme.colors.textMuted} onChange={(v) => updateColors('textMuted', v)} />
                                <ColorInput label="Sukces" value={theme.colors.success} onChange={(v) => updateColors('success', v)} />
                                <ColorInput label="Błąd" value={theme.colors.error} onChange={(v) => updateColors('error', v)} />
                            </div>
                        </div>

                        {/* Color preview */}
                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: theme.colors.surface, borderRadius: '8px', border: `1px solid ${theme.colors.surfaceHover}` }}>
                            <h4 style={{ color: theme.colors.textMain, marginBottom: '0.5rem' }}>Podgląd kolorów</h4>
                            <p style={{ color: theme.colors.textMuted, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Tak będzie wyglądał tekst wyciszony na tle kart.</p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <span style={{ padding: '0.4rem 1rem', background: theme.colors.primary, color: '#000', borderRadius: '4px', fontWeight: '600', fontSize: '0.85rem' }}>Przycisk główny</span>
                                <span style={{ padding: '0.4rem 1rem', background: theme.colors.success, color: '#fff', borderRadius: '4px', fontSize: '0.85rem' }}>Sukces</span>
                                <span style={{ padding: '0.4rem 1rem', background: theme.colors.error, color: '#fff', borderRadius: '4px', fontSize: '0.85rem' }}>Błąd</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* TYPOGRAPHY */}
                {activeSection === 'typography' && (
                    <div>
                        <SectionHeader icon={Type} title="Typografia" />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            <div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', display: 'block' }}>Czcionka treści</label>
                                    <select
                                        value={theme.typography.fontBody}
                                        onChange={(e) => updateTypography('fontBody', e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '4px',
                                            color: 'white',
                                            fontSize: '0.85rem',
                                        }}
                                    >
                                        {['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat', 'Outfit', 'DM Sans'].map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', display: 'block' }}>Czcionka nagłówków</label>
                                    <select
                                        value={theme.typography.fontHeading}
                                        onChange={(e) => updateTypography('fontHeading', e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '4px',
                                            color: 'white',
                                            fontSize: '0.85rem',
                                        }}
                                    >
                                        {['Playfair Display', 'Merriweather', 'Roboto Slab', 'Lora', 'Cormorant Garamond', 'DM Serif Display', 'Outfit'].map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <RangeInput label="Bazowy rozmiar czcionki" value={theme.typography.baseFontSize} onChange={(v) => updateTypography('baseFontSize', v)} min={12} max={22} step={1} unit="px" />
                                <RangeInput label="Skala nagłówków" value={theme.typography.headingScale} onChange={(v) => updateTypography('headingScale', v)} min={0.7} max={1.5} step={0.05} unit="x" />
                                <RangeInput label="Interlinia" value={theme.typography.lineHeight} onChange={(v) => updateTypography('lineHeight', v)} min={1.2} max={2.0} step={0.1} />
                            </div>
                        </div>
                    </div>
                )}

                {/* LAYOUT */}
                {activeSection === 'layout' && (
                    <div>
                        <SectionHeader icon={Layout} title="Układ i rozmiary" />
                        <RangeInput label="Maks. szerokość kontenera" value={theme.layout.containerMaxWidth} onChange={(v) => updateLayout('containerMaxWidth', v)} min={900} max={1600} step={50} unit="px" />
                        <RangeInput label="Skala odstępów" value={theme.layout.spacingScale} onChange={(v) => updateLayout('spacingScale', v)} min={0.5} max={1.5} step={0.1} unit="x" />

                        <div style={{ marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '8px', display: 'block' }}>Styl zaokrągleń</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {([
                                    { id: 'sharp', label: 'Ostre', preview: '0px' },
                                    { id: 'soft', label: 'Miękkie', preview: '4px' },
                                    { id: 'rounded', label: 'Zaokrąglone', preview: '12px' },
                                ] as const).map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => updateLayout('borderRadius', r.id)}
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem',
                                            background: theme.layout.borderRadius === r.id ? 'rgba(var(--color-primary-rgb),0.15)' : 'rgba(255,255,255,0.03)',
                                            border: theme.layout.borderRadius === r.id ? '2px solid rgba(var(--color-primary-rgb),0.5)' : '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: r.preview,
                                            color: theme.layout.borderRadius === r.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.6)',
                                            cursor: 'pointer',
                                            fontWeight: theme.layout.borderRadius === r.id ? '700' : '400',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <div style={{ width: '40px', height: '28px', background: 'rgba(var(--color-primary-rgb),0.2)', borderRadius: r.preview, margin: '0 auto 0.4rem' }} />
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ANIMATIONS */}
                {activeSection === 'animations' && (
                    <div>
                        <SectionHeader icon={Sparkles} title="Animacje i przejścia" />
                        <ToggleSwitch label="Animacje przewijania" description="Efekty fade-in / slide-in przy scrollowaniu" value={theme.animations.enableScrollAnimations} onChange={(v) => updateAnimations('enableScrollAnimations', v)} />
                        <ToggleSwitch label="Przejścia stron" description="Animowane przejścia między stronami" value={theme.animations.enablePageTransitions} onChange={(v) => updateAnimations('enablePageTransitions', v)} />
                        <div style={{ marginTop: '1rem' }}>
                            <RangeInput label="Prędkość animacji" value={theme.animations.animationSpeed} onChange={(v) => updateAnimations('animationSpeed', v)} min={0.3} max={2.0} step={0.1} unit="x" />
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '-0.5rem' }}>0.3x = bardzo szybkie, 1.0x = normalne, 2.0x = wolne</p>
                        </div>
                    </div>
                )}

                {/* HERO */}
                {activeSection === 'hero' && (
                    <div>
                        <SectionHeader icon={Monitor} title="Sekcja Hero (strona główna)" />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            <div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', display: 'block' }}>YouTube Video ID (tło)</label>
                                    <input
                                        type="text"
                                        value={theme.hero.backgroundVideoId}
                                        onChange={(e) => updateHero('backgroundVideoId', e.target.value)}
                                        placeholder="np. vGAu6rdJ8WQ"
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '4px',
                                            color: 'white',
                                            fontSize: '0.85rem',
                                            fontFamily: 'monospace',
                                        }}
                                    />
                                </div>
                                <RangeInput label="Przezroczystość wideo" value={theme.hero.backgroundVideoOpacity} onChange={(v) => updateHero('backgroundVideoOpacity', v)} min={0} max={1} step={0.05} />
                            </div>
                            <div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', display: 'block' }}>Minimalna wysokość sekcji Hero</label>
                                    <select
                                        value={theme.hero.minHeight}
                                        onChange={(e) => updateHero('minHeight', e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '4px',
                                            color: 'white',
                                            fontSize: '0.85rem',
                                        }}
                                    >
                                        <option value="70vh">70vh (kompaktowy)</option>
                                        <option value="80vh">80vh (średni)</option>
                                        <option value="90vh">90vh (pełny)</option>
                                        <option value="100vh">100vh (pełnoekranowy)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* NAVBAR */}
                {activeSection === 'navbar' && (
                    <div>
                        <SectionHeader icon={Navigation} title="Nawigacja" />
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', display: 'block' }}>Tekst logo</label>
                            <input
                                type="text"
                                value={theme.navbar.logoText}
                                onChange={(e) => updateNavbar('logoText', e.target.value)}
                                style={{
                                    width: '100%',
                                    maxWidth: '300px',
                                    padding: '0.5rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                }}
                            />
                        </div>
                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '8px', display: 'block' }}>Styl nawigacji</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {([
                                    { id: 'transparent', label: 'Przezroczysty', desc: 'Tło strony prześwieca' },
                                    { id: 'solid', label: 'Stały', desc: 'Jednolite ciemne tło' },
                                    { id: 'glassmorphism', label: 'Szkło', desc: 'Efekt rozmycia (blur)' },
                                ] as const).map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => updateNavbar('style', s.id)}
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem',
                                            background: theme.navbar.style === s.id ? 'rgba(var(--color-primary-rgb),0.15)' : 'rgba(255,255,255,0.03)',
                                            border: theme.navbar.style === s.id ? '2px solid rgba(var(--color-primary-rgb),0.5)' : '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            color: theme.navbar.style === s.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.6)',
                                            cursor: 'pointer',
                                            fontWeight: theme.navbar.style === s.id ? '700' : '400',
                                            transition: 'all 0.15s',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{s.label}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{s.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* FEATURES */}
                {activeSection === 'features' && (
                    <div>
                        <SectionHeader icon={ToggleLeft} title="Włączanie / wyłączanie funkcji" />
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
                            Wyłączone funkcje zostaną ukryte z nawigacji i nie będą ładowane.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
                            <div>
                                <h4 style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Komponenty UI</h4>
                                <ToggleSwitch label="Splash Screen" description="Ekran powitalny z animacją" value={theme.features.splashScreen} onChange={(v) => {
                                    updateFeature('splashScreen', v);
                                    setTheme(prev => ({
                                        ...prev,
                                        features: {
                                            ...prev.features,
                                            splashScreenConfig: { ...prev.features.splashScreenConfig, enabled: v }
                                        }
                                    }));
                                }} />
                                {theme.features.splashScreen && (() => {
                                    const sc = theme.features.splashScreenConfig || { enabled: true, animationType: 'particles' as const, duration: 6, frequency: 'once_session' as const, sections: { public: true, admin: false, employee: false, patient: false } };
                                    const updateSC = (patch: any) => setTheme(prev => ({
                                        ...prev,
                                        features: {
                                            ...prev.features,
                                            splashScreenConfig: { ...prev.features.splashScreenConfig, ...patch }
                                        }
                                    }));
                                    return (
                                        <div style={{ marginLeft: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '0.5rem' }}>
                                            <div style={{ marginBottom: '0.75rem' }}>
                                                <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>Typ animacji</label>
                                                <select
                                                    value={sc.animationType}
                                                    onChange={e => updateSC({ animationType: e.target.value })}
                                                    style={{ width: '100%', padding: '0.4rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white', fontSize: '0.8rem' }}
                                                >
                                                    <option value="particles">🌟 Nebula (cząsteczki)</option>
                                                    <option value="fade">🌊 Fade (płynne pojawienie)</option>
                                                    <option value="slide">📐 Slide (wjazd)</option>
                                                    <option value="none">⚡ Brak (tylko logo)</option>
                                                </select>
                                            </div>
                                            <RangeInput label="Czas trwania" value={sc.duration} onChange={v => updateSC({ duration: v })} min={1} max={10} step={0.5} unit="s" />
                                            <div style={{ marginBottom: '0.75rem' }}>
                                                <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>Częstotliwość</label>
                                                <select
                                                    value={sc.frequency}
                                                    onChange={e => updateSC({ frequency: e.target.value })}
                                                    style={{ width: '100%', padding: '0.4rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white', fontSize: '0.8rem' }}
                                                >
                                                    <option value="always">Zawsze (każde wejście)</option>
                                                    <option value="once_session">Raz na sesję</option>
                                                    <option value="once_ever">Raz na zawsze</option>
                                                    <option value="daily">Raz dziennie</option>
                                                    <option value="weekly">Raz w tygodniu</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>Wyświetlaj w sekcjach</label>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                                                    <ToggleSwitch label="Publiczna" value={sc.sections.public} onChange={v => updateSC({ sections: { ...sc.sections, public: v } })} />
                                                    <ToggleSwitch label="Admin" value={sc.sections.admin} onChange={v => updateSC({ sections: { ...sc.sections, admin: v } })} />
                                                    <ToggleSwitch label="Pracownik" value={sc.sections.employee} onChange={v => updateSC({ sections: { ...sc.sections, employee: v } })} />
                                                    <ToggleSwitch label="Pacjent" value={sc.sections.patient} onChange={v => updateSC({ sections: { ...sc.sections, patient: v } })} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                                <ToggleSwitch label="Wideo w tle" description="Film YouTube jako tło strony" value={theme.features.backgroundVideo} onChange={(v) => updateFeature('backgroundVideo', v)} />
                                <ToggleSwitch label="Asystent AI" description="Pływający przycisk asystenta" value={theme.features.assistantTeaser} onChange={(v) => updateFeature('assistantTeaser', v)} />
                                <ToggleSwitch label="Monit PWA" description="Zachęta do instalacji aplikacji" value={theme.features.pwaInstallPrompt} onChange={(v) => updateFeature('pwaInstallPrompt', v)} />
                                <ToggleSwitch label="Baner cookies" description="Baner zgody na pliki cookies" value={theme.features.cookieConsent} onChange={(v) => updateFeature('cookieConsent', v)} />
                                <ToggleSwitch label="Symulator uśmiechu" description="Okno symulatora uśmiechu" value={theme.features.simulatorModal} onChange={(v) => updateFeature('simulatorModal', v)} />
                                <ToggleSwitch label="Ankieta opinii" description="Popup z ankietą satyscakcji" value={theme.features.opinionSurvey} onChange={(v) => updateFeature('opinionSurvey', v)} />
                            </div>
                            <div>
                                <h4 style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Strony & sekcje</h4>
                                <ToggleSwitch label="Sklep" description="Sklep internetowy" value={theme.features.shop} onChange={(v) => updateFeature('shop', v)} />
                                <ToggleSwitch label="Blog" description="Blog Dr. Nowosielskiego" value={theme.features.blog} onChange={(v) => updateFeature('blog', v)} />
                                <ToggleSwitch label="FAQ" description="Najczęstsze pytania" value={theme.features.faq} onChange={(v) => updateFeature('faq', v)} />
                                <ToggleSwitch label="Baza wiedzy" description="Artykuły edukacyjne" value={theme.features.knowledgeBase} onChange={(v) => updateFeature('knowledgeBase', v)} />
                                <ToggleSwitch label="Kalkulator leczenia" description="Wycena kosztów leczenia" value={theme.features.treatmentCalculator} onChange={(v) => updateFeature('treatmentCalculator', v)} />
                                <ToggleSwitch label="Metamorfozy" description="Galeria przed/po" value={theme.features.metamorphoses} onChange={(v) => updateFeature('metamorphoses', v)} />
                                <ToggleSwitch label="YouTube" description="Sekcja z filmami YouTube" value={theme.features.youtubeSection} onChange={(v) => updateFeature('youtubeSection', v)} />
                                <ToggleSwitch label="Opinie Google" description="Sekcja z recenzjami Google" value={theme.features.googleReviews} onChange={(v) => updateFeature('googleReviews', v)} />
                                <ToggleSwitch label="Mapa bólu" description="Interaktywna mapa bólu" value={theme.features.painMap} onChange={(v) => updateFeature('painMap', v)} />
                                <ToggleSwitch label="Selfie Booth" description="Zrób selfie u dentysty" value={theme.features.selfie} onChange={(v) => updateFeature('selfie', v)} />
                                <ToggleSwitch label="Porównywarka" description="Porównywarka zabiegów" value={theme.features.comparator} onChange={(v) => updateFeature('comparator', v)} />
                            </div>
                        </div>
                    </div>
                )}

                {/* PRESETS */}
                {activeSection === 'presets' && (
                    <div>
                        <SectionHeader icon={Eye} title="Gotowe szablony motywów" />
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
                            Kliknij szablon, aby zastosować go natychmiast. Pamiętaj, aby zapisać po wyborze.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            {[
                                { id: 'default-gold', name: 'Domyślne Złoto', colors: ['#08090a', '#dcb14a', '#f0c975'] },
                                { id: 'densflow-light', name: 'DensFlow Light', colors: ['#F8FAFD', '#4F8FE6', '#E88DA0'] },
                                { id: 'dental-luxe', name: 'Dental Luxe', colors: ['#0B0C10', '#D4AF37', '#E8C85A'] },
                                { id: 'fresh-smile', name: 'Fresh Smile', colors: ['#F0FDF4', '#16A34A', '#4ADE80'] },
                                { id: 'nordic-dental', name: 'Nordic Dental', colors: ['#F1F5F9', '#475569', '#64748B'] },
                                { id: 'warm-care', name: 'Warm Care', colors: ['#FFF7ED', '#EA580C', '#FB923C'] },
                            ].map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => applyPreset(preset.id)}
                                    style={{
                                        padding: '1rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        transition: 'all 0.2s',
                                        color: 'white',
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.target as HTMLElement).style.borderColor = 'rgba(var(--color-primary-rgb),0.4)';
                                        (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                                        (e.target as HTMLElement).style.transform = 'translateY(0)';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '0.75rem' }}>
                                        {preset.colors.map((c, i) => (
                                            <div key={i} style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '50%',
                                                background: c,
                                                border: c === '#ffffff' ? '2px solid #ccc' : '2px solid rgba(255,255,255,0.15)',
                                            }} />
                                        ))}
                                    </div>
                                    <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{preset.name}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
