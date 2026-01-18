"use client";

import { useState, useRef } from "react";
import { Camera, Upload, RefreshCw } from "lucide-react";

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
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            {!isCameraOpen ? (
                <>
                    <div className="mb-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20">
                            <Camera size={40} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-light text-white mb-2">Rozpocznij Metamorfozę</h2>
                        <p className="text-white/60">Zrób selfie lub wgraj zdjęcie, aby przymierzyć nowy uśmiech.</p>
                    </div>

                    <div className="flex flex-col gap-4 w-full max-w-sm">
                        <button
                            onClick={startCamera}
                            className="bg-white text-black py-4 rounded-xl font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <Camera size={20} />
                            Zrób Selfie
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#0f1014] px-2 text-white/40">lub</span>
                            </div>
                        </div>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white/5 text-white border border-white/10 py-4 rounded-xl font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                        >
                            <Upload size={20} />
                            Wybierz z Galerii
                        </button>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                </>
            ) : (
                <div className="absolute inset-0 bg-black flex flex-col z-50">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />

                    {/* Camera Overlay Guide */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-[70%] h-[40%] border-2 border-dashed border-white/30 rounded-full opacity-50" />
                        <p className="absolute top-12 text-white/80 text-sm font-medium bg-black/50 px-4 py-1 rounded-full">
                            Umieść twarz w centrum
                        </p>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-between items-center bg-gradient-to-t from-black/90 to-transparent">
                        <button
                            onClick={stopCamera}
                            className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md"
                        >
                            <RefreshCw size={24} />
                        </button>

                        <button
                            onClick={capturePhoto}
                            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
                        >
                            <div className="w-16 h-16 bg-white rounded-full" />
                        </button>

                        <div className="w-12" /> {/* Spacer for balance */}
                    </div>
                </div>
            )}
        </div>
    );
}
