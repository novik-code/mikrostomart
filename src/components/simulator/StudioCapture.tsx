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
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center animate-fade-in relative">
            {/* Background Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--color-primary)] opacity-5 blur-[120px] rounded-full pointer-events-none" />

            {!isCameraOpen ? (
                <div className="relative z-10 max-w-md w-full">
                    <div className="mb-12">
                        <div className="w-20 h-20 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[var(--color-primary)]/20 rotate-3">
                            <Camera size={36} className="text-black drop-shadow-sm" />
                        </div>
                        <h2 className="text-4xl font-serif text-white mb-3 tracking-tight">
                            Studio Uśmiechu
                        </h2>
                        <p className="text-[var(--color-text-muted)] text-lg font-light leading-relaxed">
                            Przymierz nowy uśmiech w kilka sekund. <br />
                            Wykorzystaj moc AI do idealnej metamorfozy.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button
                            onClick={startCamera}
                            className="group relative w-full bg-white text-black py-4 px-6 rounded-xl font-medium text-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg flex items-center justify-center gap-3 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            <Camera size={22} className="opacity-80" />
                            <span>Zrób Selfie</span>
                        </button>

                        <div className="flex items-center gap-4 my-2">
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            <span className="text-white/30 text-xs font-medium uppercase tracking-widest">lub wgraj zdjęcie</span>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </div>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full bg-white/5 border border-white/10 text-white py-4 px-6 rounded-xl font-medium text-lg hover:bg-white/10 hover:border-white/20 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3"
                        >
                            <Upload size={22} className="text-[var(--color-primary)]" />
                            <span>Wybierz z Galerii</span>
                        </button>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                </div>
            ) : (
                <div className="absolute inset-0 bg-black flex flex-col z-50">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />

                    {/* Premium Camera Overlay Guide */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="relative w-[80%] aspect-[3/4] max-w-sm rounded-[3rem] border border-white/20 overflow-hidden shadow-2xl">
                            {/* Corners */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[var(--color-primary)] rounded-tl-2xl opacity-80" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[var(--color-primary)] rounded-tr-2xl opacity-80" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[var(--color-primary)] rounded-bl-2xl opacity-80" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[var(--color-primary)] rounded-br-2xl opacity-80" />

                            <div className="absolute top-8 left-0 right-0 text-center">
                                <p className="inline-block text-white/90 text-sm font-medium bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                                    Ustaw twarz w ramce
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-10 pb-12 flex justify-between items-center bg-gradient-to-t from-black via-black/80 to-transparent">
                        <button
                            onClick={stopCamera}
                            className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all active:scale-95"
                        >
                            <RefreshCw size={24} />
                        </button>

                        <button
                            onClick={capturePhoto}
                            className="w-24 h-24 rounded-full border-4 border-[var(--color-primary)] p-1 flex items-center justify-center active:scale-95 transition-transform shadow-[0_0_30px_rgba(220,177,74,0.3)]"
                        >
                            <div className="w-full h-full bg-white rounded-full transition-all hover:bg-[var(--color-primary)]" />
                        </button>

                        <button
                            onClick={() => { stopCamera(); fileInputRef.current?.click(); }}
                            className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all active:scale-95"
                        >
                            <ImageIcon size={24} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
