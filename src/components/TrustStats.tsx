"use client";

// TrustStats — sekcja above-the-fold (po HeroSlideshow, przed ValuesSection)
// eksponująca konkretne liczby Marcina Nowosielskiego + jego credentials academic.
//
// K-2 decyzje Marcina (2026-05-20):
// - Opcja D (Marcin-personalized): liczby Marcina osobiście (1085 implantów / 1861
//   leczeń kanałowych / 4295 pacjentów / M.Sc. RWTH)
// - Narracja "Marcin to element układanki" — subtitles odwołują się do Mikrostomart /
//   mikroskopu / RWTH (nie eksplicit "osobiście Marcin")
// - Akredytacje WIDOCZNE (nie marginalne) — 5 pill badges
// - Mobile 2x2 grid
//
// K-2b decyzje Marcina (2026-05-20 EOD):
// - Subheading dłuższy z lek. dent. + M.Sc. + małżonka Elżbieta
// - Karta 4: "Master of Science (2021)" + "2. w Polsce, najmłodszy, z wyróżnieniem"
// - Akredytacje pillsy linkują do wewnętrznych /akredytacje/[slug] landing pages
//   (nie external) — landingi mogą dalej linkować do webarchive snapshots
// - Animacja kart hover: gold shine sweep + lift + gold glow + counter pulse
//
// K-2c (2026-05-20 LATE):
// - Real-time stats z Prodentis API (endpoint /api/clinic-stats, ISR cache 1h)
// - Fallback do hardcoded src/data/clinic-stats.ts gdy Prodentis down
// - LIVE indicator: pulsing green dot + tooltip pokazujący ostatni update + source
// - RODO: dane TYLKO agregowane (counts), brak PII
//
// Option B perf 2026-05-21:
// - Usunięto framer-motion (motion + useInView + animate + motion.div whileHover).
// - AnimatedCounter: vanilla IntersectionObserver + requestAnimationFrame.
// - TrustCard hover: CSS-only transition (z .trust-card:hover w <style jsx global>).
// - LiveIndicator/AccreditationPill tooltips: CSS opacity transition triggered by
//   hover state (zachowane fade-in efect bez Framer Motion).

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";
import { CLINIC_STATS } from "@/data/clinic-stats";

// ─────────────────────────────────────────────────────────────
// LiveStats — kontrakt z /api/clinic-stats (matches LiveClinicStats z lib)
// ─────────────────────────────────────────────────────────────
interface LiveStats {
    lastUpdated: string;
    source: "live" | "partial" | "fallback";
    foundedYear: number;
    yearsActive: number;
    marcin: typeof CLINIC_STATS.marcin;
    clinic: typeof CLINIC_STATS.clinic;
}

function buildInitialLiveStats(): LiveStats {
    return {
        lastUpdated: new Date().toISOString(),
        source: "fallback",
        foundedYear: CLINIC_STATS.foundedYear,
        yearsActive: CLINIC_STATS.yearsActive,
        marcin: CLINIC_STATS.marcin,
        clinic: CLINIC_STATS.clinic,
    };
}

