"use client";

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

// Defined Zones with ABSOLUTE positions (percentages for responsiveness)
const ZONES = [
    { id: "top-left", label: "Górne Lewe (Trzonowe)", top: "0%", left: "0%", width: "35%", height: "40%" },
    { id: "top-front", label: "Górne Jedynki/Dwójki (Przód)", top: "0%", left: "35%", width: "30%", height: "35%" },
    { id: "top-right", label: "Górne Prawe (Trzonowe)", top: "0%", left: "65%", width: "35%", height: "40%" },
    { id: "palate", label: "Podniebienie / Język", top: "35%", left: "25%", width: "50%", height: "30%" },
    { id: "bottom-left", label: "Dolne Lewe (Trzonowe)", top: "65%", left: "0%", width: "35%", height: "35%" },
    { id: "bottom-front", label: "Dolne Jedynki/Dwójki (Przód)", top: "65%", left: "35%", width: "30%", height: "35%" },
    { id: "bottom-right", label: "Dolne Prawe (Trzonowe)", top: "65%", left: "65%", width: "35%", height: "35%" },
];

interface TeethVisualProps {
    onZoneSelect: (zoneId: string, label: string) => void;
    selectedZone: string | null;
}

export default function TeethVisualV2({ onZoneSelect, selectedZone }: TeethVisualProps) {
    return (
        <div className="relative w-full max-w-[600px] mx-auto aspect-[4/3] rounded-2xl overflow-hidden border-2 border-[#dcb14a]/30 shadow-2xl bg-black/80">

            {/* Base Anatomy Image */}
            <div className="absolute inset-0 p-4">
                <Image
                    src="/intraoral_anatomy_natural.png"
                    alt="Anatomia Jamy Ustnej"
                    fill
                    className="object-contain"
                    priority
                />
            </div>

            {/* CLICK LAYER - ABSOLUTE GRID */}
            <div className="absolute inset-0 z-20 m-4">
                {ZONES.map((zone) => (
                    <button
                        key={zone.id}
                        onClick={() => onZoneSelect(zone.id, zone.label)}
                        className="absolute transition-all duration-200"
                        style={{
                            top: zone.top,
                            left: zone.left,
                            width: zone.width,
                            height: zone.height,
                            border: '1px solid rgba(255, 255, 255, 0.05)', // Subtle guide
                            backgroundColor: selectedZone === zone.id ? 'rgba(220, 177, 74, 0.3)' : 'transparent',
                        }}
                    >
                        {/* Hover Effect */}
                        <div className="absolute inset-0 bg-[#dcb14a] opacity-0 hover:opacity-10 transition-opacity" />
                    </button>
                ))}
            </div>

            {/* LABEL OVERLAY */}
            {selectedZone && (
                <div className="absolute bottom-4 left-0 right-0 z-30 flex justify-center pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#111] border border-[#dcb14a] text-[#dcb14a] px-6 py-2 rounded-full font-bold shadow-xl backdrop-blur-md"
                    >
                        {ZONES.find(z => z.id === selectedZone)?.label}
                    </motion.div>
                </div>
            )}
        </div>
    );
}
