"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";
import PerformerCard from "@/components/PerformerCard";

export default function ProtetykaPage() {
    const t = useTranslations('protetyka');

    return (
        <main className="section container">
            <RevealOnScroll priority>
                {/* Hero */}
                <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                    <p style={{ textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--color-primary)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>{t('tagline')}</p>
                    <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", marginBottom: "1rem" }}>{t('title')}</h1>
                    <h2 style={{ fontSize: "1.5rem", color: "var(--color-text-muted)", fontWeight: 400 }}>{t('subtitle')}</h2>
                </div>

                <div style={{ maxWidth: "800px", margin: "0 auto", marginBottom: "4rem", lineHeight: "1.8" }}>
                    <p className="mb-4">{t('intro1')}</p>
                    <p className="mb-4">{t('intro2')}</p>
                    <p className="mb-4">{t('intro3')}</p>
                </div>

                {/* Filozofia */}
                <div style={{ marginBottom: "4rem", background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", border: "1px solid var(--color-primary)" }}>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem", color: "var(--color-primary)" }}>{t('philosophyTitle')}</h2>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('philosophyText1')}</p>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('philosophyText2')}</p>
                    <p style={{ lineHeight: 1.8 }}>{t('philosophyText3')}</p>
                </div>

                {/* Types of prosthetics (rozbudowane 4 → 6 typów) */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('typesTitle')}</h2>
                    <p style={{ marginBottom: "2rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('typesIntro')}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "1rem", border: "1px solid var(--color-border)" }}>
                                <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem", fontSize: "1.1rem" }}>{t(`type${i}Title`)}</h3>
                                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.75rem", fontStyle: "italic" }}>{t(`type${i}Meta`)}</p>
                                <p style={{ color: "var(--color-text-muted)", lineHeight: "1.6" }}>{t(`type${i}Text`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Materiały premium */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('materialsTitle')}</h2>
                    <p style={{ marginBottom: "2rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('materialsIntro')}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{
                                background: "var(--color-surface)",
                                padding: "1.5rem",
                                borderRadius: "0.75rem",
                                border: i === 1 ? "2px solid var(--color-primary)" : "1px solid var(--color-surface-hover)",
                                position: "relative",
                            }}>
                                {i === 1 && (
                                    <span style={{
                                        position: "absolute",
                                        top: "-12px",
                                        right: "16px",
                                        background: "var(--color-primary)",
                                        color: "var(--color-background)",
                                        fontSize: "0.7rem",
                                        padding: "0.25rem 0.6rem",
                                        borderRadius: "1rem",
                                        fontWeight: 600,
                                        letterSpacing: "0.05em",
                                        textTransform: "uppercase",
                                    }}>{t('materialBadge')}</span>
                                )}
                                <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem", fontSize: "1.05rem" }}>{t(`material${i}Title`)}</h3>
                                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.75rem", fontStyle: "italic" }}>{t(`material${i}Meta`)}</p>
                                <p style={{ color: "var(--color-text-muted)", lineHeight: "1.6", fontSize: "0.9rem" }}>{t(`material${i}Text`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Digital workflow rozbudowane — 5 kroków */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('digitalTitle')}</h2>
                    <p style={{ marginBottom: "2rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('digitalIntro')}</p>
                    <ol style={{ paddingLeft: 0, listStyle: "none", display: "grid", gap: "1rem" }}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <li key={i} style={{
                                display: "grid",
                                gridTemplateColumns: "auto 1fr",
                                gap: "1rem",
                                background: "var(--color-surface)",
                                padding: "1.25rem",
                                borderRadius: "0.5rem",
                            }}>
                                <div style={{ minWidth: "36px", height: "36px", borderRadius: "50%", background: "var(--color-primary)", color: "var(--color-background)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{i}</div>
                                <div>
                                    <strong style={{ color: "var(--color-text-main)", display: "block", marginBottom: "0.25rem" }}>{t(`digitalStep${i}Title`)}</strong>
                                    <span style={{ color: "var(--color-text-muted)", lineHeight: 1.6, fontSize: "0.95rem" }}>{t(`digitalStep${i}Text`)}</span>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* Decision tree */}
                <div style={{ marginBottom: "4rem", background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem" }}>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>{t('decisionTitle')}</h2>
                    <p style={{ marginBottom: "1.5rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('decisionIntro')}</p>
                    <ul style={{ paddingLeft: 0, listStyle: "none", display: "grid", gap: "0.75rem" }}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <li key={i} style={{
                                background: "var(--color-background)",
                                padding: "1rem",
                                borderRadius: "0.5rem",
                                borderLeft: "3px solid var(--color-primary)",
                                lineHeight: 1.7,
                            }}>
                                <strong style={{ color: "var(--color-primary)" }}>{t(`decisionCase${i}When`)}</strong>{" → "}
                                {t(`decisionCase${i}Then`)}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Trwałość i serwis */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('durabilityTitle')}</h2>
                    <p style={{ marginBottom: "1.5rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('durabilityIntro')}</p>
                    <ul style={{ paddingLeft: "1.5rem", lineHeight: 1.8, listStyleType: "disc" }}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <li key={i} style={{ marginBottom: "0.5rem" }}>{t(`durability${i}`)}</li>
                        ))}
                    </ul>
                </div>

                {/* Marcin's expertise */}
                <div style={{ marginBottom: "4rem", background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", borderTop: "3px solid var(--color-primary)" }}>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>{t('expertiseTitle')}</h2>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('expertiseText1')}</p>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('expertiseText2')}</p>
                    <p style={{ lineHeight: 1.8 }}>{t('expertiseText3')}</p>
                </div>

                {/* Cross-link (rozbudowany — 3 destinations) */}
                <div style={{
                    marginBottom: "4rem",
                    padding: "var(--spacing-lg)",
                    background: "var(--color-surface)",
                    borderRadius: "1rem",
                    border: "1px solid var(--color-primary)",
                }}>
                    <h3 style={{ fontSize: "1.35rem", color: "var(--color-primary)", marginBottom: "0.5rem" }}>
                        {t('crossLinkTitle')}
                    </h3>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.7 }}>{t('crossLinkDesc')}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                        <Link href="/oferta/implantologia" style={{ color: "var(--color-primary)", fontWeight: 600 }}>{t('crossLinkCta')} →</Link>
                        <Link href="/oferta/leczenie-kanalowe" style={{ color: "var(--color-primary)", fontWeight: 600 }}>{t('crossLinkEndo')} →</Link>
                        <Link href="/oferta/stomatologia-estetyczna" style={{ color: "var(--color-primary)", fontWeight: 600 }}>{t('crossLinkEstetyczna')} →</Link>
                    </div>
                </div>

                {/* FAQ rozbudowa 4→9 */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>{t('faqTitle')}</h2>
                    <div className="space-y-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                            <div key={i} style={{ marginBottom: "1.5rem" }}>
                                <h3 style={{ fontSize: "1.2rem", color: "var(--color-primary)", marginBottom: "0.5rem" }}>{t(`faqQ${i}`)}</h3>
                                <p style={{ lineHeight: 1.7 }}>{t(`faqA${i}`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <PerformerCard doctor="marcin" />
                {/* CTA — Umów wizytę */}
                <div style={{ textAlign: "center", marginTop: "4rem" }}>
                    <Link href="/kontakt" className="btn-primary" style={{ padding: "1rem 3rem", fontSize: "1.2rem" }}>{t('cta')}</Link>
                </div>
            </RevealOnScroll>
        </main>
    );
}
