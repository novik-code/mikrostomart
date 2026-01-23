"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SYMPTOM_DATA, SymptomInfo } from './SymptomData';
import Link from 'next/link';

// ZONES CONFIGURATION (Percentages for robust responsiveness)
// Top/Left/Width/Height are relative to the image container
const ZONES = [
    { id: "upper-posterior-left", top: "25%", left: "15%", width: "20%", height: "25%" },  // Upper Left Molars (Image Left is Patient Right? No, usually mirrored. Assuming standard view: Left side of screen = Patient Right)
    // Wait, dental charts are usually mirrored (Left on screen = Right in mouth). Let's stick to screen-relative names for code clarity, but map to logic correctly.
    // For simplicity: "left" means Screen Left.

    { id: "upper-front", top: "20%", left: "35%", width: "30%", height: "20%" },           // Upper Incisors
    { id: "upper-posterior-right", top: "25%", left: "65%", width: "20%", height: "25%" }, // Upper Right Molars

    { id: "palate", top: "45%", left: "35%", width: "30%", height: "15%" },                // Palate (Center)

    { id: "tongue", top: "60%", left: "35%", width: "30%", height: "20%" },                // Tongue (Center Bottom)

    { id: "lower-posterior-left", top: "60%", left: "15%", width: "20%", height: "25%" },  // Lower Left Molars
    { id: "lower-front", top: "80%", left: "35%", width: "30%", height: "15%" },           // Lower Incisors
    { id: "lower-posterior-right", top: "60%", left: "65%", width: "20%", height: "25%" }, // Lower Right Molars
];

export default function PainMapInteractive() {
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
    const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

    const selectedData = selectedZoneId ? SYMPTOM_DATA[selectedZoneId] : null;

    return (
        <div className="absolute inset-0 z-50 pointer-events-none">
            {/* ZONES LAYER - DEBUG MODE ACTIVE */}
            {ZONES.map((zone) => (
                <div
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    onMouseEnter={() => setHoveredZoneId(zone.id)}
                    onMouseLeave={() => setHoveredZoneId(null)}
                    className="absolute cursor-pointer transition-all duration-300 pointer-events-auto"
                    style={{
                        top: zone.top,
                        left: zone.left,
                        width: zone.width,
                        height: zone.height,
                        // DEBUG: Always show a red border so user knows where to click
                        border: '2px dashed rgba(255, 0, 0, 0.5)',

                        backgroundColor: (hoveredZoneId === zone.id || selectedZoneId === zone.id)
                            ? 'rgba(220, 177, 74, 0.4)' // Stronger Gold
                            : 'rgba(255, 255, 255, 0.1)', // Slight white tint to show zone exists
                        borderRadius: '30%', // Soft shapes
                        boxShadow: (selectedZoneId === zone.id)
                            ? '0 0 20px rgba(220, 177, 74, 0.8)'
                            : 'none',
                    }}
                >
                    {/* Pulsing Dot Effect on Center */}
                    {(hoveredZoneId === zone.id || selectedZoneId === zone.id) && (
                        <motion.div
                            layoutId="active-glow"
                            className="absolute inset-0 bg-[#dcb14a] opacity-20 blur-xl rounded-full"
                        />
                    )}
                </div>
            ))}

            {/* MODAL / BOTTOM SHEET */}
            <AnimatePresence>
                {selectedData && (
                    <div className="absolute inset-0 z-50 pointer-events-none flex items-end md:items-center justify-center p-4">
                        {/* Backdrop Click to Close */}
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                            onClick={() => setSelectedZoneId(null)}
                        />

                        {/* Card */}
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            className="bg-[#111] border border-[#dcb14a] rounded-t-2xl md:rounded-2xl p-6 w-full max-w-md shadow-2xl pointer-events-auto relative max-h-[80vh] overflow-y-auto"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedZoneId(null)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white"
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
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
