"use client";

// HeroSlideshow — multi-slide hero carousel zastępujący single-message HeroSection
// w default mikrostomart layout. Styl 1:1 z OfferCarousel (Marcin K-1b feedback
// 2026-05-18): 2-col grid LEFT photo (3/4 portrait, framed border) + RIGHT text
// (tagline gold uppercase + h1/h2 serif + blockquote italic + description + CTA),
// Framer Motion AnimatePresence z spring slide+fade+scale, drag swipe, gallery-nav-btn
// arrows (❮ ❯ na zewnątrz contentu), pill dots bottom-center, autoplay 5s.
//
// 5 slidów z różnymi SEO angles, każdy ma własny CTA do relewantnej landing page.
// Slide 1 = <h1> (Google preferuje 1 per page), pozostałe = <h2>.
// Wszystkie slidów w SSR HTML (Googlebot widzi 5 narracji od razu).

import { useState, useEffect, useMemo, useRef } from "react";
// Option B perf 2026-05-21: LazyMotion + domAnimation + m zamiast pełnego motion.
// Tree-shake: pełne framer-motion ~50KB → LazyMotion+domAnimation ~15KB (animation
// features ograniczone do transform/opacity/AnimatePresence — wystarczające dla
// HeroSlideshow slide/scale/opacity transitions). Saving ~35KB w initial bundle.
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface HeroSlide {
    id: string;
    tagline: string;
    title1: string;
    title2: string;
    description: string;
    ctaText: string;
    ctaHref: string;
    image: string;
    imageAlt: string;
}

// Slide order + photo mapping. Dedykowane AI-generated grafiki przez Replicate
// Flux Dev (2026-05-18) — styl 1:1 z OfferCarousel: dark moody, deep blacks +
// charcoal, subtle warm gold/amber accent lighting, modern luxury dental aesthetic,
// photorealistic, cinematic, shallow DoF, Canon R5 85mm f/1.4, 3:4 portrait.
// Prompts: scripts/generate-hero-slide-images.mjs. Regenerate: `node scripts/...`.
const SLIDE_CONFIG = [
    // -v2 suffix dla cache-bust (K-1c, 2026-05-19): Vercel CDN serwował stare grafiki
    // pomimo regeneracji (cache "immutable, max-age=31536000" = 1 rok). Bumpować -vN
    // przy każdej regeneracji grafik żeby wymusić fresh CDN fetch.
    { id: "emotional", ctaHref: "/rezerwacja", image: "/hero-slides/emotional-v4.webp" },
    { id: "authority", ctaHref: "/o-nas", image: "/hero-slides/authority-v4.webp" },
    { id: "technology", ctaHref: "/oferta", image: "/hero-slides/technology-v5.webp" },
    { id: "specialty", ctaHref: "/mapa-bolu", image: "/hero-slides/specialty-v4.webp" },
    { id: "international", ctaHref: "/dla-pacjentow-przyjezdnych", image: "/hero-slides/international-v4.webp" },
] as const;

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 1000 : -1000,
        opacity: 0,
        scale: 0.8,
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
        scale: 1,
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0,
        scale: 0.8,
    }),
};

const AUTOPLAY_MS = 5000;
const SWIPE_CONFIDENCE = 2000;
const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

