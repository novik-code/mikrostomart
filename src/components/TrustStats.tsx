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

import { useState, useRef, useEffect } from "react";
import { motion, useInView, animate } from "framer-motion";
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
// ─────────────────────────────────────────────────────────────
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.3 });
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        if (!inView) return;
        const controls = animate(0, value, {
            duration: 1.8,
            ease: "easeOut",
            onUpdate: (n) => setDisplay(Math.round(n)),
        });
        return () => controls.stop();
    }, [inView, value]);

    return (
        <span ref={ref}>
            {display.toLocaleString("pl-PL").replace(/,/g, " ")}{suffix}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────
// TrustCard — pojedyncza karta z animowanym hover (shine + lift + glow + pulse)
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
        <motion.div
            className="trust-card"
            whileHover={{
                y: -8,
                transition: { duration: 0.3, ease: "easeOut" },
            }}
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
                transition: "border-color 0.4s ease, box-shadow 0.4s ease",
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
                    <motion.div
                        whileHover={{ scale: 1.08 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        style={{
                            fontSize: "clamp(2rem, 5vw, 3rem)",
                            fontWeight: 700,
                            color: "var(--color-primary)",
                            fontFamily: "var(--font-heading)",
                            lineHeight: 1,
                            marginBottom: "var(--spacing-xs)",
                            fontVariantNumeric: "tabular-nums",
                            display: "inline-block",
                        }}
                    >
                        <AnimatedCounter value={props.value!} />
                    </motion.div>
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
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────
// AccreditationPill — text pill linkujący do internal /akredytacje/[slug]
// K-2b: zmiana z external href + tooltip na internal Link + tooltip z fullName
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
                {hover && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            position: "absolute",
                            bottom: "calc(100% + 10px)",
                            left: "50%",
                            transform: "translateX(-50%)",
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
                        }}
                    >
                        {tooltip}
                    </motion.div>
                )}
            </div>
        </Link>
    );
}

// ─────────────────────────────────────────────────────────────
// LiveIndicator — zielona pulsująca kropka + tooltip pokazujący source + timestamp
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
            {hover && (
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        padding: "10px 14px",
                        background: "var(--color-surface, #1a1a22)",
                        color: "var(--color-text-main, #e8e6e3)",
                        border: "1px solid var(--color-surface-hover)",
                        borderRadius: 8,
                        fontSize: "0.78rem",
                        fontWeight: 400,
                        letterSpacing: 0,
                        textTransform: "none",
                        whiteSpace: "normal",
                        minWidth: 260,
                        maxWidth: 360,
                        textAlign: "center",
                        zIndex: 50,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                        pointerEvents: "none",
                        lineHeight: 1.4,
                    }}
                >
                    {tooltip}
                </motion.div>
            )}
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
            value: stats.marcin.implants,
            label: t("card1Label"),
            subtitle: t("card1Subtitle"),
            icon: "🦷",
        },
        {
            // K-2c fix (2026-05-20): leczenia kanałowe = cała klinika (nie tylko
            // Marcin), bo endodoncja prowadzona też przez Ilonę Piechaczek i in.
            // Karty 1 (implanty) + 3 (pacjenci) zostają jako Marcin osobiście —
            // tam jego udział jest dominujący (94% / 69%). W endo udział to
            // 81% Marcin + 17% Ilona — sensowniej pokazać klinikę.
            value: stats.clinic.rootCanals,
            label: t("card2Label"),
            subtitle: t("card2Subtitle"),
            icon: "🔬",
        },
        {
            value: stats.marcin.patients,
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
                    left: -100%;
                    width: 60%;
                    height: 100%;
                    background: linear-gradient(
                        110deg,
                        transparent 0%,
                        rgba(220, 177, 74, 0) 30%,
                        rgba(220, 177, 74, 0.18) 50%,
                        rgba(220, 177, 74, 0) 70%,
                        transparent 100%
                    );
                    transform: skewX(-15deg);
                    transition: left 0.9s cubic-bezier(0.22, 1, 0.36, 1);
                    pointer-events: none;
                    z-index: 0;
                }
                .trust-card:hover::before {
                    left: 200%;
                }
                .trust-card:hover {
                    border-color: var(--color-primary) !important;
                    box-shadow:
                        0 12px 32px rgba(220, 177, 74, 0.18),
                        0 0 0 1px var(--color-primary);
                }
            `}</style>
        </section>
    );
}
