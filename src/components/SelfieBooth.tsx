"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Download, RefreshCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const FRAMES = [
    { src: "/frame-thumbs.png", name: "Doktor Luzak" },
    { src: "/frame-professional.png", name: "Premium VIP" },
    { src: "/frame-fun.png", name: "Zabawny Dentysta" }
];

export default function SelfieBooth() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const router = useRouter();

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isCountingDown, setIsCountingDown] = useState(false);
    const [countdown, setCountdown] = useState(3);

    // Load frame image
    const [frameImg, setFrameImg] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
        // Preload current frame
        const img = new Image();
        img.src = FRAMES[currentFrameIndex].src;
        img.crossOrigin = "anonymous";
        img.onload = () => setFrameImg(img);
    }, [currentFrameIndex]);

    // Start Camera
    useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Camera error:", err);
                setError("Nie udało się uzyskać dostępu do kamery. Upewnij się, że wyraziłeś zgodę.");
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Draw Loop
    useEffect(() => {
        let animationId: number;

        const render = () => {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            if (canvas && video && frameImg && video.readyState === 4) {
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    // Set canvas size to match video aspect ratio but high res
                    // Use frame natural size as base if possible, or fixed HD
                    // Let's stick to a portrait aspect ratio for Frames (usually vertical)
                    // But webcam is landscape. We need to crop webcam to fit frame.

                    const targetWidth = 800;
                    const targetHeight = 1000; // 4:5 ratio roughly

                    if (canvas.width !== targetWidth) canvas.width = targetWidth;
                    if (canvas.height !== targetHeight) canvas.height = targetHeight;

                    // Clear
                    ctx.clearRect(0, 0, targetWidth, targetHeight);

                    // 1. Draw Video (Center Crop)
                    // Calculate scaling to cover target
                    const vRatio = video.videoWidth / video.videoHeight;
                    const tRatio = targetWidth / targetHeight;

                    let drawW, drawH, startX, startY;

                    if (vRatio > tRatio) {
                        // Video is wider
                        drawH = targetHeight;
                        drawW = targetHeight * vRatio;
                        startY = 0;
                        startX = (targetWidth - drawW) / 2;
                    } else {
                        // Video is taller
                        drawW = targetWidth;
                        drawH = targetWidth / vRatio;
                        startX = 0;
                        startY = (targetHeight - drawH) / 2;
                    }

                    ctx.save();
                    // Mirror video for selfie feel
                    ctx.translate(targetWidth, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(video, startX * -1, startY, drawW, drawH); // Adjust x for mirror
                    // Actually manual mirror logic:
                    // drawImage destination x needs to be inverted relative to translate?
                    // Simpler: translate center, scale -1, 1, draw.
                    ctx.restore();

                    // Re-draw video correctly mirrored:
                    ctx.save();
                    ctx.translate(targetWidth, 0);
                    ctx.scale(-1, 1);
                    // Draw image at calculated position. Note: startX is usually negative to center.
                    // If we mirror, we draw from right to left?
                    // Let's just draw it normally then flip canvas?
                    // Standard approach:
                    ctx.drawImage(video, startX, startY, drawW, drawH);
                    ctx.restore();

                    // 2. Draw Frame (Multiply Mode for "White" transparency mock)
                    ctx.globalCompositeOperation = 'multiply';
                    ctx.drawImage(frameImg, 0, 0, targetWidth, targetHeight);

                    // Reset
                    ctx.globalCompositeOperation = 'source-over';

                    // 3. Optional: Draw a "clean" overlay if needed or watermarks
                    // (Assuming frames have text/logo already)
                }
            }
            animationId = requestAnimationFrame(render);
        };

        if (!capturedImage) {
            render();
        }

        return () => cancelAnimationFrame(animationId);
    }, [frameImg, capturedImage]);

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
        link.download = `mikrostomart-selfie-${Date.now()}.png`;
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
            <h1 style={{ color: "#dcb14a", marginBottom: "20px", fontFamily: "serif" }}>Wirtualna Fotobudka</h1>

            <div style={{
                position: "relative",
                width: "100%",
                maxWidth: "600px",
                borderRadius: "20px",
                overflow: "hidden",
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
                border: "4px solid #dcb14a"
            }}>
                {/* Video Element (Hidden, used for stream) */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ display: "none" }}
                />

                {/* Main Canvas */}
                <canvas
                    ref={canvasRef}
                    style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                        background: "#000"
                    }}
                />

                {/* Countdown Overlay */}
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
                        onClick={() => setCurrentFrameIndex((prev) => (prev - 1 + FRAMES.length) % FRAMES.length)}
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
                        onClick={() => setCurrentFrameIndex((prev) => (prev + 1) % FRAMES.length)}
                        className="btn-secondary"
                        style={{ padding: "15px", borderRadius: "50%" }}
                    >
                        <ChevronRight />
                    </button>

                    <div style={{ position: "absolute", bottom: "-40px", width: "100%", textAlign: "center", color: "#6b7280", fontSize: "0.9rem" }}>
                        {FRAMES[currentFrameIndex].name}
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
