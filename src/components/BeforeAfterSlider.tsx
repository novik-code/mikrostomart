"use client";

import { useState, useRef, useEffect } from "react";

export default function BeforeAfterSlider() {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleStart = () => setIsResizing(true);
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
                touchAction: "none"
            }}
            onMouseDown={handleStart}
            onTouchStart={handleStart}
        >
            {/* 1. AFTER Image (Background Layer - Full Width) */}
            <div
                style={{
                    position: "absolute",
                    top: 0, left: 0, width: "100%", height: "100%",
                    backgroundImage: "url('/metamorphosis_after.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                <div style={{
                    position: "absolute", top: "1rem", right: "1rem",
                    background: "rgba(0,0,0,0.6)", color: "#fff",
                    padding: "0.2rem 0.6rem", borderRadius: "4px",
                    fontWeight: "bold", fontSize: "0.8rem"
                }}>
                    PO
                </div>
            </div>

            {/* 2. BEFORE Image (Clipped Layer) */}
            <div
                style={{
                    position: "absolute",
                    top: 0, left: 0, height: "100%",
                    width: `${sliderPosition}%`,
                    borderRight: "4px solid var(--color-primary)", // Gold Divider
                    overflow: "hidden",
                    zIndex: 10
                }}
            >
                {/* 
                    CSS Trick for Inverse Width:
                    If wrapper is X% wide, inner needs to be 100/X * 100 % wide to counteract it.
                    We use a large fixed percentage as a fallback or the calc trick.
                    Since we can't easily do 100/X in CSS calc() without unit compatibility issues in some cases,
                    we will stick to the '100vw' approach but constrained by max-width if possible,
                    OR better: revert to simple logic provided the containerWidth issue was just a timing one.
                    
                    Actually, let's use the simplest robust CSS method:
                    Set inner to `width: 100vw` (viewport width). 
                    The background image `cover` will scale to the viewport width.
                    Provided the Slider is roughly full width or consistent, this works 'okay'.
                    But to be perfect:
                    We will use `calc(100vw - (scrollbar width))` approx OR
                    Just render it `width: 100%` of the PARENT CONTAINER?
                    
                    Wait, `width: 200%` when slider is at 50%?
                    `width: 100% * (100/sliderPosition)`
                 */}
                <div style={{
                    width: sliderPosition > 0 ? `${10000 / sliderPosition}%` : "0",
                    height: "100%",
                    backgroundImage: "url('/metamorphosis_before.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat"
                }}>
                    <div style={{
                        position: "absolute", top: "1rem", left: "1rem",
                        background: "rgba(0,0,0,0.6)", color: "#fff",
                        padding: "0.2rem 0.6rem", borderRadius: "4px",
                        fontWeight: "bold", fontSize: "0.8rem"
                    }}>
                        PRZED
                    </div>
                </div>
            </div>

            {/* Handle Circle */}
            <div style={{
                position: "absolute",
                top: "50%",
                left: `${sliderPosition}%`,
                transform: "translate(-50%, -50%)",
                width: "40px",
                height: "40px",
                background: "var(--color-primary)", // Gold Handle
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 20,
                boxShadow: "0 0 10px rgba(0,0,0,0.5)",
                pointerEvents: "none"
            }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8L22 12L18 16" />
                    <path d="M6 8L2 12L6 16" />
                </svg>
            </div>
        </div>
    );
}
