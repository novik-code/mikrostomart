"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import RevealOnScroll from "@/components/RevealOnScroll";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

/*
  SIMULATOR PAGE (Replicate / Flux Edition)
  Strategy:
  1. User draws mask (oval).
  2. We send original image + mask hole to API.
  3. API uses Replicate (Flux Fill) for SOTA inpainting.
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
    // State for Image Layout (How the image sits on the 1024x1024 canvas)
    const [imageLayout, setImageLayout] = useState({ tx: 0, ty: 0, scale: 1, drawWidth: 1024, drawHeight: 1024 });

    // Drag Logic Refs
    const previewRef = useRef<HTMLDivElement>(null);
    const [isMaskDragging, setIsMaskDragging] = useState(false);
    const [maskImage, setMaskImage] = useState<string | null>(null);

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
            const minDim = Math.min(nW, nH);
            // We want to scale so the WHOLE image fits? Or cover?
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

            // Trigger initial mask generation
            // pass layout explicitly because state update is async
            generateMask(maskConfig, layout);

        } catch (err) {
            console.error("Processing Error", err);
            alert("Błąd przetwarzania zdjęcia.");
        }
    };

    // 2. Generate Mask AND Alpha-Hole Image
    const generateMask = (config: { x: number, y: number, scaleX: number, scaleY: number }, layout?: any) => {
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
        // Replicate Mask: White = Inpaint, Black = Keep
        // My previous logic: GlobalCompositeOperation destination-out makes it transparent. 
        // Let's stick to standard: White shapes on Black background.

        maskCtx.fillStyle = "white";
        maskCtx.beginPath();
        const centerX = size * (config.x / 100);
        const centerY = size * (config.y / 100);
        const baseRadiusX = size * 0.18 * config.scaleX;
        const baseRadiusY = size * 0.10 * config.scaleY;
        maskCtx.ellipse(centerX, centerY, baseRadiusX, baseRadiusY, 0, 0, 2 * Math.PI);
        maskCtx.fill();

        // For preview, we still want the "Hole" visual. 
        // But for API we strictly need B/W Mask.
        // AND for the new strategy, we need the "Image with Transparency".

        setMaskImage(maskCanvas.toDataURL("image/png"));

        // Trigger Alpha Generation (Async)
        generateAlpha(config);
    };

    const generateAlpha = async (config: { x: number, y: number, scaleX: number, scaleY: number }) => {
        if (!processedImage) return;

        const size = 1024;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Load current processed image
        const img = new window.Image();
        img.src = processedImage;
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
    };

    // Update mask when config changes
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

            // White hole (The area to edit)
            ctx.fillStyle = "white";
            ctx.beginPath();
            const size = 1024;
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
            formData.append("image", imageBlob, "image.png");
            formData.append("mask", maskBlob, "mask.png");

            const response = await fetch("/api/simulate", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            // FORCE DEBUGGING
            alert("API RESPONSE:\n" + JSON.stringify(data, null, 2));

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
                        <p style={{ fontSize: "0.8rem", color: "red", fontWeight: "bold", marginBottom: "1rem" }}>
                            WERSJA 4.1 (Alpha+FluxPro)
                        </p>
                        <p style={{ color: "var(--color-text-muted)", maxWidth: "600px", margin: "0 auto" }}>
                            Wgraj swoje zdjęcie, a nasza sztuczna inteligencja (Flux Pro) pokaże Ci potencjał Twojego nowego uśmiechu.
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
                                    <div
                                        ref={previewRef}
                                        onMouseMove={handleMaskMouseMove}
                                        onTouchMove={handleMaskMouseMove}
                                        style={{ position: "relative", width: "100%", height: "100%", minHeight: "400px", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: isMaskDragging ? 'grabbing' : 'default', touchAction: 'none' }}
                                    >
                                        <div style={{ position: 'relative', width: '300px', height: '300px', marginBottom: '2rem', pointerEvents: 'none' }}>
                                            {/* CRITICAL FIX: Show processedImage (the actual square crop) so mask aligns 1:1 */}
                                            <Image
                                                src={processedImage || selectedImage}
                                                alt="Uploaded preview"
                                                fill
                                                style={{ objectFit: "cover", borderRadius: "10px" }} // Matches the 1024x1024 canvas logic
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

                                        {/* Alignment Guide Overlay - Dynamic & Interactive */}
                                        <div
                                            onMouseDown={handleMaskMouseDown}
                                            onTouchStart={handleMaskMouseDown}
                                            style={{
                                                position: 'absolute',
                                                top: `${maskConfig.y}%`,
                                                left: `${maskConfig.x}%`,
                                                transform: 'translate(-50%, -50%)',
                                                width: `${36 * maskConfig.scaleX}%`, // Base 36% width
                                                height: `${20 * maskConfig.scaleY}%`, // Base 20% height
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

                                        <div className="space-y-4">
                                            <p style={{ fontSize: "0.8rem", color: "orange", fontWeight: "bold", textAlign: "center" }}>
                                                ⚠️ WSKAZÓWKA: Zaznacz całe zęby + mały margines warg (2-4mm). Zamaluj też czarne braki zębowe!
                                            </p>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Pozycja pozioma (X) {maskConfig.x}%</label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={maskConfig.x}
                                                    onChange={(e) => setMaskConfig({ ...maskConfig, x: Number(e.target.value) })}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '10px' }}>
                                            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px' }}>
                                                <span>Szerokość</span>
                                                <span>{maskConfig.scaleX.toFixed(1)}x</span>
                                            </label>
                                            <input
                                                type="range" min="0.1" max="2.0" step="0.1"
                                                value={maskConfig.scaleX}
                                                onChange={(e) => setMaskConfig({ ...maskConfig, scaleX: Number(e.target.value) })}
                                                style={{ width: '100%' }}
                                                className="accent-primary"
                                            />
                                        </div>

                                        <div style={{ marginBottom: '15px' }}>
                                            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px' }}>
                                                <span>Wysokość</span>
                                                <span>{maskConfig.scaleY.toFixed(1)}x</span>
                                            </label>
                                            <input
                                                type="range" min="0.1" max="2.0" step="0.1"
                                                value={maskConfig.scaleY}
                                                onChange={(e) => setMaskConfig({ ...maskConfig, scaleY: Number(e.target.value) })}
                                                style={{ width: '100%' }}
                                                className="accent-primary"
                                            />
                                        </div>

                                        {/* GENERATE BUTTON MOVED HERE TO BE SAFE */}
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
                                            {isLoading ? "Generowanie..." : "✨ Generuj Uśmiech (Flux)"}
                                        </button>

                                        {/* DEBUG INFO */}
                                        <div style={{ marginTop: '10px', fontSize: '0.7rem', color: '#666', textAlign: 'center' }}>
                                            {processedImage ? "✅ Zdjęcie gotowe" : "⏳ Przetwarzanie..."}
                                            {maskImage ? " | ✅ Maska gotowa" : " | ⏳ Maska..."}
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
