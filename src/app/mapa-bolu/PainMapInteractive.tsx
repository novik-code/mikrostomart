"use client";

import { useState, useCallback } from 'react';
import { SYMPTOM_DATA } from './SymptomData';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────
// PREMIUM DENTAL MAP — Photorealistic background + invisible SVG overlay
// The image is dental-map-premium.jpg (1080×1080 approx)
// SVG viewBox coordinated to percentage positions on the image
// ─────────────────────────────────────────────────────────────

interface ZoneDef {
    id: string;
    // SVG path or rect coordinates (in 100×100 viewBox)
    shape: 'rect' | 'path';
    d?: string;       // for path
    x?: number;       // for rect
    y?: number;
    w?: number;
    h?: number;
}

// ─── TOOTH ZONES ───
// Mapped to the dental-map-premium.jpg (2048×2048 square)
// SVG viewBox is 100×100, coordinates are % of image dimensions
//
// Image anatomy reference:
// - Upper arch: U-shape opening DOWN.  Front teeth at top (~y=8-18), molars at sides (~y=25-38)
// - Lower arch: U-shape opening UP.    Front teeth at bottom (~y=82-93), molars at sides (~y=57-70)
// - Mouth cavity (dark): center ~y=38-55
// - Tongue: center ~y=55-72
//
// Patient's RIGHT = viewer's LEFT (standard dental convention)
// Q1 = upper right (screen left), Q2 = upper left (screen right)
// Q3 = lower left (screen right), Q4 = lower right (screen left)

// Upper teeth — front view, mapped by visual position on the 2048×2048 image
// IMAGE NOTE: Only 7 teeth visible per quadrant (1-7). 8s (wisdom) are behind/impacted.
// Incisors (1,2) ≈ OK from last iteration. Canines (3) ≈ OK.
// Premolars (4,5) and molars (6,7) were too far inward — pushed OUTWARD.
// 8s were sticking sideways — now tucked behind the arch in gum tissue.
const UPPER_TEETH: ZoneDef[] = [
    // Q1 — Upper Right (patient's right = screen LEFT)
    { id: "18", shape: "rect", x: 10, y: 37, w: 5, h: 5 },   // wisdom — behind arch, in gum above 17
    { id: "17", shape: "rect", x: 12, y: 29, w: 7, h: 7 },   // 2nd molar — last visible (far left)
    { id: "16", shape: "rect", x: 17, y: 22, w: 7, h: 7 },   // 1st molar
    { id: "15", shape: "rect", x: 22, y: 17, w: 6, h: 6 },   // 2nd premolar
    { id: "14", shape: "rect", x: 27, y: 14, w: 5, h: 6 },   // 1st premolar
    { id: "13", shape: "rect", x: 31, y: 11, w: 5, h: 7 },   // canine
    { id: "12", shape: "rect", x: 36, y: 9, w: 4, h: 7 },   // lateral incisor
    { id: "11", shape: "rect", x: 41, y: 8, w: 7, h: 8 },   // central incisor

    // Q2 — Upper Left (patient's left = screen RIGHT) — mirror of Q1
    { id: "21", shape: "rect", x: 52, y: 8, w: 7, h: 8 },   // central incisor
    { id: "22", shape: "rect", x: 60, y: 9, w: 4, h: 7 },   // lateral incisor
    { id: "23", shape: "rect", x: 64, y: 11, w: 5, h: 7 },   // canine
    { id: "24", shape: "rect", x: 68, y: 14, w: 5, h: 6 },   // 1st premolar
    { id: "25", shape: "rect", x: 72, y: 17, w: 6, h: 6 },   // 2nd premolar
    { id: "26", shape: "rect", x: 76, y: 22, w: 7, h: 7 },   // 1st molar
    { id: "27", shape: "rect", x: 81, y: 29, w: 7, h: 7 },   // 2nd molar — last visible (far right)
    { id: "28", shape: "rect", x: 85, y: 37, w: 5, h: 5 },   // wisdom — behind arch, in gum above 27
];

