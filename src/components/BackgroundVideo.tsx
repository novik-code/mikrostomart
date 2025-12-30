"use client";

import { useEffect, useState } from "react";

export default function BackgroundVideo({ videoId }: { videoId: string }) {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Small delay to prioritize static content loading
        const timer = setTimeout(() => setIsLoaded(true), 500);
        return () => clearTimeout(timer);
    }, []);

    if (!isLoaded) return null;

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: -1,
            overflow: "hidden",
            opacity: 0.3, // Subtle visibility
            mixBlendMode: "luminosity" // Cinematic effect
        }}>
            <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&showinfo=0&rel=0`}
                style={{
                    width: "100vw",
                    height: "56.25vw", // 16:9 Aspect Ratio
                    minHeight: "100vh",
                    minWidth: "177.77vh", // 16:9 Aspect Ratio
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none"
                }}
                allow="autoplay; encrypted-media"
                frameBorder="0"
            />

            {/* Gradient Overlay to ensure text readability */}
            <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "radial-gradient(circle at center, rgba(8,9,10,0.5) 0%, rgba(8,9,10,1) 100%)"
            }} />
        </div>
    );
}
