"use client";

import { useState, useRef, useEffect } from "react";
import { X, Camera, Upload, RefreshCw, AlertTriangle, Check, RotateCcw, Download } from "lucide-react";
import { useSimulator } from "@/context/SimulatorContext";
import { analysisFaceAlignment } from "@/helpers/faceDetection";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

// --- HELPERS ---
// Configure standard video constraints
const VIDEO_CONSTRAINTS = {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 }
};

export default function SimulatorModal() {
    const { isOpen, closeSimulator } = useSimulator();
    type SimulatorStep = 'instruction' | 'intro' | 'camera' | 'processing' | 'result';
    const [step, setStep] = useState<SimulatorStep>('instruction');
    const [error, setError] = useState<string | null>(null);
    const [statusMsg, setStatusMsg] = useState("Przygotowuję...");

    // Data
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);

    // ... (refs) ...

    // --- BRANDED DOWNLOAD ---
    const downloadBrandedImage = async () => {
        if (!resultImage) return;
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Load Result Image
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = resultImage;
            await new Promise(r => img.onload = r);

            // Set Canvas Size
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            // Draw Result
            ctx.drawImage(img, 0, 0);

            // Load Logo
            const logo = new Image();
            logo.crossOrigin = "anonymous";
            logo.src = "/logo-transparent.png"; // Use the one found in public
            await new Promise((r) => {
                logo.onload = r;
                logo.onerror = r; // Proceed even if logo fails
            });

            // Draw Logo (Top Left, 20% width)
            if (logo.complete && logo.naturalWidth > 0) {
                const logoW = canvas.width * 0.25;
                const logoH = logoW * (logo.naturalHeight / logo.naturalWidth);
                const padding = canvas.width * 0.05;
                ctx.drawImage(logo, padding, padding, logoW, logoH);
            }

            // Draw Slogan (Bottom Center)
            const slogan = "Pamiętaj, że my zrobimy to lepiej niż AI!";
            ctx.font = `bold ${canvas.width * 0.04}px sans-serif`;
            ctx.fillStyle = "rgba(0,0,0,0.6)"; // Shadow
            ctx.textAlign = "center";
            ctx.fillText(slogan, canvas.width / 2 + 2, canvas.height - (canvas.height * 0.05) + 2);

            ctx.fillStyle = "#dcb14a"; // Gold Color
            ctx.fillText(slogan, canvas.width / 2, canvas.height - (canvas.height * 0.05));

            // Trigger Download
            const link = document.createElement('a');
            link.download = `mikrostomart-metamorfoza-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error("Download failed", e);
            alert("Błąd pobierania");
        }
    };


    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- RESET ON CLOSE ---
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            setStep('instruction'); // Always show instructions first on re-open
            setOriginalImage(null);
            setResultImage(null);
            setError(null);
        }
    }, [isOpen]);

    // --- CAMERA LOGIC ---
    const startCamera = async () => {
        setError(null);
        setStep('camera');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: VIDEO_CONSTRAINTS,
                audio: false
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err: any) {
            console.error(err);
            setError("Nie udało się uruchomić kamery. Spróbuj wgrać plik.");
            // Fallback to intro ?? Or stay in camera with error?
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;

        // Setup canvas
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Flip horizontally if facing user (mirror effect fix)? 
        // Actually, usually user expects mirror behavior while streaming, but normal photo.
        // Let's keep it simple: What you see is what you get.
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1); // Mirror
        ctx.drawImage(video, 0, 0);

        const dataUrl = canvas.toDataURL('image/png');
        stopCamera();
        handleImageSelected(dataUrl);
    };

    // --- FILE UPLOAD LOGIC ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            if (typeof ev.target?.result === 'string') {
                handleImageSelected(ev.target.result);
            }
        };
        reader.readAsDataURL(file);
    };

    // --- IMAGE PROCESSING (Normalization & Auto-Mask) ---
    const handleImageSelected = async (rawSrc: string) => {
        setStep('processing');
        setStatusMsg("Optymalizuję zdjęcie...");

        try {
            // 1. Normalize Orientation (Draw to canvas to bake EXIF)
            const normalizedSrc = await normalizeImage(rawSrc);
            setOriginalImage(normalizedSrc);

            // 2. Auto-Mask
            setStatusMsg("Szukam uśmiechu...");
            const maskSrc = await generateAutoMask(normalizedSrc);

            // 3. Send to API
            setStatusMsg("Projektuję metamorfozę...");
            await runSimulation(normalizedSrc, maskSrc);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Błąd przetwarzania.");
            setStep('intro');
        }
    };

    const normalizeImage = (src: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                // Limit max resolution to avoid heavy payloads (e.g. 1920x1920 max)
                const MAX_SIZE = 1500;
                let w = img.naturalWidth;
                let h = img.naturalHeight;

                // Scale down logic
                if (w > MAX_SIZE || h > MAX_SIZE) {
                    const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
                    w *= ratio;
                    h *= ratio;
                }

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject("Canvas error"); return; }

                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.onerror = () => reject("Failed to load image");
        });
    };

    // --- DEBUG ---
    const [showDebug, setShowDebug] = useState(false);
    const [debugMaskSrc, setDebugMaskSrc] = useState<string | null>(null);

    // Helper: Sanitize image using createImageBitmap + Resize to Max 1280px
    const sanitizeImage = async (src: string): Promise<string> => {
        try {
            // 1. Fetch blob
            const response = await fetch(src);
            const blob = await response.blob();

            // 2. Create Bitmap (Auto-normalizes EXIF)
            const bitmap = await createImageBitmap(blob);

            // 3. Calculate Scale for Max 1280px
            const maxDim = 1280;
            let width = bitmap.width;
            let height = bitmap.height;

            if (width > maxDim || height > maxDim) {
                const ratio = Math.min(maxDim / width, maxDim / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            // 4. Draw to canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("No ctx");

            ctx.drawImage(bitmap, 0, 0, width, height);

            return canvas.toDataURL('image/png');
        } catch (e) {
            console.error("Sanitization fallback", e);
            // Fallback
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    const maxDim = 1280;
                    let w = img.naturalWidth;
                    let h = img.naturalHeight;
                    if (w > maxDim || h > maxDim) {
                        const r = Math.min(maxDim / w, maxDim / h);
                        w = Math.round(w * r);
                        h = Math.round(h * r);
                    }
                    const c = document.createElement('canvas');
                    c.width = w;
                    c.height = h;
                    c.getContext('2d')?.drawImage(img, 0, 0, w, h);
                    resolve(c.toDataURL('image/png'));
                };
                img.onerror = reject;
                img.src = src;
            });
        }
    };

    const generateAutoMask = async (imgSrc: string): Promise<string> => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imgSrc;
        await new Promise(r => img.onload = r);

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context err");

        // Black Bg
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        try {
            const analysis = await analysisFaceAlignment(img);
            if (!analysis || !analysis.mouthPath) {
                throw new Error("Nie udało się wykryć ust. Upewnij się, że twarz jest oświetlona i widoczna, lub oddal nieco aparat.");
            }

            // Normal Path: Face Detected
            // 1. Generate B/W Mask for AI
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'white';
            ctx.lineWidth = Math.max(10, canvas.width * 0.025);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.filter = 'blur(4px)';

            ctx.beginPath();
            const mp = analysis.mouthPath;

            // Calculate Centroid
            let cx = 0, cy = 0;
            mp.forEach(p => { cx += p.x; cy += p.y; });
            cx /= mp.length;
            cy /= mp.length;

            // Dilation Factor (1.15 = 15% bigger for clean edge blending)
            const dilation = 1.15;

            const dilatedPath = mp.map(p => ({
                x: (cx + (p.x - cx) * dilation) * canvas.width,
                y: (cy + (p.y - cy) * dilation) * canvas.height
            }));

            if (dilatedPath.length > 0) {
                ctx.moveTo(dilatedPath[0].x, dilatedPath[0].y);
                for (let i = 1; i < dilatedPath.length; i++) {
                    ctx.lineTo(dilatedPath[i].x, dilatedPath[i].y);
                }
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            const maskData = canvas.toDataURL('image/png'); // Save B/W Mask for API

            // 2. Generate Debug Composite (Original + Outline + Landmarks)
            ctx.filter = 'none';
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Draw Red Outline (Mouth)
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(mp[0].x * canvas.width, mp[0].y * canvas.height);
            for (let i = 1; i < mp.length; i++) {
                ctx.lineTo(mp[i].x * canvas.width, mp[i].y * canvas.height);
            }
            ctx.closePath();
            ctx.stroke();

            // Draw REFERENCE LANDMARKS (To debug global shift)
            // Face Box (Green)
            if (analysis.faceBox) {
                ctx.strokeStyle = 'lime';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    analysis.faceBox.x * canvas.width,
                    analysis.faceBox.y * canvas.height,
                    analysis.faceBox.width * canvas.width,
                    analysis.faceBox.height * canvas.height
                );
            }

            // Center (Blue)
            ctx.fillStyle = 'blue';
            ctx.beginPath();
            ctx.arc(analysis.x / 100 * canvas.width, analysis.y / 100 * canvas.height, 10, 0, 2 * Math.PI);
            ctx.fill();

            const debugData = canvas.toDataURL('image/png');
            setDebugMaskSrc(debugData);

            return maskData;

        } catch (e) {
            console.warn("Face detection failed.", e);
            throw new Error("Nie udało się wykryć ust. Upewnij się, że twarz jest oświetlona i widoczna, lub oddal nieco aparat.");
        }
    };

    // Convert mask: white=edit, black=keep → OpenAI format: transparent=edit, opaque=keep
    const convertMaskForOpenAI = async (maskSrc: string): Promise<Blob> => {
        const img = new Image();
        img.src = maskSrc;
        await new Promise(r => img.onload = r);

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas error');

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // White pixels → transparent (edit area), Black pixels → opaque (keep area)
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (brightness > 128) {
                // White area → transparent (AI edits this)
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = 0;
                data[i + 3] = 0; // transparent
            } else {
                // Black area → opaque black (AI keeps this)
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = 0;
                data[i + 3] = 255; // opaque
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png');
        });
    };

    const runSimulation = async (imgSrc: string, maskSrc: string) => {
        try {
            // Convert image to blob
            const imgBlob = await (await fetch(imgSrc)).blob();
            // Convert mask to OpenAI format (transparent = edit area)
            const maskBlob = await convertMaskForOpenAI(maskSrc);

            const formData = new FormData();
            formData.append("image", imgBlob, "image.png");
            formData.append("mask", maskBlob, "mask.png");
            formData.append("style", "hollywood");

            // Synchronous call — OpenAI returns result directly, no polling needed
            const res = await fetch("/api/simulate", { method: "POST", body: formData });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Błąd serwera. Spróbuj później.");
            }

            const result = await res.json();

            if (result.status === 'succeeded' && result.url) {
                setResultImage(result.url);
                setStep('result');
            } else {
                throw new Error(result.error || "AI nie zwróciło wyniku.");
            }
        } catch (err: any) {
            console.error("Simulation error:", err);
            setError(err.message || "Błąd generowania uśmiechu.");
            setStep('intro');
        }
    };

    // --- RENDER ---
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
            fontFamily: 'sans-serif'
        }}>

            {/* CLOSE BTN */}
            <button onClick={closeSimulator} style={{
                position: 'absolute', top: '20px', right: '20px',
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                color: 'white', padding: '10px', cursor: 'pointer', zIndex: 100
            }}>
                <X size={24} />
            </button>


            {/* DEBUG TOGGLE (Hidden in corner) */}
            <button onClick={() => setShowDebug(!showDebug)} style={{
                position: 'absolute', top: '20px', left: '20px',
                background: showDebug ? 'red' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '5px',
                color: 'white', padding: '5px 10px', cursor: 'pointer', zIndex: 100, fontSize: '10px',
                display: 'none' // HIDDEN
            }}>
                DEBUG
            </button>

            {/* MODAL WINDOW */}
            <div style={{
                width: '100%', maxWidth: '500px', height: '100%', maxHeight: '800px',
                display: 'flex', flexDirection: 'column', position: 'relative',
                overflow: 'hidden', backgroundColor: 'black'
            }}>

                {/* --- HEADER --- */}
                <div style={{ padding: '20px', textAlign: 'center', background: '#0f0f0f' }}>
                    <h2 style={{ margin: 0, color: '#dcb14a' }}>Symulator Uśmiechu</h2>
                </div>

                {/* --- CONTENT --- */}
                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>

                    {/* DEBUG OVERLAY */}
                    {showDebug && debugMaskSrc && (
                        <div style={{
                            position: 'absolute', top: 50, left: 50, width: '250px', zIndex: 200,
                            border: '2px solid red', background: 'black',
                            boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                        }}>
                            <p style={{ fontSize: '12px', color: 'white', background: 'red', margin: 0, padding: '2px 5px', fontWeight: 'bold' }}>
                                DEBUG: WHAT AI SEES (100%)
                            </p>
                            <img src={debugMaskSrc} style={{ width: '100%', display: 'block' }} />
                        </div>
                    )}

                    {error && (
                        <div style={{
                            position: 'absolute', top: '10px', left: '20px', right: '20px', zIndex: 50,
                            background: 'rgba(255,0,0,0.2)', border: '1px solid red', color: '#ffaaaa',
                            padding: '10px', borderRadius: '8px', fontSize: '14px', textAlign: 'center'
                        }}>
                            <AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px' }} /> {error}
                        </div>
                    )}

                    {step === 'instruction' && (
                        <div style={{
                            padding: '30px', textAlign: 'center', color: 'white',
                            display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center'
                        }}>
                            <div style={{ fontSize: '50px' }}>📸</div>
                            <h3 style={{ margin: 0, color: '#dcb14a' }}>Instrukcja Idealnego Zdjęcia</h3>
                            <p style={{ lineHeight: '1.6', fontSize: '16px', color: '#ccc' }}>
                                Aby uzyskać najlepszy efekt symulacji, postępuj zgodnie z poniższymi wskazówkami:
                            </p>
                            <ul style={{
                                textAlign: 'left', background: 'rgba(255,255,255,0.05)',
                                padding: '20px 30px', borderRadius: '15px', lineHeight: '1.8', margin: 0
                            }}>
                                <li>⭐ Zrób zdjęcie <b>na wprost (en face)</b>, trzymając telefon na wysokości oczu.</li>
                                <li>👄 <b>Lekko uchyl usta</b>, aby nie zasłaniać całkowicie zębów, ale też ich nie eksponować przesadnie.</li>
                                <li>☀️ Zadbaj o <b>dobre, naturalne oświetlenie</b> padające na twarz.</li>
                                <li>🚫 Unikaj zdjęć z profilu lub z dołu.</li>
                            </ul>
                            <button onClick={() => setStep('intro')} style={{
                                marginTop: '10px',
                                padding: '15px 40px', borderRadius: '50px',
                                background: '#dcb14a', color: 'black', border: 'none',
                                fontWeight: 'bold', fontSize: '16px', cursor: 'pointer'
                            }}>
                                Zrozumiałem, Zaczynamy!
                            </button>
                        </div>
                    )}

                    {step === 'intro' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                            <div style={{
                                width: '100%', aspectRatio: '1/1', background: '#1a1a1a', borderRadius: '20px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <div style={{ fontSize: '80px' }}>✨</div>
                            </div>

                            <button onClick={startCamera} style={{
                                width: '100%', padding: '20px', borderRadius: '15px', border: 'none',
                                background: '#fff', color: '#000', fontSize: '18px', fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                cursor: 'pointer'
                            }}>
                                <Camera /> Uruchom Kamerę
                            </button>

                            <button onClick={() => fileInputRef.current?.click()} style={{
                                width: '100%', padding: '20px', borderRadius: '15px', border: '1px solid #444',
                                background: 'transparent', color: '#fff', fontSize: '18px', fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                cursor: 'pointer'
                            }}>
                                <Upload /> Wgraj Zdjęcie
                            </button>

                            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                        </div>
                    )}

                    {step === 'camera' && (
                        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '20px', overflow: 'hidden', background: '#000' }}>
                            <video
                                ref={videoRef}
                                autoPlay playsInline muted
                                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                            />
                            <div style={{ position: 'absolute', bottom: '20px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                                <button onClick={capturePhoto} style={{
                                    width: '80px', height: '80px', borderRadius: '50%',
                                    background: '#fff', border: '5px solid #dcb14a'
                                }} />
                            </div>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div style={{ textAlign: 'center' }}>
                            <div className="animate-spin" style={{ margin: '0 auto 20px', width: '50px', height: '50px', border: '4px solid #333', borderTopColor: '#dcb14a', borderRadius: '50%' }} />
                            <h3 style={{ color: 'white' }}>{statusMsg}</h3>
                        </div>
                    )}

                    {step === 'result' && originalImage && resultImage && (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #333' }}>
                                <BeforeAfterSlider beforeImage={originalImage} afterImage={resultImage} />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', width: '100%', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                    <button onClick={() => handleImageSelected(originalImage)} style={{
                                        flex: 1, padding: '15px', borderRadius: '12px',
                                        background: '#333', color: 'white', border: '1px solid #444', fontWeight: 'bold',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer'
                                    }}>
                                        <RefreshCw size={18} /> Powtórz
                                    </button>
                                    <button onClick={downloadBrandedImage} style={{
                                        flex: 1, padding: '15px', borderRadius: '12px',
                                        background: '#dcb14a', color: 'black', border: 'none', fontWeight: 'bold',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer'
                                    }}>
                                        <Download size={18} /> Pobierz
                                    </button>
                                </div>

                                <button onClick={() => setStep('intro')} style={{
                                    width: '100%', padding: '10px', borderRadius: '12px',
                                    background: 'transparent', color: '#666', border: 'none', fontSize: '12px',
                                    cursor: 'pointer'
                                }}>
                                    Wróć do startu
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