export default function HeroSlideshow() {
    const t = useTranslations("heroSlides");
    const tNav = useTranslations("heroSlideshow");
    const [[page, direction], setPage] = useState([0, 0]);
    const [isPaused, setIsPaused] = useState(false);
    // Option B perf 2026-05-21: pause autoplay gdy carousel OUT of viewport.
    // Eliminuje long task setInterval co 5s gdy user scrolluje poniżej (heavy
    // Framer Motion spring computation co tick). Visible state managed by IO.
    const [isInView, setIsInView] = useState(true);
    const sectionRef = useRef<HTMLElement>(null);
    // matchMedia desktop detection — Tailwind `hidden md:flex` NIE działa w tym
    // projekcie (brak @import "tailwindcss" w globals.css → Tailwind nie generuje
    // utility classes). Używamy SSR-safe inline conditional rendering jak
    // MobileBottomBar pattern. Default false = mobile-first SSR (no image),
    // hydration aktualizuje do desktop view jeśli viewport >= 768.
    const [isDesktop, setIsDesktop] = useState(false);
    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const mq = window.matchMedia("(min-width: 768px)");
        setIsDesktop(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mq.addEventListener?.("change", handler);
        return () => mq.removeEventListener?.("change", handler);
    }, []);

    // Option B perf: IntersectionObserver pause autoplay gdy sekcja niewidoczna.
    useEffect(() => {
        const node = sectionRef.current;
        if (!node || typeof window === "undefined" || !("IntersectionObserver" in window)) return;
        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) setIsInView(entry.isIntersecting);
            },
            { threshold: 0.1 }
        );
        io.observe(node);
        return () => io.disconnect();
    }, []);

    // Build translated slides
    const SLIDES: HeroSlide[] = useMemo(() =>
        SLIDE_CONFIG.map((cfg) => ({
            id: cfg.id,
            tagline: t(`${cfg.id}.tagline`),
            title1: t(`${cfg.id}.title1`),
            title2: t(`${cfg.id}.title2`),
            description: t(`${cfg.id}.description`),
            ctaText: t(`${cfg.id}.ctaText`),
            ctaHref: cfg.ctaHref,
            image: cfg.image,
            imageAlt: `${t(`${cfg.id}.title1`)} ${t(`${cfg.id}.title2`)}`,
        })),
        [t]
    );

    const activeIndex = ((page % SLIDES.length) + SLIDES.length) % SLIDES.length;
    const slide = SLIDES[activeIndex];

    const paginate = (newDirection: number) => {
        setPage([page + newDirection, newDirection]);
    };

    // Autoplay — Option B perf 2026-05-21: pause when out of viewport
    // (długie taski co 5s blokujące main thread gdy user scrolluje down).
    useEffect(() => {
        if (isPaused || !isInView) return;
        const timer = setInterval(() => paginate(1), AUTOPLAY_MS);
        return () => clearInterval(timer);
    }, [page, isPaused, isInView]);

    const isPrimary = activeIndex === 0;

    return (
        <LazyMotion features={domAnimation} strict>
        <section
            ref={sectionRef}
            className="relative w-full flex items-center justify-center overflow-hidden py-12 md:py-24"
            style={{
                minHeight: "90vh",
                // Inline overflow:hidden bo Tailwind v4 nieaktywny w tym projekcie
                // → className="overflow-hidden" jest martwym kodem. Framer Motion
                // AnimatePresence z x:±1000px potrzebuje hard overflow guard żeby
                // motion.div w trakcie slide transition nie wyciekał poza viewport
                // (mobile horizontal scroll glitch, screeny Marcina 2026-05-20).
                overflow: "hidden",
                position: "relative",
                width: "100%",
                maxWidth: "100vw",
            }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            role="region"
            aria-roledescription="carousel"
            aria-label={tNav("regionLabel")}
        >
            {/* Hidden SSR-only block: pełny content wszystkich 5 slidów dla Googlebot.
                Aktywny slide renderuje się w widocznym carousel niżej (motion.div), ale
                Googlebot widzi te 5 sekcji bez czekania na hydration. Hidden via
                clip-path: inset(50%) — preferowane nad display:none/visibility:hidden
                bo Google traktuje display:none jako "hidden content" (penalty risk). */}
            <div style={{ clipPath: "inset(50%)", height: 1, width: 1, position: "absolute", overflow: "hidden", whiteSpace: "nowrap" }} aria-hidden="true">
                {SLIDES.map((s, idx) => {
                    const Heading = idx === 0 ? "h1" : "h2";
                    return (
                        <div key={s.id}>
                            <p>{s.tagline}</p>
                            <Heading>{s.title1} {s.title2}</Heading>
                            <p>{s.description}</p>
                        </div>
                    );
                })}
            </div>

            <div className="relative z-20 w-full max-w-6xl px-4 md:px-12 h-full flex flex-col justify-center">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <m.div
                        key={page}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 },
                        }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={1}
                        onDragEnd={(_, { offset, velocity }) => {
                            const swipe = swipePower(offset.x, velocity.x);
                            if (swipe < -SWIPE_CONFIDENCE) paginate(1);
                            else if (swipe > SWIPE_CONFIDENCE) paginate(-1);
                        }}
                        className="w-full cursor-grab active:cursor-grabbing select-none"
                        style={{ touchAction: "pan-y" }}
                    >
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                                gap: "var(--spacing-xl)",
                                alignItems: "center",
                                maxWidth: "1200px",
                                margin: "0 auto",
                                position: "relative",
                            }}
                        >
                            {/* Navigation Arrows (matching OfferCarousel) */}
                            <button
                                className="gallery-nav-btn gallery-nav-btn-prev"
                                onClick={(e) => { e.stopPropagation(); paginate(-1); }}
                                title={tNav("prevLabel")}
                                aria-label={tNav("prevLabel")}
                                style={{ left: 0, top: "50%", transform: "translateY(-50%)", zIndex: 40, position: "absolute" }}
                            >
                                ❮
                            </button>
                            <button
                                className="gallery-nav-btn gallery-nav-btn-next"
                                onClick={(e) => { e.stopPropagation(); paginate(1); }}
                                title={tNav("nextLabel")}
                                aria-label={tNav("nextLabel")}
                                style={{ right: 0, top: "50%", transform: "translateY(-50%)", zIndex: 40, position: "absolute" }}
                            >
                                ❯
                            </button>

                            {/* LEFT: Image (3/4 portrait, framed) — Team Member Style.
                                K-1c (Marcin 2026-05-19): conditional render — image
                                tylko na desktop ≥768px (matchMedia). Mobile = text-only
                                hero (image dominowało jako główny content). */}
                            {isDesktop && (
                                <div style={{ display: "flex", justifyContent: "flex-end", order: 1 }}>
                                    <div
                                        style={{
                                            width: "100%",
                                            maxWidth: "400px",
                                            aspectRatio: "3/4",
                                            position: "relative",
                                            borderRadius: "2px",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            padding: "10px",
                                            background: "transparent",
                                        }}
                                    >
                                        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
                                            <Image
                                                src={slide.image}
                                                alt={slide.imageAlt}
                                                fill
                                                sizes="50vw"
                                                style={{ objectFit: "cover" }}
                                                priority={isPrimary}
                                                draggable={false}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RIGHT: Text Content — centered na mobile (no image obok),
                                left-aligned na desktop (obok 3/4 portrait photo). */}
                            <div style={{ order: 2, textAlign: isDesktop ? "left" : "center", paddingLeft: isDesktop ? "var(--spacing-md)" : 0 }}>
                                <p
                                    style={{
                                        color: "var(--color-primary)",
                                        marginBottom: "1rem",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.1em",
                                        fontSize: "0.875rem",
                                    }}
                                >
                                    {slide.tagline}
                                </p>

                                {isPrimary ? (
                                    <h1
                                        style={{
                                            fontSize: "clamp(2rem, 4vw, 3.2rem)",
                                            marginBottom: "1.5rem",
                                            lineHeight: 1.15,
                                            fontFamily: "serif",
                                            color: "white",
                                            fontWeight: 400,
                                        }}
                                    >
                                        {slide.title1} <br />
                                        <span style={{ fontStyle: "italic", color: "var(--color-primary-light)" }}>{slide.title2}</span>
                                    </h1>
                                ) : (
                                    <h2
                                        style={{
                                            fontSize: "clamp(2rem, 4vw, 3.2rem)",
                                            marginBottom: "1.5rem",
                                            lineHeight: 1.15,
                                            fontFamily: "serif",
                                            color: "white",
                                            fontWeight: 400,
                                        }}
                                    >
                                        {slide.title1} <br />
                                        <span style={{ fontStyle: "italic", color: "var(--color-primary-light)" }}>{slide.title2}</span>
                                    </h2>
                                )}

                                <p
                                    style={{
                                        marginBottom: "2rem",
                                        color: "#cbd5e1",
                                        fontSize: "1.05rem",
                                        lineHeight: 1.7,
                                        maxWidth: "560px",
                                        textAlign: isDesktop ? "justify" : "center",
                                        marginLeft: isDesktop ? 0 : "auto",
                                        marginRight: isDesktop ? 0 : "auto",
                                    }}
                                >
                                    {slide.description}
                                </p>

                                <div style={{ display: "flex", justifyContent: isDesktop ? "flex-start" : "center", width: "100%", marginBottom: "1rem" }}>
                                    <Link
                                        href={slide.ctaHref}
                                        className="
                                            inline-flex items-center gap-3 px-8 py-3
                                            bg-[var(--color-primary)] text-black
                                            hover:bg-white hover:scale-105 active:scale-95
                                            transition-all duration-300
                                            rounded-[2px]
                                            uppercase tracking-wider text-sm font-bold
                                            shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.3)]
                                        "
                                    >
                                        {slide.ctaText} <ChevronRight size={16} strokeWidth={3} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </m.div>
                </AnimatePresence>
            </div>

            {/* Pagination Dots — bottom center, matching OfferCarousel */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-30">
                {SLIDES.map((s, i) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                            const diff = i - activeIndex;
                            if (diff !== 0) paginate(diff);
                        }}
                        aria-label={tNav("goToSlide", { idx: i + 1, total: SLIDES.length })}
                        aria-current={i === activeIndex ? "true" : "false"}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex
                            ? "w-8 bg-[var(--color-primary)]"
                            : "w-1.5 bg-white/20 hover:bg-white/40"
                            }`}
                    />
                ))}
            </div>
        </section>
        </LazyMotion>
    );
}
