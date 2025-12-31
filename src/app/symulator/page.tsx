"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import RevealOnScroll from "@/components/RevealOnScroll";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import OverlayEditor from "@/components/OverlayEditor";

/*
  SIMULATOR PAGE (Replicate / Flux Edition)
  Strategy:
  1. User draws mask (oval).
  2. We send original image + mask hole to API.
  3. API uses Replicate (Flux Fill) for SOTA inpainting.
  4. NEW: User can alternatively place a Template Overlay (SmileCloud style) which is then blended.
*/

export default function SimulatorPage() {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string | null>(null); // DEBUG STATE
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for Mask Configuration
    const [maskConfig, setMaskConfig] = useState({ x: 50, y: 65, scaleX: 1.0, scaleY: 1.0 });

    // State for Smile Style
    const [smileStyle, setSmileStyle] = useState("hollywood");

    // State for Image Layout (How the image sits on the 1024x1024 canvas)
    const [imageLayout, setImageLayout] = useState({ tx: 0, ty: 0, scale: 1, drawWidth: 1024, drawHeight: 1024 });

    // MODE SWITCH: 'ai-generate' (Default) vs 'template-overlay' (SmileCloud)
    const [simulatorMode, setSimulatorMode] = useState<'ai-generate' | 'template-overlay'>('template-overlay');
    const [compositeImage, setCompositeImage] = useState<string | null>(null);

    // Drag Logic Refs
    const previewRef = useRef<HTMLDivElement>(null);
    const [isMaskDragging, setIsMaskDragging] = useState(false);
    const [maskImage, setMaskImage] = useState<string | null>(null);
    const [alphaImage, setAlphaImage] = useState<string | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    // 1. Process Input Image (Once per file upload)
    const processInputImage = async (imageSrc: string) => {
        try {
            const img = new window.Image();
            img.src = imageSrc;
            await img.decode();

            const canvas = document.createElement("canvas");
            const size = 1024; // Standard size
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");

            if (!ctx) return;

            // Calc dimensions to FIT image in 1024x1024 (contain)
            const nW = img.naturalWidth;
            const nH = img.naturalHeight;
            // "contain" logic (so we see full face):
            const scale = Math.min(size / nW, size / nH);

            const drawWidth = nW * scale;
            const drawHeight = nH * scale;
            const tx = (size - drawWidth) / 2;
            const ty = (size - drawHeight) / 2;

            // Save layout for mask sync
            const layout = { tx, ty, scale, drawWidth, drawHeight };
            setImageLayout(layout);

            ctx.fillStyle = "white"; // White bars
            ctx.fillRect(0, 0, size, size);
            ctx.drawImage(img, tx, ty, drawWidth, drawHeight);

            const processedPng = canvas.toDataURL("image/png");
            setProcessedImage(processedPng);

            // Trigger initial mask generation with the FRESH image data
            generateMask(maskConfig, layout, processedPng);

        } catch (err) {
            console.error("Processing Error", err);
            alert("Błąd przetwarzania zdjęcia.");
        }
    };

    // 2. Generate Mask AND Alpha-Hole Image
    const generateMask = (config: { x: number, y: number, scaleX: number, scaleY: number }, layout?: any, currentProcessedImage?: string) => {
        const size = 1024;

        // 1. Create B/W Mask (for API 'mask' field)
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = size;
        maskCanvas.height = size;
        const maskCtx = maskCanvas.getContext("2d");

        if (!maskCtx) return;

        // --- DRAW MASK (B/W) ---
        // Fill BLACK (Opaque = Keep Original)
        maskCtx.fillStyle = "black";
        maskCtx.fillRect(0, 0, size, size);

        // Cut Hole (Transparent / White for API)
        maskCtx.fillStyle = "white";
        maskCtx.beginPath();
        const centerX = size * (config.x / 100);
        const centerY = size * (config.y / 100);
        const baseRadiusX = size * 0.18 * config.scaleX;
        const baseRadiusY = size * 0.10 * config.scaleY;
        maskCtx.ellipse(centerX, centerY, baseRadiusX, baseRadiusY, 0, 0, 2 * Math.PI);
        maskCtx.fill();

        setMaskImage(maskCanvas.toDataURL("image/png"));

        // Trigger Alpha Generation (Async)
        // Use passed image if available (from initial load), otherwise state
        const imgToUse = currentProcessedImage || processedImage;
        if (imgToUse) {
            generateAlpha(config, imgToUse);
        }
    };

    const generateAlpha = async (config: { x: number, y: number, scaleX: number, scaleY: number }, imageSrc: string) => {
        const size = 1024;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Load passed image
        const img = new window.Image();
        img.src = imageSrc;

        // Ensure image is loaded before drawing
        try {
            await img.decode();

            // Draw Image
            ctx.drawImage(img, 0, 0, size, size);

            // CUT HOLE (Eraser) - This removes the teeth from the image header->transparent
            ctx.globalCompositeOperation = "destination-out";
            ctx.beginPath();
            const centerX = size * (config.x / 100);
            const centerY = size * (config.y / 100);
            const baseRadiusX = size * 0.18 * config.scaleX;
            const baseRadiusY = size * 0.10 * config.scaleY;
            ctx.ellipse(centerX, centerY, baseRadiusX, baseRadiusY, 0, 0, 2 * Math.PI);
            ctx.fill();

            setAlphaImage(canvas.toDataURL("image/png"));
        } catch (e) {
            console.error("Alpha gen error", e);
        }
    };

    // Update mask when config changes
    useEffect(() => {
        if (processedImage) {
            generateMask(maskConfig, undefined, processedImage);
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
                setDebugInfo(null);
                setProcessedImage(null);
                setMaskImage(null);
                setAlphaImage(null); // Reset alpha
                setMaskConfig({ x: 50, y: 65, scaleX: 1.0, scaleY: 1.0 });
                processInputImage(imgStr);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (!processedImage || !maskImage || !alphaImage) return;

        setIsLoading(true);
        setResultImage(null);
        setDebugInfo(null);

        try {
            const canvas = document.createElement("canvas");
            const size = 1024;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not create canvas context");

            // White hole (The area to edit)
            ctx.fillStyle = "white";
            const baseX = size * (maskConfig.x / 100);
            const baseY = size * (maskConfig.y / 100);
            const baseRadiusX = size * 0.18 * maskConfig.scaleX;
            const baseRadiusY = size * 0.10 * maskConfig.scaleY;
            ctx.ellipse(baseX, baseY, baseRadiusX, baseRadiusY, 0, 0, 2 * Math.PI);
            ctx.fill();

            const bwMask = canvas.toDataURL("image/png");

            // Convert to Blobs
            const dataURItoBlob = (dataURI: string) => {
                const byteString = atob(dataURI.split(',')[1]);
                const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                return new Blob([ab], { type: mimeString });
            };

            const imageBlob = dataURItoBlob(processedImage); // Original image
            const maskBlob = dataURItoBlob(bwMask);          // B/W Mask

            const formData = new FormData();

            // IF TEMPLATE MODE: Send COMPOSITE as the image
            if (simulatorMode === 'template-overlay') {
                if (!compositeImage) { alert("Błąd: Brak kompozytu"); return; }
                const compositeBlob = dataURItoBlob(compositeImage);
                formData.append("image", compositeBlob, "composite.png");

                // We send the mask for blending reference
                formData.append("mask", maskBlob, "mask.png");
                formData.append("mode", "template-blend");
            } else {
                formData.append("image", imageBlob, "image.png");
                formData.append("mask", maskBlob, "mask.png");
                formData.append("mode", "ai-generate");
            }

            formData.append("style", smileStyle);

            const response = await fetch("/api/simulate", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            // FORCE DEBUGGING
            // alert("API RESPONSE:\n" + JSON.stringify(data, null, 2));

            if (!response.ok) {
                if (data.error && data.error.includes("auth")) {
                    throw new Error("Brak klucza API Replicate. Skontaktuj się z administratorem.");
                }
                throw new Error(data.error || "Błąd generowania");
            }

            // Fix for "Objects are not valid as a React child"
            // Ensure data.url is a string
            if (typeof data.url === 'string') {
                setResultImage(data.url);
            } else {
                console.error("Invalid URL format received:", data.url);
                alert("Błąd: Otrzymano nieprawidłowy format pliku ze sztucznej inteligencji. Zobacz debug info.");
            }

            setDebugInfo(data.debug);
        } catch (err: any) {
            console.error(err);
            alert("Wystąpił błąd: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Drag Logic for Mask ---

    const handleMaskMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault(); // Prevent scrolling on touch
        setIsMaskDragging(true);
    };

    const handleMaskMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isMaskDragging || !previewRef.current) return;

        const rect = previewRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        // Calculate percentage position
        let x = ((clientX - rect.left) / rect.width) * 100;
        let y = ((clientY - rect.top) / rect.height) * 100;

        // Clamp values
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));

        setMaskConfig(prev => ({ ...prev, x, y }));
    };

    const handleMaskMouseUp = () => {
        setIsMaskDragging(false);
    };

    // Attach global mouse up to catch drops outside container
    useEffect(() => {
        if (isMaskDragging) {
            window.addEventListener('mouseup', handleMaskMouseUp);
            window.addEventListener('touchend', handleMaskMouseUp);
        } else {
            window.removeEventListener('mouseup', handleMaskMouseUp);
            window.removeEventListener('touchend', handleMaskMouseUp);
        }
        return () => {
            window.removeEventListener('mouseup', handleMaskMouseUp);
            window.removeEventListener('touchend', handleMaskMouseUp);
        };
    }, [isMaskDragging]);


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
                        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", marginBottom: "0.5rem" }}>
                            Wirtualna Przymierzalnia
                        </h1>
                        WERSJA 5.1 (Overlay Controls)
                        <p style={{ color: "var(--color-text-muted)", maxWidth: "600px", margin: "0 auto" }}>
                            Wgraj swoje zdjęcie, wybierz tryb (AI lub Szablon) i zobacz nową wersję uśmiechu.
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
                                beforeImage={processedImage || selectedImage} // Use processed for accurate match
                                afterImage={resultImage}
                                onInteraction={() => { }}
                            />
                            <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--color-primary)' }}>
                                Twój nowy uśmiech (Flux AI)
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

                            {/* DEBUG: Show URL to check why it is broken */}
                            <div style={{ marginTop: '20px', padding: '10px', background: '#ffebee', border: '2px solid red', color: 'black', fontSize: '11px', wordBreak: 'break-all', textAlign: 'left' }}>
                                <strong>DEBUG INFO:</strong><br />
                                <strong>Image URL:</strong> {resultImage ? resultImage : "NULL"}<br />

                                {/* Composite Preview */}
                                {debugInfo && (() => {
                                    try {
                                        const parsed = JSON.parse(debugInfo);
                                        return parsed.composite ? (
                                            <div style={{ margin: '10px 0' }}>
                                                <strong>Real Mask Sent to AI:</strong><br />
                                                <img src={parsed.composite} style={{ width: '100px', height: '100px', border: '1px solid black' }} alt="Debug mask" />
                                            </div>
                                        ) : null;
                                    } catch (e) { return null; }
                                })()}

                                <strong>Raw Output:</strong> {debugInfo}
                            </div>
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
                                            {/* MODE SWITCHER PREVIEW AREA */}
                                            {simulatorMode === 'template-overlay' ? (
                                                <div style={{ width: '100%', height: '100%' }}>
                                                    <OverlayEditor
                                                        baseImage={processedImage || selectedImage}
                                                        templateImage={`/template_${smileStyle}.png`}
                                                        onCompositeReady={(url) => setCompositeImage(url)}
                                                    />
                                                    <div style={{ fontSize: '10px', color: 'gray', textAlign: 'center', marginTop: '5px' }}>
                                                        *Przesuwaj/Skaluj szablon. AI wtopi go w zdjęcie.
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    ref={previewRef}
                                                    onMouseMove={handleMaskMouseMove}
                                                    onTouchMove={handleMaskMouseMove}
                                                    style={{ width: '100%', height: '100%', position: 'relative' }}
                                                >
                                                    <Image
                                                        src={processedImage || selectedImage}
                                                        alt="Uploaded preview"
                                                        fill
                                                        style={{ objectFit: "cover", borderRadius: "10px" }}
                                                    />

                                                    {/* Alignment Guide Overlay - Dynamic & Interactive */}
                                                    <div
                                                        onMouseDown={handleMaskMouseDown}
                                                        onTouchStart={handleMaskMouseDown}
                                                        style={{
                                                            position: 'absolute',
                                                            top: `${maskConfig.y}%`,
                                                            left: `${maskConfig.x}%`,
                                                            transform: 'translate(-50%, -50%)',
                                                            width: `${36 * maskConfig.scaleX}%`,
                                                            height: `${20 * maskConfig.scaleY}%`,
                                                            border: '2px dashed rgba(255, 255, 0, 0.9)',
                                                            borderRadius: '50%',
                                                            cursor: isMaskDragging ? 'grabbing' : 'grab',
                                                            zIndex: 50,
                                                            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                                                            background: 'rgba(255, 255, 0, 0.1)'
                                                        }}>
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '-35px',
                                                            left: '50%',
                                                            transform: 'translateX(-50%)',
                                                            color: 'yellow',
                                                            fontSize: '12px',
                                                            whiteSpace: 'nowrap',
                                                            textShadow: '0 1px 2px black',
                                                            background: 'rgba(0,0,0,0.7)',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            pointerEvents: 'none'
                                                        }}>
                                                            👆 Przesuń mnie
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* CONTROLS COMMON CONTAINER */}
                                        <div style={{
                                            marginTop: '40px',
                                            padding: '15px',
                                            background: 'var(--color-surface-hover)',
                                            borderRadius: 'var(--radius-md)',
                                            width: '100%',
                                            maxWidth: '400px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px', gap: '10px' }}>
                                                <button
                                                    onClick={() => setSimulatorMode('template-overlay')}
                                                    style={{ padding: '5px 10px', borderRadius: '15px', border: simulatorMode === 'template-overlay' ? '2px solid var(--color-primary)' : '1px solid gray', background: simulatorMode === 'template-overlay' ? 'var(--color-primary)' : 'transparent', color: simulatorMode === 'template-overlay' ? 'white' : 'gray', cursor: 'pointer', fontSize: '0.8rem' }}
                                                >
                                                    Szablon (SmileCloud)
                                                </button>
                                                <button
                                                    onClick={() => setSimulatorMode('ai-generate')}
                                                    style={{ padding: '5px 10px', borderRadius: '15px', border: simulatorMode === 'ai-generate' ? '2px solid var(--color-primary)' : '1px solid gray', background: simulatorMode === 'ai-generate' ? 'var(--color-primary)' : 'transparent', color: simulatorMode === 'ai-generate' ? 'white' : 'gray', cursor: 'pointer', fontSize: '0.8rem' }}
                                                >
                                                    Tylko AI (Maska)
                                                </button>
                                            </div>

                                            {/* AI MASK CONTROLS (Only visible in AI Mode) */}
                                            {simulatorMode === 'ai-generate' && (
                                                <div className="space-y-4" style={{ marginBottom: '20px' }}>
                                                    <h4 style={{ marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-text-main)' }}>Dopasuj obszar uśmiechu:</h4>
                                                    <p style={{ fontSize: "0.8rem", color: "orange", fontWeight: "bold", textAlign: "center" }}>
                                                        ⚠️ Zaznacz całe zęby + margines.
                                                    </p>
                                                    <div>
                                                        <label className="block text-sm font-medium mb-1">Pozycja X {maskConfig.x}%</label>
                                                        <input
                                                            type="range" min="0" max="100"
                                                            value={maskConfig.x}
                                                            onChange={(e) => setMaskConfig({ ...maskConfig, x: Number(e.target.value) })}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium mb-1">Szerokość {maskConfig.scaleX.toFixed(1)}x</label>
                                                        <input
                                                            type="range" min="0.1" max="2.0" step="0.1"
                                                            value={maskConfig.scaleX}
                                                            onChange={(e) => setMaskConfig({ ...maskConfig, scaleX: Number(e.target.value) })}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium mb-1">Wysokość {maskConfig.scaleY.toFixed(1)}x</label>
                                                        <input
                                                            type="range" min="0.1" max="2.0" step="0.1"
                                                            value={maskConfig.scaleY}
                                                            onChange={(e) => setMaskConfig({ ...maskConfig, scaleY: Number(e.target.value) })}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* STYLE SELECTOR (Always visible) */}
                                            <div style={{ marginBottom: '15px' }}>
                                                <h4 style={{ marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-main)' }}>Wybierz styl uśmiechu:</h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                    {[
                                                        { id: 'hollywood', label: 'Hollywood', desc: 'Idealna biel (BL1)' },
                                                        { id: 'natural', label: 'Naturalny', desc: 'Kolor A1, tekstura' },
                                                        { id: 'soft', label: 'Łagodny', desc: 'Owalne, kobiece' },
                                                        { id: 'strong', label: 'Mocny', desc: 'Kanciaste, męskie' }
                                                    ].map((style) => (
                                                        <button
                                                            key={style.id}
                                                            onClick={() => setSmileStyle(style.id)}
                                                            style={{
                                                                padding: '8px',
                                                                borderRadius: '6px',
                                                                border: smileStyle === style.id ? '2px solid var(--color-primary)' : '1px solid var(--color-surface-hover)',
                                                                background: smileStyle === style.id ? 'rgba(var(--color-primary-rgb), 0.1)' : 'transparent',
                                                                cursor: 'pointer',
                                                                textAlign: 'left'
                                                            }}
                                                        >
                                                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: smileStyle === style.id ? 'var(--color-primary)' : 'var(--color-text-main)' }}>{style.label}</div>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{style.desc}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                className="btn-primary"
                                                onClick={handleGenerate}
                                                disabled={isLoading || !processedImage}
                                                style={{
                                                    width: '100%',
                                                    opacity: processedImage && !isLoading ? 1 : 0.7,
                                                    cursor: processedImage && !isLoading ? "pointer" : "not-allowed",
                                                    padding: "0.8rem",
                                                    display: "flex",
                                                    justifyContent: "center",
                                                    alignItems: "center",
                                                    gap: "0.5rem"
                                                }}
                                            >
                                                {isLoading ? "Generowanie..." : simulatorMode === 'template-overlay' ? "✨ Wtopienie szablonu (Flux)" : "✨ Generuj Uśmiech (Flux)"}
                                            </button>

                                            <div style={{ marginTop: '10px', fontSize: '0.7rem', color: '#666', textAlign: 'center' }}>
                                                {processedImage ? "✅ Zdjęcie gotowe" : "⏳ Przetwarzanie..."}
                                            </div>
                                        </div>
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
