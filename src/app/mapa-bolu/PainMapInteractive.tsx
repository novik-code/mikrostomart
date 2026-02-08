"use client";

import { useState, useCallback } from 'react';
import { SYMPTOM_DATA } from './SymptomData';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────
// PREMIUM DENTAL MAP — Pure SVG, no external images
// Design: Organic, realistic tooth shapes with gradients & glow
// ─────────────────────────────────────────────────────────────

// --- Individual tooth path data (realistic outlines in 100×100 viewBox) ---
// Upper arch (Q1 right side of patient = screen left, Q2 left side = screen right)
// Lower arch (Q4 right = screen left bottom, Q3 left = screen right bottom)

interface ToothDef {
    id: string;
    path: string; // SVG path
    labelX: number;
    labelY: number;
}

// Realistic tooth outlines — each tooth has a unique organic shape
// Upper arch center at ~(50, 28), Lower arch center at ~(50, 72)
const UPPER_TEETH: ToothDef[] = [
    // Q1 — Upper Right (screen LEFT side)
    { id: "18", path: "M14,33 C13,30 14,26 17,25 C19,24 21,26 21,29 C21,32 19,35 17,35 C15,35 14,35 14,33Z", labelX: 15, labelY: 24 },
    { id: "17", path: "M20,28 C19,25 21,22 24,21 C26,20 28,22 28,25 C28,28 26,31 24,31 C22,31 20,30 20,28Z", labelX: 22, labelY: 19 },
    { id: "16", path: "M27,23 C26,20 28,17 31,16 C33,15 35,17 35,20 C35,23 33,26 31,26 C29,26 27,25 27,23Z", labelX: 29, labelY: 14 },
    { id: "15", path: "M33,18 C33,16 34,13 36,12 C38,11 39,13 39,15 C40,18 38,21 37,21 C35,21 33,20 33,18Z", labelX: 35, labelY: 10 },
    { id: "14", path: "M38,14 C38,12 39,10 41,9 C43,8 44,10 44,12 C44,15 43,17 41,17 C39,17 38,16 38,14Z", labelX: 40, labelY: 7 },
    { id: "13", path: "M43,11 C43,9 44,7 46,6 C47,5.5 48,7 48,9 C48,12 47,14 46,14 C44,14 43,13 43,11Z", labelX: 44.5, labelY: 4 },
    { id: "12", path: "M47,9 C47,7 48,5.5 49,5 C50,4.5 51,6 51,8 C51,10 50,12 49.5,12 C48,12 47,11 47,9Z", labelX: 48, labelY: 3 },
    { id: "11", path: "M50,8 C50,6 50.5,4 51.5,3.5 C52.5,3 53.5,5 53.5,7 C53.5,10 52.5,11.5 51.5,11.5 C50.5,11.5 50,10 50,8Z", labelX: 51, labelY: 2 },

    // Q2 — Upper Left (screen RIGHT side) — mirror of Q1
    { id: "21", path: "M53,8 C53,6 53.5,4 54.5,3.5 C55.5,3 56.5,5 56.5,7 C56.5,10 55.5,11.5 54.5,11.5 C53.5,11.5 53,10 53,8Z", labelX: 55, labelY: 2 },
    { id: "22", path: "M56,9 C56,7 56.5,5.5 57.5,5 C58.5,4.5 59,6 59,8 C59,10 58,12 57.5,12 C56.5,12 56,11 56,9Z", labelX: 58, labelY: 3 },
    { id: "23", path: "M58,11 C58,9 59,7 60,6 C61,5.5 62,7 62,9 C62,12 61,14 60,14 C59,14 58,13 58,11Z", labelX: 61, labelY: 4 },
    { id: "24", path: "M62,14 C62,12 63,10 64,9 C65,8 66,10 66,12 C66,15 65,17 64,17 C63,17 62,16 62,14Z", labelX: 65, labelY: 7 },
    { id: "25", path: "M66,18 C66,16 67,13 68,12 C69,11 70,13 70,15 C70,18 69,21 68,21 C67,21 66,20 66,18Z", labelX: 69, labelY: 10 },
    { id: "26", path: "M69,23 C69,20 70,17 72,16 C74,15 76,17 76,20 C76,23 74,26 72,26 C70,26 69,25 69,23Z", labelX: 73, labelY: 14 },
    { id: "27", path: "M75,28 C75,25 76,22 78,21 C80,20 82,22 82,25 C82,28 80,31 78,31 C76,31 75,30 75,28Z", labelX: 80, labelY: 19 },
    { id: "28", path: "M82,33 C82,30 83,26 85,25 C87,24 89,26 89,29 C89,32 87,35 85,35 C83,35 82,35 82,33Z", labelX: 87, labelY: 24 },
];