// ─────────────────────────────────────────────────────────────
// AnimatedCounter — counts from 0 to target when scrolled into view
// Option B 2026-05-21: vanilla IntersectionObserver + requestAnimationFrame
// (zamiast Framer Motion useInView + animate). Tree-shake framer-motion z chunk.
// ─────────────────────────────────────────────────────────────
function AnimatedCounter({ value }: { value: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const [display, setDisplay] = useState(0);
    const startedRef = useRef(false);

    useEffect(() => {
        const node = ref.current;
        if (!node || startedRef.current) return;
        if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
            setDisplay(value);
            startedRef.current = true;
            return;
        }
        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting && !startedRef.current) {
                        startedRef.current = true;
                        io.disconnect();
                        // requestAnimationFrame counter — 1.8s ease-out
                        const start = performance.now();
                        const duration = 1800;
                        const step = (now: number) => {
                            const elapsed = now - start;
                            const t = Math.min(1, elapsed / duration);
                            // easeOutQuint dla snappy finish
                            const eased = 1 - Math.pow(1 - t, 5);
                            setDisplay(Math.round(value * eased));
                            if (t < 1) requestAnimationFrame(step);
                        };
                        requestAnimationFrame(step);
                    }
                }
            },
            { threshold: 0.3 }
        );
        io.observe(node);
        return () => io.disconnect();
    }, [value]);

    return (
        <span ref={ref}>
            {display.toLocaleString("pl-PL").replace(/,/g, " ")}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────
// TrustCard — pojedyncza karta z CSS hover (shine sweep + lift + glow + counter scale)
// Option B: zamieniono motion.div whileHover → CSS hover transitions
// ─────────────────────────────────────────────────────────────
interface CardProps {
    icon: string;
    isCredential?: boolean;
    value?: number;
    label?: string;
    subtitle?: string;
    credentialMain?: string;
    credentialLine2?: string;
    credentialLine3?: string;
    credentialFooter?: string;
}

function TrustCard(props: CardProps) {
    return (
        <div
            className="trust-card"
            style={{
                position: "relative",
                padding: "var(--spacing-md)",
                border: "1px solid var(--color-surface-hover)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface, rgba(255,255,255,0.02))",
                textAlign: "center",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                minHeight: "180px",
                overflow: "hidden",
                transition: "transform 0.3s ease, border-color 0.4s ease, box-shadow 0.4s ease",
            }}
        >
            <div
                style={{
                    fontSize: "1.5rem",
                    marginBottom: "var(--spacing-xs)",
                    opacity: 0.7,
                    position: "relative",
                    zIndex: 1,
                }}
            >
                {props.icon}
            </div>

            {props.isCredential ? (
                <div style={{ position: "relative", zIndex: 1 }}>
                    <div
                        style={{
                            fontSize: "clamp(1.05rem, 1.9vw, 1.35rem)",
                            fontWeight: 600,
                            color: "var(--color-primary)",
                            fontFamily: "var(--font-heading)",
                            lineHeight: 1.2,
                            marginBottom: "4px",
                        }}
                    >
                        {props.credentialMain}
                    </div>
                    <div
                        style={{
                            fontSize: "0.85rem",
                            color: "var(--color-text-main)",
                            lineHeight: 1.4,
                        }}
                    >
                        {props.credentialLine2}
                    </div>
                    <div
                        style={{
                            fontSize: "0.85rem",
                            color: "var(--color-text-main)",
                            lineHeight: 1.4,
                            marginBottom: "var(--spacing-xs)",
                        }}
                    >
                        {props.credentialLine3}
                    </div>
                    <div
                        style={{
                            fontSize: "0.72rem",
                            color: "var(--color-text-muted)",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            lineHeight: 1.4,
                        }}
                    >
                        {props.credentialFooter}
                    </div>
                </div>
            ) : (
                <div style={{ position: "relative", zIndex: 1 }}>
                    <div
                        className="trust-counter"
                        style={{
                            fontSize: "clamp(2rem, 5vw, 3rem)",
                            fontWeight: 700,
                            color: "var(--color-primary)",
                            fontFamily: "var(--font-heading)",
                            lineHeight: 1,
                            marginBottom: "var(--spacing-xs)",
                            fontVariantNumeric: "tabular-nums",
                            display: "inline-block",
                            transition: "transform 0.3s ease",
                        }}
                    >
                        <AnimatedCounter value={props.value!} />
                    </div>
                    <div
                        style={{
                            fontSize: "0.95rem",
                            color: "var(--color-text-main)",
                            fontWeight: 500,
                            marginBottom: "4px",
                        }}
                    >
                        {props.label}
                    </div>
                    <div
                        style={{
                            fontSize: "0.78rem",
                            color: "var(--color-text-muted)",
                            letterSpacing: "0.02em",
                        }}
                    >
                        {props.subtitle}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// AccreditationPill — text pill linkujący do internal /akredytacje/[slug]
// K-2b: zmiana z external href + tooltip na internal Link + tooltip z fullName
// Option B: tooltip CSS opacity transition zamiast motion.div animate
// ─────────────────────────────────────────────────────────────
interface AccreditationProps {
    slug: string;
    label: string;
    tooltip: string;
}

function AccreditationPill({ slug, label, tooltip }: AccreditationProps) {
    const [hover, setHover] = useState(false);
    return (
        <Link
            href={`/akredytacje/${slug}` as any}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={() => setHover(false)}
            style={{ textDecoration: "none" }}
        >
            <div
                style={{
                    position: "relative",
                    padding: "10px 18px",
                    border: "1px solid var(--color-primary)",
                    borderRadius: "999px",
                    color: hover ? "var(--color-bg-main, #0a0a0f)" : "var(--color-primary)",
                    background: hover ? "var(--color-primary)" : "transparent",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                }}
            >
                {label}
                <span
                    style={{
                        position: "absolute",
                        bottom: "calc(100% + 10px)",
                        left: "50%",
                        transform: hover ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(8px)",
                        padding: "10px 14px",
                        background: "var(--color-surface, #1a1a22)",
                        color: "var(--color-text-main, #e8e6e3)",
                        border: "1px solid var(--color-primary)",
                        borderRadius: "8px",
                        fontSize: "0.78rem",
                        fontWeight: 400,
                        letterSpacing: "0",
                        textTransform: "none",
                        whiteSpace: "normal",
                        minWidth: "240px",
                        maxWidth: "320px",
                        textAlign: "center",
                        zIndex: 50,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                        pointerEvents: "none",
                        opacity: hover ? 1 : 0,
                        transition: "opacity 0.2s ease, transform 0.2s ease",
                        display: "block",
                    }}
                >
                    {tooltip}
                </span>
            </div>
        </Link>
    );
}

// ─────────────────────────────────────────────────────────────
// LiveIndicator — zielona pulsująca kropka + tooltip pokazujący source + timestamp
// Option B: tooltip CSS opacity transition zamiast motion.div animate
// ─────────────────────────────────────────────────────────────
function LiveIndicator({ source, lastUpdated, label, tooltip }: {
    source: "live" | "partial" | "fallback";
    lastUpdated: string;
    label: string;
    tooltip: string;
}) {
    const [hover, setHover] = useState(false);
    const isLive = source === "live" || source === "partial";

    // Format time HH:MM in Europe/Warsaw timezone
    let timeStr = "";
    try {
        const d = new Date(lastUpdated);
        timeStr = d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });
    } catch {
        timeStr = "";
    }

    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={() => setHover((h) => !h)}
            style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 12px",
                borderRadius: 999,
                border: `1px solid ${isLive ? "var(--color-success, #10b981)" : "var(--color-text-muted)"}`,
                background: "transparent",
                fontSize: "0.72rem",
                color: isLive ? "var(--color-success, #10b981)" : "var(--color-text-muted)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                cursor: "pointer",
                userSelect: "none",
                marginTop: "var(--spacing-xs)",
            }}
            aria-label={tooltip}
        >
            <span
                style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: isLive ? "var(--color-success, #10b981)" : "var(--color-text-muted)",
                    boxShadow: isLive ? "0 0 8px rgba(16, 185, 129, 0.6)" : "none",
                    animation: isLive ? "trustStatsLivePulse 1.8s ease-in-out infinite" : "none",
                }}
            />
            <span>{label}{timeStr && ` · ${timeStr}`}</span>
            <span
                style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: "50%",
                    transform: hover ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(6px)",
                    padding: "12px 16px",
                    background: "var(--color-surface, #1a1a22)",
                    color: "var(--color-text-main, #e8e6e3)",
                    border: "1px solid var(--color-surface-hover)",
                    borderRadius: 8,
                    fontSize: "0.82rem",
                    fontWeight: 400,
                    letterSpacing: 0,
                    textTransform: "none",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    width: "max-content",
                    minWidth: 280,
                    maxWidth: "min(480px, 92vw)",
                    textAlign: "center",
                    zIndex: 100,
                    boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                    pointerEvents: "none",
                    lineHeight: 1.5,
                    opacity: hover ? 1 : 0,
                    transition: "opacity 0.2s ease, transform 0.2s ease",
                    display: "block",
                }}
            >
                {tooltip}
            </span>
            <style jsx>{`
                @keyframes trustStatsLivePulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.65; transform: scale(1.2); }
                }
            `}</style>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// TrustStats — main component
