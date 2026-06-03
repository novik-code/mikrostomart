"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";
import PerformerCard from "@/components/PerformerCard";

export default function PeriodontologiaPage() {
    const t = useTranslations('periodontologia');

    return (
        <main className="section container">
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

                {/* Objawy — warning signs */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('symptomsTitle')}</h2>
                    <p className="mb-4" style={{ lineHeight: 1.8 }}>{t('symptomsIntro')}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem", marginTop: "1.5rem" }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ background: "var(--color-surface)", padding: "1.25rem", borderRadius: "1rem", border: "1px solid var(--color-border)" }}>
                                <p style={{ margin: 0, lineHeight: "1.6" }}>{t(`symptom${i}`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Diagnostyka — sondowanie */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('diagnosticsTitle')}</h2>
                    <p style={{ lineHeight: 1.8 }}>{t('diagnosticsText')}</p>
                </div>

                {/* Etapy leczenia */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('processTitle')}</h2>
                    <p className="mb-4" style={{ lineHeight: 1.8 }}>{t('processIntro')}</p>
                    <div style={{ maxWidth: "900px", margin: "2rem auto 0" }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", alignItems: "flex-start" }}>
                                <div style={{ minWidth: "40px", height: "40px", borderRadius: "50%", background: "var(--color-primary)", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", flexShrink: 0 }}>{i}</div>
                                <div>
                                    <h3 style={{ fontSize: "1.1rem", marginBottom: "0.4rem", color: "var(--color-primary)" }}>{t(`step${i}Title`)}</h3>
                                    <p style={{ color: "var(--color-text-muted)", lineHeight: "1.65" }}>{t(`step${i}Text`)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Laser w leczeniu paradontozy — cross-link do /oferta/laser */}
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
                    <h2 style={{ fontSize: "1.5rem", color: "var(--color-primary)", margin: 0 }}>{t('laserTitle')}</h2>
                    <p style={{ margin: 0, lineHeight: 1.75 }}>{t('laserText')}</p>
                    <Link href="/oferta/laser" style={{ alignSelf: "flex-start", color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                        {t('laserCta')} →
                    </Link>
                </div>

                {/* Zdrowie ogólne */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('healthTitle')}</h2>
                    <p style={{ lineHeight: 1.8 }}>{t('healthText')}</p>
                </div>

                {/* Authority / why us */}
                <div style={{
                    marginBottom: "4rem",
                    padding: "var(--spacing-lg)",
                    background: "var(--color-surface)",
                    borderRadius: "1rem",
                    border: "1px solid rgba(var(--color-primary-rgb), 0.25)",
                }}>
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

                <PerformerCard doctor="marcin" />
                <div style={{ textAlign: "center", marginTop: "4rem" }}>
                    <Link href="/kontakt" className="btn-primary" style={{ padding: "1rem 3rem", fontSize: "1.2rem" }}>{t('cta')}</Link>
                </div>
            </RevealOnScroll>
        </main>
    );
}
