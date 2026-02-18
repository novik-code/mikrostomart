"use client";

import { Download, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/RevealOnScroll";

export default function RodoPage() {
    const t = useTranslations('rodo');

    return (
        <main style={{ background: "var(--color-background)", minHeight: "100vh" }}>

            {/* Hero Header */}
            <section style={{
                padding: "calc(var(--spacing-xl) + 2rem) 0 var(--spacing-lg)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden"
            }}>
                {/* Subtle gradient overlay */}
                <div style={{
                    position: "absolute", inset: 0,
                    background: "radial-gradient(ellipse at center top, rgba(220,177,74,0.06) 0%, transparent 60%)",
                    pointerEvents: "none"
                }} />
                <div className="container" style={{ position: "relative", zIndex: 1 }}>
                    <RevealOnScroll>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                            <div style={{
                                width: "56px", height: "56px", borderRadius: "50%",
                                background: "rgba(220,177,74,0.1)", border: "1px solid rgba(220,177,74,0.2)",
                                display: "flex", alignItems: "center", justifyContent: "center"
                            }}>
                                <Shield size={28} color="var(--color-primary)" />
                            </div>
                        </div>
                        <p style={{
                            color: "var(--color-primary)", textTransform: "uppercase",
                            letterSpacing: "0.2em", fontSize: "0.8rem", marginBottom: "1rem"
                        }}>
                            {t('tagline')}
                        </p>
                        <h1 style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: "clamp(2rem, 5vw, 3.2rem)", color: "var(--color-text-main)",
                            marginBottom: "1.5rem", lineHeight: 1.2
                        }}>
                            {t('title')}
                        </h1>
                        <a
                            href="/rodo.pdf" target="_blank" rel="noopener noreferrer"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                                background: "var(--color-primary)", color: "#000",
                                padding: "0.75rem 1.5rem", borderRadius: "var(--radius-md)",
                                fontWeight: 600, fontSize: "0.9rem",
                                transition: "var(--transition-fast)", textDecoration: "none"
                            }}
                            className="btn-primary"
                        >
                            <Download size={18} />
                            {t('downloadPdf')}
                        </a>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Content */}
            <section className="container" style={{ maxWidth: "800px", paddingBottom: "var(--spacing-xl)" }}>
                <RevealOnScroll animation="fade-up" delay={100}>
                    <div style={{
                        background: "var(--color-surface)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "var(--radius-lg)",
                        padding: "clamp(2rem, 4vw, 3rem)",
                        boxShadow: "0 4px 30px rgba(0,0,0,0.3)"
                    }}>
                        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "1.5rem" }}>
                            {t('greeting')}
                        </p>
                        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "2.5rem" }}>
                            {t('intro')}
                        </p>

                        {/* Section template — all sections follow this pattern */}
                        <LegalSection number="1" title={t('sec1Title')}>
                            <p dangerouslySetInnerHTML={{ __html: t('sec1Text') }} />
                        </LegalSection>

                        <LegalSection number="2" title={t('sec2Title')}>
                            <p style={{ marginBottom: "0.75rem" }}>{t('sec2Intro')}</p>
                            <ul>
                                <li dangerouslySetInnerHTML={{ __html: t('sec2Li1') }} />
                                <li>{t('sec2Li2')}</li>
                                <li>{t('sec2Li3')}</li>
                            </ul>
                        </LegalSection>

                        <LegalSection number="3" title={t('sec3Title')}>
                            <p>{t('sec3Text')}</p>
                        </LegalSection>

                        <LegalSection number="4" title={t('sec4Title')}>
                            <p style={{ marginBottom: "0.75rem" }}>{t('sec4Intro')}</p>
                            <ul>
                                <li>{t('sec4Li1')}</li>
                                <li>{t('sec4Li2')}</li>
                                <li>{t('sec4Li3')}</li>
                                <li>{t('sec4Li4')}</li>
                                <li>{t('sec4Li5')}</li>
                            </ul>
                        </LegalSection>

                        <LegalSection number="5" title={t('sec5Title')}>
                            <p>{t('sec5Text')}</p>
                        </LegalSection>

                        <LegalSection number="6" title={t('sec6Title')}>
                            <p>{t('sec6Text')}</p>
                        </LegalSection>

                        <LegalSection number="7" title={t('sec7Title')}>
                            <p>{t('sec7Text')}</p>
                        </LegalSection>

                        <LegalSection number="8" title={t('sec8Title')}>
                            <p style={{ marginBottom: "0.75rem" }}>{t('sec8Intro')}</p>
                            <ul>
                                <li>{t('sec8Li1')}</li>
                                <li>{t('sec8Li2')}</li>
                                <li>{t('sec8Li3')}</li>
                                <li>{t('sec8Li4')}</li>
                                <li>{t('sec8Li5')}</li>
                            </ul>
                        </LegalSection>

                        <LegalSection number="9" title={t('sec9Title')}>
                            <p>{t('sec9Text')}</p>
                        </LegalSection>

                        <LegalSection number="10" title={t('sec10Title')} last>
                            <p>{t('sec10Text')}</p>
                        </LegalSection>

                    </div>
                </RevealOnScroll>
            </section>
        </main>
    );
}

/* Reusable section component for consistent styling */
function LegalSection({ number, title, children, last }: { number: string; title: string; children: React.ReactNode; last?: boolean }) {
    return (
        <div style={{ marginBottom: last ? 0 : "2rem", paddingBottom: last ? 0 : "2rem", borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
            <h3 style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.1rem",
                color: "var(--color-primary)",
                marginBottom: "0.75rem",
                display: "flex", alignItems: "center", gap: "0.75rem"
            }}>
                <span style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: "rgba(220,177,74,0.1)", border: "1px solid rgba(220,177,74,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontFamily: "var(--font-sans)", fontWeight: 700,
                    flexShrink: 0
                }}>{number}</span>
                {title}
            </h3>
            <div style={{
                color: "var(--color-text-muted)", lineHeight: 1.8, fontSize: "0.92rem",
                paddingLeft: "calc(28px + 0.75rem)"
            }}>
                {/* Style nested lists and paragraphs */}
                <style>{`
                    .legal-content ul { list-style: none; padding: 0; margin: 0; }
                    .legal-content li {
                        padding: 0.35rem 0 0.35rem 1.25rem;
                        position: relative;
                    }
                    .legal-content li::before {
                        content: '';
                        position: absolute; left: 0; top: 0.85rem;
                        width: 4px; height: 4px; border-radius: 50%;
                        background: var(--color-primary); opacity: 0.5;
                    }
                    .legal-content p { margin-bottom: 0; }
                `}</style>
                <div className="legal-content">
                    {children}
                </div>
            </div>
        </div>
    );
}
