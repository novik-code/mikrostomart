"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { brandI18nParams } from '@/lib/brandConfig';
import RevealOnScroll from "@/components/RevealOnScroll";
import { Suspense } from "react";
import MetamorphosisContent from "./MetamorphosisContent";

export default function MetamorfozyPage() {
    const t = useTranslations('metamorfozy');

    // Ścieżki do nowego uśmiechu — kafelki z cross-linkami do stron usług (money page internal linking).
    const paths: Array<{ key: string; href: string }> = [
        { key: 'veneers', href: '/oferta/stomatologia-estetyczna' },
        { key: 'bonding', href: '/oferta/stomatologia-estetyczna' },
        { key: 'crowns', href: '/oferta/protetyka' },
        { key: 'implants', href: '/oferta/implantologia' },
        { key: 'allonx', href: '/oferta/all-on-4' },
    ];

    return (
        <main style={{ padding: "var(--navbar-height) 0 4rem" }}>
            <div className="container">
                {/* Header */}
                <RevealOnScroll animation="fade-up">
                    <header style={{ textAlign: "center", marginBottom: "3.5rem" }}>
                        <p style={{
                            color: "var(--color-primary)",
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            marginBottom: "1rem"
                        }}>
                            {t('tagline')}
                        </p>
                        <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3rem)", marginBottom: "1rem" }}>
                            {t('title')}
                        </h1>
                        <p style={{ color: "var(--color-text-muted)", maxWidth: "640px", margin: "0 auto", lineHeight: 1.7 }}>
                            {t('description', brandI18nParams())}
                        </p>
                    </header>
                </RevealOnScroll>

                {/* Intro — czym jest metamorfoza uśmiechu */}
                <RevealOnScroll animation="fade-up">
                    <section style={{ maxWidth: "820px", margin: "0 auto 4rem", lineHeight: 1.8 }}>
                        <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", color: "var(--color-primary)", marginBottom: "1rem", textAlign: "center" }}>
                            {t('introHeading')}
                        </h2>
                        <p style={{ color: "var(--color-text-main)" }}>{t('introText1')}</p>
                        <p style={{ color: "var(--color-text-muted)", marginTop: "1rem" }}>{t('introText2')}</p>
                    </section>
                </RevealOnScroll>

                {/* Ścieżki do nowego uśmiechu — cross-link grid */}
                <RevealOnScroll animation="fade-up">
                    <section style={{ marginBottom: "4rem" }}>
                        <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", color: "var(--color-primary)", marginBottom: "0.75rem", textAlign: "center" }}>
                            {t('pathsHeading')}
                        </h2>
                        <p style={{ color: "var(--color-text-muted)", textAlign: "center", maxWidth: "720px", margin: "0 auto 2rem", lineHeight: 1.7 }}>
                            {t('pathsIntro')}
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
                            {paths.map(({ key, href }) => (
                                <Link key={key} href={href} style={{ textDecoration: "none" }}>
                                    <article style={{
                                        background: "var(--color-surface)",
                                        border: "1px solid var(--color-surface-hover)",
                                        borderRadius: "8px",
                                        padding: "1.5rem",
                                        height: "100%",
                                        borderLeft: "3px solid var(--color-primary)",
                                    }}>
                                        <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem", fontSize: "1.1rem" }}>{t(`path_${key}_title`)}</h3>
                                        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.6, fontSize: "0.95rem", marginBottom: "0.75rem" }}>{t(`path_${key}_desc`)}</p>
                                        <span style={{ color: "var(--color-primary)", fontWeight: 600, fontSize: "0.9rem" }}>{t('pathsCardCta')} →</span>
                                    </article>
                                </Link>
                            ))}
                        </div>
                    </section>
                </RevealOnScroll>

                {/* DSD — cyfrowe projektowanie uśmiechu */}
                <RevealOnScroll animation="fade-up">
                    <section style={{ maxWidth: "820px", margin: "0 auto 4rem", lineHeight: 1.8 }}>
                        <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", color: "var(--color-primary)", marginBottom: "1rem", textAlign: "center" }}>
                            {t('dsdHeading')}
                        </h2>
                        <p style={{ color: "var(--color-text-main)" }}>{t('dsdText')}</p>
                    </section>
                </RevealOnScroll>

                {/* Koszt, czas, kwalifikacja */}
                <RevealOnScroll animation="fade-up">
                    <section style={{ maxWidth: "820px", margin: "0 auto 4rem" }}>
                        <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", color: "var(--color-primary)", marginBottom: "1rem", textAlign: "center" }}>
                            {t('costHeading')}
                        </h2>
                        <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "8px", lineHeight: 1.8 }}>
                            <p style={{ color: "var(--color-text-main)", margin: 0 }}>{t('costText')}</p>
                            <Link href="/cennik" style={{ display: "inline-block", marginTop: "1rem", color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                                {t('costCta')} →
                            </Link>
                        </div>
                    </section>
                </RevealOnScroll>

                {/* Galeria efektów przed/po */}
                <RevealOnScroll animation="fade-up">
                    <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", color: "var(--color-primary)", marginBottom: "1.5rem", textAlign: "center" }}>
                        {t('galleryHeading')}
                    </h2>
                </RevealOnScroll>
                <RevealOnScroll animation="blur-in" delay={100}>
                    <Suspense fallback={
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1.5rem' }}>
                            <div style={{ width: '48px', height: '48px', border: '3px solid rgba(var(--color-primary-dark-rgb),0.15)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{t('loading')}</p>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    }>
                        <MetamorphosisContent />
                    </Suspense>
                </RevealOnScroll>

                {/* FAQ */}
                <RevealOnScroll animation="fade-up">
                    <section style={{ maxWidth: "820px", margin: "4rem auto 0" }}>
                        <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", color: "var(--color-primary)", marginBottom: "1.5rem", textAlign: "center" }}>
                            {t('faqHeading')}
                        </h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {[1, 2, 3, 4, 5].map((n) => (
                                <details key={n} style={{ background: "var(--color-surface)", border: "1px solid var(--color-surface-hover)", borderRadius: "8px", padding: "1rem 1.25rem" }}>
                                    <summary style={{ fontWeight: 600, color: "var(--color-text-main)", cursor: "pointer", listStyle: "none", fontSize: "1rem" }}>
                                        {t(`faqQ${n}`)}
                                    </summary>
                                    <p style={{ color: "var(--color-text-muted)", lineHeight: 1.7, marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--color-surface-hover)" }}>
                                        {t(`faqA${n}`)}
                                    </p>
                                </details>
                            ))}
                        </div>
                    </section>
                </RevealOnScroll>

                {/* CTA */}
                <RevealOnScroll animation="fade-up">
                    <section style={{ textAlign: "center", marginTop: "4rem" }}>
                        <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", color: "var(--color-primary)", marginBottom: "1rem" }}>{t('ctaHeading')}</h2>
                        <p style={{ color: "var(--color-text-muted)", maxWidth: "620px", margin: "0 auto 1.5rem", lineHeight: 1.7 }}>{t('ctaText')}</p>
                        <Link href="/rezerwacja" className="btn-primary" style={{ padding: "1rem 2.5rem", fontSize: "1.1rem" }}>{t('ctaButton')}</Link>
                    </section>
                </RevealOnScroll>
            </div>
        </main>
    );
}
