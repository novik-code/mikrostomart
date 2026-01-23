"use client";

import { useState } from 'react';
import { SYMPTOM_DATA } from './SymptomData';
import Link from 'next/link';

// Detailed Anatomy Mapping
// Coordinates approximated for "intraoral_anatomy_natural.png"
const ZONES = [
    // --- SOFT TISSUES ---
    { id: "tongue", label: "Język", top: "55%", left: "35%", width: "30%", height: "25%", borderRadius: "40%" },
    { id: "palate", label: "Podniebienie", top: "40%", left: "35%", width: "30%", height: "15%", borderRadius: "50%" },
    { id: "throat", label: "Gardło", top: "50%", left: "42%", width: "16%", height: "10%", borderRadius: "50%" }, // Deep center
    { id: "cheek-left", label: "Policzek Lewy", top: "35%", left: "5%", width: "10%", height: "40%", borderRadius: "20%" },
    { id: "cheek-right", label: "Policzek Prawy", top: "35%", left: "85%", width: "10%", height: "40%", borderRadius: "20%" },

    // --- UPPER ARCH (Górny Łuk) ---
    // Start from Right Molars (Screen Left) -> Front -> Left Molars (Screen Right)
    // Wait, standard dental view: Patient's Right is on Left side of screen.
    // So "Screen Left" = "Right Quadrant (1)"

    // Q1 (Upper Right) - Screen Left Side
    { id: "18", label: "18", top: "60%", left: "20%", width: "7%", height: "6%", borderRadius: "40%" },
    { id: "17", label: "17", top: "54%", left: "20%", width: "7%", height: "6%", borderRadius: "40%" },
    { id: "16", label: "16", top: "48%", left: "21%", width: "7%", height: "6%", borderRadius: "40%" },
    { id: "15", label: "15", top: "42%", left: "22%", width: "6%", height: "5%", borderRadius: "50%" },
    { id: "14", label: "14", top: "37%", left: "24%", width: "6%", height: "5%", borderRadius: "50%" },
    { id: "13", label: "13", top: "33%", left: "27%", width: "5%", height: "5%", borderRadius: "50%" },
    { id: "12", label: "12", top: "30%", left: "32%", width: "5%", height: "5%", borderRadius: "50%" },
    { id: "11", label: "11", top: "28%", left: "42%", width: "6%", height: "6%", borderRadius: "30%" },

    // Q2 (Upper Left) - Screen Right Side
    { id: "21", label: "21", top: "28%", left: "52%", width: "6%", height: "6%", borderRadius: "30%" },
    { id: "22", label: "22", top: "30%", left: "63%", width: "5%", height: "5%", borderRadius: "50%" },
    { id: "23", label: "23", top: "33%", left: "68%", width: "5%", height: "5%", borderRadius: "50%" },
    { id: "24", label: "24", top: "37%", left: "70%", width: "6%", height: "5%", borderRadius: "50%" },
    { id: "25", label: "25", top: "42%", left: "72%", width: "6%", height: "5%", borderRadius: "50%" },
    { id: "26", label: "26", top: "48%", left: "73%", width: "7%", height: "6%", borderRadius: "40%" },
    { id: "27", label: "27", top: "54%", left: "73%", width: "7%", height: "6%", borderRadius: "40%" },
    { id: "28", label: "28", top: "60%", left: "73%", width: "7%", height: "6%", borderRadius: "40%" },


    // --- LOWER ARCH (Dolny Łuk) ---
    // Usually visualized below tongue or overlapping. In "open mouth" view, lower teeth are at the bottom.
    // Assuming U-shape at bottom.

    // Q4 (Lower Right) - Screen Left
    { id: "48", label: "48", top: "75%", left: "20%", width: "7%", height: "6%", borderRadius: "40%" },
    { id: "47", label: "47", top: "80%", left: "22%", width: "6%", height: "5%", borderRadius: "40%" },
    { id: "46", label: "46", top: "84%", left: "25%", width: "6%", height: "5%", borderRadius: "40%" },
    { id: "45", label: "45", top: "87%", left: "30%", width: "5%", height: "5%", borderRadius: "50%" },
    { id: "44", label: "44", top: "88%", left: "35%", width: "5%", height: "5%", borderRadius: "50%" },
    { id: "43", label: "43", top: "89%", left: "40%", width: "4%", height: "4%", borderRadius: "50%" },
    { id: "42", label: "42", top: "89%", left: "44%", width: "4%", height: "4%", borderRadius: "50%" },
    { id: "41", label: "41", top: "89%", left: "48%", width: "4%", height: "4%", borderRadius: "50%" },

    // Q3 (Lower Left) - Screen Right
    { id: "31", label: "31", top: "89%", left: "52%", width: "4%", height: "4%", borderRadius: "50%" },
    { id: "32", label: "32", top: "89%", left: "56%", width: "4%", height: "4%", borderRadius: "50%" },
    { id: "33", label: "33", top: "89%", left: "60%", width: "4%", height: "4%", borderRadius: "50%" },
    { id: "34", label: "34", top: "88%", left: "64%", width: "5%", height: "5%", borderRadius: "50%" },
    { id: "35", label: "35", top: "87%", left: "69%", width: "5%", height: "5%", borderRadius: "50%" },
    { id: "36", label: "36", top: "84%", left: "73%", width: "6%", height: "5%", borderRadius: "40%" },
    { id: "37", label: "37", top: "80%", left: "76%", width: "6%", height: "5%", borderRadius: "40%" },
    { id: "38", label: "38", top: "75%", left: "78%", width: "7%", height: "6%", borderRadius: "40%" },

];

