"use client";

import { useEffect, useRef, useState } from "react";

/**
 * BackgroundVideo — cinematic hero background.
 *
 * 2026-06-17 — losowe krótkie pętle zamiast jednego 5-minutowego pliku:
 *   PROBLEM: hero-video-v2.mp4 to było pełne 5:22 promo (3.4 MB) serwowane w pętli jako tło.
 *   Rozmiar brał się z DŁUGOŚCI (bitrate był już niski ~83 kbps), nie z jakości. Na mobile 4G
 *   = 73% transferu strony + audyt "Unikaj bardzo dużych ładunków".
 *
 *   ROZWIĄZANIE: 5 krótkich (10 s) pętli wyciętych ze ŚRODKA promo (sceny premium/techniczne:
 *   mikroskop, skan 3D, narzędzia makro, CBCT — bez napisów/name-card). Przy każdym wejściu
 *   losujemy jedną → wariacja tła + tylko ~167 KB (mobile) / ~456 KB (desktop) zamiast 3.4 MB.
 *   Per-load pobiera się DOKŁADNIE 1 klip, więc losowanie nie dokłada wagi — tylko zmienia
 *   który klip.
 *
 *   Desktop i mobile OSOBNO: matchMedia wybiera zestaw. Desktop 960×540 (HD-sourced z oryginału
 *   1080p, ostre na dużych ekranach), mobile 640×360 (lekkie pod 4G). Math.random() jest
 *   bezpieczny — wideo montuje się tylko po stronie klienta (po idle), nie ma go w SSR HTML,
 *   więc zero ryzyka hydration mismatch.
 *
 *   Poster (<img> 11 KB) renderuje się NATYCHMIAST (cheap background przed hydration), wideo
 *   montuje się DOPIERO po requestIdleCallback (nie konkuruje o pasmo z LCP elementem).
 *   Autoplay wymuszany przez .play() po mount (iOS Safari 17+/Android Data Saver wymagają
 *   explicit call mimo autoPlay attr).
 *
 * Wcześniejsze iteracje:
 *   - Faza D (2026-05-09): YouTube iframe → self-hosted MP4 (eliminacja ~4 MB JS)
 *   - Faza 4B (2026-06-10): hero-video.mp4 8.3 MB → hero-video-v2.mp4 3.4 MB (640×360 crf36)
 */

// 5 fragmentów (10 s) ze środka promo, losowane per wejście. Dwa profile jakości
// (desktop ostry HD-sourced / mobile lekki). Pliki: public/hero/loop-{1..5}-{d,m}.mp4
const CLIPS_DESKTOP = [
    "/hero/loop-1-d.mp4",
    "/hero/loop-2-d.mp4",
    "/hero/loop-3-d.mp4",
    "/hero/loop-4-d.mp4",
    "/hero/loop-5-d.mp4",
];
const CLIPS_MOBILE = [
    "/hero/loop-1-m.mp4",
    "/hero/loop-2-m.mp4",
    "/hero/loop-3-m.mp4",
    "/hero/loop-4-m.mp4",
    "/hero/loop-5-m.mp4",
];

export default function BackgroundVideo(_props: { videoId: string }) {
    // videoSrc: null dopóki nie wybierzemy klipu (po idle). Poster renderuje się wcześniej.
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        let cancelled = false;
        // Po idle: wybierz zestaw wg viewportu + LOSOWY klip. Defer = MP4 nie konkuruje z LCP.
        const pickAndMount = () => {
            if (cancelled) return;
            const isMobile = window.matchMedia("(max-width: 768px)").matches;
            const set = isMobile ? CLIPS_MOBILE : CLIPS_DESKTOP;
            setVideoSrc(set[Math.floor(Math.random() * set.length)]);
        };

        // requestIdleCallback (Chrome, Firefox) z timeoutem 2.5s; fallback setTimeout (Safari).
        const ic = (window as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
        if (typeof ic === "function") {
            const id = ic(pickAndMount, { timeout: 2500 });
            return () => {
                cancelled = true;
                (window as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
            };
        }
        const tid = setTimeout(pickAndMount, 1500);
        return () => {
            cancelled = true;
            clearTimeout(tid);
        };
    }, []);

    useEffect(() => {
        if (!videoSrc) return;
        const v = videoRef.current;
        if (!v) return;
        // Programowe wymuszenie play — niektóre browsers wymagają explicit .play() mimo
        // autoPlay attr. Catch ignoruje rejection (autoplay blocked → poster zostaje widoczny).
        const tryPlay = async () => {
            try { await v.play(); } catch { /* autoplay blocked — poster stays visible */ }
        };
        tryPlay();
    }, [videoSrc]);

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
            {/* Poster image — RENDERS IMMEDIATELY (zero JS dependency).
                Acts as "cheap" hero background while video defers fetch.
                Visible until a clip is picked + can play (potem overlay'owane przez <video>). */}
            <img
                src="/hero-video-poster.webp"
                alt=""
                aria-hidden="true"
                decoding="async"
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: videoSrc ? 0 : 1,
                    transition: "opacity 0.6s ease-out",
                }}
            />

            {/* Video — mounted DOPIERO po idle z LOSOWO wybranym klipem (desktop/mobile set).
                Mount → fetch start. preload="auto" OK bo to po idle (krytyczne zasoby już są). */}
            {videoSrc && (
                <video
                    ref={videoRef}
                    src={videoSrc}
                    poster="/hero-video-poster.webp"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                    }}
                />
            )}

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
