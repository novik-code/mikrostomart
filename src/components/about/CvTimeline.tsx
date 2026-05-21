"use client";

import { useTranslations } from "next-intl";
import { MARCIN_CV } from "@/data/marcin-cv";
import RevealOnScroll from "@/components/RevealOnScroll";

// Vertical CV timeline: rok (left/right alternating na desktop, lewa kolumna na mobile)
// + środkowa linia gold + dot per milestone + content card. SSR-friendly (static HTML).

export default function CvTimeline() {
    const t = useTranslations("oNasBrand");

    return (
        <section
            className="section"
            style={{
                padding: "var(--spacing-xl) 0",
                background: "var(--color-surface)",
                borderTop: "1px solid var(--color-surface-hover)",
                borderBottom: "1px solid var(--color-surface-hover)",
            }}
        >
            <div className="container">
                <RevealOnScroll>
                    <header
                        style={{
                            textAlign: "center",
                            maxWidth: 820,
                            margin: "0 auto var(--spacing-xl)",
                        }}
                    >
                        <p
                            style={{
                                color: "var(--color-primary)",
                                letterSpacing: "0.2em",
                                textTransform: "uppercase",
                                fontSize: "0.85rem",
                                marginBottom: "var(--spacing-sm)",
                            }}
                        >
                            {t("cvEyebrow")}
                        </p>
                        <h2
                            style={{
                                fontSize: "clamp(2rem, 4vw, 2.75rem)",
                                fontWeight: 400,
                                fontFamily: "var(--font-heading)",
                                marginBottom: "var(--spacing-md)",
                                lineHeight: 1.1,
                            }}
                        >
                            {t("cvHeading")}
                        </h2>
                        <p
                            style={{
                                fontSize: "1.05rem",
                                color: "var(--color-text-muted)",
                                lineHeight: 1.6,
                            }}
                        >
                            {t("cvLead")}
                        </p>
                    </header>
                </RevealOnScroll>

                <div className="cv-timeline">
                    {MARCIN_CV.map((m, idx) => {
                        const titleKey = m.titleKey;
                        const descKey = m.descKey;
                        return (
                            <RevealOnScroll key={titleKey} delay={50 + idx * 40}>
                                <div className={`cv-row ${idx % 2 === 0 ? "left" : "right"}`}>
                                    <div className="cv-year">
                                        {m.icon ? <span className="cv-icon">{m.icon}</span> : null}
                                        <span>{m.year}</span>
                                    </div>
                                    <div className="cv-dot" aria-hidden="true" />
                                    <div className="cv-card">
                                        <h3>{t(titleKey)}</h3>
                                        <p>{t(descKey)}</p>
                                    </div>
                                </div>
                            </RevealOnScroll>
                        );
                    })}
                </div>
            </div>

            <style jsx>{`
                .cv-timeline {
                    position: relative;
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 0 var(--spacing-md);
                }
                /* Central line — desktop */
                .cv-timeline::before {
                    content: "";
                    position: absolute;
                    left: 50%;
                    top: 0;
                    bottom: 0;
                    width: 1px;
                    background: linear-gradient(
                        180deg,
                        transparent 0%,
                        var(--color-primary) 10%,
                        var(--color-primary) 90%,
                        transparent 100%
                    );
                    opacity: 0.55;
                    transform: translateX(-50%);
                }
                .cv-row {
                    position: relative;
                    display: grid;
                    grid-template-columns: 1fr 40px 1fr;
                    align-items: center;
                    gap: var(--spacing-md);
                    padding: var(--spacing-sm) 0;
                }
                .cv-row.left .cv-year {
                    grid-column: 1;
                    justify-self: end;
                    text-align: right;
                }
                .cv-row.left .cv-card {
                    grid-column: 3;
                    justify-self: start;
                    text-align: left;
                }
                .cv-row.right .cv-year {
                    grid-column: 3;
                    justify-self: start;
                    text-align: left;
                    order: 3;
                }
                .cv-row.right .cv-card {
                    grid-column: 1;
                    justify-self: end;
                    text-align: right;
                }
                .cv-year {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--color-primary);
                    font-weight: 600;
                    font-size: 0.95rem;
                    letter-spacing: 0.04em;
                }
                .cv-icon {
                    font-size: 1.1rem;
                }
                .cv-dot {
                    grid-column: 2;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: var(--color-primary);
                    border: 2px solid var(--color-surface);
                    box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.18);
                    justify-self: center;
                }
                .cv-card {
                    max-width: 420px;
                    padding: var(--spacing-sm) var(--spacing-md);
                    border: 1px solid var(--color-surface-hover);
                    border-radius: var(--radius-md);
                    background: rgba(255, 255, 255, 0.02);
                }
                .cv-card h3 {
                    margin: 0 0 6px 0;
                    font-size: 1rem;
                    font-weight: 500;
                    color: var(--color-text-main);
                    line-height: 1.35;
                }
                .cv-card p {
                    margin: 0;
                    font-size: 0.88rem;
                    color: var(--color-text-muted);
                    line-height: 1.55;
                }

                /* Mobile: linia po lewej, content single-col */
                @media (max-width: 768px) {
                    .cv-timeline {
                        padding-left: 36px;
                    }
                    .cv-timeline::before {
                        left: 14px;
                        transform: none;
                    }
                    .cv-row,
                    .cv-row.left,
                    .cv-row.right {
                        grid-template-columns: 24px 1fr;
                        gap: var(--spacing-sm);
                        align-items: flex-start;
                    }
                    .cv-row.left .cv-year,
                    .cv-row.right .cv-year {
                        grid-column: 2;
                        justify-self: start;
                        text-align: left;
                        order: 1;
                        margin-bottom: 4px;
                    }
                    .cv-row.left .cv-card,
                    .cv-row.right .cv-card {
                        grid-column: 2;
                        justify-self: start;
                        text-align: left;
                        order: 2;
                        max-width: 100%;
                    }
                    .cv-dot {
                        grid-column: 1;
                        grid-row: 1 / span 2;
                        justify-self: center;
                        margin-top: 6px;
                    }
                }
            `}</style>
        </section>
    );
}
