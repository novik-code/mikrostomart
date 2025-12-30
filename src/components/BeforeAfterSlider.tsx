"use client";

import { useState, useRef, useEffect } from "react";

export default function BeforeAfterSlider() {
    // Start at 50%
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isResizing, setIsResizing] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleStart = () => setIsResizing(true);
    const handleEnd = () => setIsResizing(false);

    // Measure container width on mount and resize
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };

        // Run immediately
        updateWidth();

        // And on resize
        window.addEventListener("resize", updateWidth);

        // Double check a bit later in case layout shifts
        const timer = setTimeout(updateWidth, 100);

        return () => {
            window.removeEventListener("resize", updateWidth);
            clearTimeout(timer);
        };
    }, []);

    // Handle Dragging
    useEffect(() => {
        const handleMove = (clientX: number) => {
            if (!isResizing || !containerRef.current) return;
            const { left, width } = containerRef.current.getBoundingClientRect();
            // Calculate percentage 0-100
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

            {/* 2. BEFORE Image (Clipped Layer - Width based on slider) */}
            <div
                style={{
                    position: "absolute",
                    top: 0, left: 0, height: "100%",
                    width: `${sliderPosition}%`, // This width changes
                    borderRight: "4px solid white",
                    overflow: "hidden",
                    zIndex: 10
                }}
            >
                {/* 
                    INNER DIV TRICK:
                    We set this div's width to match the PARENT container's total width.
                    This way, the background image (cover) inside renders exactly the same size 
                    as the one in the background layer, regardless of the clipping parent's width.
                 */}
                <div style={{
                    width: containerWidth > 0 ? `${containerWidth}px` : "100%",
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

            {/* Handle Circle (Visual only) */}
            <div style={{
                position: "absolute",
                top: "50%",
                left: `${sliderPosition}%`,
                transform: "translate(-50%, -50%)",
                width: "40px",
                height: "40px",
                background: "white",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 20,
                boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                pointerEvents: "none"
            }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8L22 12L18 16" />
                    <path d="M6 8L2 12L6 16" />
                </svg>
            </div>
        </div>
    );
}
