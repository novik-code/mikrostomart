"use client";

import { motion } from 'framer-motion';

type PainType = 'pulsating' | 'sweet' | 'temperature' | 'biting' | 'other';

interface PainFormProps {
    onTypeSelect: (type: PainType) => void;
    selectedType: PainType | null;
}

const OPTIONS = [
    { id: 'pulsating', label: 'Pulsujący / Tętniący', icon: '⚡' },
    { id: 'sweet', label: 'Na Słodkie', icon: '🍬' },
    { id: 'temperature', label: 'Zimne / Ciepłe', icon: '❄️🔥' },
    { id: 'biting', label: 'Przy Nagryzaniu', icon: '🦷' },
    { id: 'other', label: 'Inny / Ból Dziąsła', icon: '🤔' },
];

export default function PainForm({ onTypeSelect, selectedType }: PainFormProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mx-auto mt-8">
            {OPTIONS.map((opt) => (
                <motion.button
                    key={opt.id}
                    onClick={() => onTypeSelect(opt.id as PainType)}
                    className={`
                        p-6 rounded-xl border flex flex-col items-center gap-3 transition-all
                        ${selectedType === opt.id
                            ? 'bg-[rgba(220,177,74,0.15)] border-[#dcb14a] text-white shadow-[0_0_15px_rgba(220,177,74,0.3)]'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/30'}
                    `}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <span className="text-3xl">{opt.icon}</span>
                    <span className="font-medium text-lg text-center font-heading">{opt.label}</span>
                </motion.button>
            ))}
        </div>
    );
}
