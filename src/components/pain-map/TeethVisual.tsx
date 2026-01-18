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
    { id: "top-left", label: "Górne Lewe (Trzonowe)" },
    { id: "top-front", label: "Górne Jedynki/Dwójki (Przód)" },
    { id: "top-right", label: "Górne Prawe (Trzonowe)" },
    { id: "palate", label: "Podniebienie / Język" },
    { id: "bottom-left", label: "Dolne Lewe (Trzonowe)" },
    { id: "bottom-front", label: "Dolne Jedynki/Dwójki (Przód)" },
    { id: "bottom-right", label: "Dolne Prawe (Trzonowe)" }
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
        <div className="relative w-full max-w-[600px] mx-auto aspect-[4/3] group rounded-2xl overflow-hidden border border-[#dcb14a]/20 shadow-[0_0_30px_rgba(220,177,74,0.1)] bg-black/50">
            
            {/* Natural Anatomy Image */}
            <Image 
                src="/intraoral_anatomy_natural.png" 
                alt="Natural Oral Anatomy" 
                fill
                className="object-contain p-4"
                priority
            />

            {/* DEBUG INFO - REMOVE LATER */}
            <div className="absolute top-2 left-2 z-50 bg-red-500 text-white text-[10px] px-2 py-1 rounded">
                DEBUG MODE: v3 (Absolute Layout)
            </div>

            {/* Interactive Zones - ABSOLUTE POSITIONING GRID */}
            <div className="absolute inset-0 z-20 m-4"> {/* Margin matches padding of image */}
                
                {/* 1. TOP LEFT (Upper Molars) */}
                <button 
                    onClick={() => onZoneSelect('top-left', 'Górne Lewe (Trzonowe)')}
                    className="absolute top-0 left-0 w-[30%] h-[40%]"
                    style={{ border: '1px solid rgba(255,0,0,0.3)', background: 'rgba(255,0,0,0.05)' }} // Debug visibility
                >
                    {selectedZone === 'top-left' && <div className="w-full h-full bg-[#dcb14a]/30 animate-pulse" />}
                </button>

                {/* 2. TOP FRONT (Upper Incisors) */}
                <button 
                    onClick={() => onZoneSelect('top-front', 'Górne Jedynki/Dwójki (Przód)')}
                    className="absolute top-0 left-[30%] w-[40%] h-[35%]"
                    style={{ border: '1px solid rgba(0,255,0,0.3)', background: 'rgba(0,255,0,0.05)' }}
                >
                    {selectedZone === 'top-front' && <div className="w-full h-full bg-[#dcb14a]/30 animate-pulse" />}
                </button>

                {/* 3. TOP RIGHT (Upper Molars) */}
                <button 
                    onClick={() => onZoneSelect('top-right', 'Górne Prawe (Trzonowe)')}
                    className="absolute top-0 right-0 w-[30%] h-[40%]"
                    style={{ border: '1px solid rgba(0,0,255,0.3)', background: 'rgba(0,0,255,0.05)' }}
                >
                    {selectedZone === 'top-right' && <div className="w-full h-full bg-[#dcb14a]/30 animate-pulse" />}
                </button>


                {/* 4. PALATE / CENTER */}
                <button 
                    onClick={() => onZoneSelect('palate', 'Podniebienie / Język')}
                    className="absolute top-[35%] left-[30%] w-[40%] h-[30%]"
                     style={{ border: '1px solid rgba(255,255,0,0.3)', background: 'rgba(255,255,0,0.05)' }}
                >
                    {selectedZone === 'palate' && <div className="w-full h-full bg-[#dcb14a]/30 animate-pulse" />}
                </button>


                {/* 5. BOTTOM LEFT (Lower Molars) */}
                <button 
                    onClick={() => onZoneSelect('bottom-left', 'Dolne Lewe (Trzonowe)')}
                    className="absolute bottom-0 left-0 w-[30%] h-[40%]"
                    style={{ border: '1px solid rgba(255,0,255,0.3)', background: 'rgba(255,0,255,0.05)' }}
                >
                     {selectedZone === 'bottom-left' && <div className="w-full h-full bg-[#dcb14a]/30 animate-pulse" />}
                </button>

                {/* 6. BOTTOM FRONT (Lower Incisors) */}
                <button 
                    onClick={() => onZoneSelect('bottom-front', 'Dolne Jedynki/Dwójki (Przód)')}
                    className="absolute bottom-0 left-[30%] w-[40%] h-[35%]"
                    style={{ border: '1px solid rgba(0,255,255,0.3)', background: 'rgba(0,255,255,0.05)' }}
                >
                     {selectedZone === 'bottom-front' && <div className="w-full h-full bg-[#dcb14a]/30 animate-pulse" />}
                </button>

                {/* 7. BOTTOM RIGHT (Lower Molars) */}
                <button 
                    onClick={() => onZoneSelect('bottom-right', 'Dolne Prawe (Trzonowe)')}
                    className="absolute bottom-0 right-0 w-[30%] h-[40%]"
                    style={{ border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' }}
                >
                     {selectedZone === 'bottom-right' && <div className="w-full h-full bg-[#dcb14a]/30 animate-pulse" />}
                </button>

            </div>

            {/* Selection Text Overlay */}
            {selectedZone && (
                <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                    <div className="bg-black/90 text-[#dcb14a] border border-[#dcb14a] px-6 py-3 rounded-full text-lg font-bold shadow-2xl backdrop-blur-md animate-in fade-in zoom-in duration-300">
                        ✓ {ZONES.find(z => z.id === selectedZone)?.label || selectedZone}
                    </div>
                </div>
            )}

        </div>
    );
}
