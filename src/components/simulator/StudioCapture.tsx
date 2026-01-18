"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Upload, RefreshCw, Image as ImageIcon, AlertTriangle } from "lucide-react";

interface StudioCaptureProps {
    onImageSelected: (imageData: string) => void;
}

export default function StudioCapture({ onImageSelected }: StudioCaptureProps) {
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string>("");

    const startCamera = async () => {
        setErrorMsg(null);
        setIsCameraOpen(true);
        try {
            // Request best possible resolution (HD+), fallback to OS default
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err: any) {
            console.error("Camera Error:", err);
            setErrorMsg(err.message || "Błąd kamery. Spróbuj wgrać zdjęcie.");
            setDebugInfo(err.toString());
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;

        if (video.videoWidth === 0 || video.videoHeight === 0) {
            alert("Kamera nie gotowa. Poczekaj chwilę.");
            return;
        }

        const canvas = document.createElement("canvas");
        // Capture square center crop
        const size = Math.min(video.videoWidth, video.videoHeight);
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            const sx = (video.videoWidth - size) / 2;
            const sy = (video.videoHeight - size) / 2;
            ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
            onImageSelected(canvas.toDataURL("image/png"));
            stopCamera();
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (typeof ev.target?.result === "string") {
                    onImageSelected(ev.target.result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
        }}>

            {!isCameraOpen ? (
                // --- INTRO SCREEN ---
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    textAlign: 'center',
                    background: 'radial-gradient(circle at center, #1a1a1a 0%, #000 100%)'
                }}>
                    <div style={{
                        width: '80px', height: '80px',
                        background: 'linear-gradient(135deg, #dcb14a, #856b2d)',
                        borderRadius: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '24px',
                        boxShadow: '0 10px 30px rgba(220,177,74,0.3)'
                    }}>
                        <Camera size={40} color="black" />
                    </div>

                    <h1 style={{ fontSize: '2rem', marginBottom: '10px', color: '#f3f4f6' }}>Studio Uśmiechu</h1>
                    <p style={{ color: '#9ca3af', marginBottom: '40px' }}>
                        Przymierz nowy uśmiech w 10 sekund.<br />Sztuczna Inteligencja zrobi to za Ciebie.
                    </p>

                    {errorMsg && (
                        <div style={{ color: '#ff6b6b', background: 'rgba(255,0,0,0.1)', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>
                            <AlertTriangle size={16} style={{ display: 'inline', marginBottom: '-2px' }} /> {errorMsg}
                        </div>
                    )}

                    <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <button onClick={startCamera} style={{
                            padding: '16px', borderRadius: '12px',
                            background: 'white', color: 'black',
                            fontWeight: 'bold', fontSize: '1rem',
                            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                        }}>
                            <Camera size={20} /> Otwórz Kamerę
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4b5563', fontSize: '12px' }}>
                            <div style={{ flex: 1, height: '1px', background: '#374151' }} /> LUB <div style={{ flex: 1, height: '1px', background: '#374151' }} />
                        </div>

                        <button onClick={() => fileInputRef.current?.click()} style={{
                            padding: '16px', borderRadius: '12px',
                            background: 'rgba(255,255,255,0.1)', color: 'white',
                            fontWeight: '500', fontSize: '1rem',
                            border: '1px solid #374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                        }}>
                            <Upload size={20} /> Wybierz Zdjęcie
                        </button>
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
                </div>

            ) : (
                // --- CAMERA VIEW ---
                <div style={{
                    flex: 1,
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* VIDEO LAYER */}
                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: 'black' }}>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            onLoadedMetadata={(e) => {
                                e.currentTarget.play();
                                setDebugInfo(`Stream: ${e.currentTarget.videoWidth}x${e.currentTarget.videoHeight}`);
                            }}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                        />

                        {/* GUIDE OVERLAY */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            zIndex: 10
                        }}>
                            <div style={{
                                width: '75%',
                                aspectRatio: '3/4',
                                border: '2px dashed rgba(255,255,255,0.6)',
                                borderRadius: '120px',
                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.85)'
                            }} />

                            {/* CENTER DEBUG: Always Visible */}
                            <div style={{
                                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                color: '#0f0', background: 'rgba(0,0,0,0.8)', padding: '6px',
                                fontFamily: 'monospace', fontSize: '12px',
                                display: debugInfo ? 'block' : 'none',
                                borderRadius: '4px',
                                pointerEvents: 'none'
                            }}>
                                {debugInfo}
                            </div>
                        </div>
                    </div>

                    {/* CONTROLS (Bottom Bar) */}
                    <div style={{
                        height: '120px',
                        background: 'black',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                        paddingBottom: '20px',
                        zIndex: 50,
                        position: 'relative'
                    }}>
                        <button onClick={stopCamera} style={{ background: '#333', border: 'none', color: 'white', padding: '15px', borderRadius: '50%', cursor: 'pointer' }}>
                            <RefreshCw size={24} />
                        </button>

                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                capturePhoto();
                            }}
                            style={{
                                width: '80px', height: '80px', borderRadius: '50%',
                                background: 'white', border: '4px solid #dcb14a',
                                cursor: 'pointer',
                                touchAction: 'manipulation'
                            }}
                        />

                        <button onClick={() => { stopCamera(); fileInputRef.current?.click() }} style={{ background: '#333', border: 'none', color: 'white', padding: '15px', borderRadius: '50%', cursor: 'pointer' }}>
                            <ImageIcon size={24} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
