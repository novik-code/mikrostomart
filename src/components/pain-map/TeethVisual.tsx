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
        <div className="relative w-full max-w-[600px] mx-auto min-h-[400px] aspect-[4/3] group rounded-2xl overflow-hidden border border-[#dcb14a]/20 shadow-[0_0_30px_rgba(220,177,74,0.1)] bg-black/50">

            {/* Natural Anatomy Image - Contain to ensure full visibility */}
            <Image
                src="/intraoral_anatomy_natural.png"
                alt="Natural Oral Anatomy"
                fill
                className="object-contain p-4 transition-transform duration-700 hover:scale-[1.02]"
                priority
            />

            {/* Interactive Overlay Layer */}
            <div className="absolute inset-0 z-20 flex flex-col pointer-events-none">

                {/* TOP ROW: Upper Teeth */}
                <div className="flex-1 flex w-full pointer-events-auto">
                    <button
                        onClick={() => onZoneSelect('top-left', 'Górne Lewe (Trzonowe)')}
                        className="flex-1 hover:bg-[#dcb14a]/10 hover:border-2 hover:border-[#dcb14a]/30 transition-all rounded-tl-xl m-1"
                        title="Górne Lewe"
                    />
                    <button
                        onClick={() => onZoneSelect('top-front', 'Górne Jedynki (Przód)')}
                        className="flex-1 hover:bg-[#dcb14a]/10 hover:border-2 hover:border-[#dcb14a]/30 transition-all m-1"
                        title="Górne Przód"
                    />
                    <button
                        onClick={() => onZoneSelect('top-right', 'Górne Prawe (Trzonowe)')}
                        className="flex-1 hover:bg-[#dcb14a]/10 hover:border-2 hover:border-[#dcb14a]/30 transition-all rounded-tr-xl m-1"
                        title="Górne Prawe"
                    />
                </div>

                {/* MIDDLE ROW: Palate / Center */}
                <div className="h-[20%] w-full flex pointer-events-auto">
                    <button
                        onClick={() => onZoneSelect('palate', 'Podniebienie / Język')}
                        className="w-full h-full hover:bg-[#dcb14a]/10 hover:border-2 hover:border-[#dcb14a]/30 transition-all m-1"
                        title="Środek / Język"
                    />
                </div>

                {/* BOTTOM ROW: Lower Teeth */}
                <div className="flex-1 flex w-full pointer-events-auto">
                    <button
                        onClick={() => onZoneSelect('bottom-left', 'Dolne Lewe (Trzonowe)')}
                        className="flex-1 hover:bg-[#dcb14a]/10 hover:border-2 hover:border-[#dcb14a]/30 transition-all rounded-bl-xl m-1"
                        title="Dolne Lewe"
                    />
                    <button
                        onClick={() => onZoneSelect('bottom-front', 'Dolne Jedynki (Przód)')}
                        className="flex-1 hover:bg-[#dcb14a]/10 hover:border-2 hover:border-[#dcb14a]/30 transition-all m-1"
                        title="Dolne Przód"
                    />
                    <button
                        onClick={() => onZoneSelect('bottom-right', 'Dolne Prawe (Trzonowe)')}
                        className="flex-1 hover:bg-[#dcb14a]/10 hover:border-2 hover:border-[#dcb14a]/30 transition-all rounded-br-xl m-1"
                        title="Dolne Prawe"
                    />
                </div>
            </div>

            {/* Selection Text Overlay */}
            {selectedZone && (
                <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                    <div className="bg-black/80 text-[#dcb14a] border border-[#dcb14a] px-6 py-3 rounded-full text-lg font-bold shadow-2xl backdrop-blur-md">
                        ✓ {ZONES.find(z => z.id === selectedZone)?.label || "Wybrano"}
                    </div>
                </div>
            )}

        </div>
    );
}
