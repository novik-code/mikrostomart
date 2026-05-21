"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";
import PerformerCard from "@/components/PerformerCard";

export default function StomatologiaEstetycznaPage() {
    const t = useTranslations('estetyczna');

    return (
        <main className="section container">
            {/* K-4 hotfix lesson (commit 7ee833d): strony 1500+ słów MUSZĄ mieć
                <RevealOnScroll priority> na page-level — bez tego IntersectionObserver
                threshold:0.15 dla ~12000px elementu w viewport 800px nie odpala. */}
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

                {/* Filozofia projektowania — Marcin's voice "nie bilbordy, naturalny uśmiech" */}
                <div style={{ marginBottom: "4rem", background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", border: "1px solid var(--color-primary)" }}>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem", color: "var(--color-primary)" }}>{t('philosophyTitle')}</h2>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('philosophyText1')}</p>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('philosophyText2')}</p>
                    <p style={{ lineHeight: 1.8 }}>{t('philosophyText3')}</p>
                </div>

                {/* DSD Workflow — 4 numbered steps */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('dsdTitle')}</h2>
                    <p style={{ marginBottom: "2rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('dsdIntro')}</p>
                    <ol style={{ paddingLeft: 0, listStyle: "none", display: "grid", gap: "1.25rem" }}>
                        {[1, 2, 3, 4].map(i => (
                            <li key={i} style={{
                                display: "grid",
                                gridTemplateColumns: "auto 1fr",
                                gap: "1rem",
                                alignItems: "start",
                                background: "var(--color-surface)",
                                padding: "1.5rem",
                                borderRadius: "0.75rem",
                                border: "1px solid var(--color-surface-hover)",
                            }}>
                                <span style={{
                                    width: "44px",
                                    height: "44px",
                                    borderRadius: "50%",
                                    background: "var(--color-primary)",
                                    color: "var(--color-background)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 700,
                                    fontSize: "1.1rem",
                                    flexShrink: 0,
                                }}>{i}</span>
                                <div>
                                    <h3 style={{ fontSize: "1.1rem", color: "var(--color-primary)", margin: "0 0 0.5rem 0" }}>{t(`dsdStep${i}Title`)}</h3>
                                    <p style={{ margin: 0, lineHeight: 1.7, color: "var(--color-text-muted)" }}>{t(`dsdStep${i}Text`)}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* Existing Services Grid (4 cards) — TEKSTY ROZBUDOWANE */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>{t('servicesTitle')}</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "1rem", border: "1px solid var(--color-border)" }}>
                                <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem", fontSize: "1.1rem" }}>{t(`service${i}Title`)}</h3>
                                <p style={{ color: "var(--color-text-muted)", lineHeight: "1.6" }}>{t(`service${i}Text`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Materiały premium — porównanie 4 opcji */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('materialsTitle')}</h2>
                    <p style={{ marginBottom: "2rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('materialsIntro')}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{
                                background: "var(--color-surface)",
                                padding: "1.5rem",
                                borderRadius: "0.75rem",
                                border: i === 3 ? "2px solid var(--color-primary)" : "1px solid var(--color-surface-hover)",
                                position: "relative",
                            }}>
                                {i === 3 && (
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
                                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.75rem", fontStyle: "italic" }}>{t(`material${i}Subtitle`)}</p>
                                <p style={{ color: "var(--color-text-muted)", lineHeight: "1.6", fontSize: "0.9rem", marginBottom: "0.5rem" }}>{t(`material${i}Text`)}</p>
                                <p style={{ fontSize: "0.8rem", color: "var(--color-primary)", margin: 0 }}>{t(`material${i}WhenToUse`)}</p>
                            </div>
                        ))}
                    </div>
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

                {/* Workflow zabiegu — 6 numbered kroków */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('workflowTitle')}</h2>
                    <p style={{ marginBottom: "2rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('workflowIntro')}</p>
                    <ol style={{ paddingLeft: 0, listStyle: "none", display: "grid", gap: "1rem" }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <li key={i} style={{
                                display: "grid",
                                gridTemplateColumns: "auto 1fr",
                                gap: "1rem",
                                alignItems: "start",
                                padding: "1.25rem",
                                background: "var(--color-surface)",
                                borderRadius: "0.5rem",
                            }}>
                                <span style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    background: "var(--color-primary)",
                                    color: "var(--color-background)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 700,
                                    fontSize: "0.9rem",
                                    flexShrink: 0,
                                }}>{i}</span>
                                <div>
                                    <strong style={{ color: "var(--color-text-main)", display: "block", marginBottom: "0.25rem" }}>{t(`workflowStep${i}Title`)}</strong>
                                    <span style={{ color: "var(--color-text-muted)", lineHeight: 1.6, fontSize: "0.95rem" }}>{t(`workflowStep${i}Text`)}</span>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* Wybielanie — 2 ścieżki */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('whiteningTitle')}</h2>
                    <p style={{ marginBottom: "2rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('whiteningIntro')}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
                        {['inOffice', 'home'].map(key => (
                            <div key={key} style={{
                                background: "var(--color-surface)",
                                padding: "1.5rem",
                                borderRadius: "0.75rem",
                                border: "1px solid var(--color-surface-hover)",
                            }}>
                                <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem" }}>{t(`whitening_${key}_title`)}</h3>
                                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.75rem", fontStyle: "italic" }}>{t(`whitening_${key}_meta`)}</p>
                                <p style={{ lineHeight: 1.7, marginBottom: "0.75rem" }}>{t(`whitening_${key}_text`)}</p>
                                <p style={{ fontSize: "0.85rem", color: "var(--color-primary)", margin: 0 }}>{t(`whitening_${key}_best`)}</p>
                            </div>
                        ))}
                    </div>
                    <p style={{ color: "var(--color-text-muted)", lineHeight: 1.7, fontSize: "0.95rem" }}>{t('whiteningSensitivity')}</p>
                </div>

                {/* Marcin's expertise — laser w restauracjach (z art 009) */}
                <div style={{ marginBottom: "4rem", background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", borderTop: "3px solid var(--color-primary)" }}>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>{t('expertiseTitle')}</h2>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('expertiseText1')}</p>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('expertiseText2')}</p>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('expertiseText3')}</p>
                    <p style={{ lineHeight: 1.8 }}>{t('expertiseText4')}</p>
                </div>

                {/* Trwałość i pielęgnacja */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('durabilityTitle')}</h2>
                    <p style={{ marginBottom: "1.5rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('durabilityIntro')}</p>
                    <ul style={{ paddingLeft: "1.5rem", lineHeight: 1.8, listStyleType: "disc" }}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <li key={i} style={{ marginBottom: "0.5rem" }}>{t(`durabilityTip${i}`)}</li>
                        ))}
                    </ul>
                </div>

                {/* Pricing — ZACHOWANE z baseline */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>{t('pricingTitle')}</h2>
                    <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem" }}>
                        <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>{t('pricingNote')}</p>
                        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "1rem" }}>
                            {['veneers', 'whitening', 'bonding', 'crown'].map(key => (
                                <li key={key} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
                                    <span>{t(`price_${key}_label`)}</span>
                                    <span style={{ fontWeight: "bold", color: "var(--color-primary)" }}>{t(`price_${key}_value`)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Cross-link */}
                <div style={{ marginBottom: "4rem", background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", border: "1px solid var(--color-primary)" }}>
                    <h3 style={{ fontSize: "1.3rem", color: "var(--color-primary)", marginBottom: "0.75rem" }}>{t('crossLinkTitle')}</h3>
                    <p style={{ lineHeight: 1.8, marginBottom: "1rem" }}>{t('crossLinkText')}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                        <Link href="/oferta/protetyka" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                            {t('crossLinkProtetyka')} →
                        </Link>
                        <Link href="/oferta/leczenie-kanalowe" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                            {t('crossLinkEndo')} →
                        </Link>
                    </div>
                </div>

                {/* FAQ — rozbudowa 4 → 9 */}
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
