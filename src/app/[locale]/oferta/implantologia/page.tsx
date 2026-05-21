"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";

export default function ImplantologiaPage() {
    const t = useTranslations('implantologia');

    return (
        <main className="section container">
            <RevealOnScroll>
                {/* Header Section */}
                <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                    <p style={{ textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--color-primary)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                        {t('tagline')}
                    </p>
                    <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", marginBottom: "1rem" }}>{t('title')}</h1>
                    <h2 style={{ fontSize: "1.5rem", color: "var(--color-text-muted)", fontWeight: 400 }}>{t('subtitle')}</h2>
                </div>

                {/* Introduction */}
                <div style={{ maxWidth: "800px", margin: "0 auto", marginBottom: "4rem", lineHeight: "1.8" }}>
                    <p className="mb-4">
                        {t('intro1')}
                    </p>
                    <p className="mb-4">
                        {t('intro2')}
                    </p>
                    <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", marginTop: "2rem", border: "1px solid var(--color-primary)" }}>
                        <p style={{ fontWeight: "bold", color: "var(--color-primary)", marginBottom: "1rem" }}>{t('materialsTitle')}</p>
                        <ul style={{ listStyle: "none", padding: 0, gap: "0.5rem", display: "flex", flexDirection: "column" }}>
                            <li><a href="https://www.facebook.com/284295261917113/posts/1133975220282442/?d=n" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>{t('fbLink1')}</a></li>
                            <li><a href="https://www.facebook.com/284295261917113/posts/1131697387176892/?d=n" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>{t('fbLink2')}</a></li>
                            <li><a href="https://www.facebook.com/284295261917113/posts/1000856353594330/?d=n" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>{t('fbLink3')}</a></li>
                        </ul>
                    </div>
                </div>

                {/* Benefits Section */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem", color: "var(--color-text-main)" }}>{t('whenTitle')}</h2>
                    <p className="mb-4">{t('whenIntro')}</p>

                    <h3 style={{ fontSize: "1.5rem", marginTop: "2rem", marginBottom: "1rem", color: "var(--color-primary)" }}>{t('benefitsTitle')}</h3>
                    <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8", listStyleType: "disc" }}>
                        <li className="mb-2">{t('benefit1')}</li>
                        <li className="mb-2">{t('benefit2')}</li>
                        <li className="mb-2">{t('benefit3')}</li>
                        <li className="mb-2">{t('benefit4')}</li>
                        <li className="mb-2">{t('benefit5')}</li>
                        <li className="mb-2">{t('benefit6')}</li>
                        <li className="mb-2">{t('benefit7')}</li>
                        <li className="mb-2">{t('benefit8')}</li>
                    </ul>
                </div>

                {/* K-4: Workflow cyfrowy — 6 kroków */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem", color: "var(--color-text-main)" }}>{t('workflowTitle')}</h2>
                    <p className="mb-4" style={{ lineHeight: 1.8 }}>{t('workflowIntro')}</p>
                    <ol style={{ paddingLeft: 0, listStyle: "none", display: "grid", gap: "1.25rem", marginTop: "2rem" }}>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                            <li key={n} style={{
                                display: "grid",
                                gridTemplateColumns: "44px 1fr",
                                gap: "1rem",
                                alignItems: "start",
                                padding: "1.25rem",
                                border: "1px solid var(--color-surface-hover)",
                                borderRadius: "0.75rem",
                                background: "rgba(255,255,255,0.02)",
                            }}>
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    background: "var(--color-primary)",
                                    color: "var(--color-bg, #000)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 700,
                                    fontSize: "0.95rem",
                                }}>{n}</div>
                                <div>
                                    <h3 style={{ fontSize: "1.1rem", color: "var(--color-primary)", margin: "0 0 0.5rem 0" }}>
                                        {t(`workflowStep${n}Title`)}
                                    </h3>
                                    <p style={{ margin: 0, lineHeight: 1.7, color: "var(--color-text-muted)" }}>
                                        {t(`workflowStep${n}Desc`)}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* K-4: 3 poziomy złożoności */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem", color: "var(--color-text-main)" }}>{t('complexityTitle')}</h2>
                    <p className="mb-4" style={{ lineHeight: 1.8 }}>{t('complexityIntro')}</p>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                        gap: "1rem",
                        marginTop: "2rem",
                    }}>
                        {[1, 2, 3].map((n) => (
                            <div key={n} style={{
                                padding: "1.5rem",
                                border: "1px solid var(--color-surface-hover)",
                                borderRadius: "0.75rem",
                                background: "var(--color-surface)",
                                display: "flex",
                                flexDirection: "column",
                            }}>
                                <div style={{
                                    display: "inline-block",
                                    padding: "4px 12px",
                                    border: "1px solid var(--color-primary)",
                                    color: "var(--color-primary)",
                                    borderRadius: 999,
                                    fontSize: "0.72rem",
                                    fontWeight: 600,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    alignSelf: "flex-start",
                                    marginBottom: "0.75rem",
                                }}>
                                    {t('complexityLevelLabel')} {n}
                                </div>
                                <h3 style={{ fontSize: "1.1rem", color: "var(--color-text-main)", margin: "0 0 0.75rem 0" }}>
                                    {t(`complexity${n}Title`)}
                                </h3>
                                <p style={{ margin: 0, lineHeight: 1.6, color: "var(--color-text-muted)", fontSize: "0.92rem" }}>
                                    {t(`complexity${n}Desc`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pricing */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>{t('pricingTitle')}</h2>
                    <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem" }}>
                        <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>{t('pricingNote')}</p>
                        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "1rem" }}>
                            <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
                                <span>{t('priceImplant')}</span>
                                <span style={{ fontWeight: "bold", color: "var(--color-primary)" }}>3500 zł</span>
                            </li>
                            <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
                                <span>{t('priceCrown')}</span>
                                <span style={{ fontWeight: "bold", color: "var(--color-primary)" }}>3500 zł</span>
                            </li>
                            <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
                                <span>{t('priceBone')}</span>
                                <span>500 - 5500 zł</span>
                            </li>
                            <li style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
                                <span>{t('priceSinus')}</span>
                                <span>1500 - 5000 zł</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Technical Details */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1.5rem" }}>{t('structureTitle')}</h2>
                    <p style={{ lineHeight: "1.8" }}>
                        {t('structureText')}
                    </p>
                </div>

                {/* K-4: Post-op harmonogram */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem", color: "var(--color-text-main)" }}>{t('postOpTitle')}</h2>
                    <p className="mb-4" style={{ lineHeight: 1.8 }}>{t('postOpIntro')}</p>
                    <div style={{ display: "grid", gap: "1rem", marginTop: "2rem" }}>
                        {[
                            { key: 'D0', label: '🟢' },
                            { key: 'D7', label: '🟡' },
                            { key: 'D90', label: '🟠' },
                            { key: 'M4', label: '🔵' },
                            { key: 'M6', label: '✨' },
                        ].map(({ key, label }) => (
                            <div key={key} style={{
                                display: "grid",
                                gridTemplateColumns: "44px 1fr",
                                gap: "1rem",
                                alignItems: "start",
                                padding: "1rem 1.25rem",
                                border: "1px solid var(--color-surface-hover)",
                                borderRadius: "0.75rem",
                                background: "rgba(255,255,255,0.02)",
                            }}>
                                <div style={{ fontSize: "1.5rem", textAlign: "center" }}>{label}</div>
                                <div>
                                    <h3 style={{ fontSize: "1.05rem", color: "var(--color-primary)", margin: "0 0 0.4rem 0" }}>
                                        {t(`postOp${key}Title`)}
                                    </h3>
                                    <p style={{ margin: 0, lineHeight: 1.65, color: "var(--color-text-muted)", fontSize: "0.93rem" }}>
                                        {t(`postOp${key}Desc`)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* K-4: Training references — krótka sekcja autorytetu */}
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

                {/* J-5: cross-link to protetyka. Implants and prosthetics are
                    inherently paired — the implant is the root, the crown/bridge
                    is the visible tooth. Naturally placed after structure
                    explanation, before FAQ, so the reader has the concept ready. */}
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
                    <h3 style={{ fontSize: "1.35rem", color: "var(--color-primary)", margin: 0 }}>
                        {t('crossLinkTitle')}
                    </h3>
                    <p style={{ margin: 0, lineHeight: 1.7 }}>{t('crossLinkDesc')}</p>
                    <Link
                        href="/oferta/protetyka"
                        style={{
                            alignSelf: "flex-start",
                            color: "var(--color-primary)",
                            fontWeight: 600,
                            textDecoration: "none",
                        }}
                    >
                        {t('crossLinkCta')} →
                    </Link>
                </div>

                {/* FAQ (K-4: rozszerzone z 4 → 9 pytań) */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>{t('faqTitle')}</h2>

                    <div className="space-y-6" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                            <div key={n}>
                                <h3 style={{ fontSize: "1.15rem", color: "var(--color-primary)", marginBottom: "0.5rem", lineHeight: 1.35 }}>
                                    {t(`faqQ${n}`)}
                                </h3>
                                <p style={{ lineHeight: 1.7, color: "var(--color-text-muted)" }}>
                                    {t(`faqA${n}`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ textAlign: "center", marginTop: "4rem" }}>
                    <Link href="/kontakt" className="btn-primary" style={{ padding: "1rem 3rem", fontSize: "1.2rem" }}>{t('ctaConsult')}</Link>
                </div>

            </RevealOnScroll>
        </main>
    );
}
