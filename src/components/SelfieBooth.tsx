"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Download, RefreshCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const POSES = [
    { src: "/images/doctor-cutout-1.png", name: "Doktor Luzak" },
    { src: "/images/doctor-cutout-2.png", name: "Doktor VIP" },
    { src: "/images/doctor-cutout-3.png", name: "Doktor Rock" }
];

export default function SelfieBooth() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const router = useRouter();

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isCountingDown, setIsCountingDown] = useState(false);
    const [countdown, setCountdown] = useState(3);

    const [poseImg, setPoseImg] = useState<HTMLImageElement | null>(null);

    // Dynamic canvas size based on window to fit mobile screens better?
    // For now, let's stick to a fixed high-res internal resolution and CSS scaling.

    // Helper to remove GREEN SCREEN background
    const cleanImage = (img: HTMLImageElement): Promise<HTMLImageElement> => {
        return new Promise((resolve) => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(img);

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Green Screen Logic
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Simple Green Key: G is dominant and significantly larger than R and B
                // Adjust thresholds if needed. 
                // Using a slightly more tolerant threshold for generated AI green (#00FF00)
                if (g > 100 && g > r + 40 && g > b + 40) {
                    data[i + 3] = 0; // Transparent
                }
            }

            ctx.putImageData(imageData, 0, 0);
            const newImg = new Image();
            newImg.src = canvas.toDataURL();
            newImg.onload = () => resolve(newImg);
        });
    };

    useEffect(() => {
        setPoseImg(null); // Reset while loading
        const img = new Image();
        img.src = POSES[currentPoseIndex].src;
        img.crossOrigin = "anonymous";
        img.onload = async () => {
            // Process image to remove background
            const cleaned = await cleanImage(img);
            setPoseImg(cleaned);
        };
    }, [currentPoseIndex]);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "user",
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    // Important to prevent freezing
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play().catch(e => console.error("Play error:", e));
                    }
                }
            } catch (err) {
                console.error("Camera error:", err);
                setError("Brak dostępu do kamery. Sprawdź uprawnienia przeglądarki.");
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []); // eslint-disable-line

    useEffect(() => {
        let animationId: number;

        const render = () => {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            if (canvas && video && video.readyState >= 2) {
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    // Force Portrait Mode for the output image (Instastory style 9:16 approx)
                    // But standard 4:5 (800x1000) is also good.
                    const targetW = 800;
                    const targetH = 1000;

                    if (canvas.width !== targetW) canvas.width = targetW;
                    if (canvas.height !== targetH) canvas.height = targetH;

                    ctx.clearRect(0, 0, targetW, targetH);

                    // 1. Draw Video (Cover Scale + Mirror)
                    const vW = video.videoWidth;
                    const vH = video.videoHeight;

                    // "Cover" scaling
                    const scale = Math.max(targetW / vW, targetH / vH);
                    const drawW = vW * scale;
                    const drawH = vH * scale;

                    // Center crop
                    const offsetX = (targetW - drawW) / 2;
                    const offsetY = (targetH - drawH) / 2;

                    ctx.save();
                    // Mirroring logic
                    ctx.translate(targetW, 0);
                    ctx.scale(-1, 1);

                    ctx.drawImage(video, offsetX, offsetY, drawW, drawH);

                    ctx.restore();

                    // 2. Draw Doctor Pose (Overlay)
                    if (poseImg) {
                        // Logic: Doctor should be at the bottom, reasonably sized.
                        // Let's make doctor 85% of width?
                        const dW = targetW * 0.85;
                        const dH = (dW / poseImg.width) * poseImg.height;

                        // Position: Bottom LEFT
                        // To place at left: dX = -50 (slight overlap off-screen) or 0
                        const dX = -50;
                        const dY = targetH - dH;

                        ctx.drawImage(poseImg, dX, dY, dW, dH);
                    }
                }
            }
            animationId = requestAnimationFrame(render);
        };

        if (!capturedImage) {
            render();
        }

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
        };
    }, [poseImg, capturedImage]);

    const takePhoto = () => {
        setIsCountingDown(true);
        let count = 3;
        setCountdown(count);

        const interval = setInterval(() => {
            count--;
            setCountdown(count);
            if (count === 0) {
                clearInterval(interval);
                setIsCountingDown(false);
                if (canvasRef.current) {
                    setCapturedImage(canvasRef.current.toDataURL("image/png"));
                }
            }
        }, 1000);
    };

    const downloadPhoto = () => {
        if (!capturedImage) return;
        const link = document.createElement("a");
        link.download = `selfie-z-doktorem-${Date.now()}.png`;
        link.href = capturedImage;
        link.click();
    };

    const reset = () => {
        setCapturedImage(null);
    };

    if (error) {
        return (
            <div style={{ padding: "2rem", textAlign: "center", color: "#ef4444" }}>
                <p>{error}</p>
                <button onClick={() => router.push("/")} className="btn-primary" style={{ marginTop: "1rem" }}>
                    Powrót
                </button>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: "100vh",
            background: "#121418",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
        }}>
            <h1 style={{ color: "#dcb14a", marginBottom: "20px", fontFamily: "serif" }}>Selfie z Doktorem</h1>

            <div style={{
                position: "relative",
                width: "100%",
                maxWidth: "600px",
                borderRadius: "20px",
                overflow: "hidden",
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
                border: "4px solid #dcb14a"
            }}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ display: "none" }}
                />

                <canvas
                    ref={canvasRef}
                    style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                        background: "#000"
                    }}
                />

                {isCountingDown && (
                    <div style={{
                        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(0,0,0,0.3)", fontSize: "120px", color: "#fff", fontWeight: "bold", textShadow: "0 4px 10px rgba(0,0,0,0.5)"
                    }}>
                        {countdown}
                    </div>
                )}
            </div>

            {/* Controls */}
            {!capturedImage ? (
                <div style={{ marginTop: "20px", display: "flex", gap: "20px", alignItems: "center" }}>
                    <button
                        onClick={() => setCurrentPoseIndex((prev) => (prev - 1 + POSES.length) % POSES.length)}
                        className="btn-secondary"
                        style={{ padding: "15px", borderRadius: "50%" }}
                    >
                        <ChevronLeft />
                    </button>

                    <button
                        onClick={takePhoto}
                        disabled={isCountingDown}
                        style={{
                            width: "80px", height: "80px", borderRadius: "50%",
                            background: "#dcb14a", border: "4px solid rgba(255,255,255,0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", transform: isCountingDown ? "scale(0.9)" : "scale(1)", transition: "transform 0.2s"
                        }}
                    >
                        <Camera size={40} color="#000" />
                    </button>

                    <button
                        onClick={() => setCurrentPoseIndex((prev) => (prev + 1) % POSES.length)}
                        className="btn-secondary"
                        style={{ padding: "15px", borderRadius: "50%" }}
                    >
                        <ChevronRight />
                    </button>

                    <div style={{ position: "absolute", bottom: "-40px", width: "100%", textAlign: "center", color: "#6b7280", fontSize: "0.9rem" }}>
                        {POSES[currentPoseIndex].name}
                    </div>
                </div>
            ) : (
                <div style={{ marginTop: "30px", display: "flex", gap: "20px" }}>
                    <button
                        onClick={reset}
                        className="btn-secondary"
                        style={{ display: "flex", gap: "10px", alignItems: "center" }}
                    >
                        <RefreshCcw size={20} />
                        Powtórz
                    </button>
                    <button
                        onClick={downloadPhoto}
                        className="btn-primary"
                        style={{ display: "flex", gap: "10px", alignItems: "center", background: "#dcb14a", color: "#000" }}
                    >
                        <Download size={20} />
                        Pobierz Zdjęcie
                    </button>
                </div>
            )}
        </div>
    );
}
