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
    const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
    const [brushSize, setBrushSize] = useState(25); // Slightly larger default
    const [history, setHistory] = useState<ImageData[]>([]);

    useEffect(() => {
        const init = async () => {
            const img = new Image();
            img.src = imageSrc;

            img.onload = async () => {
                const canvas = canvasRef.current;
                if (!canvas) return;

                // CRITICAL FIX: Set Canvas Resolution to match Image Resolution exactly
                // This ensures the mask drawn corresponds 1:1 to the pixels of the image
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                // Configure Context
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = "rgba(255, 255, 255, 1)"; // Draw visible white mask
                ctx.lineWidth = brushSize;

                // Run Face Analysis
                setIsAnalyzing(true);
                try {
                    const result = await analysisFaceAlignment(img);
                    if (result && result.mouthPath) {
                        drawAutoMask(ctx, result.mouthPath, img.naturalWidth, img.naturalHeight);
                    }
                } catch (e) {
                    console.error("Auto-mask failed", e);
                }
                setIsAnalyzing(false);
                saveHistory();
            };
        };

        const drawAutoMask = (ctx: CanvasRenderingContext2D, path: { x: number, y: number }[], width: number, height: number) => {
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)"; // High opacity for auto-mask
            ctx.beginPath();
            if (path.length > 0) {
                // Determine scale based on image size vs 600px reference logic if needed
                // But current path logic seems normalized (0..1)
                ctx.moveTo(path[0].x * width, path[0].y * height);
                for (let i = 1; i < path.length; i++) {
                    ctx.lineTo(path[i].x * width, path[i].y * height);
                }
                ctx.closePath();
                ctx.fill();
            }
        };

        if (imageSrc) init();
    }, [imageSrc]);

    const saveHistory = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // Limit history to 10 steps to save memory
        setHistory(prev => [...prev.slice(-9), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };

    const handleUndo = () => {
        if (history.length <= 1) return;
        const newHistory = [...history];
        newHistory.pop(); // Remove current
        const prevState = newHistory[newHistory.length - 1];
        setHistory(newHistory);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && prevState) {
            ctx.putImageData(prevState, 0, 0);
        }
    };

    // --- Drawing Logic ---
    const isDrawing = useRef(false);
    const lastPoint = useRef<{ x: number, y: number } | null>(null);

    const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        // Map client coordinates to canvas resolution coordinates
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
        if (e.type === 'touchstart') document.body.style.overflow = 'hidden';
    };

    const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        lastPoint.current = null;
        saveHistory();
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
        // Adjust brush size relative to image resolution (so "20" isn't tiny on 4k image)
        const scaleFactor = Math.max(canvas.width, canvas.height) / 1000;
        ctx.lineWidth = brushSize * scaleFactor;
        ctx.strokeStyle = "rgba(255, 255, 255, 1)";
        ctx.fillStyle = "rgba(255, 255, 255, 1)";

        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        lastPoint.current = p;
    };

    const handleNext = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Export Mask: Needs to be Black Background + White Shape
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const ctx = exportCanvas.getContext('2d');
        if (!ctx) return;

        // 1. Fill Black
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        // 2. Draw User Mask (White)
        ctx.drawImage(canvas, 0, 0);

        // 3. Ensure Binary mask (White shape on Black bg)
        // Since we drew with white, we just need to make sure unwanted alpha is black.
        // The composite 'source-over' on black effectively does this for opaque variable alpha.
        // But let's force strict white just in case.

        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        // Restore Black Background for transparent areas
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
            touchAction: 'none'
        }}>
            {/* TOOLBAR */}
            <div style={{
                height: '70px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                backgroundColor: '#0f1014',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                zIndex: 20
            }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white' }}>
                    <ArrowLeft />
                </button>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <button onClick={() => setTool('brush')} style={{
                        padding: '10px',
                        borderRadius: '8px',
                        background: tool === 'brush' ? 'rgba(220, 177, 74, 0.2)' : 'transparent',
                        color: tool === 'brush' ? '#dcb14a' : 'white',
                        border: tool === 'brush' ? '1px solid #dcb14a' : '1px solid transparent'
                    }}>
                        <Paintbrush size={20} />
                    </button>
                    <button onClick={() => setTool('eraser')} style={{
                        padding: '10px',
                        borderRadius: '8px',
                        background: tool === 'eraser' ? 'rgba(220, 177, 74, 0.2)' : 'transparent',
                        color: tool === 'eraser' ? '#dcb14a' : 'white',
                        border: tool === 'eraser' ? '1px solid #dcb14a' : '1px solid transparent'
                    }}>
                        <Eraser size={20} />
                    </button>
                    <button onClick={handleUndo} disabled={history.length <= 1} style={{ background: 'none', border: 'none', color: history.length > 1 ? 'white' : 'grey' }}>
                        <Undo size={20} />
                    </button>
                </div>

                <button onClick={handleNext} style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    padding: '8px 20px',
                    borderRadius: '20px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600
                }}>
                    Dalej <Check size={16} />
                </button>
            </div>

            {/* CANVAS CONTAINER */}
            <div ref={containerRef} style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backgroundColor: '#000'
            }}>
                <img
                    src={imageSrc}
                    alt="Source"
                    style={{
                        position: 'absolute',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        opacity: 0.6 // Dimmed for contrast
                    }}
                />

                {/* Canvas must match the visual size of the img, but have full resolution internally.
                    We rely on CSS 'width: auto, height: auto' inside the flex container to match the img natural behavior?
                    Actually, it's safer to just let the canvas be the element that determines size if possible, 
                    OR absolutely position it over the image.
                    
                    Best Mobile approach: 
                    Allow image to hold the size. Position Canvas absolute on top with w/h 100%.
                */}
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
                        position: 'absolute',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        // Canvas visual size should match the rendered image size.
                        // Since they are both in a flex center container with same max constraints, 
                        // they *should* overlap perfectly if aspect ratio matches.
                        objectFit: 'contain',
                        touchAction: 'none',
                        zIndex: 10
                    }}
                />

                {isAnalyzing && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 30, color: 'white' }}>
                        <Loader2 className="animate-spin" style={{ marginRight: '10px' }} /> Szukam uśmiechu...
                    </div>
                )}
            </div>

            {/* SLIDER */}
            <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px', backgroundColor: '#0f1014' }}>
                <input
                    type="range" min="10" max="100" value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    style={{ width: '100%', maxWidth: '300px', accentColor: '#dcb14a' }}
                />
            </div>
        </div>
    );
}
