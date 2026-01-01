
"use client";

import { useState, useRef, useEffect } from "react";

interface BeforeAfterSliderProps {
    beforeImage: string;
    afterImage: string;
    maskImage?: string | null; // NEW: Precision Binary Mask (White=Teeth, Black=Transparent)
    onHoverStart?: () => void;
    onHoverEnd?: () => void;
    onInteraction?: () => void;
}

export default function BeforeAfterSlider({ beforeImage, afterImage, maskImage, onHoverStart, onHoverEnd, onInteraction }: BeforeAfterSliderProps) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleStart = () => {
        setIsResizing(true);
        if (onInteraction) onInteraction();
    };
    const handleEnd = () => setIsResizing(false);

    // Handle Dragging
    useEffect(() => {
        const handleMove = (clientX: number) => {
            if (!isResizing || !containerRef.current) return;
            const { left, width } = containerRef.current.getBoundingClientRect();
            const newPos = ((clientX - left) / width) * 100;
            setSliderPosition(Math.min(100, Math.max(0, newPos)));
        };

        const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
        const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);

        if (isResizing) {
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("touchmove", onTouchMove);
            window.addEventListener("mouseup", handleEnd);
            window.addEventListener("touchend", handleEnd);
        }

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("mouseup", handleEnd);
            window.removeEventListener("touchend", handleEnd);
        };
    }, [isResizing]);

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minHeight: "400px",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                cursor: "ew-resize",
                userSelect: "none",
                touchAction: "none",
                background: "black" // Ensure black backing if transparent
            }}
            onMouseDown={handleStart}
            onTouchStart={handleStart}
        >
            {/* LAYER 1: "AFTER" VIEW (Right Side, Revealed by Slider) */}
            {/* Logic: The slider is revealing the 'After' image? No, standard is Left=Before, Right=After. 
                Wait, usually slider acts as a divider.
                Let's stick to standard:
                - Base Layer (Full Width): AFTER Image
                - Top Layer (Clipped Width): BEFORE Image
                
                BUT with Safety Masking:
                - The "After" Image acts as the composite.
                - If we have a mask, the "After" View should actually be:
                  [Base: Original] + [Overlay: AI Result (Masked)]
                  
                So we need a Composite Container for the "After" state.
             */}

            <div
                style={{
                    position: "absolute",
                    top: 0, left: 0, width: "100%", height: "100%",
                }}
            >
                {/* AFTER VIEW COMPOSITE */}
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    {/* 1. Background: ORIGINAL Image (Safety Net) */}
                    {maskImage && (
                        <img
                            src={beforeImage}
                            alt="Safety Background"
                            style={{
                                position: 'absolute', top: 0, left: 0,
                                width: '100%', height: '100%',
                                objectFit: 'cover'
                            }}
                        />
                    )}

                    {/* 2. Foreground: AI Result */}
                    <img
                        src={afterImage}
                        alt="After"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            position: maskImage ? 'absolute' : 'relative',
                            top: 0, left: 0,
                            // THE CORE SAFETY MECHANISM:
                            // Use CSS Mask to only show pixels where mask is white (teeth).
                            // Everything else becomes transparent, revealing the Original Image below.
                            maskImage: maskImage ? `url(${maskImage})` : undefined,
                            WebkitMaskImage: maskImage ? `url(${maskImage})` : undefined,
                            maskMode: 'alpha', // Standard
                            maskRepeat: 'no-repeat',
                            maskSize: '100% 100%'
                        }}
                    />
                </div>

                <div style={{
                    position: "absolute", top: "1rem", right: "1rem",
                    background: "rgba(0,0,0,0.6)", color: "#fff",
                    padding: "0.2rem 0.6rem", borderRadius: "4px",
                    fontWeight: "bold", fontSize: "0.8rem",
                    zIndex: 2
                }}>
                    PO
                </div>
            </div>

            {/* LAYER 2: "BEFORE" VIEW (Clipped by Slider) */}
            <div
                style={{
                    position: "absolute",
                    top: 0, left: 0, height: "100%",
                    width: `${sliderPosition}%`, // Controlled by slider
                    borderRight: "4px solid var(--color-primary)",
                    overflow: "hidden",
                    zIndex: 10,
                    background: "white" // Avoid see-through
                }}
            >
                {/* Inner container to keep image width static while parent clips */}
                <div style={{
                    width: sliderPosition > 0 ? `${100 / sliderPosition * 100}%` : "0",
                    height: "100%",
                    position: 'relative'
                }}>
                    <img
                        src={beforeImage}
                        alt="Before"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block'
                        }}
                    />
                    <div style={{
                        position: "absolute", top: "1rem", left: "1rem",
                        background: "rgba(0,0,0,0.6)", color: "#fff",
                        padding: "0.2rem 0.6rem", borderRadius: "4px",
                        fontWeight: "bold", fontSize: "0.8rem",
                        zIndex: 2
                    }}>
                        PRZED
                    </div>
                </div>
            </div>

            {/* Handle Circle */}
            <div
                onMouseEnter={onHoverStart}
                onMouseLeave={onHoverEnd}
                style={{
                    position: "absolute",
                    top: "50%",
                    left: `${sliderPosition}%`,
                    transform: "translate(-50%, -50%)",
                    width: "40px",
                    height: "40px",
                    background: "var(--color-primary)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 20,
                    boxShadow: "0 0 10px rgba(0,0,0,0.5)",
                    pointerEvents: "auto",
                    cursor: "ew-resize"
                }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8L22 12L18 16" />
                    <path d="M6 8L2 12L6 16" />
                </svg>
            </div>
        </div>
    );
}
