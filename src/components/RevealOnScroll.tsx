"use client";

import { useEffect, useRef, useState } from "react";

interface RevealOnScrollProps {
    children: React.ReactNode;
    animation?: "fade-up" | "blur-in";
    delay?: 0 | 100 | 200 | 300;
    className?: string;
    style?: React.CSSProperties; // Add style support
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
            className={`reveal ${animation} ${isActive ? "active" : ""} ${delay > 0 ? `reveal-delay-${delay}` : ""} ${className}`}
            style={style}
        >
            {children}
        </div>
    );
}
