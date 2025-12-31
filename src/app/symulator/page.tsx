"use client";

import { useState, useRef, useEffect } from "react";
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
    // State for Mask Configuration
    const [maskConfig, setMaskConfig] = useState({ x: 50, y: 65, scaleX: 1.0, scaleY: 1.0 });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    // New State for Mask
    const [maskImage, setMaskImage] = useState<string | null>(null);

    // 1. Process Input Image (Once per file upload)
    const processInputImage = async (imageSrc: string) => {
        try {
            const img = new window.Image();
            img.src = imageSrc;
            await img.decode();

            const canvas = document.createElement("canvas");
            const size = 1024; // OpenAI standard
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");

            if (!ctx) return;

            // Calc dimensions
            const nW = img.naturalWidth;
            const nH = img.naturalHeight;
            const minDim = Math.min(nW, nH);
            const scale = size / minDim;

            const drawWidth = nW * scale;
            const drawHeight = nH * scale;
            const tx = (size - drawWidth) / 2;
            const ty = (size - drawHeight) / 2;

            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, size, size);
            ctx.drawImage(img, tx, ty, drawWidth, drawHeight);

            const processedPng = canvas.toDataURL("image/png");
            setProcessedImage(processedPng);

            // Trigger initial mask generation
            generateMask(maskConfig);

        } catch (err) {
            console.error("Processing Error", err);
            alert("Błąd przetwarzania zdjęcia.");
        }
    };

    // 2. Generate Mask (Dynamic based on config)
    const generateMask = (config: { x: number, y: number, scaleX: number, scaleY: number }) => {
        const size = 1024;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        // Fill BLACK (Opaque = Keep Original)
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, size, size);

        // Cut Hole (Transparent = AI Edit Area)
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();

        // Base params
        const baseX = size * (config.x / 100);
        const baseY = size * (config.y / 100);
        const baseRadiusX = size * 0.18 * config.scaleX;
        const baseRadiusY = size * 0.10 * config.scaleY;

        ctx.ellipse(baseX, baseY, baseRadiusX, baseRadiusY, 0, 0, 2 * Math.PI);
        ctx.fill();

        setMaskImage(canvas.toDataURL("image/png"));
    };

    // Update mask when config changes (Debounced effect could be better but this is fast enough for canvas)
    useEffect(() => {
        if (processedImage) {
            generateMask(maskConfig);
        }
    }, [maskConfig, processedImage]);

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
                setResultImage(null);
                setProcessedImage(null);
                setMaskImage(null);
                setMaskConfig({ x: 50, y: 65, scaleX: 1.0, scaleY: 1.0 });
                setMaskConfig({ x: 50, y: 65, scaleX: 1.0, scaleY: 1.0 });
                processInputImage(imgStr);
            }
        };
        reader.readAsDataURL(file);
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
                                beforeImage={processedImage || selectedImage}
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
                                <>
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
                                                cursor: "pointer",
                                                zIndex: 20
                                            }}
                                        >
                                            Zmień zdjęcie
                                        </button>

                                        {/* Alignment Guide Overlay - Dynamic */}
                                        <div style={{
                                            position: 'absolute',
                                            top: `${maskConfig.y}%`,
                                            left: `${maskConfig.x}%`,
                                            transform: 'translate(-50%, -50%)',
                                            width: `${36 * maskConfig.scaleX}%`, // Base 36% width
                                            height: `${20 * maskConfig.scaleY}%`, // Base 20% height
                                            border: '2px dashed rgba(255, 255, 0, 0.9)',
                                            borderRadius: '50%',
                                            pointerEvents: 'none',
                                            zIndex: 10,
                                            boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: '-25px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                color: 'yellow',
                                                fontSize: '12px',
                                                whiteSpace: 'nowrap',
                                                textShadow: '0 1px 2px black',
                                                background: 'rgba(0,0,0,0.5)',
                                                padding: '2px 6px',
                                                borderRadius: '4px'
                                            }}>
                                                Dopasuj tutaj
                                            </div>
                                        </div>
                                    </div>

                                    {/* CONTROLS FOR MASK */}
                                    <div style={{
                                        marginTop: '20px',
                                        padding: '15px',
                                        background: 'var(--color-surface-hover)',
                                        borderRadius: 'var(--radius-md)',
                                        width: '100%',
                                        maxWidth: '400px'
                                    }}>
                                        <h4 style={{ marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-text-main)' }}>Dopasuj obszar uśmiechu:</h4>

                                        <div style={{ marginBottom: '10px' }}>
                                            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px' }}>
                                                <span>Pionowo (Góra/Dół)</span>
                                                <span>{maskConfig.y}%</span>
                                            </label>
                                            <input
                                                type="range" min="0" max="100" step="1"
                                                value={maskConfig.y}
                                                onChange={(e) => setMaskConfig({ ...maskConfig, y: Number(e.target.value) })}
                                                style={{ width: '100%' }}
                                            />
                                        </div>

                                        <div style={{ marginBottom: '10px' }}>
                                            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px' }}>
                                                <span>Poziomo (Lewo/Prawo)</span>
                                                <span>{maskConfig.x}%</span>
                                            </label>
                                            <input
                                                type="range" min="0" max="100" step="1"
                                                value={maskConfig.x}
                                                onChange={(e) => setMaskConfig({ ...maskConfig, x: Number(e.target.value) })}
                                                style={{ width: '100%' }}
                                            />
                                        </div>

                                        <div style={{ marginBottom: '10px' }}>
                                            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px' }}>
                                                <span>Szerokość Maski</span>
                                                <span>{maskConfig.scaleX.toFixed(1)}x</span>
                                            </label>
                                            <input
                                                type="range" min="0.1" max="2.0" step="0.1"
                                                value={maskConfig.scaleX}
                                                onChange={(e) => setMaskConfig({ ...maskConfig, scaleX: Number(e.target.value) })}
                                                style={{ width: '100%' }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px' }}>
                                                <span>Wysokość Maski</span>
                                                <span>{maskConfig.scaleY.toFixed(1)}x</span>
                                            </label>
                                            <input
                                                type="range" min="0.1" max="2.0" step="0.1"
                                                value={maskConfig.scaleY}
                                                onChange={(e) => setMaskConfig({ ...maskConfig, scaleY: Number(e.target.value) })}
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                    </div>
                                </>
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

                {
                    selectedImage && !resultImage && (
                        <div style={{ textAlign: "center", marginTop: "2rem" }}>
                            <button
                                className="btn-primary"
                                onClick={handleGenerate}
                                disabled={isLoading || !processedImage || !maskImage}
                                style={{
                                    opacity: processedImage && maskImage && !isLoading ? 1 : 0.5,
                                    cursor: processedImage && maskImage && !isLoading ? "pointer" : "not-allowed",
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

                            {/* Debug Info */}
                            <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#666' }}>
                                Status: {maskImage ? "✅ Gotowy do edycji (Maska OK)" : "⏳ Przetwarzanie..."}
                            </div>

                            {/* Debug Mask Preview (Temporary) */}
                            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                {processedImage && (
                                    <div style={{ border: '1px solid #ccc' }}>
                                        <p style={{ fontSize: '10px' }}>Podgląd Inputu (Do AI):</p>
                                        <img src={processedImage} alt="Input Debug" style={{ width: '50px', height: '50px', objectFit: 'cover' }} />
                                    </div>
                                )}
                                {maskImage && (
                                    <div style={{ border: '1px solid #ccc' }}>
                                        <p style={{ fontSize: '10px' }}>Podgląd Maski:</p>
                                        <img src={maskImage} alt="Mask Debug" style={{ width: '50px', height: '50px', background: 'url(https://media.istockphoto.com/id/1147544807/vector/transparent-background-pattern-gray.jpg?s=612x612&w=0&k=20&c=p_yM_iQYt4g-gN3E_5mPjUe0QzU-5lK_L-5lK_L-5lK.jpg)' }} />
                                    </div>
                                )}
                            </div>

                            {isLoading && (
                                <p style={{ marginTop: "1rem", color: "var(--color-primary)", animation: "pulse 1.5s infinite" }}>
                                    To może potrwać kilka sekund... Sztuczna inteligencja pracuje.
                                </p>
                            )}
                        </div>
                    )
                }

                {
                    resultImage && (
                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <a
                                href={resultImage}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-block',
                                    marginTop: '10px',
                                    textDecoration: 'underline',
                                    color: 'var(--color-primary)'
                                }}
                            >
                                Biały ekran? Kliknij tutaj, aby otworzyć zdjęcie w nowym oknie
                            </a>
                        </div>
                    )
                }

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

            </div >
        </main >
    );
}
