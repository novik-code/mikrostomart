"use client";

import { useEffect, useRef, useState } from "react";

interface RevealOnScrollProps {
    children: React.ReactNode;
    animation?: "fade-up" | "blur-in";
    delay?: number;
    className?: string;
    style?: React.CSSProperties;
    /**
     * Faza G4 (2026-05-10): skip the initial opacity:0 → opacity:1 animation.
     * Use for above-the-fold elements (hero h1, hero text, hero CTA) so they're
     * visible in initial SSR paint instead of appearing 200-500ms after hydration
     * fires the IntersectionObserver. Eliminates "flicker" at page load and
     * reduces LCP for hero-as-LCP-element pages.
     */
    priority?: boolean;
}

// Map arbitrary delay values to nearest valid CSS class
function getDelayClass(delay: number): string {
    if (delay <= 0) return "";
    if (delay <= 150) return "reveal-delay-100";
    if (delay <= 250) return "reveal-delay-200";
    return "reveal-delay-300";
}

export default function RevealOnScroll({
    children,
    animation = "fade-up",
    delay = 0,
    className = "",
    style = {},
    priority = false,
}: RevealOnScrollProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        if (priority) return; // skip observer for above-the-fold elements

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsActive(entry.isIntersecting);
            },
            {
                threshold: 0.15,
                rootMargin: "0px 0px -50px 0px"
            }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [priority]);

    // Priority: render plain div, no .reveal class, no opacity:0 initial state.
    // Element is visible in SSR HTML — no animation, no flicker, no LCP delay.
    if (priority) {
        return (
            <div className={className} style={style}>
                {children}
            </div>
        );
    }

    return (
        <div
            ref={ref}
            className={`reveal ${animation} ${isActive ? "active" : ""} ${getDelayClass(delay)} ${className}`}
            style={style}
        >
            {children}
        </div>
    );
}