const LOWER_TEETH: ToothDef[] = [
    // Q4 — Lower Right (screen LEFT bottom)
    { id: "48", path: "M16,67 C15,70 16,74 18,75 C20,76 22,74 22,71 C22,68 20,65 18,65 C16,65 16,66 16,67Z", labelX: 15, labelY: 78 },
    { id: "47", path: "M22,72 C21,75 23,78 25,79 C27,80 29,78 29,75 C29,72 27,69 25,69 C23,69 22,70 22,72Z", labelX: 22, labelY: 82 },
    { id: "46", path: "M28,77 C27,80 29,83 31,84 C33,85 35,83 35,80 C35,77 33,74 31,74 C29,74 28,75 28,77Z", labelX: 29, labelY: 87 },
    { id: "45", path: "M34,82 C34,84 35,87 36,88 C37,89 39,87 39,85 C39,82 38,79 37,79 C35,79 34,80 34,82Z", labelX: 35, labelY: 91 },
    { id: "44", path: "M38,86 C38,88 39,90 41,91 C42,92 44,90 44,88 C44,85 43,83 41,83 C40,83 38,84 38,86Z", labelX: 40, labelY: 93 },
    { id: "43", path: "M43,89 C43,91 44,93 45,94 C46,94.5 47,93 47,91 C47,88 46,86 45,86 C44,86 43,87 43,89Z", labelX: 44, labelY: 96 },
    { id: "42", path: "M47,91 C47,93 47.5,94.5 48.5,95 C49.5,95.5 50,94 50,92 C50,90 49.5,88 49,88 C48,88 47,89 47,91Z", labelX: 48, labelY: 97 },
    { id: "41", path: "M50,92 C50,94 50.5,96 51.5,96.5 C52.5,97 53,95 53,93 C53,90 52.5,88.5 51.5,88.5 C50.5,88.5 50,90 50,92Z", labelX: 51, labelY: 98 },

    // Q3 — Lower Left (screen RIGHT bottom)
    { id: "31", path: "M53,92 C53,94 53.5,96 54.5,96.5 C55.5,97 56,95 56,93 C56,90 55.5,88.5 54.5,88.5 C53.5,88.5 53,90 53,92Z", labelX: 55, labelY: 98 },
    { id: "32", path: "M56,91 C56,93 56.5,94.5 57.5,95 C58.5,95.5 59,94 59,92 C59,90 58.5,88 58,88 C57,88 56,89 56,91Z", labelX: 58, labelY: 97 },
    { id: "33", path: "M59,89 C59,91 60,93 61,94 C62,94.5 63,93 63,91 C63,88 62,86 61,86 C60,86 59,87 59,89Z", labelX: 61, labelY: 96 },
    { id: "34", path: "M62,86 C62,88 63,90 65,91 C66,92 67,90 67,88 C67,85 66,83 65,83 C63,83 62,84 62,86Z", labelX: 65, labelY: 93 },
    { id: "35", path: "M66,82 C66,84 67,87 69,88 C70,89 71,87 71,85 C71,82 70,79 69,79 C67,79 66,80 66,82Z", labelX: 69, labelY: 91 },
    { id: "36", path: "M70,77 C70,80 71,83 73,84 C75,85 77,83 77,80 C77,77 75,74 73,74 C71,74 70,75 70,77Z", labelX: 73, labelY: 87 },
    { id: "37", path: "M76,72 C76,75 77,78 79,79 C81,80 83,78 83,75 C83,72 81,69 79,69 C77,69 76,70 76,72Z", labelX: 80, labelY: 82 },
    { id: "38", path: "M83,67 C83,70 84,74 86,75 C88,76 90,74 90,71 C90,68 88,65 86,65 C84,65 83,66 83,67Z", labelX: 87, labelY: 78 },
];

// Soft tissue zones — made smaller so they don't overlap teeth
const SOFT_TISSUE_ZONES = [
    { id: "tongue", label: "Język", cx: 52, cy: 55, rx: 8, ry: 7 },
    { id: "palate", label: "Podniebienie", cx: 52, cy: 22, rx: 7, ry: 4 },
    { id: "throat", label: "Gardło", cx: 52, cy: 50, rx: 4, ry: 3 },
];

