"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { SYMPTOM_DATA, DOCTORS, type ZoneInfo, type SeverityLevel, type TipItem } from './SymptomData';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────
// PREMIUM DENTAL MAP — Multi-severity system
// Each zone → 3 levels (łagodne / umiarkowane / zaawansowane)
// ─────────────────────────────────────────────────────────────

interface ZoneDef {
    id: string;
    shape: 'rect' | 'path';
    d?: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
}

// ─── TOOTH ZONES (user-calibrated via /mapa-bolu/editor) ───
const UPPER_TEETH: ZoneDef[] = [
    { id: "18", shape: "rect", x: 17.4, y: 48.2, w: 6.1, h: 4.6 },
    { id: "17", shape: "rect", x: 16.7, y: 40.8, w: 7, h: 7 },
    { id: "16", shape: "rect", x: 18.2, y: 34.6, w: 7, h: 7 },
    { id: "15", shape: "rect", x: 18.9, y: 28.6, w: 6, h: 6 },
    { id: "14", shape: "rect", x: 22.5, y: 23.1, w: 5, h: 6 },
    { id: "13", shape: "rect", x: 25.9, y: 14.9, w: 5, h: 7 },
    { id: "12", shape: "rect", x: 33.3, y: 10.6, w: 4.1, h: 6.7 },
    { id: "11", shape: "rect", x: 41, y: 8, w: 7, h: 8 },
    { id: "21", shape: "rect", x: 52, y: 8, w: 7, h: 8 },
    { id: "22", shape: "rect", x: 63.2, y: 10.4, w: 4, h: 7 },
    { id: "23", shape: "rect", x: 69.2, y: 15.7, w: 5, h: 7 },
    { id: "24", shape: "rect", x: 72.8, y: 22.2, w: 5.3, h: 7 },
    { id: "25", shape: "rect", x: 75.3, y: 28.5, w: 6, h: 6 },
    { id: "26", shape: "rect", x: 76.4, y: 33.9, w: 7, h: 7 },
    { id: "27", shape: "rect", x: 77.3, y: 40.4, w: 7, h: 7 },
    { id: "28", shape: "rect", x: 78, y: 46.7, w: 5, h: 5 },
];
const LOWER_TEETH: ZoneDef[] = [
    { id: "48", shape: "rect", x: 18.8, y: 52.4, w: 5, h: 5 },
    { id: "47", shape: "rect", x: 17.7, y: 56.4, w: 7, h: 7 },
    { id: "46", shape: "rect", x: 19, y: 62.3, w: 7, h: 7 },
    { id: "45", shape: "rect", x: 20.9, y: 68.8, w: 6, h: 6 },
    { id: "44", shape: "rect", x: 24.4, y: 73.4, w: 5, h: 6 },
    { id: "43", shape: "rect", x: 29.1, y: 79.1, w: 5, h: 6 },
    { id: "42", shape: "rect", x: 36.2, y: 81.5, w: 4, h: 7 },
    { id: "41", shape: "rect", x: 42.1, y: 82.2, w: 7, h: 7 },
    { id: "31", shape: "rect", x: 50.6, y: 82, w: 7, h: 7 },
    { id: "32", shape: "rect", x: 59.5, y: 81.9, w: 4, h: 7 },
    { id: "33", shape: "rect", x: 66, y: 79.2, w: 5, h: 6 },
    { id: "34", shape: "rect", x: 71.2, y: 74.2, w: 5, h: 6 },
    { id: "35", shape: "rect", x: 74, y: 69.2, w: 6, h: 6 },
    { id: "36", shape: "rect", x: 74.6, y: 62.7, w: 7, h: 7 },
    { id: "37", shape: "rect", x: 76.2, y: 56.7, w: 7, h: 7 },
    { id: "38", shape: "rect", x: 77.9, y: 52, w: 5, h: 5 },
];
const SOFT_ZONES: ZoneDef[] = [
    { id: "tongue", shape: "rect", x: 35.8, y: 56.6, w: 28.4, h: 22 },
    { id: "palate", shape: "rect", x: 33.4, y: 19.7, w: 33.1, h: 25 },
    { id: "throat", shape: "rect", x: 41.6, y: 46.5, w: 16.8, h: 7.7 },
];
const ALL_ZONES = [...UPPER_TEETH, ...LOWER_TEETH, ...SOFT_ZONES];

type SeverityKey = 'low' | 'medium' | 'high';

