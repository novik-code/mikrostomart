"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";
import PerformerCard from "@/components/PerformerCard";

export default function AllOn4Page() {
    const t = useTranslations('allon4');

    return (
        <main className="section container">
            {/* Faza 2A: priority — długa strona, IntersectionObserver threshold nie odpala. */}
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

                {/* Kwalifikacja — dla kogo */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('qualifyTitle')}</h2>
                    <p className="mb-4" style={{ lineHeight: 1.8 }}>{t('qualifyIntro')}</p>
                    <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.75rem", marginTop: "1.5rem", maxWidth: "800px" }}>
                        {[1, 2, 3, 4].map(i => (
                            <li key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: "0.75rem", alignItems: "start" }}>
                                <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>✓</span>
                                <span style={{ lineHeight: 1.6 }}>{t(`qualify${i}`)}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Procedura — nowe zęby w 1 dzień */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('procedureTitle')}</h2>
                    <p className="mb-4" style={{ lineHeight: 1.8 }}>{t('procedureIntro')}</p>
                    <div style={{ display: "grid", gap: "1rem", marginTop: "2rem" }}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} style={{
                                display: "grid", gridTemplateColumns: "auto 1fr", gap: "1rem", alignItems: "start",
                                background: "var(--color-surface)", padding: "1.25rem 1.5rem", borderRadius: "1rem",
                                borderLeft: "3px solid var(--color-primary)",
                            }}>
                                <span style={{ color: "var(--color-primary)", fontWeight: 700, fontSize: "1.5rem", lineHeight: 1 }}>{i}</span>
                                <div>
                                    <h3 style={{ color: "var(--color-primary)", marginBottom: "0.35rem", fontSize: "1.1rem" }}>{t(`step${i}Title`)}</h3>
                                    <p style={{ color: "var(--color-text-muted)", lineHeight: "1.6" }}>{t(`step${i}Text`)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* All-on-4 vs All-on-6 vs zygoma */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('compareTitle')}</h2>
                    <p className="mb-4" style={{ lineHeight: 1.8 }}>{t('compareIntro')}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginTop: "2rem" }}>
                        {[
                            { key: 'allon4', },
                            { key: 'allon6', },
                            { key: 'zygoma', },
                        ].map(({ key }) => (
                            <div key={key} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "1rem", border: "1px solid var(--color-border)" }}>
                                <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem", fontSize: "1.15rem" }}>{t(`${key}Title`)}</h3>
                                <p style={{ color: "var(--color-text-muted)", lineHeight: "1.6" }}>{t(`${key}Text`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Materiały — cyrkon przykręcany */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('materialsTitle')}</h2>
                    <p style={{ lineHeight: 1.8, maxWidth: "800px" }}>{t('materialsText')}</p>
                </div>

                {/* Obciążenie natychmiastowe */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('immediateTitle')}</h2>
                    <p style={{ lineHeight: 1.8, maxWidth: "800px" }}>{t('immediateText')}</p>
                </div>

                {/* Authority — M.Sc. RWTH + implantologia */}
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

                {/* Koszt + raty */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('costTitle')}</h2>
                    <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", lineHeight: 1.8 }}>
                        <p style={{ margin: 0 }}>{t('costText')}</p>
                        <Link href="/cennik" style={{ display: "inline-block", marginTop: "1rem", color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                            {t('costCta')} →
                        </Link>
                    </div>
                </div>

                {/* Trwałość / gwarancja */}
                <div style={{
                    marginBottom: "4rem",
                    padding: "var(--spacing-lg)",
                    background: "var(--color-surface)",
                    borderRadius: "1rem",
                    border: "1px solid rgba(var(--color-primary-rgb), 0.25)",
                    display: "flex", flexDirection: "column", gap: "0.75rem",
                }}>
                    <h2 style={{ fontSize: "1.5rem", color: "var(--color-primary)", margin: 0 }}>{t('warrantyTitle')}</h2>
                    <p style={{ margin: 0, lineHeight: 1.75 }}>{t('warrantyText')}</p>
                    <Link href="/gwarancje" style={{ alignSelf: "flex-start", color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                        {t('warrantyCta')} →
                    </Link>
                </div>

                {/* Cross-link — implantologia / protetyka */}
                <div style={{
                    marginBottom: "4rem",
                    padding: "var(--spacing-lg)",
                    background: "var(--color-surface)",
                    borderRadius: "1rem",
                    border: "1px solid rgba(var(--color-primary-rgb), 0.25)",
                    display: "flex", flexDirection: "column", gap: "0.75rem",
                }}>
                    <h2 style={{ fontSize: "1.35rem", color: "var(--color-primary)", margin: 0 }}>{t('crossTitle')}</h2>
                    <p style={{ margin: 0, lineHeight: 1.7 }}>{t('crossText')}</p>
                    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                        <Link href="/oferta/implantologia" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                            {t('crossCtaImplants')} →
                        </Link>
                        <Link href="/oferta/protetyka" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                            {t('crossCtaProsth')} →
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

                {/* CTA */}
                <div style={{ textAlign: "center", marginTop: "4rem" }}>
                    <Link href="/kontakt" className="btn-primary" style={{ padding: "1rem 3rem", fontSize: "1.2rem" }}>{t('cta')}</Link>
                </div>
            </RevealOnScroll>
        </main>
    );
}
