"use client";

import { useEffect, useState } from "react";

/**
 * BackgroundVideo — cinematic hero background.
 *
 * Faza D SEO (2026-05-09): zmieniony z YouTube iframe na self-hosted MP4 w
 * public/hero-video.mp4. Powód: poprzednia wersja ładowała ~4 MB YouTube
 * JavaScript (base.js, m=r78Drb, root,base) i zżerała ~2 sekundy main thread
 * tylko przez sam SDK YouTube. Native <video> ładuje 8 MB MP4 ale:
 *   - zero JavaScript execution (nie blokuje main thread)
 *   - ładuje się równolegle z innymi assetami (nie blokuje LCP)
 *   - autoplay/muted/loop działają identycznie jak w YouTube embed
 *
 * Prop `videoId` zachowany dla kompatybilności z theme config (ThemeContext
 * `hero.backgroundVideoId`), ale aktualnie ignorowany — zawsze serwujemy
 * lokalny `vGAu6rdJ8WQ` (Mikrostomart promo) skompresowany do 480p H.264.
 * Jeśli kiedyś potrzebne wiele tłen, dorobimy mapę videoId → URL.
 */
export default function BackgroundVideo(_props: { videoId: string }) {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Małe opóźnienie żeby najpierw wyrenderować statyczną treść,
        // dopiero potem zacząć pobierać ~8 MB MP4.
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
            opacity: 0.3,
            mixBlendMode: "luminosity"
        }}>
            <video
                src="/hero-video.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-hidden="true"
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    pointerEvents: "none",
                }}
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
