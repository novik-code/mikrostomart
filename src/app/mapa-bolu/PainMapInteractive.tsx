"use client";

import { useState } from 'react';
import { SYMPTOM_DATA } from './SymptomData';
import Link from 'next/link';

// SVG Coordinate System (0-100)
// The mouth is roughly in the center 50% of the image.
// We'll use a tighter coordinate set.
const ZONES = [
    // --- SOFT TISSUES ---
    { id: "tongue", label: "Język", cx: 50, cy: 60, r: 12 },
    { id: "palate", label: "Podniebienie", cx: 50, cy: 35, r: 10 },
    { id: "throat", label: "Gardło", cx: 50, cy: 45, r: 6 },
    { id: "cheek-left", label: "Policzek Lewy", cx: 15, cy: 50, r: 8 },
    { id: "cheek-right", label: "Policzek Prawy", cx: 85, cy: 50, r: 8 },

    // --- UPPER ARCH (Górny Łuk) ---
    // Y approx 20-40 range
    // Width approx 30-70 range

    // Right Quadrant (Screen Left)
    { id: "18", label: "18", cx: 28, cy: 52, r: 3 },
    { id: "17", label: "17", cx: 29, cy: 46, r: 3 },
    { id: "16", label: "16", cx: 31, cy: 40, r: 3.5 },
    { id: "15", label: "15", cx: 33, cy: 35, r: 2.5 },
    { id: "14", label: "14", cx: 36, cy: 31, r: 2.5 },
    { id: "13", label: "13", cx: 40, cy: 28, r: 2.5 },
    { id: "12", label: "12", cx: 44, cy: 26, r: 2.5 },
    { id: "11", label: "11", cx: 48, cy: 25, r: 2.8 },

    // Left Quadrant (Screen Right)
    { id: "21", label: "21", cx: 52, cy: 25, r: 2.8 },
    { id: "22", label: "22", cx: 56, cy: 26, r: 2.5 },
    { id: "23", label: "23", cx: 60, cy: 28, r: 2.5 },
    { id: "24", label: "24", cx: 64, cy: 31, r: 2.5 },
    { id: "25", label: "25", cx: 67, cy: 35, r: 2.5 },
    { id: "26", label: "26", cx: 69, cy: 40, r: 3.5 },
    { id: "27", label: "27", cx: 71, cy: 46, r: 3 },
    { id: "28", label: "28", cx: 72, cy: 52, r: 3 },


    // --- LOWER ARCH (Dolny Łuk) ---
    // Y approx 70-90 range, curving up

    // Right Quadrant (Screen Left)
    { id: "48", label: "48", cx: 29, cy: 62, r: 3 },
    { id: "47", label: "47", cx: 30, cy: 68, r: 3 },
    { id: "46", label: "46", cx: 32, cy: 74, r: 3 },
    { id: "45", label: "45", cx: 35, cy: 79, r: 2.5 },
    { id: "44", label: "44", cx: 39, cy: 82, r: 2.5 },
    { id: "43", label: "43", cx: 42, cy: 84, r: 2 },
    { id: "42", label: "42", cx: 45, cy: 85, r: 2 },
    { id: "41", label: "41", cx: 48, cy: 85, r: 2 },

    // Left Quadrant (Screen Right)
    { id: "31", label: "31", cx: 52, cy: 85, r: 2 },
    { id: "32", label: "32", cx: 55, cy: 85, r: 2 },
    { id: "33", label: "33", cx: 58, cy: 84, r: 2 },
    { id: "34", label: "34", cx: 61, cy: 82, r: 2.5 },
    { id: "35", label: "35", cx: 65, cy: 79, r: 2.5 },
    { id: "36", label: "36", cx: 68, cy: 74, r: 3 },
    { id: "37", label: "37", cx: 70, cy: 68, r: 3 },
    { id: "38", label: "38", cx: 71, cy: 62, r: 3 },
];

export default function PainMapInteractive() {
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
    const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

    const selectedData = selectedZoneId ? SYMPTOM_DATA[selectedZoneId] : null;

    return (
        <div className="absolute inset-0 z-50">
            {/* SVG OVERLAY */}
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full h-full"
                style={{ filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.5))' }}
            >
                {ZONES.map((zone) => (
                    <g
                        key={zone.id}
                        onClick={() => setSelectedZoneId(zone.id)}
                        onMouseEnter={() => setHoveredZoneId(zone.id)}
                        onMouseLeave={() => setHoveredZoneId(null)}
                        className="cursor-pointer transition-all duration-300"
                        style={{ transformOrigin: `${zone.cx}% ${zone.cy}%` }}
                    >
                        {/* Interactive Circle */}
                        <circle
                            cx={zone.cx}
                            cy={zone.cy}
                            r={zone.r}
                            fill={
                                (hoveredZoneId === zone.id || selectedZoneId === zone.id)
                                    ? 'rgba(220, 177, 74, 0.4)'
                                    : 'transparent'
                            }
                            stroke={
                                (hoveredZoneId === zone.id)
                                    ? '#dcb14a'
                                    : 'rgba(255,255,255,0.1)'
                            }
                            strokeWidth={hoveredZoneId === zone.id ? 0.5 : 0.2}
                            strokeDasharray={hoveredZoneId === zone.id ? '0' : '2,1'}
                            className="transition-all duration-300"
                        />

                        {/* Label (Only visible on hover/select) */}
                        {(hoveredZoneId === zone.id) && (
                            <text
                                x={zone.cx}
                                y={zone.cy}
                                fontSize="3"
                                fill="white"
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                style={{ pointerEvents: 'none', textShadow: '0px 1px 2px black' }}
                            >
                                {zone.label}
                            </text>
                        )}
                    </g>
                ))}
            </svg>

            {/* MODAL (Unchanged logic, just keeping it here) */}
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

                        <div className="w-12 h-12 rounded-full bg-[#dcb14a]/10 flex items-center justify-center mb-4 border border-[#dcb14a]/30">
                            <span className="text-2xl">🦷</span>
                        </div>

                        <h3 className="text-2xl font-heading text-[#dcb14a] mb-2">{selectedData.title}</h3>
                        <p className="text-sm text-gray-400 mb-6 font-light italic">{selectedData.description}</p>

                        <div className="w-full space-y-6 text-left">
                            <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                                <h4 className="text-[#dcb14a] text-xs font-bold uppercase tracking-widest mb-3">Typowe objawy</h4>
                                <ul className="text-sm text-gray-300 space-y-2">
                                    {selectedData.symptoms.map((s, i) => <li key={i} className="flex gap-2"><span className="text-gray-500">›</span>{s}</li>)}
                                </ul>
                            </div>

                            <div className={`p-4 rounded-lg border ${selectedData.urgency === 'high' ? 'bg-red-900/10 border-red-500/30' : 'bg-blue-900/10 border-blue-500/30'}`}>
                                <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 ${selectedData.urgency === 'high' ? 'text-red-400' : 'text-blue-400'}`}>Zalecenie</h4>
                                <p className="text-gray-200 text-sm">{selectedData.advice}</p>
                            </div>
                        </div>

                        <Link href="/rezerwacja" className="w-full mt-6 bg-[#dcb14a] hover:bg-[#c59d3e] text-black font-bold py-4 rounded-lg shadow-lg hover:shadow-[#dcb14a]/20 transition-all">
                            Umów wizytę
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
