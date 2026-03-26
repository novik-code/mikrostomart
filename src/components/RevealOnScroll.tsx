"use client";

import { useEffect, useRef, useState } from "react";

interface RevealOnScrollProps {
    children: React.ReactNode;
    animation?: "fade-up" | "blur-in";
    delay?: number;
    className?: string;
    style?: React.CSSProperties; // Add style support
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
    style = {}
}: RevealOnScrollProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // Update state based on intersection status to allow replay
                setIsActive(entry.isIntersecting);
            },
            {
                threshold: 0.15, // Trigger when 15% visible
                rootMargin: "0px 0px -50px 0px"
            }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, []);

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
