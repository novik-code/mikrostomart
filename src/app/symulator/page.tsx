"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import RevealOnScroll from "@/components/RevealOnScroll";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

export default function SimulatorPage() {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file: File) => {
        if (!file.type.startsWith("image/")) {
            alert("Proszę wybrać plik obrazkowy (JPG, PNG).");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                const imgStr = e.target.result as string;
                setSelectedImage(imgStr);
                // Reset previous results
                setResultImage(null);
                prepareImageForAPI(imgStr);
            }
        };
        reader.readAsDataURL(file);
    };

    // New State for Mask
    const [maskImage, setMaskImage] = useState<string | null>(null);

    // Helper to crop/resize image to square PNG for OpenAI AND generate Mask
    const prepareImageForAPI = (imageSrc: string) => {
        const img = new window.Image();
        // Handler MUST be set before src to catch cached load (though unlikely with data uri)
        img.onload = () => {
            // Verify image loaded correctly
            if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                console.error("Image dimensions zero");
                return;
            }

            const canvas = document.createElement("canvas");
            const size = 1024; // OpenAI standard
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                alert("Błąd: Twoja przeglądarka nie obsługuje Canvas.");
                return;
            }

            // Calculate crop (center crop)
            // Use naturalWidth/Height for accuracy
            const nW = img.naturalWidth;
            const nH = img.naturalHeight;
            const minDim = Math.min(nW, nH);
            const scale = size / minDim;

            const drawWidth = nW * scale;
            const drawHeight = nH * scale;
            const tx = (size - drawWidth) / 2;
            const ty = (size - drawHeight) / 2;

            // Debug: Check if we are drawing
            // console.log("Drawing image:", nW, nH, "->", drawWidth, drawHeight);

            // 1. Draw Original Image
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, size, size);

            try {
                ctx.drawImage(img, tx, ty, drawWidth, drawHeight);
                const pngData = canvas.toDataURL("image/png");
                setProcessedImage(pngData);

                // 2. Generate Mask (Heuristic: Bottom-Center Oval for Mouth)
                // OpenAI Mask: Transparent pixels are where we edit. Opaque pixels are kept.

                // Clear canvas for mask
                ctx.clearRect(0, 0, size, size);

                // Fill with Opaque Color (Black) - parts to KEEP
                ctx.fillStyle = "rgba(0, 0, 0, 1)";
                ctx.fillRect(0, 0, size, size);

                // Cut out the Mouth Area (Transparent) - parts to EDIT
                // Assuming mouth is roughly at 50% X and 65% Y
                ctx.globalCompositeOperation = "destination-out";
                ctx.beginPath();
                // Ellipse: x, y, radiusX, radiusY, rotation, startAngle, endAngle
                ctx.ellipse(size * 0.5, size * 0.60, size * 0.15, size * 0.08, 0, 0, 2 * Math.PI);
                ctx.fill();

                // Reset composite operation
                ctx.globalCompositeOperation = "source-over";

                const maskPng = canvas.toDataURL("image/png");
                setMaskImage(maskPng);

            } catch (err) {
                console.error("Canvas draw error:", err);
                alert("Błąd przetwarzania obrazu.");
            }
        };

        img.onerror = (err) => {
            console.error("Image load error:", err);
            alert("Nieudane wczytanie pliku obrazu.");
        };

        img.src = imageSrc;
    };

    const handleGenerate = async () => {
        if (!processedImage) return;

        setIsLoading(true);
        try {
            const body = maskImage
                ? JSON.stringify({ image: processedImage, mask: maskImage })
                : JSON.stringify({ image: processedImage });

            const response = await fetch("/api/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: body,
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error && data.error.includes("safety")) {
                    throw new Error("System bezpieczeństwa odrzucił zdjęcie.");
                }
                throw new Error(data.error || "Błąd generowania");
            }

            setResultImage(data.url);
            // Alert removed
        } catch (err: any) {
            alert("Wystąpił błąd: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <main className="section" style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="container" style={{ maxWidth: "800px", width: "100%" }}>
                <RevealOnScroll>
                    <header style={{ textAlign: "center", marginBottom: "3rem" }}>
                        <p style={{
                            color: "var(--color-primary)",
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            marginBottom: "1rem"
                        }}>
                            AI Smile Simulator
                        </p>
                        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", marginBottom: "1rem" }}>
                            Wirtualna Przymierzalnia
                        </h1>
                        <p style={{ color: "var(--color-text-muted)", maxWidth: "600px", margin: "0 auto" }}>
                            Wgraj swoje zdjęcie, a nasza sztuczna inteligencja pokaże Ci potencjał Twojego nowego uśmiechu.
                        </p>
                    </header>
                </RevealOnScroll>

                <RevealOnScroll delay={100} animation="blur-in">
                    {/* RESULT VIEW */}
                    {resultImage && selectedImage ? (
                        <div style={{
                            width: "100%",
                            maxWidth: "600px",
                            margin: "0 auto",
                            aspectRatio: "1/1",
                            position: "relative",
                            border: "1px solid var(--color-surface-hover)",
                            borderRadius: "var(--radius-lg)",
                            overflow: "hidden"
                        }}>
                            <BeforeAfterSlider
                                beforeImage={selectedImage}
                                afterImage={resultImage}
                            />
                            <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--color-primary)' }}>
                                Twój nowy uśmiech (AI Variation)
                                <div style={{ background: 'yellow', color: 'black', padding: '10px', marginTop: '10px', wordBreak: 'break-all' }}>
                                    <strong>DEBUG URL:</strong> {resultImage}
                                </div>
                            </div>
                            <button
                                onClick={() => { setResultImage(null); setSelectedImage(null); }}
                                style={{
                                    marginTop: '2rem',
                                    background: 'transparent',
                                    border: '1px solid var(--color-text-muted)',
                                    color: 'var(--color-text-main)',
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer'
                                }}
                            >
                                Spróbuj z innym zdjęciem
                            </button>
                        </div>
                    ) : (
                        /* UPLOAD VIEW */
                        <div
                            style={{
                                background: "var(--color-surface)",
                                borderRadius: "var(--radius-lg)",
                                padding: "2rem",
                                border: `2px dashed ${isDragging ? "var(--color-primary)" : "var(--color-surface-hover)"}`,
                                textAlign: "center",
                                transition: "all 0.3s ease",
                                minHeight: "400px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                position: "relative",
                                overflow: "hidden"
                            }}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            {selectedImage ? (
                                <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "400px", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ position: 'relative', width: '300px', height: '300px', marginBottom: '2rem' }}>
                                        <Image
                                            src={selectedImage}
                                            alt="Uploaded preview"
                                            fill
                                            style={{ objectFit: "contain" }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setSelectedImage(null)}
                                        style={{
                                            position: "absolute",
                                            top: "1rem",
                                            right: "1rem",
                                            background: "rgba(0,0,0,0.6)",
                                            color: "#fff",
                                            border: "none",
                                            padding: "0.5rem 1rem",
                                            borderRadius: "var(--radius-sm)",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Zmień zdjęcie
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div style={{ fontSize: "4rem", marginBottom: "1rem", opacity: 0.5 }}>📸</div>
                                    <h3 style={{ marginBottom: "1rem" }}>Przeciągnij zdjęcie tutaj</h3>
                                    <p style={{ color: "var(--color-text-muted)", marginBottom: "2rem" }}>
                                        lub wybierz z urządzenia
                                    </p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        accept="image/*"
                                        style={{ display: "none" }}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="btn-primary"
                                    >
                                        Wybierz plik
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </RevealOnScroll>

                {selectedImage && !resultImage && (
                    <div style={{ textAlign: "center", marginTop: "2rem" }}>
                        <button
                            className="btn-primary"
                            onClick={handleGenerate}
                            disabled={isLoading || !processedImage}
                            style={{
                                opacity: processedImage && !isLoading ? 1 : 0.5,
                                cursor: processedImage && !isLoading ? "pointer" : "not-allowed",
                                padding: "1rem 3rem",
                                fontSize: "1.1rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                margin: "0 auto"
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner"></span> Generowanie...
                                </>
                            ) : (
                                <>Generuj Mój Uśmiech (AI) ✨</>
                            )}
                        </button>
                        {isLoading && (
                            <p style={{ marginTop: "1rem", color: "var(--color-primary)", animation: "pulse 1.5s infinite" }}>
                                To może potrwać kilka sekund... Sztuczna inteligencja pracuje.
                            </p>
                        )}
                    </div>
                )}

                <style jsx>{`
                    .spinner {
                        width: 20px;
                        height: 20px;
                        border: 3px solid rgba(255,255,255,0.3);
                        border-radius: 50%;
                        border-top-color: #fff;
                        animation: spin 1s ease-in-out infinite;
                        display: inline-block;
                    }

                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                    
                    @keyframes pulse {
                        0% { opacity: 0.6; }
                        50% { opacity: 1; }
                        100% { opacity: 0.6; }
                    }
                `}</style>

            </div>
        </main>
    );
}
