
"use client";

import React, { useRef, useEffect, useState } from 'react';

interface OverlayEditorProps {
    baseImage: string;
    templateImage: string;
    onCompositeReady: (compositeDataUrl: string) => void;
}

export default function OverlayEditor({ baseImage, templateImage, onCompositeReady }: OverlayEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [config, setConfig] = useState({ x: 512, y: 512, scaleX: 1.0, scaleY: 1.0, rotation: 0, opacity: 0.85 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Load images
    const [imgBase, setImgBase] = useState<HTMLImageElement | null>(null);
    const [imgTemplate, setImgTemplate] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
        const i1 = new Image();
        i1.src = baseImage;
        i1.onload = () => setImgBase(i1);

        const i2 = new Image();
        i2.src = templateImage;
        i2.onload = () => setImgTemplate(i2);
    }, [baseImage, templateImage]);

    // Draw Loop
    useEffect(() => {
        if (!canvasRef.current || !imgBase || !imgTemplate) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, 1024, 1024);

        // 1. Draw Base
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.drawImage(imgBase, 0, 0, 1024, 1024);

        // 2. Draw Template with "Screen" blend mode to remove black background
        ctx.save();
        ctx.globalCompositeOperation = "screen"; // This removes black background effectively!
        ctx.globalAlpha = config.opacity;

        ctx.translate(config.x, config.y);
        ctx.rotate((config.rotation * Math.PI) / 180);
        ctx.scale(config.scaleX, config.scaleY);

        // Draw centered
        const w = imgTemplate.width;
        const h = imgTemplate.height;
        const drawW = 1024;
        const drawH = 1024 * (h / w);

        ctx.drawImage(imgTemplate, -drawW / 2, -drawH / 2, drawW, drawH);

        ctx.restore();

        // Auto-emit for smoother UX (optional, but requested often)
        // onCompositeReady(canvasRef.current.toDataURL("image/png"));

    }, [imgBase, imgTemplate, config]);

    const handleGenerateComposite = () => {
        if (canvasRef.current) {
            onCompositeReady(canvasRef.current.toDataURL("image/png"));
        }
    };

    // Interaction Handlers
    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault(); // Prevent scroll on mobile
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setDragStart({ x: clientX, y: clientY });
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const dx = clientX - dragStart.x;
        const dy = clientY - dragStart.y;

        // Convert screen delta to canvas delta
        const displayScale = 1024 / (canvasRef.current?.clientWidth || 1);

        setConfig(prev => ({
            ...prev,
            x: prev.x + dx * displayScale,
            y: prev.y + dy * displayScale
        }));
        setDragStart({ x: clientX, y: clientY });
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
            <div
                style={{ position: 'relative', width: '100%', aspectRatio: '1/1', border: '2px dashed var(--color-primary)', borderRadius: '8px', overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
            >
                <canvas
                    ref={canvasRef}
                    width={1024}
                    height={1024}
                    style={{ width: '100%', height: '100%', display: 'block' }}
                />
            </div>

            {/* Controls */}
            <div style={{ background: 'var(--color-surface-hover)', padding: '15px', marginTop: '10px', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '10px' }}>Dopasuj uśmiech</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.8rem' }}>Szerokość {config.scaleX.toFixed(2)}x</label>
                        <input type="range" min="0.2" max="2.0" step="0.01" value={config.scaleX} onChange={e => setConfig({ ...config, scaleX: parseFloat(e.target.value) })} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.8rem' }}>Wysokość {config.scaleY.toFixed(2)}x</label>
                        <input type="range" min="0.2" max="2.0" step="0.01" value={config.scaleY} onChange={e => setConfig({ ...config, scaleY: parseFloat(e.target.value) })} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
                    <span style={{ width: '60px', fontSize: '0.9rem' }}>Obrót:</span>
                    <input type="range" min="-20" max="20" step="0.5" value={config.rotation} onChange={e => setConfig({ ...config, rotation: parseFloat(e.target.value) })} style={{ flex: 1 }} />
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
                    <span style={{ width: '60px', fontSize: '0.9rem' }}>Krycie:</span>
                    <input type="range" min="0.2" max="1.0" step="0.05" value={config.opacity} onChange={e => setConfig({ ...config, opacity: parseFloat(e.target.value) })} style={{ flex: 1 }} />
                </div>

                <button onClick={handleGenerateComposite} className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                    ✅ Zatwierdź ułożenie
                </button>
            </div>
        </div>
    );
}
