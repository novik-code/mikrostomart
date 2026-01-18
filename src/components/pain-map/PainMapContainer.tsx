"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TeethVisual from './TeethVisual';
import PainForm from './PainForm';
import DiagnosisResult from './DiagnosisResult';
import { ChevronRight, RotateCcw } from 'lucide-react';

type Step = 'location' | 'type' | 'result';

export default function PainMapContainer() {
    const [step, setStep] = useState<Step>('location');
    const [selectedZone, setSelectedZone] = useState<{ id: string; label: string } | null>(null);
    const [painType, setPainType] = useState<string | null>(null);

    const handleZoneSelect = (id: string, label: string) => {
        setSelectedZone({ id, label });
        setStep('type');
    };

    const handleTypeSelect = (type: string) => {
        setPainType(type);
        setStep('result');
    };

    const reset = () => {
        setStep('location');
        setSelectedZone(null);
        setPainType(null);
    };

    return (
        <div className="w-full max-w-4xl mx-auto min-h-[600px] flex flex-col">

            {/* PROGRESS HEADER */}
            <div className="flex justify-between items-center mb-8 px-4">
                <div className="flex gap-2 text-sm uppercase tracking-widest text-[#dcb14a]">
                    <span className={step === 'location' ? "font-bold" : "opacity-50"}>1. Lokalizacja</span>
                    <span className="opacity-30">/</span>
                    <span className={step === 'type' ? "font-bold" : "opacity-50"}>2. Rodzaj Bólu</span>
                    <span className="opacity-30">/</span>
                    <span className={step === 'result' ? "font-bold" : "opacity-50"}>3. Diagnoza</span>
                </div>

                {step !== 'location' && (
                    <button
                        onClick={reset}
                        className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
                    >
                        <RotateCcw size={14} /> Zacznij od nowa
                    </button>
                )}
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 relative">
                <AnimatePresence mode="wait">

                    {step === 'location' && (
                        <motion.div
                            key="location"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex flex-col items-center"
                        >
                            <h2 className="text-3xl font-heading text-white mb-4 text-center">Gdzie Cię boli?</h2>
                            <p className="text-gray-400 mb-8 text-center max-w-md">Kliknij na mapie obszar, w którym odczuwasz dyskomfort.</p>

                            <TeethVisual
                                onZoneSelect={handleZoneSelect}
                                selectedZone={selectedZone?.id || null}
                            />
                        </motion.div>
                    )}

                    {step === 'type' && (
                        <motion.div
                            key="type"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex flex-col items-center"
                        >
                            <h2 className="text-3xl font-heading text-white mb-2 text-center">Jaki to ból?</h2>
                            <p className="text-[#dcb14a] font-bold mb-8 text-center">{selectedZone?.label}</p>

                            <PainForm
                                onTypeSelect={handleTypeSelect as any}
                                selectedType={painType as any}
                            />
                        </motion.div>
                    )}

                    {step === 'result' && painType && selectedZone && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full"
                        >
                            <DiagnosisResult
                                painType={painType as any}
                                zoneLabel={selectedZone.label}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