// ─────────────────────────────────────────────────────────────
export default function TrustStats() {
    const t = useTranslations("trustStats");

    // K-2c: real-time fetch z /api/clinic-stats (Prodentis API z 1h ISR cache).
    // Initial state = hardcoded fallback żeby SSR działało natychmiast bez czekania
    // 2-5s na Prodentis query. Po hydration fetch updatuje values + LIVE indicator.
    const [stats, setStats] = useState<LiveStats>(buildInitialLiveStats);

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000); // 10s safety
        (async () => {
            try {
                const res = await fetch("/api/clinic-stats", { signal: controller.signal });
                if (!res.ok || cancelled) return;
                const data = (await res.json()) as LiveStats;
                if (!cancelled) setStats(data);
            } catch {
                // network / abort / parse error → zostaw initial fallback
            } finally {
                clearTimeout(timeout);
            }
        })();
        return () => {
            cancelled = true;
            controller.abort();
            clearTimeout(timeout);
        };
    }, []);

    const cards: CardProps[] = [
        {
            value: stats.clinic.implants,
            label: t("card1Label"),
            subtitle: t("card1Subtitle"),
            icon: "🦷",
        },
        {
            // K-2c follow-up (2026-05-20 NIGHT): WSZYSTKIE liczby = cała klinika
            // (decyzja Marcina: "to zrobi wieksze wrazenie"). Wcześniej karty
            // 1+3 były Marcin osobiście, teraz spójnie clinic-wide:
            // - implanty: 1277 (klinika) vs 1150 (sam Marcin)
            // - leczenia kanałowe: 2292 (klinika) vs 1861 (sam Marcin)
            // - pacjenci: 6213 (klinika) vs 4305 (sam Marcin)
            value: stats.clinic.rootCanals,
            label: t("card2Label"),
            subtitle: t("card2Subtitle"),
            icon: "🔬",
        },
        {
            value: stats.clinic.patients,
            label: t("card3Label"),
            subtitle: t("card3Subtitle"),
            icon: "👥",
        },
        {
            isCredential: true,
            credentialMain: t("card4Main"),
            credentialLine2: t("card4Line2"),
            credentialLine3: t("card4Line3"),
            credentialFooter: t("card4Footer"),
            icon: "🎓",
        },
    ];

    const accreditations = [
        { slug: "pte", label: "PTE", tooltip: t("accPteTooltip") },
        { slug: "ese", label: "ESE", tooltip: t("accEseTooltip") },
        { slug: "ptsl", label: "PTSL", tooltip: t("accPtslTooltip") },
        { slug: "rwth-aachen", label: "RWTH Aachen", tooltip: t("accRwthTooltip") },
        { slug: "la-ha", label: "LA&HA", tooltip: t("accLahaTooltip") },
    ];

    return (
        <section
            className="section"
            style={{
                padding: "var(--spacing-xl) 0",
                background: "linear-gradient(180deg, transparent 0%, var(--color-surface, rgba(255,255,255,0.02)) 100%)",
            }}
        >
            <div className="container">
                <RevealOnScroll>
                    <h2
                        style={{
                            fontSize: "clamp(1.5rem, 3vw, 2rem)",
                            fontWeight: 400,
                            textAlign: "center",
                            marginBottom: "var(--spacing-md)",
                            color: "var(--color-text-main)",
                            fontFamily: "var(--font-heading)",
                            letterSpacing: "-0.01em",
                        }}
                    >
                        {t("heading")}
                    </h2>
                    <p
                        style={{
                            textAlign: "center",
                            color: "var(--color-text-muted)",
                            fontSize: "0.95rem",
                            lineHeight: 1.6,
                            marginBottom: "var(--spacing-lg)",
                            maxWidth: "780px",
                            margin: "0 auto var(--spacing-lg)",
                        }}
                    >
                        {t("subheading")}
                    </p>
                    <div style={{ textAlign: "center", marginBottom: "var(--spacing-md)" }}>
                        <LiveIndicator
                            source={stats.source}
                            lastUpdated={stats.lastUpdated}
                            label={stats.source === "fallback" ? t("liveLabelOffline") : t("liveLabel")}
                            tooltip={stats.source === "fallback" ? t("liveTooltipOffline") : t("liveTooltip")}
                        />
                    </div>
                </RevealOnScroll>

                {/* 4 cards: 2x2 mobile, 4x1 desktop */}
                <div
                    className="trust-stats-grid"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "var(--spacing-md)",
                        marginBottom: "var(--spacing-xl)",
                    }}
                >
                    {cards.map((card, i) => (
                        <RevealOnScroll key={i} delay={i * 100}>
                            <TrustCard {...card} />
                        </RevealOnScroll>
                    ))}
                </div>

                {/* Accreditation pills row — K-2b linkują do internal pages */}
                <RevealOnScroll delay={400}>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "var(--spacing-sm)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "0.78rem",
                                color: "var(--color-text-muted)",
                                letterSpacing: "0.15em",
                                textTransform: "uppercase",
                                marginBottom: "4px",
                            }}
                        >
                            {t("accreditationsHeading")}
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                justifyContent: "center",
                                gap: "var(--spacing-sm)",
                            }}
                        >
                            {accreditations.map((acc) => (
                                <AccreditationPill key={acc.slug} {...acc} />
                            ))}
                        </div>
                    </div>
                </RevealOnScroll>
            </div>

            <style jsx global>{`
                @media (min-width: 768px) {
                    .trust-stats-grid {
                        grid-template-columns: repeat(4, 1fr) !important;
                    }
                }

                /* K-2b hover animation: gold shine sweep diagonal + glow */
                .trust-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        110deg,
                        transparent 0%,
                        rgba(220, 177, 74, 0) 30%,
                        rgba(220, 177, 74, 0.18) 50%,
                        rgba(220, 177, 74, 0) 70%,
                        transparent 100%
                    );
                    transform: translateX(-100%) skewX(-15deg);
                    transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
                    pointer-events: none;
                    z-index: 0;
                    will-change: transform;
                }
                .trust-card:hover::before {
                    transform: translateX(200%) skewX(-15deg);
                }
                /* Option B perf 2026-05-21: hover lift + counter scale przeniesione z motion
                   (whileHover y:-8 + scale 1.08) na CSS — composited transform. */
                .trust-card:hover {
                    transform: translateY(-8px);
                    border-color: var(--color-primary) !important;
                    box-shadow:
                        0 12px 32px rgba(220, 177, 74, 0.18),
                        0 0 0 1px var(--color-primary);
                }
                .trust-card:hover .trust-counter {
                    transform: scale(1.08);
                }
            `}</style>
        </section>
    );
}
