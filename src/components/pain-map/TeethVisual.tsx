"use client";

import { motion } from 'framer-motion';
import Image from 'next/image';

interface TeethVisualProps {
    onZoneSelect: (zoneId: string, label: string) => void;
    selectedZone: string | null;
}

// Zones mapped relatively to a 1000x1000 coordinate system matching the image aspect
// Focusing on the dental arches.
const ZONES = [
    {
        id: "top-front",
        label: "Górne Jedynki/Dwójki (Przód)",
        // Top Arch Front
        path: "M 350,250 Q 500,150 650,250 L 600,350 Q 500,280 400,350 Z",
        cx: 500, cy: 220
    },
    {
        id: "top-left",
        label: "Górne Lewe (Trzonowe)",
        // Top Left (User's Left = Right on screen?) No, usually Left is Left. Top Left of logic.
        // Let's assume standard view: Left side of image is Patient's Right (Dental notation) or just Left side visually.
        // Visually Left:
        path: "M 200,300 Q 300,200 350,250 L 400,350 Q 300,450 200,500 Z",
        cx: 250, cy: 350
    },
    {
        id: "top-right",
        label: "Górne Prawe (Trzonowe)",
        // Visually Right:
        path: "M 800,300 Q 700,200 650,250 L 600,350 Q 700,450 800,500 Z",
        cx: 750, cy: 350
    },
    {
        id: "bottom-front",
        label: "Dolne Jedynki/Dwójki (Przód)",
        // Bottom Arch Front
        path: "M 350,750 Q 500,850 650,750 L 600,650 Q 500,720 400,650 Z",
        cx: 500, cy: 800
    },
    {
        id: "bottom-left",
        label: "Dolne Lewe (Trzonowe)",
        // Bottom Left
        path: "M 200,700 Q 300,800 350,750 L 400,650 Q 300,550 200,500 Z",
        cx: 250, cy: 650
    },
    {
        id: "bottom-right",
        label: "Dolne Prawe (Trzonowe)",
        path: "M 800,700 Q 700,800 650,750 L 600,650 Q 700,550 800,500 Z",
        cx: 750, cy: 650
    }
];

export default function TeethVisual({ onZoneSelect, selectedZone }: TeethVisualProps) {
    return (
        <div className="relative w-full max-w-[500px] mx-auto aspect-square group">

            {/* Base Image */}
            <Image
                src="/jaw_anatomy_elegant.png"
                alt="Jaw Anatomy"
                fill
                className="object-contain opacity-90 transition-opacity duration-500"
                priority
            />

            {/* SVG Overlay Layer */}
            <svg viewBox="0 0 1000 1000" className="absolute inset-0 w-full h-full">
                <defs>
                    <radialGradient id="gold-glow">
                        <stop offset="0%" stopColor="#dcb14a" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#dcb14a" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {ZONES.map((zone) => {
                    const isSelected = selectedZone === zone.id;
                    return (
                        <motion.g
                            key={zone.id}
                            onClick={() => onZoneSelect(zone.id, zone.label)}
                            initial="idle"
                            whileHover="hover"
                            animate={isSelected ? "selected" : "idle"}
                            className="cursor-pointer"
                        >
                            {/* Hit Area - Invisible but detectable */}
                            <motion.path
                                d={zone.path}
                                fill="transparent"
                                stroke="transparent"
                                variants={{
                                    idle: { fillOpacity: 0 },
                                    hover: { fill: "url(#gold-glow)", fillOpacity: 0.3 },
                                    selected: { fill: "url(#gold-glow)", fillOpacity: 0.6 }
                                }}
                            />

                            {/* Selection Indicator Dot or Ring */}
                            <motion.circle
                                cx={zone.cx}
                                cy={zone.cy}
                                r={isSelected ? 10 : 0}
                                fill="#dcb14a"
                                initial={false}
                                animate={{ r: isSelected ? 15 : 0, opacity: isSelected ? 1 : 0 }}
                            />
                        </motion.g>
                    );
                })}


            </svg>

            {/* Labels overlay */}
            {ZONES.map((zone) => (
                selectedZone === zone.id && (
                    <motion.div
                        key={`label-${zone.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bg-black/80 text-[#dcb14a] text-xs px-2 py-1 rounded border border-[#dcb14a]/30"
                        style={{
                            left: `${(zone.cx / 1000) * 100}%`,
                            top: `${(zone.cy / 1000) * 100}%`,
                            transform: 'translate(-50%, -150%)'
                        }}
                    >
                        ✓ Wybrano
                    </motion.div>
                )
            ))}
        </div>
    );
}