const LOWER_TEETH: ZoneDef[] = [
    // Q4 — Lower Right (patient's right = screen LEFT)
    { id: "48", shape: "rect", x: 10, y: 56, w: 5, h: 5 },   // wisdom — behind arch, in gum below 47
    { id: "47", shape: "rect", x: 12, y: 61, w: 7, h: 7 },   // 2nd molar — last visible
    { id: "46", shape: "rect", x: 17, y: 67, w: 7, h: 7 },   // 1st molar
    { id: "45", shape: "rect", x: 22, y: 73, w: 6, h: 6 },   // 2nd premolar
    { id: "44", shape: "rect", x: 27, y: 77, w: 5, h: 6 },   // 1st premolar
    { id: "43", shape: "rect", x: 31, y: 80, w: 5, h: 6 },   // canine
    { id: "42", shape: "rect", x: 36, y: 82, w: 4, h: 7 },   // lateral incisor
    { id: "41", shape: "rect", x: 41, y: 83, w: 7, h: 7 },   // central incisor

    // Q3 — Lower Left (patient's left = screen RIGHT) — mirror of Q4
    { id: "31", shape: "rect", x: 52, y: 83, w: 7, h: 7 },   // central incisor
    { id: "32", shape: "rect", x: 60, y: 82, w: 4, h: 7 },   // lateral incisor
    { id: "33", shape: "rect", x: 64, y: 80, w: 5, h: 6 },   // canine
    { id: "34", shape: "rect", x: 68, y: 77, w: 5, h: 6 },   // 1st premolar
    { id: "35", shape: "rect", x: 72, y: 73, w: 6, h: 6 },   // 2nd premolar
    { id: "36", shape: "rect", x: 76, y: 67, w: 7, h: 7 },   // 1st molar
    { id: "37", shape: "rect", x: 81, y: 61, w: 7, h: 7 },   // 2nd molar — last visible
    { id: "38", shape: "rect", x: 85, y: 56, w: 5, h: 5 },   // wisdom — behind arch, in gum below 37
];

// Soft tissues — zones between the arches
const SOFT_ZONES: ZoneDef[] = [
    { id: "tongue", shape: "rect", x: 33, y: 56, w: 34, h: 18 },  // tongue fills center of lower arch
    { id: "palate", shape: "rect", x: 33, y: 28, w: 34, h: 12 },  // upper palate (behind upper teeth)
    { id: "throat", shape: "rect", x: 40, y: 42, w: 20, h: 12 },  // dark cavity center
];

const ALL_ZONES = [...UPPER_TEETH, ...LOWER_TEETH, ...SOFT_ZONES];

