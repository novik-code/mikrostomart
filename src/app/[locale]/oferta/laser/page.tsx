"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";
import PerformerCard from "@/components/PerformerCard";

export default function LaserPage() {
    const t = useTranslations('laser');

    return (
        <main className="section container">
            {/* B (oferta recovery): priority={true} — content rozbudowany, bez priority
                IntersectionObserver threshold:0.15 nie odpala dla długiej strony.
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

                {/* Fotona LightWalker — dwa lasery */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('fotonaTitle')}</h2>
                    <p className="mb-4" style={{ lineHeight: 1.8 }}>{t('fotonaIntro')}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginTop: "2rem" }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "1rem", border: "1px solid var(--color-border)" }}>
                                <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem", fontSize: "1.1rem" }}>{t(`advantage${i}Title`)}</h3>
                                <p style={{ color: "var(--color-text-muted)", lineHeight: "1.6" }}>{t(`advantage${i}Text`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Zastosowania — applications grid */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('applicationsTitle')}</h2>
                    <p className="mb-4" style={{ lineHeight: 1.8 }}>{t('applicationsIntro')}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem", marginTop: "2rem" }}>
                        {[1, 2, 3, 4, 5, 6, 7].map(i => (
                            <div key={i} style={{
                                background: "var(--color-surface)",
                                padding: "1.5rem",
                                borderRadius: "1rem",
                                borderLeft: "3px solid var(--color-primary)",
                            }}>
                                <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem", fontSize: "1.1rem" }}>{t(`app${i}Title`)}</h3>
                                <p style={{ color: "var(--color-text-muted)", lineHeight: "1.6" }}>{t(`app${i}Text`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Authority — M.Sc. RWTH + LA&HA */}
                <div style={{
                    marginBottom: "4rem",
                    padding: "var(--spacing-lg)",
                    background: "var(--color-surface)",
                    borderRadius: "1rem",
                    border: "1px solid rgba(var(--color-primary-rgb), 0.25)",
                }}>
                    <h2 style={{ fontSize: "1.5rem", color: "var(--color-primary)", margin: "0 0 1rem 0" }}>
                        {t('authorityTitle')}
                    </h2>
                    <p style={{ margin: 0, lineHeight: 1.75 }}>{t('authorityDesc')}</p>
                </div>

                {/* Benefits for patient */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('benefitsTitle')}</h2>
                    <p className="mb-4" style={{ lineHeight: 1.8 }}>{t('benefitsIntro')}</p>
                    <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.75rem", marginTop: "1.5rem", maxWidth: "800px" }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <li key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: "0.75rem", alignItems: "start" }}>
                                <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>✓</span>
                                <span style={{ lineHeight: 1.6 }}>{t(`benefit${i}`)}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Cross-link block — endo laserowe */}
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
                        {t('crossTitle')}
                    </h2>
                    <p style={{ margin: 0, lineHeight: 1.7 }}>{t('crossText')}</p>
                    <Link
                        href="/oferta/leczenie-kanalowe"
                        style={{ alignSelf: "flex-start", color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}
                    >
                        {t('crossCta')} →
                    </Link>
                </div>

                {/* Koszt — note (laser to technologia wspomagająca, nie osobny cennik) */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('costTitle')}</h2>
                    <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", lineHeight: 1.8 }}>
                        <p style={{ margin: 0 }}>{t('costText')}</p>
                        <Link href="/cennik" style={{ display: "inline-block", marginTop: "1rem", color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                            {t('costCta')} →
                        </Link>
                    </div>
                </div>

                {/* FAQ */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>{t('faqTitle')}</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        {[1, 2, 3, 4, 5, 6, 7].map(i => (
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
