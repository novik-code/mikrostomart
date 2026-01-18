"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';

interface TeethVisualProps {
    onZoneSelect: (zoneId: string, label: string) => void;
    selectedZone: string | null;
}

// Simplified Jaw Paths
// Top Left, Top Right, Bottom Left, Bottom Right, Top Front, Bottom Front
const ZONES = [
    {
        id: "top-front",
        label: "Górne Jedynki/Dwójki (Przód)",
        path: "M 100,50 Q 150,20 200,50 L 200,80 Q 150,60 100,80 Z",
        cx: 150, cy: 50
    },
    {
        id: "top-left",
        label: "Górne Lewe (Trzonowe)",
        path: "M 20,80 Q 50,50 100,50 L 100,80 Q 50,90 20,120 Z",
        cx: 60, cy: 80
    },
    {
        id: "top-right",
        label: "Górne Prawe (Trzonowe)",
        path: "M 280,80 Q 250,50 200,50 L 200,80 Q 250,90 280,120 Z",
        cx: 240, cy: 80
    },
    {
        id: "bottom-front",
        label: "Dolne Jedynki/Dwójki (Przód)",
        path: "M 100,150 Q 150,170 200,150 L 200,120 Q 150,140 100,120 Z",
        cx: 150, cy: 150
    },
    {
        id: "bottom-left",
        label: "Dolne Lewe (Trzonowe)",
        path: "M 20,120 Q 50,150 100,150 L 100,120 Q 50,110 20,80 Z", // Flipped roughly
        cx: 60, cy: 130
    },
    {
        id: "bottom-right",
        label: "Dolne Prawe (Trzonowe)",
        path: "M 280,120 Q 250,150 200,150 L 200,120 Q 250,110 280,80 Z",
        cx: 240, cy: 130
    }
];

export default function TeethVisual({ onZoneSelect, selectedZone }: TeethVisualProps) {
    return (
        <div className="relative w-full max-w-[400px] mx-auto aspect-[4/3]">
            <svg viewBox="0 0 300 200" className="w-full h-full drop-shadow-2xl">
                <defs>
                    <linearGradient id="gold-shine" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#dcb14a" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#8a6d25" stopOpacity="0.9" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {ZONES.map((zone) => {
                    const isSelected = selectedZone === zone.id;
                    return (
                        <motion.path
                            key={zone.id}
                            d={zone.path}
                            onClick={() => onZoneSelect(zone.id, zone.label)}
                            initial={{ fill: "rgba(255,255,255,0.1)", stroke: "rgba(255,255,255,0.3)" }}
                            animate={{
                                fill: isSelected ? "url(#gold-shine)" : "rgba(255,255,255,0.1)",
                                stroke: isSelected ? "#dcb14a" : "rgba(255,255,255,0.5)",
                                scale: isSelected ? 1.05 : 1
                            }}
                            whileHover={{
                                fill: "rgba(255,255,255,0.3)",
                                cursor: "pointer",
                                scale: 1.02
                            }}
                            transition={{ duration: 0.3 }}
                            strokeWidth="1.5"
                            className="transition-all duration-300"
                        />
                    );
                })}

                {ZONES.map((zone) => (
                    selectedZone === zone.id && (
                        <motion.text
                            key={`text-${zone.id}`}
                            x={zone.cx}
                            y={zone.cy}
                            textAnchor="middle"
                            fill="white"
                            fontSize="8"
                            fontWeight="bold"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            ✓
                        </motion.text>
                    )
                ))}
            </svg>

            {/* Visual Guide Text */}
            <div className="absolute top-0 w-full text-center text-xs text-white/50 pointer-events-none">
                GÓRA
            </div>
            <div className="absolute bottom-0 w-full text-center text-xs text-white/50 pointer-events-none">
                DÓŁ
            </div>
        </div>
    );
}