// ─── CSS KEYFRAMES (injected once) ───
const STYLE_TAG = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

export default function PainMapInteractive() {
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
    const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [showIntro, setShowIntro] = useState(true);
    const [introClosing, setIntroClosing] = useState(false);
    const [modalClosing, setModalClosing] = useState(false);
    const [activeSeverity, setActiveSeverity] = useState<SeverityKey>('low');
    const [hoveredTip, setHoveredTip] = useState<{ text: string; x: number; y: number } | null>(null);
    const tipTimeout = useRef<NodeJS.Timeout | null>(null);

    const selectedData: ZoneInfo | null = selectedZoneId ? SYMPTOM_DATA[selectedZoneId] ?? null : null;
    const activeLevel: SeverityLevel | null = selectedData ? selectedData.levels[activeSeverity] : null;

    // Tooltip handlers
    const showTip = useCallback((tip: string, e: React.MouseEvent) => {
        if (!tip) return;
        if (tipTimeout.current) clearTimeout(tipTimeout.current);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setHoveredTip({ text: tip, x: rect.left + rect.width / 2, y: rect.top - 8 });
    }, []);
    const hideTip = useCallback(() => {
        tipTimeout.current = setTimeout(() => setHoveredTip(null), 150);
    }, []);

    // Inject keyframes on mount
    useEffect(() => {
        if (typeof document !== 'undefined' && !document.getElementById('painmap-styles')) {
            const style = document.createElement('style');
            style.id = 'painmap-styles';
            style.textContent = STYLE_TAG;
            document.head.appendChild(style);
        }
    }, []);

    const getZoneName = useCallback((id: string) => {
        return SYMPTOM_DATA[id]?.title || id;
    }, []);

    const closeIntro = useCallback(() => {
        setIntroClosing(true);
        setTimeout(() => { setShowIntro(false); setIntroClosing(false); }, 300);
    }, []);

    const handleSelectZone = useCallback((id: string) => {
        setSelectedZoneId(id);
        setActiveSeverity('low'); // reset to mild on new zone selection
    }, []);

    const closeModal = useCallback(() => {
        setModalClosing(true);
        setTimeout(() => { setSelectedZoneId(null); setModalClosing(false); }, 250);
    }, []);

    // ─── URGENCY STYLE HELPER ───
    const getUrgencyStyle = (urgency: string) => {
        switch (urgency) {
            case 'high': return { bg: 'rgba(239,68,68,0.15)', text: '#f87171', border: 'rgba(239,68,68,0.3)', icon: '🔴', label: 'Pilne — umów wizytę' };
            case 'medium': return { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)', icon: '🟡', label: 'Umiarkowane' };
            default: return { bg: 'rgba(34,197,94,0.15)', text: '#4ade80', border: 'rgba(34,197,94,0.3)', icon: '🟢', label: 'Łagodne' };
        }
    };

    // ─── SEVERITY TOGGLE COMPONENT ───
    const renderSeverityToggle = () => {
        const levels: { key: SeverityKey; label: string; color: string; activeColor: string; bg: string }[] = [
            { key: 'low', label: '🟢 Łagodne', color: 'rgba(255,255,255,0.45)', activeColor: '#4ade80', bg: 'rgba(34,197,94,0.15)' },
            { key: 'medium', label: '🟡 Umiarkowane', color: 'rgba(255,255,255,0.45)', activeColor: '#fbbf24', bg: 'rgba(245,158,11,0.15)' },
            { key: 'high', label: '🔴 Zaawansowane', color: 'rgba(255,255,255,0.45)', activeColor: '#f87171', bg: 'rgba(239,68,68,0.15)' },
        ];

        return (
            <div style={{
                display: 'flex', gap: '4px', padding: '4px',
                background: 'rgba(255,255,255,0.03)', borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: '16px',
            }}>
                {levels.map(l => {
                    const isActive = activeSeverity === l.key;
                    return (
                        <button
                            key={l.key}
                            onClick={() => setActiveSeverity(l.key)}
                            style={{
                                flex: 1, padding: '8px 6px', border: 'none', borderRadius: '10px',
                                fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                                transition: 'all 0.2s ease', letterSpacing: '0.01em',
                                background: isActive ? l.bg : 'transparent',
                                color: isActive ? l.activeColor : l.color,
                                outline: isActive ? `1px solid ${l.activeColor}33` : 'none',
                            }}
                        >
                            {l.label}
                        </button>
                    );
                })}
            </div>
        );
    };

    // ─── RENDER: SVG ZONE ───
    const renderZone = useCallback((zone: ZoneDef) => {
        const isHovered = hoveredZoneId === zone.id;
        const isSelected = selectedZoneId === zone.id;
        const isActive = isHovered || isSelected;

        return (
            <g key={zone.id}>
                <rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.w}
                    height={zone.h}
                    fill={isActive ? 'rgba(220, 177, 74, 0.3)' : 'transparent'}
                    stroke={isActive ? '#dcb14a' : 'transparent'}
                    strokeWidth={isSelected ? 0.8 : 0.5}
                    rx={1}
                    style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    onClick={() => handleSelectZone(zone.id)}
                    onMouseEnter={() => setHoveredZoneId(zone.id)}
                    onMouseLeave={() => setHoveredZoneId(null)}
                />
            </g>
        );
    }, [hoveredZoneId, selectedZoneId, handleSelectZone]);

    // ─── RENDER: MAP VIEW ───
    const renderMap = () => (
        <div style={{ position: 'relative', width: '100%' }}>
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
                style={{ width: '100%', height: '100%', display: 'block', position: 'absolute', top: 0, left: 0, zIndex: 10 }}
            >
                {ALL_ZONES.map(renderZone)}
            </svg>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/dental-map-premium.jpg"
                alt="Mapa bólu zębów"
                style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }}
                draggable={false}
            />
            {/* Hover tooltip */}
            {hoveredZoneId && !selectedZoneId && (
                <div style={{
                    position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(10,10,10,0.9)', color: '#dcb14a',
                    padding: '8px 20px', borderRadius: '24px', fontSize: '13px',
                    fontWeight: 600, whiteSpace: 'nowrap', zIndex: 20,
                    border: '1px solid rgba(220,177,74,0.4)', backdropFilter: 'blur(12px)',
                    pointerEvents: 'none', animation: 'slideDown 0.15s ease-out',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    letterSpacing: '0.02em',
                }}>
                    🦷 {getZoneName(hoveredZoneId)}
                </div>
            )}
        </div>
    );

    // ─── RENDER: LIST VIEW ───
    const renderList = () => {
        const quadrants = [
            { title: 'Górny Łuk Prawy', subtitle: 'Q1 · Zęby 11–18', keys: ['11', '12', '13', '14', '15', '16', '17', '18'] },
            { title: 'Górny Łuk Lewy', subtitle: 'Q2 · Zęby 21–28', keys: ['21', '22', '23', '24', '25', '26', '27', '28'] },
            { title: 'Dolny Łuk Lewy', subtitle: 'Q3 · Zęby 31–38', keys: ['31', '32', '33', '34', '35', '36', '37', '38'] },
            { title: 'Dolny Łuk Prawy', subtitle: 'Q4 · Zęby 41–48', keys: ['41', '42', '43', '44', '45', '46', '47', '48'] },
            { title: 'Tkanki Miękkie', subtitle: 'Język · Podniebienie · Gardło', keys: ['tongue', 'palate', 'throat'] },
        ];

        return (
            <div style={{
                width: '100%', maxHeight: '75vh', overflowY: 'auto',
                padding: '16px', background: 'rgba(10,10,10,0.7)',
                backdropFilter: 'blur(16px)', borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
            }}>
                {quadrants.map((q, qi) => (
                    <div key={q.title} style={{ marginBottom: qi < quadrants.length - 1 ? '24px' : 0 }}>
                        <div style={{ marginBottom: '12px' }}>
                            <h3 style={{ color: '#dcb14a', fontWeight: 700, fontSize: '14px', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                                {q.title}
                            </h3>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{q.subtitle}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                            {q.keys.map(key => {
                                const info = SYMPTOM_DATA[key];
                                if (!info) return null;
                                const isSelected = selectedZoneId === key;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => handleSelectZone(key)}
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                                            padding: '10px 12px', borderRadius: '12px', border: 'none',
                                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease',
                                            background: isSelected ? 'rgba(220,177,74,0.15)' : 'rgba(255,255,255,0.04)',
                                            outline: isSelected ? '1px solid rgba(220,177,74,0.5)' : '1px solid rgba(255,255,255,0.06)',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,177,74,0.1)'; e.currentTarget.style.outline = '1px solid rgba(220,177,74,0.3)'; }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = isSelected ? 'rgba(220,177,74,0.15)' : 'rgba(255,255,255,0.04)';
                                            e.currentTarget.style.outline = isSelected ? '1px solid rgba(220,177,74,0.5)' : '1px solid rgba(255,255,255,0.06)';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                            <span style={{ color: '#dcb14a', fontWeight: 700, fontSize: '13px' }}>{key}</span>
                                        </div>
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', lineHeight: 1.3 }}>
                                            {info.title}
                                        </span>
                                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '2px' }}>
                                            {info.subtitle}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', position: 'relative', paddingTop: '72px' }}>

            {/* ═══ INTRO POPUP ═══ */}
            {showIntro && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem',
                    animation: introClosing ? 'fadeIn 0.3s ease reverse forwards' : 'fadeIn 0.3s ease',
                }}>
                    <div
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
                        onClick={closeIntro}
                    />
                    <div style={{
                        position: 'relative', zIndex: 1,
                        background: 'linear-gradient(145deg, rgba(20,20,20,0.95), rgba(10,10,10,0.98))',
                        border: '1px solid rgba(220,177,74,0.3)',
                        borderRadius: '24px', padding: '32px 28px', maxWidth: '420px', width: '100%',
                        textAlign: 'center', backdropFilter: 'blur(20px)',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(220,177,74,0.08)',
                        animation: introClosing ? 'fadeInUp 0.3s ease reverse forwards' : 'fadeInUp 0.4s ease',
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🦷</div>
                        <h2 style={{
                            color: '#dcb14a', fontSize: '24px', fontWeight: 700,
                            marginBottom: '12px', letterSpacing: '-0.01em',
                        }}>
                            Mapa Bólu
                        </h2>
                        <p style={{
                            color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: 1.7,
                            marginBottom: '20px',
                        }}>
                            Dotknij ząb lub obszar, który Cię boli — podpowiemy, co może być przyczyną
                            i kiedy warto umówić wizytę.
                        </p>
                        <div style={{
                            background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
                            padding: '10px 16px', marginBottom: '24px',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', margin: 0, lineHeight: 1.5 }}>
                                ⓘ Narzędzie ma charakter informacyjny i nie zastępuje wizyty u specjalisty.
                            </p>
                        </div>
                        <button
                            onClick={closeIntro}
                            style={{
                                width: '100%', padding: '14px', border: 'none', borderRadius: '14px',
                                background: 'linear-gradient(135deg, #dcb14a, #c59d3e)',
                                color: '#000', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                                transition: 'all 0.2s ease', letterSpacing: '0.02em',
                                boxShadow: '0 4px 16px rgba(220,177,74,0.3)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(220,177,74,0.4)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(220,177,74,0.3)'; }}
                        >
                            Rozpocznij diagnostykę
                        </button>
                    </div>
                </div>
            )}

            {/* ═══ VIEW TOGGLE ═══ */}
            <div style={{
                display: 'flex', justifyContent: 'center', marginBottom: '12px', padding: '0 16px',
            }}>
                <div style={{
                    display: 'inline-flex', gap: '4px',
                    background: 'rgba(255,255,255,0.04)', padding: '4px',
                    borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)',
                }}>
                    {(['map', 'list'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            style={{
                                padding: '8px 20px', border: 'none', borderRadius: '10px',
                                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                transition: 'all 0.2s ease', letterSpacing: '0.02em',
                                background: viewMode === mode ? 'linear-gradient(135deg, #dcb14a, #c59d3e)' : 'transparent',
                                color: viewMode === mode ? '#000' : 'rgba(255,255,255,0.4)',
                                boxShadow: viewMode === mode ? '0 2px 12px rgba(220,177,74,0.25)' : 'none',
                            }}
                        >
                            {mode === 'map' ? '🗺️ Mapa' : '📋 Lista'}
                        </button>
                    ))}
                </div>
            </div>

            {/* ═══ CONTENT ═══ */}
            <div style={{ padding: '0 8px' }}>
                <div style={{
                    borderRadius: '20px', overflow: 'hidden',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}>
                    {viewMode === 'map' ? renderMap() : renderList()}
                </div>
            </div>

            {/* ═══ DETAIL MODAL ═══ */}
            {selectedData && activeLevel && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                        padding: '0',
                        animation: modalClosing ? 'fadeIn 0.25s ease reverse forwards' : 'fadeIn 0.2s ease',
                    }}
                >
                    {/* Backdrop */}
                    <div
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
                        onClick={closeModal}
                    />

                    {/* Modal card — slides up from bottom */}
                    <div style={{
                        position: 'relative', zIndex: 1, width: '100%', maxWidth: '500px',
                        maxHeight: '88vh', overflowY: 'auto',
                        background: 'linear-gradient(180deg, rgba(18,18,18,0.98), rgba(10,10,10,0.99))',
                        borderTop: '2px solid rgba(220,177,74,0.4)',
                        borderRadius: '24px 24px 0 0',
                        padding: '28px 24px 32px',
                        boxShadow: '0 -10px 50px rgba(0,0,0,0.6), 0 0 30px rgba(220,177,74,0.05)',
                        backdropFilter: 'blur(20px)',
                        animation: modalClosing ? 'fadeInUp 0.25s ease reverse forwards' : 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}>
                        {/* Handle bar */}
                        <div style={{
                            width: '36px', height: '4px', borderRadius: '2px',
                            background: 'rgba(255,255,255,0.15)', margin: '0 auto 20px',
                        }} />

                        {/* Close button */}
                        <button
                            onClick={closeModal}
                            style={{
                                position: 'absolute', top: '16px', right: '16px',
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s ease', fontSize: '16px',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,177,74,0.15)'; e.currentTarget.style.color = '#dcb14a'; e.currentTarget.style.borderColor = 'rgba(220,177,74,0.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        >
                            ✕
                        </button>

                        {/* Title + subtitle */}
                        <h3 style={{
                            color: '#dcb14a', fontSize: '22px', fontWeight: 700,
                            margin: '0 0 2px', letterSpacing: '-0.01em',
                        }}>
                            {selectedData.title}
                        </h3>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', display: 'block', marginBottom: '16px' }}>
                            {selectedData.subtitle}
                        </span>

                        {/* ═══ SEVERITY TOGGLE ═══ */}
                        {renderSeverityToggle()}

                        {/* Urgency badge */}
                        {(() => {
                            const u = getUrgencyStyle(activeLevel.urgency);
                            return (
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    background: u.bg, color: u.text,
                                    padding: '6px 14px', borderRadius: '20px',
                                    fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                                    letterSpacing: '0.06em', border: `1px solid ${u.border}`,
                                    marginBottom: '12px',
                                }}>
                                    {u.icon} {u.label}
                                </div>
                            );
                        })()}

                        {/* Description */}
                        <p style={{
                            color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: 1.6,
                            margin: '0 0 16px',
                        }}>
                            {activeLevel.description}
                        </p>

                        {/* Symptoms card */}
                        <div style={{
                            background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
                            padding: '16px', marginBottom: '12px',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <span style={{
                                color: '#dcb14a', fontSize: '11px', fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                display: 'block', marginBottom: '10px',
                            }}>
                                Możliwe objawy
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {activeLevel.symptoms.map((s, i) => (
                                    <div key={i}
                                        style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', position: 'relative', cursor: s.tip ? 'help' : 'default' }}
                                        onMouseEnter={e => showTip(s.tip, e)}
                                        onMouseLeave={hideTip}
                                    >
                                        <span style={{
                                            width: '6px', height: '6px', borderRadius: '50%',
                                            background: '#dcb14a', flexShrink: 0, marginTop: '6px',
                                        }} />
                                        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', lineHeight: 1.5 }}>
                                            {s.text}
                                            {s.tip && <span style={{ color: 'rgba(220,177,74,0.5)', fontSize: '11px', marginLeft: '4px' }}>ⓘ</span>}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Causes card — clickable → booking */}
                        <div style={{
                            background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
                            padding: '16px', marginBottom: '12px',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <span style={{
                                color: '#dcb14a', fontSize: '11px', fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                display: 'block', marginBottom: '10px',
                            }}>
                                🔍 Możliwe przyczyny
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {activeLevel.causes.map((c, i) => (
                                    <Link
                                        key={i}
                                        href={`/rezerwacja?specialist=${activeLevel.doctors?.[0] || ''}&reason=${encodeURIComponent(c.text)}`}
                                        style={{
                                            display: 'flex', alignItems: 'flex-start', gap: '8px',
                                            textDecoration: 'none', padding: '6px 8px', borderRadius: '10px',
                                            transition: 'all 0.15s ease', cursor: 'pointer',
                                            background: 'transparent', border: 'none',
                                        }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLElement).style.background = 'rgba(220,177,74,0.08)';
                                            showTip(c.tip, e);
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                                            hideTip();
                                        }}
                                    >
                                        <span style={{
                                            width: '6px', height: '6px', borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.25)', flexShrink: 0, marginTop: '7px',
                                        }} />
                                        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', lineHeight: 1.5, flex: 1 }}>
                                            {c.text}
                                            {c.tip && <span style={{ color: 'rgba(220,177,74,0.4)', fontSize: '11px', marginLeft: '4px' }}>ⓘ</span>}
                                        </span>
                                        <span style={{ color: 'rgba(220,177,74,0.5)', fontSize: '11px', flexShrink: 0, marginTop: '3px' }}>umów →</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Recommended doctors */}
                        {activeLevel.doctors && activeLevel.doctors.length > 0 && (
                            <div style={{
                                background: 'rgba(220,177,74,0.03)', borderRadius: '16px',
                                padding: '16px', marginBottom: '12px',
                                border: '1px solid rgba(220,177,74,0.08)',
                            }}>
                                <span style={{
                                    color: '#dcb14a', fontSize: '11px', fontWeight: 700,
                                    textTransform: 'uppercase', letterSpacing: '0.08em',
                                    display: 'block', marginBottom: '10px',
                                }}>
                                    👨‍⚕️ Rekomendowani specjaliści
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {activeLevel.doctors.map(docId => {
                                        const doc = DOCTORS[docId];
                                        if (!doc) return null;
                                        return (
                                            <Link
                                                key={docId}
                                                href={`/rezerwacja?specialist=${docId}`}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '10px 14px', borderRadius: '12px',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                    textDecoration: 'none', transition: 'all 0.15s ease',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,177,74,0.1)'; e.currentTarget.style.borderColor = 'rgba(220,177,74,0.3)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                                            >
                                                <div>
                                                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>{doc.name}</div>
                                                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '2px' }}>{doc.specialties}</div>
                                                </div>
                                                <span style={{ color: '#dcb14a', fontSize: '12px', fontWeight: 600, flexShrink: 0, marginLeft: '12px' }}>Umów →</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Advice card */}
                        <div style={{
                            background: 'rgba(220,177,74,0.04)', borderRadius: '16px',
                            padding: '16px', marginBottom: '24px',
                            border: '1px solid rgba(220,177,74,0.1)',
                        }}>
                            <span style={{
                                color: '#dcb14a', fontSize: '11px', fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                display: 'block', marginBottom: '8px',
                            }}>
                                💡 Rada specjalisty
                            </span>
                            <p style={{
                                color: 'rgba(255,255,255,0.6)', fontSize: '13px',
                                lineHeight: 1.6, margin: 0,
                            }}>
                                {activeLevel.advice}
                            </p>
                        </div>

                        {/* CTA */}
                        <Link
                            href={`/rezerwacja${activeLevel.doctors?.[0] ? `?specialist=${activeLevel.doctors[0]}` : ''}`}
                            style={{
                                display: 'block', width: '100%', padding: '14px',
                                borderRadius: '14px', textAlign: 'center',
                                background: 'linear-gradient(135deg, #dcb14a, #c59d3e)',
                                color: '#000', fontWeight: 700, fontSize: '15px',
                                textDecoration: 'none', transition: 'all 0.2s ease',
                                boxShadow: '0 4px 20px rgba(220,177,74,0.3)',
                                letterSpacing: '0.02em',
                            }}
                        >
                            Rezerwuj wizytę
                        </Link>

                        {/* Floating tooltip */}
                        {hoveredTip && (
                            <div style={{
                                position: 'fixed',
                                left: Math.min(hoveredTip.x, typeof window !== 'undefined' ? window.innerWidth - 280 : 300),
                                top: hoveredTip.y,
                                transform: 'translate(-50%, -100%)',
                                maxWidth: '260px', padding: '10px 14px',
                                background: 'rgba(10,10,10,0.95)', color: 'rgba(255,255,255,0.8)',
                                fontSize: '12px', lineHeight: 1.5, borderRadius: '12px',
                                border: '1px solid rgba(220,177,74,0.3)',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                                zIndex: 10001, pointerEvents: 'none',
                                animation: 'fadeIn 0.15s ease',
                            }}>
                                {hoveredTip.text}
                                <div style={{
                                    position: 'absolute', bottom: '-5px', left: '50%',
                                    width: '10px', height: '10px', background: 'rgba(10,10,10,0.95)',
                                    borderRight: '1px solid rgba(220,177,74,0.3)',
                                    borderBottom: '1px solid rgba(220,177,74,0.3)',
                                    transform: 'translateX(-50%) rotate(45deg)',
                                }} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
