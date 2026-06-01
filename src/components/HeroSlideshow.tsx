"use client";

// HeroSlideshow — multi-slide hero carousel zastępujący single-message HeroSection
// w default mikrostomart layout.
//
// Option D 2026-05-21 — text-only refactor (CLS 0.219 fix + bundle reduction):
//   PROBLEM: SSR renderował text-only (isDesktop=false), client po hydration
//   matchMedia ustawiał isDesktop=true → re-render z 2-col grid + image → hero
//   urósł z ~400px do ~840px na desktop. CLS 0.219 (jeden element <main>).
//   Plus 5 grafik hero-slides ~500KB ładowanych podczas critical path.
//
//   FIX: text-only zawsze. Usunięto isDesktop state, matchMedia effect, Image
//   component, 5 .webp grafik (zostają na disku — wciąż referenced przez
//   scripts/generate-hero-slide-images.mjs gdyby ktoś chciał wrócić). Hero
//   pozostaje slideshow z autoplay 5s + drag swipe + arrows + dots, ale
//   text-only (centered). SEO 5 unique narracji w SSR HTML zachowane.
//
//   Trade-off: mniej "premium" wizualnie (brak portretu obok tekstu), ale
//   Marcin zaakceptował: "moze rzeczywiscie lepiej to usunac" (2026-05-21).
//
// 5 slidów z różnymi SEO angles, każdy ma własny CTA do relewantnej landing page.
// H1: jeden keyword-rich (geo) w SSR-only hidden block (heroSlideshow.seoH1).
// Wszystkie slajdy (SSR + widoczny carousel) = <h2> — Google preferuje 1 h1/page,
// a fraza główna nie powinna polegać na zmiennym tekście slajdów (2026-06-01 Pakiet A SEO).

import { useState, useEffect, useMemo, useRef } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface HeroSlide {
    id: string;
    tagline: string;
    title1: string;
    title2: string;
    description: string;
    ctaText: string;
    ctaHref: string;
}

// Option D 2026-05-21: SLIDE_CONFIG bez `image` pola (text-only).
const SLIDE_CONFIG = [
    { id: "emotional", ctaHref: "/rezerwacja" },
    { id: "authority", ctaHref: "/o-nas" },
    { id: "technology", ctaHref: "/oferta" },
    { id: "specialty", ctaHref: "/mapa-bolu" },
    { id: "international", ctaHref: "/dla-pacjentow-przyjezdnych" },
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
    // Option B perf: IntersectionObserver pause autoplay gdy out of viewport.
    const [isInView, setIsInView] = useState(true);
    const sectionRef = useRef<HTMLElement>(null);

    // Option D 2026-05-21: usunięto `isDesktop` state + matchMedia effect.
    // Były źródłem CLS 0.219 (SSR=false → client hydration=true → layout re-render).
    // Hero jest teraz text-only zarówno na SSR jak i client. Brak height change.

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
        })),
        [t]
    );

    const activeIndex = ((page % SLIDES.length) + SLIDES.length) % SLIDES.length;
    const slide = SLIDES[activeIndex];

    const paginate = (newDirection: number) => {
        setPage([page + newDirection, newDirection]);
    };

    // Autoplay — Option B perf: pause when out of viewport
    useEffect(() => {
        if (isPaused || !isInView) return;
        const timer = setInterval(() => paginate(1), AUTOPLAY_MS);
        return () => clearInterval(timer);
    }, [page, isPaused, isInView]);

    return (
        <LazyMotion features={domAnimation} strict>
        <section
            ref={sectionRef}
            className="relative w-full flex items-center justify-center overflow-hidden py-12 md:py-24"
            style={{
                // Stała wysokość żeby zarezerwować miejsce przed hydration (eliminate CLS).
                // 75vh = wystarczające na text-only hero z autoplay slides; nie tak duże
                // jak 90vh (poprzednie z image) żeby user szybko widział content below.
                minHeight: "75vh",
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
                Aktywny slide renderuje się w widocznym carousel niżej, ale Googlebot
                widzi te 5 sekcji bez czekania na hydration. Hidden via clip-path. */}
            <div style={{ clipPath: "inset(50%)", height: 1, width: 1, position: "absolute", overflow: "hidden", whiteSpace: "nowrap" }} aria-hidden="true">
                {/* Jedyny <h1> strony — keyword-rich (geo "Stomatolog Opole" / locale-aware).
                    Widoczny carousel używa <h2> (slajdy zmieniają tekst, fraza główna nie
                    powinna na nich polegać). 5 slidów = 5 narracji SEO jako <h2>. */}
                <h1>{tNav("seoH1")}</h1>
                {SLIDES.map((s) => (
                    <div key={s.id}>
                        <p>{s.tagline}</p>
                        <h2>{s.title1} {s.title2}</h2>
                        <p>{s.description}</p>
                    </div>
                ))}
            </div>

            <div className="relative z-20 w-full max-w-4xl px-4 md:px-12 h-full flex flex-col justify-center">
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
                        style={{ touchAction: "pan-y", position: "relative" }}
                    >
                        {/* Navigation Arrows */}
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

                        {/* Text Content — centered (text-only hero, no image col) */}
                        <div style={{ textAlign: "center", padding: "0 var(--spacing-md)" }}>
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

                            <p
                                style={{
                                    marginBottom: "2rem",
                                    color: "#cbd5e1",
                                    fontSize: "1.05rem",
                                    lineHeight: 1.7,
                                    maxWidth: "640px",
                                    textAlign: "center",
                                    marginLeft: "auto",
                                    marginRight: "auto",
                                }}
                            >
                                {slide.description}
                            </p>

                            <div style={{ display: "flex", justifyContent: "center", width: "100%", marginBottom: "1rem" }}>
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
                    </m.div>
                </AnimatePresence>
            </div>

            {/* Pagination Dots */}
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
