"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";
import PerformerCard from "@/components/PerformerCard";

export default function LeczenieCanalowePage() {
    const t = useTranslations('leczeniekanalowe');

    return (
        <main className="section container">
            {/* K-4 priority={true} bo content rozbudowany >15000px — bez priority
                IntersectionObserver z threshold:0.15 nie odpala dla tak długiej strony.
                Patrz K-4 hotfix commit 7ee833d. */}
            <RevealOnScroll priority>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                    <p style={{ textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--color-primary)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                        {t('tagline')}
                    </p>
                    <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", marginBottom: "1rem" }}>{t('title')}</h1>
                    <h2 style={{ fontSize: "1.5rem", color: "var(--color-text-muted)", fontWeight: 400 }}>{t('subtitle')}</h2>
                </div>

                {/* Introduction */}
                <div style={{ maxWidth: "800px", margin: "0 auto", marginBottom: "4rem", lineHeight: "1.8" }}>
                    <p className="mb-4">{t('intro1')}</p>
                    <p className="mb-4">{t('intro2')}</p>
                </div>

                {/* Why Microscope ZEISS Extaro — rozbudowane */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('whyMicroscopeTitle')}</h2>
                    <p className="mb-4" style={{ lineHeight: 1.8 }}>{t('whyMicroscopeIntro')}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginTop: "2rem" }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "1rem", border: "1px solid var(--color-border)" }}>
                                <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem", fontSize: "1.1rem" }}>{t(`advantage${i}Title`)}</h3>
                                <p style={{ color: "var(--color-text-muted)", lineHeight: "1.6" }}>{t(`advantage${i}Text`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* K-4: Lasery PIPS/SWEEPS — mechanizm */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('laserTitle')}</h2>
                    <p className="mb-4" style={{ lineHeight: 1.8 }}>{t('laserIntro')}</p>

                    <h3 style={{ fontSize: "1.3rem", marginTop: "2rem", marginBottom: "1rem", color: "var(--color-primary)" }}>
                        {t('laserMechanismTitle')}
                    </h3>
                    <ol style={{ paddingLeft: 0, listStyle: "none", display: "grid", gap: "1rem" }}>
                        {[1, 2, 3, 4].map(n => (
                            <li key={n} style={{
                                display: "grid",
                                gridTemplateColumns: "36px 1fr",
                                gap: "0.875rem",
                                padding: "1rem 1.25rem",
                                border: "1px solid var(--color-surface-hover)",
                                borderRadius: "0.75rem",
                                background: "rgba(255,255,255,0.02)",
                            }}>
                                <div style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: "50%",
                                    background: "var(--color-primary)",
                                    color: "var(--color-bg, #000)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 700,
                                    fontSize: "0.85rem",
                                }}>{n}</div>
                                <p style={{ margin: 0, lineHeight: 1.6, color: "var(--color-text-muted)" }}>
                                    {t(`laserMechanism${n}`)}
                                </p>
                            </li>
                        ))}
                    </ol>

                    <div style={{
                        marginTop: "2rem",
                        padding: "1.5rem",
                        background: "var(--color-surface)",
                        borderRadius: "1rem",
                        border: "1px solid var(--color-primary)",
                    }}>
                        <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem", fontSize: "1.15rem" }}>
                            {t('laserNdYagTitle')}
                        </h3>
                        <p style={{ margin: 0, lineHeight: 1.7 }}>{t('laserNdYagDesc')}</p>
                    </div>
                </div>

                {/* Process — 7 kroków */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('processTitle')}</h2>
                    <p className="mb-4" style={{ lineHeight: 1.8 }}>{t('processIntro')}</p>
                    <div style={{ maxWidth: "900px", margin: "2rem auto 0" }}>
                        {[1, 2, 3, 4, 5, 6, 7].map(i => (
                            <div key={i} style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", alignItems: "flex-start" }}>
                                <div style={{
                                    minWidth: "40px",
                                    height: "40px",
                                    borderRadius: "50%",
                                    background: "var(--color-primary)",
                                    color: "#000",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: "bold",
                                    flexShrink: 0,
                                }}>{i}</div>
                                <div>
                                    <h3 style={{ fontSize: "1.1rem", marginBottom: "0.4rem", color: "var(--color-primary)" }}>
                                        {t(`step${i}Title`)}
                                    </h3>
                                    <p style={{ color: "var(--color-text-muted)", lineHeight: "1.65" }}>{t(`step${i}Text`)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* K-4: Re-Endo deep dive */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('reEndoTitle')}</h2>
                    <p className="mb-4" style={{ lineHeight: 1.8 }}>{t('reEndoIntro')}</p>
                    <div style={{
                        padding: "1.5rem",
                        background: "var(--color-surface)",
                        borderRadius: "1rem",
                        borderLeft: "3px solid var(--color-primary)",
                        marginTop: "1.5rem",
                    }}>
                        <p style={{ margin: 0, lineHeight: 1.75, fontStyle: "italic" }}>{t('reEndoCaseDesc')}</p>
                    </div>
                </div>

                {/* K-4: Training references — authority */}
                <div style={{
                    marginBottom: "4rem",
                    padding: "var(--spacing-lg)",
                    background: "var(--color-surface)",
                    borderRadius: "1rem",
                    border: "1px solid rgba(var(--color-primary-rgb), 0.25)",
                }}>
                    <h2 style={{ fontSize: "1.5rem", color: "var(--color-primary)", margin: "0 0 1rem 0" }}>
                        {t('trainingTitle')}
                    </h2>
                    <p style={{ margin: 0, lineHeight: 1.75 }}>{t('trainingDesc')}</p>
                </div>

                {/* Pricing */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>{t('pricingTitle')}</h2>
                    <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem" }}>
                        <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>{t('pricingNote')}</p>
                        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "1rem" }}>
                            {['priceRootCanal', 'priceReEndo', 'priceMicroscope'].map(key => (
                                <li key={key} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", gap: "1rem" }}>
                                    <span>{t(`${key}Label`)}</span>
                                    <span style={{ fontWeight: "bold", color: "var(--color-primary)", whiteSpace: "nowrap" }}>{t(`${key}Price`)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* K-4: When tooth not savable — uczciwy cross-link do implantologii */}
                <div style={{
                    marginBottom: "4rem",
                    padding: "var(--spacing-lg)",
                    background: "var(--color-surface)",
                    borderRadius: "1rem",
                    border: "1px solid rgba(var(--color-primary-rgb), 0.25)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                }}>
                    <h2 style={{ fontSize: "1.35rem", color: "var(--color-primary)", margin: 0 }}>
                        {t('whenNoTitle')}
                    </h2>
                    <p style={{ margin: 0, lineHeight: 1.7 }}>{t('whenNoText')}</p>
                    <Link
                        href="/oferta/implantologia"
                        style={{
                            alignSelf: "flex-start",
                            color: "var(--color-primary)",
                            fontWeight: 600,
                            textDecoration: "none",
                        }}
                    >
                        {t('whenNoCta')} →
                    </Link>
                </div>

                {/* FAQ — rozszerzone z 4 → 9 */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>{t('faqTitle')}</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                            <div key={i}>
                                <h3 style={{ fontSize: "1.15rem", color: "var(--color-primary)", marginBottom: "0.5rem", lineHeight: 1.35 }}>
                                    {t(`faqQ${i}`)}
                                </h3>
                                <p style={{ lineHeight: 1.7, color: "var(--color-text-muted)" }}>{t(`faqA${i}`)}</p>
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
