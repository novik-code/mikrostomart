"use client";

import { motion } from 'framer-motion';
import Image from 'next/image';

interface TeethVisualProps {
    onZoneSelect: (zoneId: string, label: string) => void;
    selectedZone: string | null;
}

// Coordinate mapping for "intraoral_anatomy_natural.png"
// Assuming a roughly 1000x1000 square where the mouth spans most of it.
// Upper Arch is Top Half (~100-450), Lower Arch is Bottom Half (~550-900).
// Left/Right is split around X=500.

const ZONES = [
    {
        id: "palate",
        label: "Podniebienie / Górna Szczęka",
        // Central Top area
        path: "M 300,300 Q 500,100 700,300 Q 500,450 300,300 Z",
        cx: 500, cy: 250
    },
    {
        id: "top-teeth",
        label: "Górne Zęby",
        // Arch shape top
        path: "M 150,350 Q 500,50 850,350 L 750,450 Q 500,200 250,450 Z",
        cx: 500, cy: 150
    },
    {
        id: "tongue",
        label: "Język",
        // Center
        path: "M 350,500 Q 500,450 650,500 Q 600,700 500,750 Q 400,700 350,500 Z",
        cx: 500, cy: 600
    },
    {
        id: "bottom-teeth",
        label: "Dolne Zęby",
        // Arch shape bottom
        path: "M 150,650 Q 500,950 850,650 L 750,550 Q 500,800 250,550 Z",
        cx: 500, cy: 850
    },
    {
        id: "cheeks",
        label: "Policzek / Błona Śluzowa",
        // Side areas (catch-all for sides)
        path: "M 50,400 Q 150,500 50,600 L 0,600 L 0,400 Z  M 950,400 Q 850,500 950,600 L 1000,600 L 1000,400 Z",
        // Note: Multipart path or just use two zones. Let's make it simple: Left Cheek
        cx: 100, cy: 500
    }
];

// SIMPLIFIED HIT ZONES (Robust Rectangles/Circles for easy clicking)
// Since complex paths are hard to aid without seeing coords, we use simple transparent overlays.
const HIT_ZONES = [
    { id: "top-teeth", label: "Górny Łuk Zębowy", x: 200, y: 100, w: 600, h: 250 },
    { id: "palate", label: "Podniebienie", x: 350, y: 350, w: 300, h: 150 },
    { id: "tongue", label: "Język", x: 350, y: 550, w: 300, h: 200 },
    { id: "bottom-teeth", label: "Dolny Łuk Zębowy", x: 200, y: 750, w: 600, h: 200 },
    { id: "cheeks", label: "Policzki / Inne", x: 0, y: 400, w: 1000, h: 200, ghost: true }, // Background layer?
];


export default function TeethVisual({ onZoneSelect, selectedZone }: TeethVisualProps) {
    return (
        <div className="relative w-full max-w-[500px] mx-auto aspect-square group rounded-full overflow-hidden border-4 border-[#dcb14a]/20 shadow-[0_0_50px_rgba(220,177,74,0.1)]">

            {/* Natural Anatomy Image */}
            <Image
                src="/intraoral_anatomy_natural.png"
                alt="Natural Oral Anatomy"
                fill
                className="object-cover transition-transform duration-700 hover:scale-105"
                priority
            />

            {/* Interactive Grid Layer */}
            <div className="absolute inset-0 z-10 grid grid-cols-2 grid-rows-3 gap-2 p-4">
                {/* Top Left - Upper Molars */}
                <button
                    onClick={() => onZoneSelect('top-left', 'Górne Lewe (Trzonowe)')}
                    className={`rounded-2xl transition-all duration-300 ${selectedZone === 'top-left' ? 'bg-[#dcb14a]/30 ring-2 ring-[#dcb14a]' : 'hover:bg-white/10'}`}
                />
                {/* Top Right - Upper Molars */}
                <button
                    onClick={() => onZoneSelect('top-right', 'Górne Prawe (Trzonowe)')}
                    className={`rounded-2xl transition-all duration-300 ${selectedZone === 'top-right' ? 'bg-[#dcb14a]/30 ring-2 ring-[#dcb14a]' : 'hover:bg-white/10'}`}
                />

                {/* Middle Left - Cheeks/Tongue Side */}
                <button
                    onClick={() => onZoneSelect('palate', 'Podniebienie / Język')}
                    className={`col-span-2 rounded-2xl transition-all duration-300 ${selectedZone === 'palate' ? 'bg-[#dcb14a]/30 ring-2 ring-[#dcb14a]' : 'hover:bg-white/5'}`}
                >
                    <span className={`text-xs uppercase font-bold tracking-widest text-[#dcb14a] ${selectedZone === 'palate' ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                        Obszar Centralny
                    </span>
                </button>

                {/* Bottom Left - Lower Molars */}
                <button
                    onClick={() => onZoneSelect('bottom-left', 'Dolne Lewe (Trzonowe)')}
                    className={`rounded-2xl transition-all duration-300 ${selectedZone === 'bottom-left' ? 'bg-[#dcb14a]/30 ring-2 ring-[#dcb14a]' : 'hover:bg-white/10'}`}
                />
                {/* Bottom Right - Lower Molars */}
                <button
                    onClick={() => onZoneSelect('bottom-right', 'Dolne Prawe (Trzonowe)')}
                    className={`rounded-2xl transition-all duration-300 ${selectedZone === 'bottom-right' ? 'bg-[#dcb14a]/30 ring-2 ring-[#dcb14a]' : 'hover:bg-white/10'}`}
                />
            </div>

            {/* Center Front Overlay for Incisors (Absolute) */}
            <div className="absolute inset-x-0 top-6 mx-auto w-32 h-20 z-20">
                <button
                    onClick={() => onZoneSelect('top-front', 'Górne Jedynki (Przód)')}
                    className={`w-full h-full rounded-b-2xl transition-all duration-300 ${selectedZone === 'top-front' ? 'bg-[#dcb14a]/30 ring-2 ring-[#dcb14a]' : 'hover:bg-white/10'}`}
                />
            </div>
            <div className="absolute inset-x-0 bottom-6 mx-auto w-32 h-20 z-20">
                <button
                    onClick={() => onZoneSelect('bottom-front', 'Dolne Jedynki (Przód)')}
                    className={`w-full h-full rounded-t-2xl transition-all duration-300 ${selectedZone === 'bottom-front' ? 'bg-[#dcb14a]/30 ring-2 ring-[#dcb14a]' : 'hover:bg-white/10'}`}
                />
            </div>

        </div>
    );
}
