"use client";

import { motion } from 'framer-motion';
import { Zap, Snowflake, Candy, Diamond, HelpCircle } from 'lucide-react';

type PainType = 'pulsating' | 'sweet' | 'temperature' | 'biting' | 'other';

interface PainFormProps {
    onTypeSelect: (type: PainType) => void;
    selectedType: PainType | null;
}

const OPTIONS = [
    { id: 'pulsating', label: 'Pulsujący / Tętniący', icon: Zap, desc: 'Ból narastający, zgodny z tętnem' },
    { id: 'temperature', label: 'Zimne / Ciepłe', icon: Snowflake, desc: 'Reakcja na lody lub gorącą kawę' },
    { id: 'sweet', label: 'Na Słodkie', icon: Candy, desc: 'Ból przy jedzeniu słodyczy' },
    { id: 'biting', label: 'Przy Nagryzaniu', icon: Diamond, desc: 'Kłucie przy nacisku na ząb' }, // Diamond as "hard" object
    { id: 'other', label: 'Inny / Dziąsła', icon: HelpCircle, desc: 'Krwawienie, opuchlizna, inne' },
];

export default function PainForm({ onTypeSelect, selectedType }: PainFormProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl mx-auto mt-8">
            {OPTIONS.map((opt, i) => {
                const Icon = opt.icon;
                const isSelected = selectedType === opt.id;

                return (
                    <motion.button
                        key={opt.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => onTypeSelect(opt.id as PainType)}
                        className={`
                            relative overflow-hidden group p-6 rounded-2xl border text-left transition-all duration-300
                            ${isSelected
                                ? 'bg-[#dcb14a]/10 border-[#dcb14a] shadow-[0_0_30px_rgba(220,177,74,0.15)]'
                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}
                        `}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {/* Background Glow */}
                        {isSelected && (
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#dcb14a]/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                        )}

                        <div className="flex items-start gap-4 relative z-10">
                            <div className={`
                                p-3 rounded-xl transition-colors
                                ${isSelected ? 'bg-[#dcb14a] text-black' : 'bg-white/10 text-gray-400 group-hover:text-white'}
                            `}>
                                <Icon size={24} strokeWidth={1.5} />
                            </div>

                            <div>
                                <h3 className={`font-heading text-lg font-bold mb-1 transition-colors ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                    {opt.label}
                                </h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    {opt.desc}
                                </p>
                            </div>
                        </div>

                        {/* Selection Check */}
                        {isSelected && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute bottom-4 right-4 text-[#dcb14a]"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </motion.div>
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
}
