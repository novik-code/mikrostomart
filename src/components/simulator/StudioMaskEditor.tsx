"use client";

import { useEffect, useRef, useState } from "react";
import { analysisFaceAlignment, SmileAlignment } from "@/helpers/faceDetection";
import { ArrowLeft, Check, Eraser, Paintbrush, Loader2, Undo, ZoomIn } from "lucide-react";

interface StudioMaskEditorProps {
    imageSrc: string;
    onBack: () => void;
    onNext: (maskData: string) => void;
}

export default function StudioMaskEditor({ imageSrc, onBack, onNext }: StudioMaskEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [alignment, setAlignment] = useState<SmileAlignment | null>(null);
    const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
    const [brushSize, setBrushSize] = useState(20);
    const [history, setHistory] = useState<ImageData[]>([]);

    // Scale handling for responsiveness
    // logic: The canvas holds the full resolution image, but is displayed scaled reliably via CSS.
    // Interaction coordinates must be mapped.

    useEffect(() => {
        const init = async () => {
            const img = new Image();
            img.src = imageSrc;
            await img.decode();

            const canvas = canvasRef.current;
            if (!canvas) return;

            // Set canvas to full resolution
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Draw initial image (dimmed to show mask better)
            // Actually, we want a "Mask Layer" on top of the image.
            // But to export, we need JUST the mask.
            // Strategy: 
            // 1. Draw Image
            // 2. Draw Semi-transparent Black Overlay
            // 3. "Cut out" (Erase) the hole where teeth are.
            // WAIT - Replicate expects a black/white mask where WHITE is the inpaint area (teeth) and BLACK is preserved.
            // So we should PAINT WHITE for teeth.

            // Let's restart render logic: 
            // We visualize: Background Image -> Semi-transparent Red Overlay (Teeth Area).
            // Canvas state: We store the "Mask" in a separate offscreen canvas or just ImageData?
            // Simpler: Use the main canvas for everything using composite operations? 
            // No, we need to export just the mask.

            // Better: 
            // Layer 1 (CSS Background): The original image.
            // Layer 2 (Canvas): The Mask. Transparent background. User paints Red (or White).

            // On Export: Draw Black Background, Source-In White Mask? 
            // Replicate Flux Fill Mask: White = Replace, Black = Keep.

            // Run Detection
            setIsAnalyzing(true);
            try {
                const result = await analysisFaceAlignment(img);
                if (result && result.mouthPath) {
                    setAlignment(result);
                    drawAutoMask(ctx, result.mouthPath, img.naturalWidth, img.naturalHeight);
                } else {
                    // Fallback: Clear canvas
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            } catch (e) {
                console.error("Auto-mask failed", e);
            }
            setIsAnalyzing(false);
            saveHistory();
        };

        const drawAutoMask = (ctx: CanvasRenderingContext2D, path: { x: number, y: number }[], width: number, height: number) => {
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)"; // Visual Style
            ctx.beginPath();
            if (path.length > 0) {
                ctx.moveTo(path[0].x * width, path[0].y * height);
                for (let i = 1; i < path.length; i++) {
                    ctx.lineTo(path[i].x * width, path[i].y * height);
                }
                ctx.closePath();
                ctx.fill();
            }
        };

        init();
    }, [imageSrc]);

    const saveHistory = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (history.length > 5) {
            setHistory(prev => [...prev.slice(1), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
        } else {
            setHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
        }
    };

    const handleUndo = () => {
        if (history.length <= 1) return;
        const newHistory = [...history];
        newHistory.pop(); // Remove current state
        const prevState = newHistory[newHistory.length - 1];
        setHistory(newHistory);

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && prevState) {
            ctx.putImageData(prevState, 0, 0);
        }
    };

    // Drawing Logic
    const isDrawing = useRef(false);
    const lastPoint = useRef<{ x: number, y: number } | null>(null);

    const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        isDrawing.current = true;
        const p = getPoint(e);
        if (p) lastPoint.current = p;

        // Disable scroll on mobile while touching canvas
        if (e.type === 'touchstart') document.body.style.overflow = 'hidden';
    };

    const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        lastPoint.current = null;
        saveHistory(); // Save state after stroke

        if (e.type === 'touchend') document.body.style.overflow = '';
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const p = getPoint(e);
        if (!p || !lastPoint.current) return;

        ctx.globalCompositeOperation = tool === 'brush' ? 'source-over' : 'destination-out';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize * (canvas.width / 1000); // Scale brush relative to image size
        ctx.strokeStyle = tool === 'brush' ? "rgba(255, 255, 255, 0.7)" : "rgba(0,0,0,1)";
        ctx.fillStyle = ctx.strokeStyle; // For dots

        // Draw smoother line
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        lastPoint.current = p;
    };

    const handleNext = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Create a temporary canvas to generate the B&W mask
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const ctx = exportCanvas.getContext('2d');
        if (!ctx) return;

        // 1. Fill Black (Background)
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        // 2. Draw the Painted Mask as White
        // The current canvas has "rgba(255,255,255,0.7)" pixels where user painted.
        // We want those to be PURE WHITE.
        ctx.drawImage(canvas, 0, 0);

        // Enforce Threshold to make it binary B&W
        // (Just drawing strictly white on top of black is safer if we control opacity)
        // Since we used rgba(255,255,255,0.7) for visuals, we need to boost this to solid white.
        // Simplest trick: composite operation

        // Reset and do properly:
        // Draw Black again
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        // Draw the user canvas, but force it to be white?
        // Let's just iterate pixels? No, slow.
        // Use GlobalCompositeOperation 'source-in'?

        // Better: When validation is done, we assume User Canvas matches intent.
        // Just draw the User Canvas onto the Black background, 
        // AND then use 'source-in' with White color to fill the non-transparent pixels?

        ctx.drawImage(canvas, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        // Now we have White shape on Transparent BG.
        // But we need Black BG for the non-shape.
        // Composite 'destination-over' Black.
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        const maskData = exportCanvas.toDataURL('image/png');
        onNext(maskData);
    };

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0f1014',
            touchAction: 'none',
            overflow: 'hidden'
        }}>
            {/* TOOLBAR */}
            <div style={{
                height: '70px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: '#0f1014',
                zIndex: 20
            }}>
                <button
                    onClick={onBack}
                    style={{
                        padding: '10px',
                        color: 'rgba(255,255,255,0.7)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <ArrowLeft />
                </button>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <button
                        onClick={() => setTool('brush')}
                        style={{
                            padding: '10px',
                            borderRadius: '8px',
                            background: tool === 'brush' ? 'white' : 'transparent',
                            color: tool === 'brush' ? 'black' : 'rgba(255,255,255,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Paintbrush size={20} />
                    </button>
                    <button
                        onClick={() => setTool('eraser')}
                        style={{
                            padding: '10px',
                            borderRadius: '8px',
                            background: tool === 'eraser' ? 'white' : 'transparent',
                            color: tool === 'eraser' ? 'black' : 'rgba(255,255,255,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Eraser size={20} />
                    </button>

                    <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)', height: '24px', margin: 'auto 0' }} />

                    <button
                        onClick={handleUndo}
                        disabled={history.length <= 1}
                        style={{
                            padding: '10px',
                            color: history.length > 1 ? 'white' : 'rgba(255,255,255,0.2)',
                            background: 'transparent',
                            border: 'none',
                            cursor: history.length > 1 ? 'pointer' : 'default'
                        }}
                    >
                        <Undo size={20} />
                    </button>
                </div>

                <button
                    onClick={handleNext}
                    style={{
                        backgroundColor: '#2563eb',
                        color: 'white',
                        padding: '8px 20px',
                        borderRadius: '999px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                    }}
                >
                    Dalej <Check size={16} />
                </button>
            </div>

            {/* CANVAS AREA */}
            <div ref={containerRef} style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: 'black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {/* Background Image Layer */}
                <img
                    src={imageSrc}
                    style={{
                        position: 'absolute',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        pointerEvents: 'none',
                        opacity: 0.8
                    }}
                    alt="ref"
                />

                {/* Canvas Layer matches the size of the image visually */}
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{
                        position: 'relative',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        zIndex: 10,
                        touchAction: 'none'
                    }}
                />

                {isAnalyzing && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        zIndex: 30,
                        backdropFilter: 'blur(4px)'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="spinner" style={{
                                width: '32px',
                                height: '32px',
                                border: '3px solid rgba(255,255,255,0.3)',
                                borderTopColor: '#3b82f6',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                marginBottom: '12px'
                            }} />
                            <p style={{ color: 'white', fontWeight: 500 }}>Szukam uśmiechu...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* SLIDERS (Brush Size) */}
            <div style={{
                height: '70px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 24px',
                backgroundColor: '#0f1014'
            }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginRight: '16px' }}>Rozmiar</span>
                <input
                    type="range"
                    min="5"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    style={{
                        width: '100%',
                        maxWidth: '300px',
                        accentColor: '#3b82f6'
                    }}
                />
            </div>

            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
