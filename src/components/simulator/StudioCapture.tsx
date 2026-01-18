"use client";

import { useState, useRef } from "react";
import { Camera, Upload, RefreshCw, Image as ImageIcon } from "lucide-react";

interface StudioCaptureProps {
    onImageSelected: (imageData: string) => void;
}

export default function StudioCapture({ onImageSelected }: StudioCaptureProps) {
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }
            });
            setIsCameraOpen(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access denied:", err);
            alert("Nie udało się uruchomić kamery. Upewnij się, że wyraziłeś zgodę.");
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
        const canvas = document.createElement("canvas");

        // Square crop logic (center crop)
        const size = Math.min(video.videoWidth, video.videoHeight);
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            // Draw center crop
            const sx = (video.videoWidth - size) / 2;
            const sy = (video.videoHeight - size) / 2;
            ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

            const imgData = canvas.toDataURL("image/png");
            onImageSelected(imgData);
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
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            position: 'relative',
            backgroundColor: '#08090a', // Hardcoded Dark Background
            color: '#ffffff',
            fontFamily: 'var(--font-heading, "Times New Roman")', // Fallback check
        }}>
            {/* Background Ambient Glow */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '500px',
                height: '500px',
                backgroundColor: '#dcb14a', // Primary Gold
                opacity: 0.05,
                filter: 'blur(120px)',
                borderRadius: '50%',
                pointerEvents: 'none'
            }} />

            {!isCameraOpen ? (
                <div style={{ position: 'relative', zIndex: 10, maxWidth: '450px', width: '100%' }}>
                    <div style={{ marginBottom: '40px' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'linear-gradient(135deg, #dcb14a 0%, #a68531 100%)',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            boxShadow: '0 10px 30px rgba(220,177,74,0.2)',
                            transform: 'rotate(3deg)'
                        }}>
                            {/* Icon Placeholder or Lucide */}
                            <Camera size={36} color="black" />
                        </div>
                        <h2 style={{
                            fontSize: '2.5rem',
                            fontWeight: 400,
                            marginBottom: '12px',
                            color: 'white',
                            fontFamily: 'serif'
                        }}>
                            Studio Uśmiechu
                        </h2>
                        <p style={{
                            color: '#9ca3af',
                            fontSize: '1.125rem',
                            lineHeight: 1.6,
                            fontWeight: 300
                        }}>
                            Przymierz nowy uśmiech w kilka sekund. <br />
                            Technologia AI dla Twojej metamorfozy.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <button
                            onClick={startCamera}
                            style={{
                                width: '100%',
                                backgroundColor: '#ffffff',
                                color: '#000000',
                                padding: '16px 24px',
                                borderRadius: '12px',
                                fontSize: '1.125rem',
                                fontWeight: 500,
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                transition: 'transform 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <Camera size={22} className="opacity-80" />
                            <span>Zrób Selfie</span>
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '8px 0' }}>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>lub</span>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                        </div>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                width: '100%',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                color: '#ffffff',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '16px 24px',
                                borderRadius: '12px',
                                fontSize: '1.125rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                        >
                            <Upload size={22} color="#dcb14a" />
                            <span>Wybierz z Galerii</span>
                        </button>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>
            ) : (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'black',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 50
                }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />

                    {/* Overlay Guide */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            width: '80%', // Responsive width
                            maxWidth: '350px', // Max width for desktop
                            aspectRatio: '3/4',
                            border: '2px dashed rgba(255,255,255,0.3)',
                            borderRadius: '30%', // Oval shape for face
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)', // Darker dim
                            position: 'relative'
                        }} />
                        <p style={{
                            position: 'absolute',
                            top: '10%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            color: 'white',
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            backdropFilter: 'blur(4px)',
                            whiteSpace: 'nowrap',
                            fontSize: '14px'
                        }}>
                            Ustaw twarz w centrum
                        </p>
                    </div>

                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '40px 20px',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                        display: 'flex',
                        justifyContent: 'space-around',
                        alignItems: 'center',
                        pointerEvents: 'auto'
                    }}>
                        <button
                            onClick={stopCamera}
                            style={{
                                padding: '16px',
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                                backdropFilter: 'blur(4px)',
                                cursor: 'pointer'
                            }}
                        >
                            <RefreshCw size={24} />
                        </button>

                        <button
                            onClick={capturePhoto}
                            style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                border: '4px solid #dcb14a',
                                padding: '4px',
                                background: 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <div style={{ width: '100%', height: '100%', background: 'white', borderRadius: '50%' }} />
                        </button>

                        <button
                            onClick={() => { stopCamera(); fileInputRef.current?.click(); }}
                            style={{
                                padding: '16px',
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                                backdropFilter: 'blur(4px)',
                                cursor: 'pointer'
                            }}
                        >
                            <ImageIcon size={24} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
