"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Eraser, Paintbrush, Undo, Loader2 } from "lucide-react";

// We removed Auto-Mask to give user full control and avoid "Giant Mask" bugs.
// import { analysisFaceAlignment, SmileAlignment } from "@/helpers/faceDetection";

interface StudioMaskEditorProps {
    imageSrc: string;
    onBack: () => void;
    onNext: (maskData: string) => void;
}

export default function StudioMaskEditor({ imageSrc, onBack, onNext }: StudioMaskEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
    const [brushSize, setBrushSize] = useState(25);
    const [history, setHistory] = useState<ImageData[]>([]);

    useEffect(() => {
        const init = async () => {
            const img = new Image();
            img.src = imageSrc;

            img.onload = async () => {
                const canvas = canvasRef.current;
                if (!canvas) return;

                // CRITICAL FIX: Set Canvas Resolution to match Image Resolution exactly 1:1
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                // Configure Context
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = "rgba(255, 255, 255, 1)";
                ctx.lineWidth = brushSize;

                // Make sure canvas is clear
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                saveHistory();
            };
        };

        if (imageSrc) init();
    }, [imageSrc]);

    const saveHistory = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
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
        // Adjust brush size relative to image resolution
        const scaleFactor = Math.max(canvas.width, canvas.height) / 800;
        ctx.lineWidth = brushSize * scaleFactor;
        ctx.strokeStyle = "rgba(255, 255, 255, 1)";

        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        lastPoint.current = p;
    };

    const handleNext = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Export Mask: Needs to be Black Background + White Shape for Flux Fill
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

        // 3. Ensure Strict Binary White/Black
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

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
                height: '80px',
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
                        padding: '12px',
                        borderRadius: '12px',
                        background: tool === 'brush' ? 'rgba(220, 177, 74, 0.2)' : 'transparent',
                        color: tool === 'brush' ? '#dcb14a' : 'white',
                        border: tool === 'brush' ? '1px solid #dcb14a' : '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <Paintbrush size={24} />
                    </button>
                    <button onClick={() => setTool('eraser')} style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background: tool === 'eraser' ? 'rgba(220, 177, 74, 0.2)' : 'transparent',
                        color: tool === 'eraser' ? '#dcb14a' : 'white',
                        border: tool === 'eraser' ? '1px solid #dcb14a' : '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <Eraser size={24} />
                    </button>
                    <button onClick={handleUndo} disabled={history.length <= 1} style={{ background: 'none', border: 'none', color: history.length > 1 ? 'white' : '#444' }}>
                        <Undo size={24} />
                    </button>
                </div>

                <button onClick={handleNext} style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    padding: '10px 24px',
                    borderRadius: '24px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    fontSize: '16px'
                }}>
                    Dalej <Check size={18} />
                </button>
            </div>

            {/* CANVAS CONTAINER - Center Canvas over Image */}
            <div ref={containerRef} style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backgroundColor: '#000'
            }}>
                {/* 
                   We want the user to see the image fully, and paint on top.
                   The easiest way to align is overlaying them exactly with identical sizing constraints.
                */}
                <img
                    src={imageSrc}
                    alt="Source"
                    style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        opacity: 0.6, // Dim to make drawing visible
                        position: 'absolute',
                        zIndex: 5
                    }}
                />

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
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        touchAction: 'none',
                        position: 'absolute', // Stack on top of img
                        zIndex: 10
                    }}
                />
            </div>

            {/* SLIDER Tool */}
            <div style={{ height: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px', backgroundColor: '#0f1014', gap: '8px' }}>
                <p style={{ color: 'grey', fontSize: '12px', margin: 0 }}>Wielkość pędzla</p>
                <input
                    type="range" min="10" max="100" value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    style={{ width: '100%', maxWidth: '300px', accentColor: '#dcb14a', height: '6px' }}
                />
            </div>
        </div>
    );
}
