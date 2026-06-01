"use client";

// LazyMapEmbed — osadza mapę Google Maps (iframe) dopiero gdy kontener wejdzie
// w viewport (IntersectionObserver, rootMargin 200px). Cel: lokalny SEO/UX na
// stronach geo bez regresji Core Web Vitals.
//
// Zero-CLS: stały aspect-ratio rezerwuje miejsce zanim iframe się załaduje.
// Perf (lekcja Sprint A+B+C 2026-05-21): ciężkie zewnętrzne osadzenia ładujemy
// leniwie — iframe Map nie jest pobierany dopóki user nie doscrolluje.
// Fallback: dopóki nie załadowane, pokazujemy klikalny link do Google Maps.

import { useEffect, useRef, useState } from "react";

interface LazyMapEmbedProps {
    src: string;            // brand.mapEmbedUrl (Google Maps embed pb URL)
    placeUrl: string;       // link do Google Maps Place (fallback + a11y)
    title: string;          // tytuł iframe (a11y) + label fallback linku
}

export default function LazyMapEmbed({ src, placeUrl, title }: LazyMapEmbedProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const node = containerRef.current;
        if (!node || typeof window === "undefined" || !("IntersectionObserver" in window)) {
            // Brak IO (bardzo stare przeglądarki) → załaduj od razu, byle działało.
            setIsLoaded(true);
            return;
        }
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsLoaded(true);
                    io.disconnect();
                }
            },
            { rootMargin: "200px" }
        );
        io.observe(node);
        return () => io.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                aspectRatio: "3 / 2",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                background: "var(--color-surface-hover, #1a1a1a)",
            }}
        >
            {isLoaded && src ? (
                <iframe
                    src={src}
                    title={title}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        border: 0,
                    }}
                />
            ) : (
                <a
                    href={placeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-primary)",
                        fontWeight: 600,
                        textDecoration: "none",
                    }}
                >
                    {title} →
                </a>
            )}
        </div>
    );
}
