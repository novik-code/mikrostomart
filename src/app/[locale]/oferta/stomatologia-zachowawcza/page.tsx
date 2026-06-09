"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";
import PerformerCard from "@/components/PerformerCard";

export default function StomatologiaZachowawczaPage() {
    const t = useTranslations('zachowawcza');

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

                {/* Leczenie próchnicy */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('cariesTitle')}</h2>
                    <p style={{ lineHeight: 1.8 }}>{t('cariesText')}</p>
                </div>

                {/* Wypełnienia estetyczne */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('fillingsTitle')}</h2>
                    <p style={{ lineHeight: 1.8 }}>{t('fillingsText')}</p>
                </div>

                {/* Bez wiertła — laser/ICON cross-link */}
                <div style={{
                    marginBottom: "4rem", padding: "var(--spacing-lg)", background: "var(--color-surface)",
                    borderRadius: "1rem", border: "1px solid rgba(var(--color-primary-rgb), 0.25)",
                    display: "flex", flexDirection: "column", gap: "0.75rem",
                }}>
                    <h2 style={{ fontSize: "1.5rem", color: "var(--color-primary)", margin: 0 }}>{t('noDrillTitle')}</h2>
                    <p style={{ margin: 0, lineHeight: 1.75 }}>{t('noDrillText')}</p>
                    <Link href="/oferta/laser" style={{ alignSelf: "flex-start", color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>{t('noDrillCta')} →</Link>
                </div>

                {/* Wymiana amalgamatu */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('amalgamTitle')}</h2>
                    <p style={{ lineHeight: 1.8 }}>{t('amalgamText')}</p>
                </div>

                {/* Ubytki niepróchnicowe */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('nonCariesTitle')}</h2>
                    <p style={{ lineHeight: 1.8 }}>{t('nonCariesText')}</p>
                </div>

                {/* Why us */}
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
