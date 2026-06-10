"use client";

import { useEffect, useRef, useState } from "react";

/**
 * BackgroundVideo — cinematic hero background.
 *
 * Option C perf 2026-05-21 — defer 8 MB MP4 fetch:
 *   PROBLEM: hero-video.mp4 (8.1 MB) = 84% mobile initial transfer. Browser pobiera
 *   równolegle z critical resources (HTML, CSS, fonts, hero text, logo, JS) →
 *   bandwidth contention na 4G → LCP delay + Speed Index 12.3s.
 *
 *   STRATEGIA: poster image (<img> 11 KB) renderuje SIĘ NATYCHMIAST jako "fake background"
 *   przed hydration. Video tag (z preload="auto") mountuje się DOPIERO po
 *   requestIdleCallback (~1.5-2s po hydration, gdy main thread idle + critical
 *   resources skończyły load). Browser fetchuje MP4 wtedy gdy ma capacity, NIE
 *   konkuruje z LCP elementem.
 *
 *   Autoplay zachowane — `video.play()` triggerowany po mount + `loadedmetadata`.
 *   User experience identyczna: widzi cinematic frame (poster) od razu, video
 *   "wraca do życia" po ~2s gdy strona już interaktywna.
 *
 * Wcześniejsze iteracje:
 *   - Faza D SEO (2026-05-09): YouTube iframe → self-hosted MP4 (eliminacja 4 MB JS)
 *   - K-1c #2 mobile fix (2026-05-19): ref + force .play() + poster attr +
 *     preload="metadata" (już wtedy delay 500ms; teraz w C bumped do idle)
 */
export default function BackgroundVideo(_props: { videoId: string }) {
    // mountVideo: true gdy chcemy zacząć fetchować MP4 (po idle).
    // Poster image renders inny pierwszy (cheap), video overlay'uje go gdy ready.
    const [mountVideo, setMountVideo] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        // Defer do gdy main thread idle. requestIdleCallback fallback do setTimeout
        // dla browsers bez IC (Safari < 18 nie ma IC). Timeout 2.5s żeby zagwarantować
        // że video się załaduje nawet jeśli main thread cały czas zajęty.
        let cancelled = false;
        const trigger = () => {
            if (!cancelled) setMountVideo(true);
        };

        // Use requestIdleCallback jeśli dostępne (Chrome, Firefox)
        const ic = (window as any).requestIdleCallback;
        if (typeof ic === "function") {
            const id = ic(trigger, { timeout: 2500 });
            return () => {
                cancelled = true;
                ((window as any).cancelIdleCallback as any)?.(id);
            };
        }
        // Fallback: setTimeout 1500ms (Safari)
        const tid = setTimeout(trigger, 1500);
        return () => {
            cancelled = true;
            clearTimeout(tid);
        };
    }, []);

    useEffect(() => {
        if (!mountVideo) return;
        const v = videoRef.current;
        if (!v) return;
        // Programowe wymuszenie play — niektóre browsers (iOS Safari 17+,
        // Android Chrome z Data Saver) wymagają explicit .play() call mimo
        // autoPlay attribute. Catch ignoruje rejection (np. user gesture
        // required) — wtedy user widzi poster nadal.
        const tryPlay = async () => {
            try { await v.play(); } catch { /* autoplay blocked — poster stay visible */ }
        };
        tryPlay();
    }, [mountVideo]);

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
                Decoding async + fetchPriority high — non-blocking critical path
                but priority hint dla browser scheduler. */}
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
                    // Visible until video can play through (potem overlay'owane przez <video>)
                    opacity: mountVideo ? 0 : 1,
                    transition: "opacity 0.6s ease-out",
                }}
            />

            {/* Video — mounted DOPIERO po idle (browser nie fetchuje MP4 wcześniej).
                Mount → video element appended do DOM → src attribute → fetch start.
                preload="auto" = browser fetchuje aggresively gdy mount, OK bo to po
                idle czyli krytyczne zasoby już ściągnięte. */}
            {mountVideo && (
                <video
                    ref={videoRef}
                    // 4B (perf, 2026-06-10): hero-video.mp4 8.3 MB → hero-video-v2.mp4 3.4 MB
                    // (640×360 crf36, -59% transfer). Tło opacity 0.3 + luminosity → artefakty
                    // niewidoczne. Rename = cache-bust (Vercel CDN immutable).
                    src="/hero-video-v2.mp4"
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
