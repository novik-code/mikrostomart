"use client";

// TrustStats — sekcja above-the-fold (po HeroSlideshow, przed ValuesSection)
// eksponująca konkretne liczby Marcina Nowosielskiego + jego credentials academic.
//
// K-2 decyzje Marcina (2026-05-20):
// - Opcja D (Marcin-personalized): liczby Marcina osobiście (1085 implantów / 1861
//   leczeń kanałowych / 4295 pacjentów / M.Sc. RWTH)
// - Narracja "Marcin to element układanki" — subtitles odwołują się do Mikrostomart /
//   mikroskopu / RWTH (nie eksplicit "osobiście Marcin")
// - Akredytacje WIDOCZNE (nie marginalne) — 5 pill badges z hover tooltip + external links
// - Mobile 2x2 grid

import { useState, useRef, useEffect } from "react";
import { motion, useInView, animate } from "framer-motion";
import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/RevealOnScroll";
import { CLINIC_STATS } from "@/data/clinic-stats";

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
// Accreditation pill — text badge z hover tooltip + optional external link
// ─────────────────────────────────────────────────────────────
interface AccreditationProps {
    label: string;
    tooltip: string;
    href?: string;
}

function AccreditationPill({ label, tooltip, href }: AccreditationProps) {
    const [hover, setHover] = useState(false);
    const content = (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={() => setHover((h) => !h)} // mobile toggle
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
                cursor: href ? "pointer" : "default",
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
    );

    if (href) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                {content}
            </a>
        );
    }
    return content;
}

// ─────────────────────────────────────────────────────────────
// TrustStats — main component
// ─────────────────────────────────────────────────────────────
export default function TrustStats() {
    const t = useTranslations("trustStats");

    const cards = [
        {
            value: CLINIC_STATS.marcin.implants,
            label: t("card1Label"), // "implantów wszczepionych"
            subtitle: t("card1Subtitle"), // "w Mikrostomart od 2016"
            icon: "🦷",
        },
        {
            value: CLINIC_STATS.marcin.rootCanals,
            label: t("card2Label"), // "leczeń kanałowych"
            subtitle: t("card2Subtitle"), // "pod mikroskopem ZEISS"
            icon: "🔬",
        },
        {
            value: CLINIC_STATS.marcin.patients,
            label: t("card3Label"), // "pacjentów"
            subtitle: t("card3Subtitle"), // "w Mikrostomart od 2016"
            icon: "👥",
        },
        {
            // Karta 4 — credential zamiast liczby
            isCredential: true,
            credentialMain: t("card4Main"), // "Master of Science"
            credentialLine2: t("card4Line2"), // "in Lasers in Dentistry"
            credentialLine3: t("card4Line3"), // "RWTH Aachen University"
            credentialFooter: t("card4Footer"), // "2. w Polsce"
            icon: "🎓",
        },
    ];

    const accreditations = [
        {
            label: "PTE",
            tooltip: t("accPteTooltip"),
            href: "https://endodoncja.pl/20-lecie-pte/#tab-id-2",
        },
        {
            label: "ESE",
            tooltip: t("accEseTooltip"),
            href: "https://www.e-s-e.eu/",
        },
        {
            label: "PTSL",
            tooltip: t("accPtslTooltip"),
        },
        {
            label: "RWTH Aachen",
            tooltip: t("accRwthTooltip"),
            href: "https://www.aalz.de/en/",
        },
        {
            label: "LA&HA",
            tooltip: t("accLahaTooltip"),
            href: "https://www.laserandhealthacademy.com/",
        },
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
                            marginBottom: "var(--spacing-lg)",
                            maxWidth: "720px",
                            margin: "0 auto var(--spacing-lg)",
                        }}
                    >
                        {t("subheading")}
                    </p>
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
                            <div
                                style={{
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
                                    transition: "transform 0.3s ease, border-color 0.3s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-4px)";
                                    e.currentTarget.style.borderColor = "var(--color-primary)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.borderColor = "var(--color-surface-hover)";
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: "1.5rem",
                                        marginBottom: "var(--spacing-xs)",
                                        opacity: 0.7,
                                    }}
                                >
                                    {card.icon}
                                </div>

                                {card.isCredential ? (
                                    <>
                                        <div
                                            style={{
                                                fontSize: "clamp(1.1rem, 2vw, 1.4rem)",
                                                fontWeight: 600,
                                                color: "var(--color-primary)",
                                                fontFamily: "var(--font-heading)",
                                                lineHeight: 1.2,
                                                marginBottom: "4px",
                                            }}
                                        >
                                            {card.credentialMain}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "0.85rem",
                                                color: "var(--color-text-main)",
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            {card.credentialLine2}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "0.85rem",
                                                color: "var(--color-text-main)",
                                                lineHeight: 1.4,
                                                marginBottom: "var(--spacing-xs)",
                                            }}
                                        >
                                            {card.credentialLine3}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "0.75rem",
                                                color: "var(--color-text-muted)",
                                                letterSpacing: "0.05em",
                                                textTransform: "uppercase",
                                            }}
                                        >
                                            {card.credentialFooter}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div
                                            style={{
                                                fontSize: "clamp(2rem, 5vw, 3rem)",
                                                fontWeight: 700,
                                                color: "var(--color-primary)",
                                                fontFamily: "var(--font-heading)",
                                                lineHeight: 1,
                                                marginBottom: "var(--spacing-xs)",
                                                fontVariantNumeric: "tabular-nums",
                                            }}
                                        >
                                            <AnimatedCounter value={card.value!} />
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "0.95rem",
                                                color: "var(--color-text-main)",
                                                fontWeight: 500,
                                                marginBottom: "4px",
                                            }}
                                        >
                                            {card.label}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "0.78rem",
                                                color: "var(--color-text-muted)",
                                                letterSpacing: "0.02em",
                                            }}
                                        >
                                            {card.subtitle}
                                        </div>
                                    </>
                                )}
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>

                {/* Accreditation pills row */}
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
                                <AccreditationPill key={acc.label} {...acc} />
                            ))}
                        </div>
                    </div>
                </RevealOnScroll>
            </div>

            <style jsx>{`
                @media (min-width: 768px) {
                    .trust-stats-grid {
                        grid-template-columns: repeat(4, 1fr) !important;
                    }
                }
            `}</style>
        </section>
    );
}