export default function PainMapInteractive() {
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
    const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

    const selectedData = selectedZoneId ? SYMPTOM_DATA[selectedZoneId] : null;

    const getToothFill = useCallback((id: string) => {
        if (selectedZoneId === id) return 'url(#selectedGlow)';
        if (hoveredZoneId === id) return 'url(#hoverGlow)';
        return 'url(#toothGradient)';
    }, [selectedZoneId, hoveredZoneId]);

    const getToothStroke = useCallback((id: string) => {
        if (selectedZoneId === id) return '#dcb14a';
        if (hoveredZoneId === id) return '#f0d68a';
        return 'rgba(180,160,120,0.4)';
    }, [selectedZoneId, hoveredZoneId]);

    const getToothStrokeWidth = useCallback((id: string) => {
        if (selectedZoneId === id || hoveredZoneId === id) return '0.6';
        return '0.3';
    }, [selectedZoneId, hoveredZoneId]);

    const renderTooth = useCallback((tooth: ToothDef) => (
        <g key={tooth.id}>
            <path
                d={tooth.path}
                fill={getToothFill(tooth.id)}
                stroke={getToothStroke(tooth.id)}
                strokeWidth={getToothStrokeWidth(tooth.id)}
                onClick={() => setSelectedZoneId(tooth.id)}
                onMouseEnter={() => setHoveredZoneId(tooth.id)}
                onMouseLeave={() => setHoveredZoneId(null)}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
            />
            {/* Tooth number label — only on hover or selection */}
            {(hoveredZoneId === tooth.id || selectedZoneId === tooth.id) && (
                <text
                    x={tooth.labelX}
                    y={tooth.labelY}
                    textAnchor="middle"
                    fill="#dcb14a"
                    fontSize="2.5"
                    fontWeight="bold"
                    style={{ pointerEvents: 'none', textShadow: '0 0 3px rgba(0,0,0,0.8)' }}
                >
                    {tooth.id}
                </text>
            )}
        </g>
    ), [getToothFill, getToothStroke, getToothStrokeWidth, hoveredZoneId, selectedZoneId]);

    const renderMap = () => (
        <svg
            viewBox="0 0 105 100"
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: '100%', display: 'block' }}
        >
            <defs>
                {/* Tooth base gradient — warm ivory */}
                <radialGradient id="toothGradient" cx="50%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#f5efe0" />
                    <stop offset="60%" stopColor="#e8dcc8" />
                    <stop offset="100%" stopColor="#d4c5a8" />
                </radialGradient>

                {/* Hover glow — warm gold highlight */}
                <radialGradient id="hoverGlow" cx="50%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#fff5d6" />
                    <stop offset="50%" stopColor="#f0d68a" />
                    <stop offset="100%" stopColor="#dcb14a" />
                </radialGradient>

                {/* Selected glow — intense gold */}
                <radialGradient id="selectedGlow" cx="50%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#ffe082" />
                    <stop offset="60%" stopColor="#dcb14a" />
                    <stop offset="100%" stopColor="#c49b30" />
                </radialGradient>

                {/* Gum gradient — realistic pink */}
                <radialGradient id="gumGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#c4697a" />
                    <stop offset="50%" stopColor="#a34d5e" />
                    <stop offset="100%" stopColor="#7a3040" />
                </radialGradient>

                {/* Inner mouth gradient — dark cavity */}
                <radialGradient id="mouthGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#4a2030" />
                    <stop offset="60%" stopColor="#2d1018" />
                    <stop offset="100%" stopColor="#1a0810" />
                </radialGradient>

                {/* Tongue gradient */}
                <radialGradient id="tongueGradient" cx="50%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#d47080" />
                    <stop offset="50%" stopColor="#b85565" />
                    <stop offset="100%" stopColor="#9a404e" />
                </radialGradient>

                {/* Outer glow filter */}
                <filter id="toothShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0.3" stdDeviation="0.5" floodColor="#000000" floodOpacity="0.4" />
                </filter>

                {/* Gold glow for selected */}
                <filter id="goldGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
                    <feFlood floodColor="#dcb14a" floodOpacity="0.6" result="color" />
                    <feComposite in2="blur" operator="in" result="glow" />
                    <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* ─── BACKGROUND ─── */}
            <rect x="0" y="0" width="105" height="100" fill="#080808" />

            {/* ─── UPPER GUM (organic shape) ─── */}
            <path
                d="M10,35 C10,18 20,5 35,3 C42,2 48,1.5 52,1.5 C56,1.5 62,2 69,3 C84,5 94,18 94,35 C94,38 92,40 88,39 C80,37 70,33 52,33 C34,33 24,37 16,39 C12,40 10,38 10,35Z"
                fill="url(#gumGradient)"
                opacity="0.9"
            />

            {/* ─── LOWER GUM (organic shape) ─── */}
            <path
                d="M10,65 C10,82 20,95 35,97 C42,98 48,98.5 52,98.5 C56,98.5 62,98 69,97 C84,95 94,82 94,65 C94,62 92,60 88,61 C80,63 70,67 52,67 C34,67 24,63 16,61 C12,60 10,62 10,65Z"
                fill="url(#gumGradient)"
                opacity="0.9"
            />

            {/* ─── INNER MOUTH (dark area between arches) ─── */}
            <ellipse cx="52" cy="50" rx="30" ry="14" fill="url(#mouthGradient)" opacity="0.8" />

            {/* ─── TONGUE ─── */}
            <ellipse cx="52" cy="55" rx="12" ry="8" fill="url(#tongueGradient)" opacity="0.7" />
            {/* Tongue midline */}
            <line x1="52" y1="48" x2="52" y2="62" stroke="rgba(100,40,50,0.5)" strokeWidth="0.3" />

            {/* ─── UPPER TEETH ─── */}
            <g filter="url(#toothShadow)">
                {UPPER_TEETH.map(renderTooth)}
            </g>

            {/* ─── LOWER TEETH ─── */}
            <g filter="url(#toothShadow)">
                {LOWER_TEETH.map(renderTooth)}
            </g>

            {/* ─── SOFT TISSUE INTERACTIVE ZONES (invisible until hovered) ─── */}
            {SOFT_TISSUE_ZONES.map(zone => (
                <g key={zone.id}>
                    <ellipse
                        cx={zone.cx}
                        cy={zone.cy}
                        rx={zone.rx}
                        ry={zone.ry}
                        fill={hoveredZoneId === zone.id || selectedZoneId === zone.id ? 'rgba(220,177,74,0.25)' : 'transparent'}
                        stroke={hoveredZoneId === zone.id || selectedZoneId === zone.id ? '#dcb14a' : 'transparent'}
                        strokeWidth="0.4"
                        strokeDasharray="1.5,1"
                        onClick={() => setSelectedZoneId(zone.id)}
                        onMouseEnter={() => setHoveredZoneId(zone.id)}
                        onMouseLeave={() => setHoveredZoneId(null)}
                        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    />
                    {(hoveredZoneId === zone.id || selectedZoneId === zone.id) && (
                        <text
                            x={zone.cx}
                            y={zone.cy + 1}
                            textAnchor="middle"
                            fill="#dcb14a"
                            fontSize="2.5"
                            fontWeight="bold"
                            style={{ pointerEvents: 'none' }}
                        >
                            {zone.label}
                        </text>
                    )}
                </g>
            ))}

            {/* ─── HOVER INFO BAR ─── */}
            {hoveredZoneId && !selectedZoneId && (
                <g>
                    <rect x="15" y="92" width="74" height="6" rx="3" fill="rgba(0,0,0,0.7)" />
                    <text
                        x="52"
                        y="96"
                        textAnchor="middle"
                        fill="#dcb14a"
                        fontSize="3"
                        fontWeight="bold"
                        style={{ pointerEvents: 'none' }}
                    >
                        {SYMPTOM_DATA[hoveredZoneId]?.title || hoveredZoneId}
                    </text>
                </g>
            )}
        </svg>
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

            <div style={{ width: '100%', height: '100%', position: 'relative', zIndex: 50 }}>
                {viewMode === 'map' ? renderMap() : renderList()}

                {/* MODAL */}
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
                        <div className="bg-[#0a0a0a] border border-[#dcb14a] rounded-xl p-6 w-full max-w-lg shadow-2xl relative overflow-y-auto max-h-[90vh] flex flex-col items-center text-center z-[10000]">
                            <button
                                onClick={() => setSelectedZoneId(null)}
                                className="absolute top-3 right-3 text-gray-400 hover:text-[#dcb14a]"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>

                            {/* Urgency Indicator */}
                            <div className={`mb-3 px-3 py-1 rounded-full text-xs font-bold uppercase ${selectedData.urgency === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                    selectedData.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                        'bg-green-500/20 text-green-400 border border-green-500/30'
                                }`}>
                                {selectedData.urgency === 'high' ? '⚠️ Pilne' :
                                    selectedData.urgency === 'medium' ? '🔶 Umiarkowane' :
                                        '🟢 Łagodne'}
                            </div>

                            <h3 className="text-2xl font-heading text-[#dcb14a] mb-2">{selectedData.title}</h3>
                            <p className="text-sm text-gray-400 mb-6 font-light">{selectedData.description}</p>

                            <div className="w-full space-y-4 mb-6 text-left">
                                <div className="bg-white/5 p-3 rounded border border-white/5">
                                    <span className="text-xs font-bold text-[#dcb14a] uppercase block mb-1">Objawy</span>
                                    <p className="text-sm text-gray-300">{selectedData.symptoms.join(", ")}</p>
                                </div>
                                <div className="bg-white/5 p-3 rounded border border-white/5">
                                    <span className="text-xs font-bold text-[#dcb14a] uppercase block mb-1">Rada</span>
                                    <p className="text-sm text-gray-300">{selectedData.advice}</p>
                                </div>
                            </div>

                            <Link href="/rezerwacja" className="inline-block w-full bg-[#dcb14a] hover:bg-[#c59d3e] text-black font-bold py-3 rounded-lg transition-colors">
                                Rezerwuj wizytę
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
