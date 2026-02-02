"use client";

import { useState } from 'react';
import { SYMPTOM_DATA } from './SymptomData';
import Link from 'next/link';

// --- HELPER: POLAR TO CARTESIAN ---
function polarToCartesian(centerX: number, centerY: number, radiusX: number, radiusY: number, angleInDegrees: number) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radiusX * Math.cos(angleInRadians)),
        y: centerY + (radiusY * Math.sin(angleInRadians))
    };
}

// --- HELPER: SVG ARC PATH ---
function describeSector(x: number, y: number, innerRx: number, innerRy: number, outerRx: number, outerRy: number, startAngle: number, endAngle: number) {
    const startOuter = polarToCartesian(x, y, outerRx, outerRy, endAngle);
    const endOuter = polarToCartesian(x, y, outerRx, outerRy, startAngle);
    const startInner = polarToCartesian(x, y, innerRx, innerRy, endAngle);
    const endInner = polarToCartesian(x, y, innerRx, innerRy, startAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    // Draw the shape:
    // 1. Move to Start Outer
    // 2. Arc to End Outer
    // 3. Line to Start Inner (which is actually endAngle for inner)
    // 4. Arc to End Inner
    // 5. Close path

    // Note: Inner arc is drawn in reverse (End -> Start) to close loop properly

    const d = [
        "M", startOuter.x, startOuter.y,
        "A", outerRx, outerRy, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
        "L", endInner.x, endInner.y,
        "A", innerRx, innerRy, 0, largeArcFlag, 1, startInner.x, startInner.y,
        "Z"
    ].join(" ");

    return d;
}

// --- TEETH DEFINITIONS ---
// We map each tooth to a start/end angle.
// 0 degrees is Top (12 o'clock). 
// Negative goes Left, Positive goes Right (Screen view).
const TEETH_ANGLES = [
    // UPPER RIGHT (Q1) - Screen Left
    { id: "18", start: -75, end: -60 },
    { id: "17", start: -60, end: -48 },
    { id: "16", start: -48, end: -36 },
    { id: "15", start: -36, end: -26 },
    { id: "14", start: -26, end: -18 },
    { id: "13", start: -18, end: -10 },
    { id: "12", start: -10, end: -4 },
    { id: "11", start: -4, end: 0 },

    // UPPER LEFT (Q2) - Screen Right
    { id: "21", start: 0, end: 4 },
    { id: "22", start: 4, end: 10 },
    { id: "23", start: 10, end: 18 },
    { id: "24", start: 18, end: 26 },
    { id: "25", start: 26, end: 36 },
    { id: "26", start: 36, end: 48 },
    { id: "27", start: 48, end: 60 },
    { id: "28", start: 60, end: 75 },

    // LOWER RIGHT (Q4) - Screen Left (Bottom)
    // Angles for bottom: 180 is Bottom (6 o'clock).
    { id: "48", start: 255, end: 240 }, // -105 to -120 from top, normalized
    { id: "47", start: 240, end: 228 },
    { id: "46", start: 228, end: 216 },
    { id: "45", start: 216, end: 206 },
    { id: "44", start: 206, end: 198 },
    { id: "43", start: 198, end: 190 },
    { id: "42", start: 190, end: 184 },
    { id: "41", start: 184, end: 180 },

    // LOWER LEFT (Q3) - Screen Right (Bottom)
    { id: "31", start: 180, end: 176 },
    { id: "32", start: 176, end: 170 },
    { id: "33", start: 170, end: 162 },
    { id: "34", start: 162, end: 154 },
    { id: "35", start: 154, end: 144 },
    { id: "36", start: 144, end: 132 },
    { id: "37", start: 132, end: 120 },
    { id: "38", start: 120, end: 105 },
];

const SOFT_TISSUES = [
    // Simple ellipses for soft tissues
    { id: "tongue", label: "Język", cx: 50, cy: 50, rx: 15, ry: 12 },
    { id: "palate", label: "Podniebienie", cx: 50, cy: 20, rx: 15, ry: 8 },
    { id: "throat", label: "Gardło", cx: 50, cy: 35, rx: 8, ry: 5 },
];

export default function PainMapInteractive() {
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
    const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

    const selectedData = selectedZoneId ? SYMPTOM_DATA[selectedZoneId] : null;

    // Config for the dental arches
    // Adjusted for the new custom image integration
    const UPPER_ARCH = { cx: 50, cy: 35, innerRx: 24, innerRy: 20, outerRx: 34, outerRy: 30 };
    const LOWER_ARCH = { cx: 50, cy: 35, innerRx: 26, innerRy: 22, outerRx: 36, outerRy: 32 };

    const renderMap = () => (
        <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }}
        >
            {/* BACKGROUND IMAGE EMBEDDED IN SVG FOR PERFECT ALIGNMENT */}
            <image
                href="/custom-pain-map.jpg"
                width="100"
                height="100"
                preserveAspectRatio="none"
                style={{ opacity: 0.9 }}
            />

            {/* TEETH SECTORS */}
            {TEETH_ANGLES.map((tooth) => {
                const isUpper = parseInt(tooth.id) < 30;
                const config = isUpper ? UPPER_ARCH : LOWER_ARCH;
                const d = describeSector(
                    config.cx, config.cy,
                    config.innerRx, config.innerRy,
                    config.outerRx, config.outerRy,
                    tooth.start, tooth.end
                );

                return (
                    <path
                        key={tooth.id}
                        d={d}
                        onClick={() => setSelectedZoneId(tooth.id)}
                        onMouseEnter={() => setHoveredZoneId(tooth.id)}
                        onMouseLeave={() => setHoveredZoneId(null)}
                        fill={(hoveredZoneId === tooth.id || selectedZoneId === tooth.id) ? 'rgba(220, 177, 74, 0.6)' : 'transparent'}
                        stroke={(hoveredZoneId === tooth.id) ? '#dcb14a' : 'rgba(255,255,255,0.05)'}
                        strokeWidth="0.5"
                        className="cursor-pointer transition-all duration-200"
                    />
                );
            })}

            {/* SOFT TISSUE ELLIPSES */}
            {SOFT_TISSUES.map((tissue) => (
                <ellipse
                    key={tissue.id}
                    cx={tissue.cx}
                    cy={tissue.cy}
                    rx={tissue.rx}
                    ry={tissue.ry}
                    onClick={() => setSelectedZoneId(tissue.id)}
                    onMouseEnter={() => setHoveredZoneId(tissue.id)}
                    onMouseLeave={() => setHoveredZoneId(null)}
                    fill={(hoveredZoneId === tissue.id || selectedZoneId === tissue.id) ? 'rgba(220, 177, 74, 0.6)' : 'transparent'}
                    stroke={(hoveredZoneId === tissue.id) ? '#dcb14a' : 'rgba(255,255,255,0.05)'}
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                    className="cursor-pointer transition-all duration-200"
                />
            ))}

            {/* LABELS ON HOVER */}
            {hoveredZoneId && (
                <text
                    x="50"
                    y="95"
                    textAnchor="middle"
                    fill="#dcb14a"
                    fontSize="4"
                    fontWeight="bold"
                    style={{ pointerEvents: 'none', textShadow: '0 1px 2px black' }}
                >
                    {selectedZoneId === hoveredZoneId ? "WYBRANO: " : ""}{SYMPTOM_DATA[hoveredZoneId]?.title || hoveredZoneId}
                </text>
            )}
        </svg>
    );

    const renderList = () => {
        // Group keys by quadrant roughly
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

            <div
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    zIndex: 50
                }}
            >
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
