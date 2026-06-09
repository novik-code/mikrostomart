"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";
import PerformerCard from "@/components/PerformerCard";

export default function StomatologiaDziececaPage() {
    const t = useTranslations('dziecieca');

    return (
        <main className="section container">
            <RevealOnScroll priority>
                <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                    <p style={{ textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--color-primary)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>{t('tagline')}</p>
                    <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", marginBottom: "1rem" }}>{t('title')}</h1>
                    <h2 style={{ fontSize: "1.5rem", color: "var(--color-text-muted)", fontWeight: 400 }}>{t('subtitle')}</h2>
                </div>

                <div style={{ maxWidth: "800px", margin: "0 auto", marginBottom: "4rem", lineHeight: "1.8" }}>
                    <p className="mb-4">{t('intro1')}</p>
                    <p className="mb-4">{t('intro2')}</p>
                </div>

                {/* Podejście — approach cards */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('approachTitle')}</h2>
                    <p className="mb-4" style={{ lineHeight: 1.8 }}>{t('approachIntro')}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem", marginTop: "1.5rem" }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "1rem", border: "1px solid var(--color-border)" }}>
                                <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem", fontSize: "1.1rem" }}>{t(`approach${i}Title`)}</h3>
                                <p style={{ color: "var(--color-text-muted)", lineHeight: "1.6" }}>{t(`approach${i}Text`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Profilaktyka */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('prophylaxisTitle')}</h2>
                    <p style={{ lineHeight: 1.8 }}>{t('prophylaxisText')}</p>
                </div>

                {/* Bez bólu / bez wiertła — cross-link do lasera */}
                <div style={{
                    marginBottom: "4rem", padding: "var(--spacing-lg)", background: "var(--color-surface)",
                    borderRadius: "1rem", border: "1px solid rgba(var(--color-primary-rgb), 0.25)",
                    display: "flex", flexDirection: "column", gap: "0.75rem",
                }}>
                    <h2 style={{ fontSize: "1.5rem", color: "var(--color-primary)", margin: 0 }}>{t('painlessTitle')}</h2>
                    <p style={{ margin: 0, lineHeight: 1.75 }}>{t('painlessText')}</p>
                    <Link href="/oferta/laser" style={{ alignSelf: "flex-start", color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>{t('painlessCta')} →</Link>
                </div>

                {/* Zęby mleczne */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('milkTeethTitle')}</h2>
                    <p style={{ lineHeight: 1.8 }}>{t('milkTeethText')}</p>
                </div>

                {/* Higiena u najmłodszych */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('hygieneTitle')}</h2>
                    <p style={{ lineHeight: 1.8 }}>{t('hygieneText')}</p>
                </div>

                {/* Why us / approach */}
                <div style={{ marginBottom: "4rem", padding: "var(--spacing-lg)", background: "var(--color-surface)", borderRadius: "1rem", border: "1px solid rgba(var(--color-primary-rgb), 0.25)" }}>
                    <h2 style={{ fontSize: "1.5rem", color: "var(--color-primary)", margin: "0 0 1rem 0" }}>{t('whyTitle')}</h2>
                    <p style={{ margin: 0, lineHeight: 1.75 }}>{t('whyText')}</p>
                </div>

                {/* FAQ */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>{t('faqTitle')}</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i}>
                                <h3 style={{ fontSize: "1.15rem", color: "var(--color-primary)", marginBottom: "0.5rem", lineHeight: 1.35 }}>{t(`faqQ${i}`)}</h3>
                                <p style={{ lineHeight: 1.7, color: "var(--color-text-muted)" }}>{t(`faqA${i}`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Nasze podejście w Opolu (2D) */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('geoTitle')}</h2>
                    <p style={{ lineHeight: 1.8, maxWidth: "800px" }}>{t('geoText')}</p>
                </div>

                <PerformerCard doctor="marcin" />
                <div style={{ textAlign: "center", marginTop: "4rem" }}>
                    <Link href="/kontakt" className="btn-primary" style={{ padding: "1rem 3rem", fontSize: "1.2rem" }}>{t('cta')}</Link>
                </div>
            </RevealOnScroll>
        </main>
    );
}
