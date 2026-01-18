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
        <div className="w-full h-full flex flex-col bg-[#0f1014]">
            {/* TOOLBAR */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 z-20 bg-[#0f1014]">
                <button onClick={onBack} className="p-2 text-white/70 hover:text-white">
                    <ArrowLeft />
                </button>
                <div className="flex gap-4">
                    <button
                        onClick={() => setTool('brush')}
                        className={`p-2 rounded-lg transition-colors ${tool === 'brush' ? 'bg-white text-black' : 'text-white/50 hover:bg-white/10'}`}
                    >
                        <Paintbrush size={20} />
                    </button>
                    <button
                        onClick={() => setTool('eraser')}
                        className={`p-2 rounded-lg transition-colors ${tool === 'eraser' ? 'bg-white text-black' : 'text-white/50 hover:bg-white/10'}`}
                    >
                        <Eraser size={20} />
                    </button>
                    <div className="w-[1px] bg-white/10 h-6 my-auto mx-2" />
                    <button
                        onClick={handleUndo}
                        disabled={history.length <= 1}
                        className="p-2 text-white/50 hover:text-white disabled:opacity-20"
                    >
                        <Undo size={20} />
                    </button>
                </div>
                <button
                    onClick={handleNext}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-medium flex items-center gap-2"
                >
                    Dalej <Check size={16} />
                </button>
            </div>

            {/* CANVAS AREA */}
            <div ref={containerRef} className="flex-1 relative overflow-hidden bg-black flex items-center justify-center touch-none">
                {/* Background Image Layer */}
                <img
                    src={imageSrc}
                    className="absolute max-w-full max-h-full object-contain pointer-events-none opacity-80"
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
                    className="max-w-full max-h-full object-contain cursor-crosshair relative z-10"
                // Important: The canvas element's CSS size must match the flexible image size.
                // But standard CSS object-contain centering is hard to match with a canvas absolute position unless we explicitly size it.
                // Hack: We rely on "max-w-full" on both IMG and CANVAS to align them if they have same aspect ratio.
                // Since specific pixel alignment is critical:
                // Better approach: Let the Render loop handle sizing or use a wrapper with Aspect Ratio.
                // For now, stacking them in a flex-center container with max-w/h usually aligns them if aspect ratios match.
                />

                {isAnalyzing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30 backdrop-blur-sm">
                        <div className="flex flex-col items-center">
                            <Loader2 className="animate-spin text-blue-500 mb-2" size={32} />
                            <p className="text-white font-medium">Szukam uśmiechu...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* SLIDERS (Brush Size) */}
            <div className="h-16 border-t border-white/10 flex items-center justify-center px-6 bg-[#0f1014]">
                <span className="text-white/50 text-xs mr-4">Rozmiar</span>
                <input
                    type="range"
                    min="5"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full max-w-xs accent-blue-500"
                />
            </div>
        </div>
    );
}
