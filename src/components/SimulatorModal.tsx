"use client";

import { useState, useRef, useEffect } from "react";
import { X, Camera, Upload, RefreshCw, AlertTriangle, Check, RotateCcw } from "lucide-react";
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
    const [step, setStep] = useState<'intro' | 'camera' | 'processing' | 'result'>('intro');
    const [error, setError] = useState<string | null>(null);
    const [statusMsg, setStatusMsg] = useState("Przygotowuję...");

    // Data
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- RESET ON CLOSE ---
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            setStep('intro');
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

    // Update generateAutoMask to save debug mask
    const generateAutoMask = async (imgSrc: string): Promise<string> => {
        const img = new Image();
        img.src = imgSrc;
        await new Promise(r => img.onload = r);

        const analysis = await analysisFaceAlignment(img);
        if (!analysis || !analysis.mouthPath) {
            throw new Error("Nie wykryto twarzy/ust. Spróbuj innego zdjęcia.");
        }

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context err");

        // Black Bg
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // White Mouth
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = Math.max(8, canvas.width * 0.02); // Increased dilation (~2% of width)
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.filter = 'blur(4px)'; // Soften edges for better AI blending

        ctx.beginPath();
        const mp = analysis.mouthPath;
        ctx.moveTo(mp[0].x * canvas.width, mp[0].y * canvas.height);
        for (let i = 1; i < mp.length; i++) {
            ctx.lineTo(mp[i].x * canvas.width, mp[i].y * canvas.height);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke(); // Apply dilation

        // Reset filter for other ops if needed (not needed here as we export immediately)

        const maskData = canvas.toDataURL('image/png');
        setDebugMaskSrc(maskData); // Save for debug
        return maskData;
    };

    const runSimulation = async (imgSrc: string, maskSrc: string) => {
        // Convert to Blobs
        const imgBlob = await (await fetch(imgSrc)).blob();
        const maskBlob = await (await fetch(maskSrc)).blob();

        const formData = new FormData();
        formData.append("image", imgBlob);
        formData.append("mask", maskBlob);
        formData.append("style", "hollywood");

        const res = await fetch("/api/simulate", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Błąd serwera. Spróbuj później.");

        const { id } = await res.json();

        // Polling
        const poll = async () => {
            const sRes = await fetch(`/api/simulate?id=${id}`);
            const data = await sRes.json();
            if (data.status === 'succeeded') {
                setResultImage(data.url);
                setStep('result');
            } else if (data.status === 'failed') {
                throw new Error("AI nie poradziło sobie z tym zdjęciem.");
            } else {
                setTimeout(poll, 1000);
            }
        };
        poll();
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
                color: 'white', padding: '5px 10px', cursor: 'pointer', zIndex: 100, fontSize: '10px'
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
                    {showDebug && debugMaskSrc && originalImage && (
                        <div style={{
                            position: 'absolute', top: 50, left: 50, width: '200px', zIndex: 200,
                            border: '2px solid red', background: 'black'
                        }}>
                            <p style={{ fontSize: '10px', color: 'red', margin: 0 }}>MASK PREVIEW:</p>
                            <img src={originalImage} style={{ width: '100%', display: 'block' }} />
                            <img src={debugMaskSrc} style={{
                                width: '100%', position: 'absolute', top: 0, left: 0,
                                opacity: 0.5, mixBlendMode: 'screen'
                            }} />
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
                            <button onClick={() => setStep('intro')} style={{
                                padding: '15px', borderRadius: '50px', background: '#333', color: 'white', border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                            }}>
                                <RotateCcw size={18} /> Inne zdjęcie
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
