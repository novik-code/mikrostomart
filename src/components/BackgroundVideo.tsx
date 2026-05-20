"use client";

import { useEffect, useRef, useState } from "react";

/**
 * BackgroundVideo — cinematic hero background.
 *
 * Faza D SEO (2026-05-09): zmieniony z YouTube iframe na self-hosted MP4 w
 * public/hero-video.mp4. Powód: zero JavaScript execution + ładowanie równoległe.
 *
 * K-1c #2 mobile autoplay fix (2026-05-19): Marcin zgłosił że na mobile widać
 * tylko ikonę play (autoplay nie startuje, click nie działa). Fixy:
 *   - REMOVED `pointerEvents: "none"` na <video> (blokowało user fallback gdy
 *     autoplay się nie startuje + niektóre iOS Safari interpretowały jako brak
 *     user interaction → wymuszały autoplay block)
 *   - DODANY ref + force `videoRef.current.play()` w useEffect z catch(noop) —
 *     niektóre przeglądarki wymagają explicit .play() po mount mimo autoPlay attr
 *   - DODANY `poster="/hero-video-poster.webp"` — pierwsza klatka jako fallback
 *     gdy autoplay się nie startuje lub video się jeszcze ładuje. Marcin
 *     widzi cinematic frame zamiast czarny prostokąt + play button.
 *   - `preload="metadata"` zamiast `preload="auto"` — szybsze first paint na
 *     mobile (8 MB MP4 nie pobiera od razu, tylko gdy ready to play)
 */
export default function BackgroundVideo(_props: { videoId: string }) {
    const [isLoaded, setIsLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // Małe opóźnienie żeby najpierw wyrenderować statyczną treść,
        // dopiero potem zacząć pobierać ~8 MB MP4.
        const timer = setTimeout(() => setIsLoaded(true), 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!isLoaded) return;
        const v = videoRef.current;
        if (!v) return;
        // Programowe wymuszenie play — niektóre browsers (iOS Safari 17+,
        // Android Chrome z Data Saver) wymagają explicit .play() call mimo
        // autoPlay attribute. Catch ignoruje rejection (np. user gesture
        // required) — wtedy user widzi poster + może kliknąć play manually.
        const tryPlay = async () => {
            try { await v.play(); } catch { /* autoplay blocked — poster + play button stay visible */ }
        };
        tryPlay();
    }, [isLoaded]);

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
                ref={videoRef}
                src="/hero-video.mp4"
                poster="/hero-video-poster.webp"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
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
