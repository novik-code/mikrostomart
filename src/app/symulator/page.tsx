"use client";

import { useState, useRef, useEffect } from "react";
import RevealOnScroll from "@/components/RevealOnScroll";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

/*
  SIMULATOR PAGE (Dentist Mode Edition)
  Strategy:
  1. User draws mask (oval).
  2. Before sending to API, we 'PAINT' the mouth area #DDDDDD (Grey) on the image.
  3. This removes "closed lips" features and gives DALL-E 2 a neutral canvas to draw teeth on.
*/

export default function SimulatorPage() {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null); // Scaled/Cropped square
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Mask Visualization State
    const [maskConfig, setMaskConfig] = useState({
        x: 50,
        y: 65,
        scaleX: 1.0,
        scaleY: 1.0
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Image Processing (Crop to Square) ---
    const processInputImage = (imageUrl: string) => {
        const img = new window.Image();
        img.onload = () => {
            const size = Math.min(img.width, img.height);
            const canvas = document.createElement("canvas");
            canvas.width = 1024;
            canvas.height = 1024;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            // Draw white background
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, 1024, 1024);

            // Center crop
            const offsetX = (img.width - size) / 2;
            const offsetY = (img.height - size) / 2;
            ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 1024, 1024);

            setProcessedImage(canvas.toDataURL("image/png"));
            setResultImage(null); // Reset result on new image
        };
        img.src = imageUrl;
    };

    const handleFile = (file: File) => {
        if (!file.type.startsWith("image/")) {
            alert("Proszę wgrać plik obrazkowy (JPG, PNG).");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const imgStr = e.target?.result as string;
            if (imgStr) {
                setSelectedImage(imgStr);
                // Reset mask to default position
                setMaskConfig({ x: 50, y: 65, scaleX: 1.0, scaleY: 1.0 });
                processInputImage(imgStr);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (!processedImage) return;

        setIsLoading(true);
        setResultImage(null);

        try {
            // "The Dentist" Strategy
            // We physically paint a tooth-colored blob on the image before sending it.
            // This destroys the "closed lips" information, forcing the AI to see "teeth" 
            // and just fix the texture/lighting.

            const canvas = document.createElement("canvas");
            canvas.width = 1024;
            canvas.height = 1024;
            const ctx = canvas.getContext("2d");

            if (!ctx) throw new Error("Canvas context failed");

            const img = new window.Image();
            img.src = processedImage;
            await img.decode();

            // --- 1. Prepare "Painted" Image (INPUT) ---
            // Draw original
            ctx.drawImage(img, 0, 0);

            // Calculate Mask Coordinates
            const size = 1024;
            const baseX = size * (maskConfig.x / 100);
            const baseY = size * (maskConfig.y / 100);
            const baseRadiusX = size * 0.18 * maskConfig.scaleX;
            const baseRadiusY = size * 0.10 * maskConfig.scaleY;

            // PAINT IT GREY/WHITE (The "Guide")
            // #DDDDDD is a neutral light grey that looks like "unlit teeth" to the AI
            ctx.fillStyle = "#DDDDDD";
            ctx.beginPath();
            ctx.ellipse(baseX, baseY, baseRadiusX, baseRadiusY, 0, 0, 2 * Math.PI);
            ctx.fill();

            const imageWithGuide = canvas.toDataURL("image/png");


            // --- 2. Prepare Mask (Where to edit) ---
            // We need a separate pass for the mask to ensure it matches perfectly
            ctx.clearRect(0, 0, 1024, 1024);

            // Background Black (Keep)
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, 1024, 1024);

            // Hole Transparent (Edit) - This needs to match the painted area
            ctx.globalCompositeOperation = "destination-out";
            ctx.beginPath();
            ctx.ellipse(baseX, baseY, baseRadiusX, baseRadiusY, 0, 0, 2 * Math.PI);
            ctx.fill();

            // Reset
            ctx.globalCompositeOperation = "source-over";

            const maskData = canvas.toDataURL("image/png");


            // --- 3. Debug View ---
            const debugContainer = document.getElementById('debug-hole-container');
            if (debugContainer) {
                debugContainer.innerHTML = `
                    <div style="display:flex; gap:10px; justify-content:center;">
                        <div>
                            <img src="${imageWithGuide}" style="width: 150px; height: 150px; border: 2px solid red;" />
                            <p style="font-size: 10px; color: red;">DENTIST MODE: Painted Input</p>
                        </div>
                    </div>
                `;
            }

            // --- 4. Convert and Send ---
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

            const imageBlob = dataURItoBlob(imageWithGuide);
            const maskBlob = dataURItoBlob(maskData);

            const formData = new FormData();
            formData.append("image", imageBlob, "image.png");
            formData.append("mask", maskBlob, "mask.png");

            const response = await fetch("/api/simulate", {
                method: "POST",
                body: formData, // No Content-Type header needed for FormData
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error && data.error.includes("safety")) {
                    throw new Error("System bezpieczeństwa odrzucił zdjęcie.");
                }
                throw new Error(data.error || "Błąd generowania");
            }

            setResultImage(data.url);
        } catch (err: any) {
            console.error(err);
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
                        <div className="simulator-result" style={{ marginBottom: "3rem" }}>
                            <BeforeAfterSlider
                                beforeImage={selectedImage} // Use original, uncropped for context? Or processed? Let's use beforeImage as processed to match
                                afterImage={resultImage}
                                onInteraction={() => { }}
                            />

                            <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setResultImage(null)}
                                >
                                    Skoryguj Obszar
                                </button>
                                <a
                                    href={resultImage}
                                    download="nowy-usmiech.png"
                                    className="btn btn-primary"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Pobierz Wynik
                                </a>
                            </div>

                            {/* DEBUG PREVIEW */}
                            <div id="debug-hole-container" style={{ marginTop: '20px', textAlign: 'center', opacity: 0.7 }}></div>
                        </div>
                    ) : (
                        <div className="simulator-workspace" style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", border: "1px solid var(--color-border)" }}>

                            {/* UPLOAD & PREVIEW */}
                            {!processedImage ? (
                                <div
                                    className={`upload-zone ${isDragging ? "dragging" : ""}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        border: "2px dashed var(--color-border)",
                                        padding: "4rem 2rem",
                                        textAlign: "center",
                                        cursor: "pointer",
                                        borderRadius: "0.5rem",
                                        background: isDragging ? "rgba(var(--color-primary-rgb), 0.05)" : "transparent",
                                        transition: "all 0.3s ease"
                                    }}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                                        accept="image/*"
                                        style={{ display: "none" }}
                                    />
                                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📸</div>
                                    <h3>Kliknij lub upuść zdjęcie tutaj</h3>
                                    <p style={{ color: "var(--color-text-muted)" }}>Najlepiej działa zdjęcie twarzy na wprost</p>
                                </div>
                            ) : (
                                <div className="editor-interface">
                                    <div className="preview-container" style={{ position: "relative", width: "100%", maxWidth: "512px", margin: "0 auto", aspectRatio: "1/1", overflow: "hidden", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                                        {/* Background Image */}
                                        <img
                                            src={processedImage}
                                            alt="Preview"
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        />

                                        {/* INTERACTIVE MASK OVERLAY */}
                                        <div
                                            className="mask-overlay"
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                left: 0,
                                                width: "100%",
                                                height: "100%",
                                                pointerEvents: "none" // Let clicks pass through if needed, but we check sliders
                                            }}
                                        >
                                            {/* We draw the 'hole' visually using a semi-transparent overlay with a cutout */}
                                            <div style={{
                                                position: "absolute",
                                                top: `${maskConfig.y}%`,
                                                left: `${maskConfig.x}%`,
                                                transform: "translate(-50%, -50%)",
                                                width: `${36 * maskConfig.scaleX}%`, // 1024 * 0.18 * 2 = 36% approx width
                                                height: `${20 * maskConfig.scaleY}%`, // 1024 * 0.10 * 2 = 20% approx height
                                                borderRadius: "50%",
                                                border: "2px solid rgba(255, 0, 0, 0.8)",
                                                background: "rgba(255, 0, 0, 0.2)",
                                                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)" // Dim everything else
                                            }}>
                                                <div style={{
                                                    position: "absolute",
                                                    top: "-25px",
                                                    left: "50%",
                                                    transform: "translateX(-50%)",
                                                    background: "red",
                                                    color: "white",
                                                    padding: "2px 6px",
                                                    borderRadius: "4px",
                                                    fontSize: "10px",
                                                    whiteSpace: "nowrap"
                                                }}>
                                                    Obszar do zmiany
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CONTROLS */}
                                    <div className="controls" style={{ marginTop: "2rem", display: "grid", gap: "1.5rem" }}>

                                        <div className="control-group">
                                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Pozycja (Góra/Dół)</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={maskConfig.y}
                                                onChange={(e) => setMaskConfig(prev => ({ ...prev, y: Number(e.target.value) }))}
                                                style={{ width: "100%" }}
                                            />
                                        </div>

                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                            <div className="control-group">
                                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Szerokość</label>
                                                <input
                                                    type="range"
                                                    min="0.5"
                                                    max="2.0"
                                                    step="0.1"
                                                    value={maskConfig.scaleX}
                                                    onChange={(e) => setMaskConfig(prev => ({ ...prev, scaleX: Number(e.target.value) }))}
                                                    style={{ width: "100%" }}
                                                />
                                            </div>
                                            <div className="control-group">
                                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Wysokość</label>
                                                <input
                                                    type="range"
                                                    min="0.5"
                                                    max="2.0"
                                                    step="0.1"
                                                    value={maskConfig.scaleY}
                                                    onChange={(e) => setMaskConfig(prev => ({ ...prev, scaleY: Number(e.target.value) }))}
                                                    style={{ width: "100%" }}
                                                />
                                            </div>
                                        </div>

                                        <div className="actions" style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1rem" }}>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setProcessedImage(null);
                                                    setSelectedImage(null);
                                                }}
                                            >
                                                Zmień zdjęcie
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleGenerate}
                                                disabled={isLoading}
                                                style={{ minWidth: "200px" }}
                                            >
                                                {isLoading ? "Generowanie..." : "✨ Generuj Uśmiech"}
                                            </button>
                                        </div>
                                        <div id="debug-hole-container" style={{ marginTop: '20px', textAlign: 'center', opacity: 0.7 }}></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </RevealOnScroll>
            </div>
        </main>
    );
}
