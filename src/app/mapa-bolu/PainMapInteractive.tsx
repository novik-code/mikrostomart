"use client";

import { useState } from 'react';
import { SYMPTOM_DATA } from './SymptomData';
import Link from 'next/link';

// ZONES CONFIGURATION
const ZONES = [
    { id: "upper-posterior-left", top: "25%", left: "15%", width: "20%", height: "25%" },
    { id: "upper-front", top: "20%", left: "35%", width: "30%", height: "20%" },
    { id: "upper-posterior-right", top: "25%", left: "65%", width: "20%", height: "25%" },
    { id: "palate", top: "45%", left: "35%", width: "30%", height: "15%" },
    { id: "tongue", top: "60%", left: "35%", width: "30%", height: "20%" },
    { id: "lower-posterior-left", top: "60%", left: "15%", width: "20%", height: "25%" },
    { id: "lower-front", top: "80%", left: "35%", width: "30%", height: "15%" },
    { id: "lower-posterior-right", top: "60%", left: "65%", width: "20%", height: "25%" },
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
                    // pointer-events-auto IS CRITICAL HERE
                    className="cursor-pointer"
                    style={{
                        position: 'absolute',
                        top: zone.top,
                        left: zone.left,
                        width: zone.width,
                        height: zone.height,
                        pointerEvents: 'auto', // Ensure clicks are captured

                        // VISUALS
                        backgroundColor: (hoveredZoneId === zone.id || selectedZoneId === zone.id)
                            ? 'rgba(220, 177, 74, 0.3)' // Highlight
                            : 'transparent',

                        // Border visible only on hover to hint interaction, OR faint always?
                        // User wanted links visual? Let's give a faint border always.
                        border: (hoveredZoneId === zone.id)
                            ? '2px solid #dcb14a'
                            : '1px dashed rgba(255,255,255,0.2)',

                        borderRadius: '30%',
                        transition: 'all 0.2s ease'
                    }}
                />
            ))}

            {/* MODAL - FIXED POSITION TO ESCAPE CONTAINER CLIPPING */}
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
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(4px)'
                        }}
                        onClick={() => setSelectedZoneId(null)}
                    />

                    {/* Card */}
                    <div
                        className="bg-[#111] border border-[#dcb14a] rounded-xl p-6 w-full max-w-md shadow-2xl relative overflow-y-auto max-h-[90vh]"
                        style={{ position: 'relative', zIndex: 10000 }}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedZoneId(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl p-2"
                        >
                            ✕
                        </button>

                        <h3 className="text-xl font-heading text-[#dcb14a] mb-2 pr-8">
                            {selectedData.title}
                        </h3>
                        <p className="text-sm text-gray-400 mb-4 font-light italic">
                            {selectedData.description}
                        </p>

                        <div className="space-y-4">
                            <div>
                                <h4 className="text-white text-sm font-bold uppercase tracking-wide mb-2">Typowe objawy:</h4>
                                <ul className="text-sm text-gray-300 space-y-1 list-disc pl-4">
                                    {selectedData.symptoms.map((s, i) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className={`p-4 rounded-lg border ${selectedData.urgency === 'high' ? 'bg-red-900/20 border-red-500' : 'bg-blue-900/20 border-blue-500'}`}>
                                <h4 className={`text-sm font-bold uppercase tracking-wide mb-1 ${selectedData.urgency === 'high' ? 'text-red-400' : 'text-blue-400'}`}>
                                    Rada Doktora:
                                </h4>
                                <p className="text-gray-200 text-sm">
                                    {selectedData.advice}
                                </p>
                            </div>

                            <Link
                                href="/rezerwacja"
                                className="block w-full text-center bg-[#dcb14a] hover:bg-[#c59d3e] text-black font-bold py-3 rounded-lg transition-colors mt-4"
                            >
                                Umów konsultację teraz
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
