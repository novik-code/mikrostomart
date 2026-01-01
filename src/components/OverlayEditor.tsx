
"use client";

import React, { useRef, useEffect, useState } from 'react';

interface OverlayEditorProps {
    baseImage: string;
    templateImage: string;
    onCompositeReady: (compositeDataUrl: string) => void;
    onMaskReady?: (maskDataUrl: string) => void;
    initialAlignment?: { x: number, y: number, scale: number, rotation: number } | null;
}

export default function OverlayEditor({ baseImage, templateImage, onCompositeReady, onMaskReady, initialAlignment }: OverlayEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // State for Image Layout
    const [config, setConfig] = useState(() => {
        // Initialize with auto-alignment if available
        if (initialAlignment) {
            return {
                x: (initialAlignment.x / 100) * 1024,
                y: (initialAlignment.y / 100) * 1024,
                scaleX: initialAlignment.scale,
                scaleY: initialAlignment.scale,
                rotation: initialAlignment.rotation,
                opacity: 0.85,
                curve: 0
            };
        }
        return {
            x: 512,
            y: 512,
            scaleX: 1.0,
            scaleY: 1.0,
            rotation: 0,
            opacity: 0.85,
            curve: 0
        };
    });

    // React to Auto-Alignment Updates
    useEffect(() => {
        if (initialAlignment) {
            const newX = (initialAlignment.x / 100) * 1024;
            const newY = (initialAlignment.y / 100) * 1024;
            const s = initialAlignment.scale;

            setConfig(prev => ({
                ...prev,
                x: newX,
                y: newY,
                scaleX: s,
                scaleY: s,
                rotation: initialAlignment.rotation,
            }));

            // Smart Lip Line Positioning:
            // Place the curve just above the teeth center using the scale.
            // Heuristic: Teeth are roughly centered. Upper lip is ~150px (at scale 1) above center.
            const lipOffsetY = 120 * s;
            const lipCurveY = 50 * s; // How much the smile curves up

            setLipMask(prev => ({
                ...prev,
                p1: { x: newX - (300 * s), y: newY - lipOffsetY + lipCurveY }, // Left
                p2: { x: newX, y: newY - (lipOffsetY + 50 * s) }, // Center (Higher)
                p3: { x: newX + (300 * s), y: newY - lipOffsetY + lipCurveY }  // Right
            }));
        }
    }, [initialAlignment]);

    // State for Lip Mask (Bezier Curve)
    const [maskMode, setMaskMode] = useState(false); // Toggle edit mode
    const [lipMask, setLipMask] = useState({
        enabled: true,
        p1: { x: 300, y: 400 }, // Left
        p2: { x: 512, y: 350 }, // Center (Control/Cupid)
        p3: { x: 724, y: 400 }  // Right
    });

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [dragTarget, setDragTarget] = useState<'move' | 'p1' | 'p2' | 'p3' | null>(null);

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

        // 2. Draw Template with "Screen" blend mode + masking
        ctx.save();

        // --- LIP MASKING (Clip Area) ---
        if (lipMask.enabled) {
            ctx.beginPath();
            // Define visible area: Bottom half of screen starting from the curve
            // We draw a shape from the curve down to the bottom corners
            ctx.moveTo(0, 1024); // BL
            ctx.lineTo(0, lipMask.p1.y); // Left Edge (approx)
            ctx.lineTo(lipMask.p1.x, lipMask.p1.y); // P1

            // Quadratic Bezier from P1 to P3 via P2
            ctx.quadraticCurveTo(lipMask.p2.x, lipMask.p2.y, lipMask.p3.x, lipMask.p3.y);

            ctx.lineTo(1024, lipMask.p3.y); // Right Edge
            ctx.lineTo(1024, 1024); // BR
            ctx.closePath();

            // Clip! Only draw inside this shape
            ctx.clip();
        }

        // --- DRAW TEMPLATE ---
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = config.opacity;

        ctx.translate(config.x, config.y);
        ctx.rotate((config.rotation * Math.PI) / 180);
        ctx.scale(config.scaleX, config.scaleY);

        const w = 1024;
        const h = 1024 * (imgTemplate.height / imgTemplate.width);

        // --- WARP (CURVE) RENDERING ---
        if (config.curve !== 0) {
            // Slice rendering
            const slices = 40;
            const sliceW = w / slices;
            const amp = config.curve * 100; // Amplitude of curve pixels

            for (let i = 0; i < slices; i++) {
                // Normalized x (-1 to 1) relative to center
                const nx = (i / (slices - 1)) * 2 - 1;
                // Parabolic offset: y = x^2 * amp
                const dy = -(nx * nx) * amp; // Ends (nx=1) get -amp (up), Center (nx=0) gets 0.

                // Clip src x
                const sx = (i * imgTemplate.width) / slices;
                const sWidth = imgTemplate.width / slices;

                // Dest x - centered
                const dx = -w / 2 + i * sliceW;

                ctx.drawImage(
                    imgTemplate,
                    sx, 0, sWidth, imgTemplate.height, // Source
                    dx, -h / 2 + dy, sliceW, h           // Dest
                );
            }
        } else {
            // Normal Draw
            ctx.drawImage(imgTemplate, -w / 2, -h / 2, w, h);
        }

        ctx.restore();

        // 3. Draw Mask Controls (Overlay UI) if in edit mode
        if (maskMode) {
            const pointRadius = 15;

            // Draw Curve
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
            ctx.lineWidth = 4;
            ctx.moveTo(lipMask.p1.x, lipMask.p1.y);
            ctx.quadraticCurveTo(lipMask.p2.x, lipMask.p2.y, lipMask.p3.x, lipMask.p3.y);
            ctx.stroke();

            // Helpers
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 1;
            ctx.moveTo(lipMask.p1.x, lipMask.p1.y);
            ctx.lineTo(lipMask.p2.x, lipMask.p2.y);
            ctx.lineTo(lipMask.p3.x, lipMask.p3.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw Points
            [lipMask.p1, lipMask.p2, lipMask.p3].forEach((p, idx) => {
                ctx.beginPath();
                ctx.fillStyle = idx === 1 ? "yellow" : "white";
                ctx.arc(p.x, p.y, pointRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "black";
                ctx.lineWidth = 2;
                ctx.stroke();
                // Label
                ctx.fillStyle = "black";
                ctx.font = "12px sans-serif";
                ctx.fillText(idx === 1 ? "Środek" : "Bok", p.x - 10, p.y - 20);
            });
        }

        // Auto-emit result (debounced)
        const timeoutId = setTimeout(() => {
            if (canvasRef.current && onCompositeReady) {
                onCompositeReady(canvasRef.current.toDataURL("image/png"));

                // GENERATE PRECISE BINARY MASK (White Teeth / Black BG)
                if (onMaskReady && imgTemplate) {
                    const maskCnv = document.createElement('canvas');
                    maskCnv.width = 1024;
                    maskCnv.height = 1024;
                    const mCtx = maskCnv.getContext('2d');

                    if (mCtx) {
                        const drawW = 1024;
                        const drawH = 1024 * (imgTemplate.height / imgTemplate.width);

                        // 1. Clear Canvas (Transparent)
                        mCtx.clearRect(0, 0, 1024, 1024);

                        // 2. Draw Teeth (Normal) -> NOW WITH SHADOW TO FILL GAPS
                        mCtx.save();
                        mCtx.translate(config.x, config.y);
                        mCtx.rotate((config.rotation * Math.PI) / 180);
                        mCtx.scale(config.scaleX, config.scaleY);

                        // Add Shadow to fill interdental transparency
                        // This ensures the CSS Shield doesn't show old teeth gaps
                        mCtx.shadowColor = "white"; // Same color as mask
                        mCtx.shadowBlur = 15;       // Strong blur to bridge 5-10px gaps
                        mCtx.shadowOffsetX = 0;
                        mCtx.shadowOffsetY = 0;

                        mCtx.drawImage(imgTemplate, -drawW / 2, -drawH / 2, drawW, drawH);
                        // Draw again to intensify core
                        mCtx.shadowBlur = 0;
                        mCtx.drawImage(imgTemplate, -drawW / 2, -drawH / 2, drawW, drawH);

                        // 3. Turn Non-Transparent Pixels to White
                        mCtx.globalCompositeOperation = "source-in";
                        mCtx.fillStyle = "white";
                        mCtx.fillRect(-drawW, -drawH, drawW * 2, drawH * 2);
                        mCtx.restore();

                        // 4. SKIP FILLING BLACK (We need transparency for CSS Shield)
                        // mCtx.globalCompositeOperation = "destination-over";
                        // ...

                        // 3. Apply Lip Clip (Eraser for Upper Lip)
                        if (maskMode) {
                            mCtx.globalCompositeOperation = "destination-out"; // ERASE mode
                            mCtx.save();
                            mCtx.beginPath();
                            mCtx.moveTo(lipMask.p1.x, lipMask.p1.y);
                            mCtx.quadraticCurveTo(lipMask.p2.x, lipMask.p2.y, lipMask.p3.x, lipMask.p3.y);
                            // Close loop upwards to obscure the upper lip/skin
                            mCtx.lineTo(1024, 0); // Top Right
                            mCtx.lineTo(0, 0);    // Top Left
                            mCtx.lineTo(lipMask.p1.x, lipMask.p1.y);
                            mCtx.closePath();

                            mCtx.fillStyle = "black"; // Color doesn't matter in destination-out, alpha does
                            mCtx.fill();
                            mCtx.restore();
                        }

                        onMaskReady(maskCnv.toDataURL("image/png"));
                    }
                }
            }
        }, 100); // 100ms debounce

        return () => clearTimeout(timeoutId);

    }, [imgBase, imgTemplate, config, lipMask, maskMode]);

    // Removal of manual "Generate" button handler since we auto-emit

    // Interaction Handlers
    const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? (e as any).touches[0].clientX : (e as any).clientX;
        const clientY = 'touches' in e ? (e as any).touches[0].clientY : (e as any).clientY;
        const scale = 1024 / rect.width;
        return {
            x: (clientX - rect.left) * scale,
            y: (clientY - rect.top) * scale
        };
    };

    // Updated Handler Logic
    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const pt = getCanvasPoint(e);
        const hitDist = 60; // Increased hit area for mobile

        // Check Mask Points first (if visible)
        if (maskMode) {
            if (Math.hypot(pt.x - lipMask.p2.x, pt.y - lipMask.p2.y) < hitDist) {
                setIsDragging(true); setDragTarget('p2'); return;
            }
            if (Math.hypot(pt.x - lipMask.p1.x, pt.y - lipMask.p1.y) < hitDist) {
                setIsDragging(true); setDragTarget('p1'); return;
            }
            if (Math.hypot(pt.x - lipMask.p3.x, pt.y - lipMask.p3.y) < hitDist) {
                setIsDragging(true); setDragTarget('p3'); return;
            }
        }

        // Default: Move Template
        setIsDragging(true);
        setDragTarget('move');

        // For move, we need screen coords to calc delta
        const clientX = 'touches' in e ? (e as any).touches[0].clientX : (e as any).clientX;
        const clientY = 'touches' in e ? (e as any).touches[0].clientY : (e as any).clientY;
        setDragStart({ x: clientX, y: clientY });
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !dragTarget) return;

        if (dragTarget === 'move') {
            const clientX = 'touches' in e ? (e as any).touches[0].clientX : (e as any).clientX;
            const clientY = 'touches' in e ? (e as any).touches[0].clientY : (e as any).clientY;
            const dx = clientX - dragStart.x;
            const dy = clientY - dragStart.y;
            const displayScale = 1024 / (canvasRef.current?.clientWidth || 1);

            setConfig(prev => ({
                ...prev,
                x: prev.x + dx * displayScale,
                y: prev.y + dy * displayScale
            }));
            setDragStart({ x: clientX, y: clientY });
        } else {
            // Dragging a point (Absolute canvas coords)
            const pt = getCanvasPoint(e);
            setLipMask(prev => ({
                ...prev,
                [dragTarget]: { x: pt.x, y: pt.y }
            }));
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDragTarget(null);
    };

    return (
        <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
            {/* TOOLBAR */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button
                    onClick={() => setMaskMode(!maskMode)}
                    className="btn-secondary"
                    style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        background: maskMode ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                        border: '1px solid var(--color-surface-hover)',
                        color: maskMode ? 'white' : 'var(--color-text-main)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '500'
                    }}
                >
                    {maskMode ? "✅ Zakończ edycję wargi" : "✏️ Edytuj Linię Wargi"}
                </button>
            </div>

            <div
                style={{ position: 'relative', width: '100%', aspectRatio: '1/1', border: '1px solid var(--color-surface-hover)', borderRadius: '8px', overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
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

            {/* Compact Controls */}
            <div style={{ background: 'var(--color-surface)', padding: '12px', marginTop: '10px', borderRadius: '8px', border: '1px solid var(--color-surface-hover)' }}>
                <h4 style={{ marginBottom: '8px', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Parametry Uśmiechu</h4>

                {/* Scale Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Szerokość</label>
                        <input type="range" min="0.2" max="2.0" step="0.01" value={config.scaleX} onChange={e => setConfig({ ...config, scaleX: parseFloat(e.target.value) })} style={{ accentColor: 'var(--color-primary)' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Wysokość</label>
                        <input type="range" min="0.2" max="2.0" step="0.01" value={config.scaleY} onChange={e => setConfig({ ...config, scaleY: parseFloat(e.target.value) })} style={{ accentColor: 'var(--color-primary)' }} />
                    </div>
                </div>

                {/* Curve & Rotation */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Obrót ({config.rotation}°)</label>
                        <input type="range" min="-20" max="20" step="0.5" value={config.rotation} onChange={e => setConfig({ ...config, rotation: parseFloat(e.target.value) })} style={{ accentColor: 'var(--color-primary)' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Krzywizna</label>
                        <input type="range" min="-1.0" max="1.0" step="0.1" value={config.curve} onChange={e => setConfig({ ...config, curve: parseFloat(e.target.value) })} style={{ accentColor: 'var(--color-primary)' }} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Przezroczystość:</span>
                    <input type="range" min="0.2" max="1.0" step="0.05" value={config.opacity} onChange={e => setConfig({ ...config, opacity: parseFloat(e.target.value) })} style={{ flex: 1, accentColor: 'var(--color-primary)' }} />
                </div>
            </div>
        </div>
    );
}
