"use client";

import { useState } from "react";
import StudioCapture from "@/components/simulator/StudioCapture";
import StudioMaskEditor from "@/components/simulator/StudioMaskEditor";
import StudioResults from "@/components/simulator/StudioResults";

type Step = 'CAPTURE' | 'MASK' | 'GENERATING' | 'RESULT';

export default function SmileStudioPage() {
    const [currentStep, setCurrentStep] = useState<Step>('CAPTURE');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);

    const handleImageCapture = (imageData: string) => {
        setCapturedImage(imageData);
        setCurrentStep('MASK');
    };

    const handleMaskComplete = async (maskData: string) => {
        if (!capturedImage) return;

        setCurrentStep('GENERATING');

        try {
            // 1. Prepare FormData
            const formData = new FormData();

            // Helper: Convert Base64 to Blob
            const base64ToBlob = async (b64: string) => {
                const res = await fetch(b64);
                return await res.blob();
            };

            const imageBlob = await base64ToBlob(capturedImage);
            const maskBlob = await base64ToBlob(maskData);

            formData.append("image", imageBlob, "image.png");
            formData.append("mask", maskBlob, "mask.png");
            formData.append("style", "hollywood"); // Default style for now
            formData.append("mode", "ai-generate"); // Flux Fill Mode

            // 2. Call API
            const response = await fetch("/api/simulate", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Symulacja nieudana");
            }

            const data = await response.json();

            if (data.url) {
                setResultImage(data.url);
                setCurrentStep('RESULT');
            } else {
                throw new Error("Brak URL w odpowiedzi");
            }

        } catch (error) {
            console.error("Simulation Failed:", error);
            alert("Wystąpił błąd podczas generowania: " + (error instanceof Error ? error.message : "Nieznany błąd"));
            setCurrentStep('MASK'); // Go back to allow retry
        }
    };

    const resetStudio = () => {
        setCapturedImage(null);
        setResultImage(null);
        setCurrentStep('CAPTURE');
    };

    return (
        <main className="fixed inset-0 bg-[#08090a] overflow-hidden flex flex-col z-[9999]">
            {/* Header / Nav could go here */}

            <div className="flex-1 relative w-full h-full max-w-4xl mx-auto">
                {currentStep === 'CAPTURE' && (
                    <StudioCapture onImageSelected={handleImageCapture} />
                )}

                {currentStep === 'MASK' && capturedImage && (
                    <StudioMaskEditor
                        imageSrc={capturedImage}
                        onBack={() => setCurrentStep('CAPTURE')}
                        onNext={handleMaskComplete}
                    />
                )}

                {currentStep === 'GENERATING' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-lg font-light animate-pulse">Projektowanie uśmiechu...</p>
                    </div>
                )}

                {currentStep === 'RESULT' && resultImage && (
                    <StudioResults
                        resultImage={resultImage}
                        onReset={resetStudio}
                    />
                )}
            </div>

            <style jsx global>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in {
                    animation: fade-in 0.4s ease-out forwards;
                }
            `}</style>
        </main>
    );
}
