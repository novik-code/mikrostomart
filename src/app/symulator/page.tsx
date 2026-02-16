"use client";

import { useState, useRef } from "react";
import { Camera, Upload, RefreshCw, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { analysisFaceAlignment } from "@/helpers/faceDetection";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

// --- STYLES ---
const containerStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', width: '100%', backgroundColor: '#000', color: '#fff',
    fontFamily: 'Inter, sans-serif'
};

const cardStyle: React.CSSProperties = {
    width: '100%', maxWidth: '500px', padding: '20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px'
};

export default function SimulatorPage() {
    const t = useTranslations('symulator');
    const [step, setStep] = useState<'upload' | 'processing' | 'result'>('upload');
    const [error, setError] = useState<string | null>(null);
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState(t('statusSmile'));

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- STEP 1: UPLOAD & AUTO-MASK ---
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setStep('processing');
        setStatusMessage(t('statusFace'));

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async (ev) => {
                const imgData = ev.target?.result as string;
                setOriginalImage(imgData);
                await processImage(imgData);
            };
        } catch (err: any) {
            console.error(err);
            setError(err.message || t('errorLoad'));
            setStep('upload');
        }
    };

    const processImage = async (imgSrc: string) => {
        const img = new window.Image();
        img.src = imgSrc;
        img.onload = async () => {
            try {
                const analysis = await analysisFaceAlignment(img);

                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error("Canvas Error");

                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                if (analysis && analysis.mouthPath) {
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    const mp = analysis.mouthPath;
                    ctx.moveTo(mp[0].x * canvas.width, mp[0].y * canvas.height);
                    for (let i = 1; i < mp.length; i++) {
                        ctx.lineTo(mp[i].x * canvas.width, mp[i].y * canvas.height);
                    }
                    ctx.closePath();
                    ctx.fill();
                } else {
                    throw new Error(t('errorNoFace'));
                }

                const maskData = canvas.toDataURL('image/png');
                await sendToApi(imgSrc, maskData);

            } catch (err: any) {
                setError(err.message);
                setStep('upload');
            }
        };
    };

    const sendToApi = async (image: string, mask: string) => {
        setStatusMessage(t('statusDesign'));
        try {
            const formData = new FormData();
            const fetchBlob = async (url: string) => await (await fetch(url)).blob();
            formData.append("image", await fetchBlob(image));
            formData.append("mask", await fetchBlob(mask));
            formData.append("style", "hollywood");

            const res = await fetch("/api/simulate", { method: "POST", body: formData });
            if (!res.ok) throw new Error(t('errorServer'));

            const { id } = await res.json();

            const checkStatus = async () => {
                const statusRes = await fetch(`/api/simulate?id=${id}`);
                const statusData = await statusRes.json();

                if (statusData.status === "succeeded") {
                    setResultImage(statusData.url);
                    setStep('result');
                } else if (statusData.status === "failed") {
                    throw new Error(t('errorGenerate'));
                } else {
                    setTimeout(checkStatus, 1000);
                }
            };
            checkStatus();

        } catch (err: any) {
            setError(err.message);
            setStep('upload');
        }
    };

    // --- RENDER ---
    return (
        <div style={containerStyle}>
            {/* BACKGROUND DECORATION */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: -1,
                background: 'radial-gradient(circle at 50% 30%, #2a2a2a 0%, #000 100%)'
            }} />

            {/* HEADER */}
            <header style={{
                position: 'absolute', top: 0, left: 0, width: '100%',
                padding: '20px', display: 'flex', justifyContent: 'center'
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    color: '#dcb14a', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px'
                }}>
                    <RefreshCw size={20} /> Mikrostomart AI
                </div>
            </header>

            {/* CONTENT */}
            <main style={cardStyle}>

                {step === 'upload' && (
                    <>
                        <h1 style={{ fontSize: '2rem', textAlign: 'center', fontWeight: 300 }}>
                            {t('title')} <span style={{ color: '#dcb14a', fontWeight: 600 }}>{t('titleAccent')}</span>
                        </h1>
                        <p style={{ color: '#aaa', textAlign: 'center', marginBottom: '20px' }}>
                            {t('subtitle')}
                        </p>

                        {error && (
                            <div style={{
                                backgroundColor: 'rgba(255, 0, 0, 0.1)', border: '1px solid rgba(255, 0, 0, 0.3)',
                                color: '#ff6b6b', padding: '15px', borderRadius: '12px', width: '100%',
                                display: 'flex', gap: '10px', alignItems: 'center'
                            }}>
                                <AlertTriangle size={20} /> {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
                            {/* NATIVE CAMERA INPUT */}
                            <label style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                background: '#fff', color: '#000', padding: '20px', borderRadius: '15px',
                                fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer',
                                boxShadow: '0 5px 20px rgba(255,255,255,0.2)'
                            }}>
                                <Camera size={24} />
                                {t('takePhoto')}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="user"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                            </label>

                            {/* SEPARATOR */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#555', fontSize: '0.8rem' }}>
                                <div style={{ flex: 1, height: '1px', background: '#333' }} /> {t('or')} <div style={{ flex: 1, height: '1px', background: '#333' }} />
                            </div>

                            {/* UPLOAD INPUT */}
                            <label style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                background: 'transparent', color: '#fff', padding: '20px', borderRadius: '15px',
                                border: '1px solid #333',
                                fontSize: '1.1rem', fontWeight: 500, cursor: 'pointer'
                            }}>
                                <Upload size={24} />
                                {t('uploadGallery')}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        </div>
                    </>
                )}

                {step === 'processing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                        <div className="relative">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#dcb14a]"></div>
                        </div>
                        <h2 style={{ fontSize: '1.2rem', color: '#eee' }}>{statusMessage}</h2>
                        <p style={{ color: '#666', fontSize: '0.9rem' }}>{t('statusWait')}</p>
                    </div>
                )}

                {step === 'result' && originalImage && resultImage && (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{
                            width: '100%', aspectRatio: '3/4', position: 'relative',
                            borderRadius: '20px', overflow: 'hidden', border: '1px solid #333'
                        }}>
                            <BeforeAfterSlider
                                beforeImage={originalImage}
                                afterImage={resultImage}
                            />
                        </div>

                        <button
                            onClick={() => {
                                setStep('upload');
                                setOriginalImage(null);
                                setResultImage(null);
                            }}
                            style={{
                                background: '#fff', color: '#000', padding: '15px', borderRadius: '30px',
                                border: 'none', fontWeight: 600, fontSize: '1rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                boxShadow: '0 5px 20px rgba(255,255,255,0.1)'
                            }}
                        >
                            <RefreshCw size={20} /> {t('tryAgain')}
                        </button>
                    </div>
                )}

            </main>
        </div>
    );
}
