"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Import V2 Visual
import TeethVisualV2 from './TeethVisualV2';
// Re-use existing form/result components for now as they were fine, just imported here
import PainForm from '../pain-map/PainForm';
import DiagnosisResult from '../pain-map/DiagnosisResult';
import { RotateCcw } from 'lucide-react';

type Step = 'location' | 'type' | 'result';

export default function PainMapContainerV2() {
    const [step, setStep] = useState<Step>('location');
    const [selectedZone, setSelectedZone] = useState<{ id: string; label: string } | null>(null);
    const [painType, setPainType] = useState<string | null>(null);

    const handleZoneSelect = (id: string, label: string) => {
        console.log("Zone selected:", id, label); // Debug log
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
        <div className="w-full max-w-4xl mx-auto min-h-[600px] flex flex-col bg-transparent">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-8 px-4 border-b border-white/10 pb-4">
                <div className="flex gap-2 text-sm uppercase tracking-widest text-[#dcb14a]">
                    <span className={step === 'location' ? "font-bold text-[#dcb14a]" : "text-gray-600"}>1. Mapa</span>
                    <span className="text-gray-700">/</span>
                    <span className={step === 'type' ? "font-bold text-[#dcb14a]" : "text-gray-600"}>2. Objawy</span>
                    <span className="text-gray-700">/</span>
                    <span className={step === 'result' ? "font-bold text-[#dcb14a]" : "text-gray-600"}>3. Wynik</span>
                </div>

                {step !== 'location' && (
                    <button
                        onClick={reset}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                        <RotateCcw size={14} /> Reset
                    </button>
                )}
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 relative">
                <AnimatePresence mode="wait">

                    {step === 'location' && (
                        <motion.div
                            key="step-location-v2"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="flex flex-col items-center"
                        >
                            <h2 className="text-2xl font-bold text-white mb-6">Wskaż miejsce bólu</h2>
                            <TeethVisualV2
                                onZoneSelect={handleZoneSelect}
                                selectedZone={selectedZone?.id || null}
                            />
                        </motion.div>
                    )}

                    {step === 'type' && (
                        <motion.div
                            key="step-type-v2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col items-center w-full"
                        >
                            <h2 className="text-2xl font-bold text-white mb-2">Rodzaj bólu</h2>
                            <p className="text-[#dcb14a] mb-8">Obszar: {selectedZone?.label}</p>
                            <PainForm
                                onTypeSelect={handleTypeSelect as any}
                                selectedType={painType as any}
                            />
                        </motion.div>
                    )}

                    {step === 'result' && painType && selectedZone && (
                        <motion.div
                            key="step-result-v2"
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