export default function PainMapInteractive() {
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
    const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

    const selectedData = selectedZoneId ? SYMPTOM_DATA[selectedZoneId] : null;

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 50,
                pointerEvents: 'none'
            }}
        >
            {/* ZONES LAYER - HIT AREAS */}
            {ZONES.map((zone) => (
                <div
                    key={zone.id}
                    onClick={() => {
                        console.log("Clicked zone:", zone.id);
                        setSelectedZoneId(zone.id);
                    }}
                    onMouseEnter={() => setHoveredZoneId(zone.id)}
                    onMouseLeave={() => setHoveredZoneId(null)}
                    className="cursor-pointer group"
                    style={{
                        position: 'absolute',
                        top: zone.top,
                        left: zone.left,
                        width: zone.width,
                        height: zone.height,
                        borderRadius: zone.borderRadius || '50%',
                        pointerEvents: 'auto',

                        // Visuals
                        backgroundColor: (hoveredZoneId === zone.id || selectedZoneId === zone.id)
                            ? 'rgba(220, 177, 74, 0.4)'
                            : 'transparent',

                        // Subtle Border Always Visible to indicate "Clickable"
                        border: (hoveredZoneId === zone.id)
                            ? '2px solid #dcb14a'
                            : '1px dashed rgba(255,255,255,0.15)',

                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {/* Tiny Label on Hover */}
                    <span
                        className={`text-[8px] md:text-[10px] text-white bg-black/50 px-1 rounded transition-opacity duration-200 ${hoveredZoneId === zone.id ? 'opacity-100' : 'opacity-0'}`}
                        style={{ pointerEvents: 'none' }}
                    >
                        {zone.label}
                    </span>
                </div>
            ))}

            {/* MODAL - FIXED */}
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
                    {/* Backdrop */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(5px)'
                        }}
                        onClick={() => setSelectedZoneId(null)}
                    />

                    {/* Card */}
                    <div
                        className="bg-[#0a0a0a] border border-[#dcb14a] rounded-xl p-6 w-full max-w-lg shadow-2xl relative overflow-y-auto max-h-[90vh] flex flex-col items-center text-center"
                        style={{ position: 'relative', zIndex: 10000 }}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedZoneId(null)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-[#dcb14a] transition-colors"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>

                        <div className="w-12 h-12 rounded-full bg-[#dcb14a]/10 flex items-center justify-center mb-4 border border-[#dcb14a]/30">
                            <span className="text-2xl">🦷</span>
                        </div>

                        <h3 className="text-2xl font-heading text-[#dcb14a] mb-2">
                            {selectedData.title}
                        </h3>
                        <p className="text-sm text-gray-400 mb-6 font-light italic max-w-xs">
                            {selectedData.description}
                        </p>

                        <div className="w-full space-y-6 text-left">
                            <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                                <h4 className="text-[#dcb14a] text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#dcb14a]"></span>
                                    Typowe objawy
                                </h4>
                                <ul className="text-sm text-gray-300 space-y-2">
                                    {selectedData.symptoms.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-gray-600 mt-1">›</span>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className={`p-4 rounded-lg border ${selectedData.urgency === 'high' ? 'bg-red-900/10 border-red-500/30' : 'bg-blue-900/10 border-blue-500/30'}`}>
                                <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 ${selectedData.urgency === 'high' ? 'text-red-400' : 'text-blue-400'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${selectedData.urgency === 'high' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                                    Zalecenie
                                </h4>
                                <p className="text-gray-200 text-sm leading-relaxed">
                                    {selectedData.advice}
                                </p>
                            </div>
                        </div>

                        <Link
                            href="/rezerwacja"
                            className="w-full mt-6 bg-[#dcb14a] hover:bg-[#c59d3e] text-black font-bold py-4 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#dcb14a]/20"
                        >
                            Umów wizytę dla tego obszaru
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