export default function PainMapInteractive() {
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
    const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

    const selectedData = selectedZoneId ? SYMPTOM_DATA[selectedZoneId] : null;

    const getZoneName = useCallback((id: string) => {
        return SYMPTOM_DATA[id]?.title || id;
    }, []);

    const renderZone = useCallback((zone: ZoneDef) => {
        const isHovered = hoveredZoneId === zone.id;
        const isSelected = selectedZoneId === zone.id;
        const isActive = isHovered || isSelected;

        const fill = isActive ? 'rgba(220, 177, 74, 0.35)' : 'transparent';
        const stroke = isActive ? '#dcb14a' : 'rgba(220, 177, 74, 0.15)';
        const strokeWidth = isSelected ? '0.8' : '0.3';

        const commonProps = {
            onClick: () => setSelectedZoneId(zone.id),
            onMouseEnter: () => setHoveredZoneId(zone.id),
            onMouseLeave: () => setHoveredZoneId(null),
            fill,
            stroke,
            strokeWidth,
            rx: 1.5,
            style: { cursor: 'pointer' as const, transition: 'all 0.15s ease' },
        };

        return (
            <g key={zone.id}>
                {zone.shape === 'rect' ? (
                    <rect
                        x={zone.x}
                        y={zone.y}
                        width={zone.w}
                        height={zone.h}
                        {...commonProps}
                    />
                ) : (
                    <path d={zone.d} {...commonProps} />
                )}
            </g>
        );
    }, [hoveredZoneId, selectedZoneId]);

    const renderMap = () => (
        <div style={{ position: 'relative', width: '100%' }}>
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 10,
                }}
            >
                {/* Invisible interactive zones */}
                {ALL_ZONES.map(renderZone)}
            </svg>

            {/* The premium dental image as background */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/dental-map-premium.jpg"
                alt="Mapa bólu zębów"
                style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    pointerEvents: 'none',
                }}
                draggable={false}
            />

            {/* Hover tooltip */}
            {hoveredZoneId && !selectedZoneId && (
                <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.85)',
                    color: '#dcb14a',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    zIndex: 20,
                    border: '1px solid rgba(220,177,74,0.3)',
                    backdropFilter: 'blur(8px)',
                    pointerEvents: 'none',
                }}>
                    {getZoneName(hoveredZoneId)}
                </div>
            )}
        </div>
    );

    const renderList = () => {
        const quadrants = {
            'Góra Prawa (1)': Object.keys(SYMPTOM_DATA).filter(k => k.startsWith('1')),
            'Góra Lewa (2)': Object.keys(SYMPTOM_DATA).filter(k => k.startsWith('2')),
            'Dół Lewa (3)': Object.keys(SYMPTOM_DATA).filter(k => k.startsWith('3')),
            'Dół Prawa (4)': Object.keys(SYMPTOM_DATA).filter(k => k.startsWith('4')),
            'Tkanki Miękkie': ['tongue', 'palate', 'throat', 'cheek-left', 'cheek-right']
        };

        return (
            <div className="w-full p-4 overflow-y-auto max-h-[600px] bg-neutral-900/50 backdrop-blur rounded-xl border border-white/10">
                {Object.entries(quadrants).map(([title, keys]) => (
                    <div key={title} className="mb-6">
                        <h3 className="text-[#dcb14a] font-bold text-sm uppercase mb-3 border-b border-[#dcb14a]/20 pb-1">{title}</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {keys.map(key => {
                                const info = SYMPTOM_DATA[key];
                                if (!info) return null;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedZoneId(key)}
                                        className={`text-xs p-2 rounded border transition-all text-left ${selectedZoneId === key
                                            ? 'bg-[#dcb14a] text-black border-[#dcb14a]'
                                            : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:border-[#dcb14a]/50'
                                            }`}
                                    >
                                        <div className="font-bold">{key}</div>
                                        <div className="truncate opacity-80">{info.title}</div>
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
        <div className="w-full h-full relative flex flex-col">
            {/* VIEW TOGGLE */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] flex gap-2 bg-black/80 p-1 rounded-full border border-white/10 shadow-xl backdrop-blur">
                <button
                    onClick={() => setViewMode('map')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${viewMode === 'map' ? 'bg-[#dcb14a] text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    Mapa 🗺️
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${viewMode === 'list' ? 'bg-[#dcb14a] text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    Lista 📋
                </button>
            </div>

            <div style={{ width: '100%', position: 'relative', zIndex: 50 }}>
                {viewMode === 'map' ? renderMap() : renderList()}

                {/* DETAIL MODAL */}
                {selectedData && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem',
                            pointerEvents: 'auto'
                        }}
                    >
                        <div
                            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
                            onClick={() => setSelectedZoneId(null)}
                        />
                        <div className="bg-[#0a0a0a] border border-[#dcb14a]/50 rounded-2xl p-6 w-full max-w-lg shadow-2xl shadow-[#dcb14a]/10 relative overflow-y-auto max-h-[90vh] flex flex-col items-center text-center z-[10000]">
                            <button
                                onClick={() => setSelectedZoneId(null)}
                                className="absolute top-3 right-3 text-gray-400 hover:text-[#dcb14a] transition-colors"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>

                            {/* Urgency Badge */}
                            <div className={`mb-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedData.urgency === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                selectedData.urgency === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}>
                                {selectedData.urgency === 'high' ? '⚠️ Pilne — umów wizytę' :
                                    selectedData.urgency === 'medium' ? '🔶 Umiarkowane' :
                                        '🟢 Łagodne'}
                            </div>

                            <h3 className="text-2xl font-heading text-[#dcb14a] mb-1">{selectedData.title}</h3>
                            {selectedZoneId && /^\d+$/.test(selectedZoneId) && (
                                <span className="text-xs text-gray-500 mb-3">Ząb nr {selectedZoneId}</span>
                            )}
                            <p className="text-sm text-gray-400 mb-6 font-light">{selectedData.description}</p>

                            <div className="w-full space-y-3 mb-6 text-left">
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <span className="text-xs font-bold text-[#dcb14a] uppercase tracking-wider block mb-2">Możliwe objawy</span>
                                    <ul className="space-y-1">
                                        {selectedData.symptoms.map((s, i) => (
                                            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                                <span className="text-[#dcb14a] mt-0.5">•</span>
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <span className="text-xs font-bold text-[#dcb14a] uppercase tracking-wider block mb-2">Rada specjalisty</span>
                                    <p className="text-sm text-gray-300 leading-relaxed">{selectedData.advice}</p>
                                </div>
                            </div>

                            <Link
                                href="/rezerwacja"
                                className="inline-block w-full bg-[#dcb14a] hover:bg-[#c59d3e] text-black font-bold py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-[#dcb14a]/20 text-center"
                            >
                                Rezerwuj wizytę
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
