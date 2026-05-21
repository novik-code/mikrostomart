"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";
import PerformerCard from "@/components/PerformerCard";

export default function ChirurgiaPage() {
    const t = useTranslations('chirurgia');

    return (
        <main className="section container">
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

                {/* Zakres + filozofia */}
                <div style={{ marginBottom: "4rem", background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", border: "1px solid var(--color-primary)" }}>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem", color: "var(--color-primary)" }}>{t('scopeTitle')}</h2>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('scopeText1')}</p>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('scopeText2')}</p>
                    <p style={{ lineHeight: 1.8 }}>{t('scopeText3')}</p>
                </div>

                {/* Services Grid (rozbudowane) */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('servicesTitle')}</h2>
                    <p style={{ marginBottom: "2rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('servicesIntro')}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "1rem", border: "1px solid var(--color-border)" }}>
                                <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem", fontSize: "1.1rem" }}>{t(`service${i}Title`)}</h3>
                                <p style={{ color: "var(--color-text-muted)", lineHeight: "1.6" }}>{t(`service${i}Text`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ósemki workflow */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('wisdomTitle')}</h2>
                    <p style={{ marginBottom: "2rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('wisdomIntro')}</p>
                    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{
                                display: "grid",
                                gridTemplateColumns: "auto 1fr",
                                gap: "1rem",
                                marginBottom: "1.25rem",
                                background: "var(--color-surface)",
                                padding: "1.25rem",
                                borderRadius: "0.5rem",
                            }}>
                                <div style={{ minWidth: "36px", height: "36px", borderRadius: "50%", background: "var(--color-primary)", color: "var(--color-background)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.95rem" }}>{i}</div>
                                <div>
                                    <strong style={{ color: "var(--color-text-main)", display: "block", marginBottom: "0.25rem" }}>{t(`wisdomStep${i}Title`)}</strong>
                                    <span style={{ color: "var(--color-text-muted)", lineHeight: 1.6, fontSize: "0.95rem" }}>{t(`wisdomStep${i}Text`)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* PRF Section (rozbudowane) */}
                <div style={{ marginBottom: "4rem" }}>
                    <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", border: "1px solid var(--color-primary)", maxWidth: "900px", margin: "0 auto" }}>
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem", color: "var(--color-primary)" }}>{t('prfTitle')}</h2>
                        <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('prfText1')}</p>
                        <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('prfText2')}</p>
                        <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('prfText3')}</p>
                        <h3 style={{ fontSize: "1.1rem", color: "var(--color-primary)", marginTop: "1.5rem", marginBottom: "0.75rem" }}>{t('prfWhenTitle')}</h3>
                        <ul style={{ paddingLeft: "1.5rem", lineHeight: 1.7, listStyleType: "disc" }}>
                            {[1, 2, 3, 4].map(i => (
                                <li key={i} style={{ marginBottom: "0.4rem" }}>{t(`prfUse${i}`)}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Mikrochirurgia endodontyczna (apicoektomia) */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('apicoTitle')}</h2>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('apicoText1')}</p>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('apicoText2')}</p>
                    <p style={{ lineHeight: 1.8 }}>{t('apicoText3')}</p>
                </div>

                {/* Ozonoterapia + laser */}
                <div style={{ marginBottom: "4rem", background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem" }}>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>{t('adjunctTitle')}</h2>
                    <p style={{ marginBottom: "1rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('adjunctIntro')}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
                        {['ozone', 'laser', 'lllt'].map(key => (
                            <div key={key} style={{
                                background: "var(--color-background)",
                                padding: "1.25rem",
                                borderRadius: "0.5rem",
                                border: "1px solid var(--color-surface-hover)",
                            }}>
                                <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem", fontSize: "1rem" }}>{t(`adjunct_${key}_title`)}</h3>
                                <p style={{ lineHeight: 1.6, fontSize: "0.9rem", color: "var(--color-text-muted)" }}>{t(`adjunct_${key}_text`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Post-op care */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('postopTitle')}</h2>
                    <p style={{ marginBottom: "1.5rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('postopIntro')}</p>
                    <ul style={{ paddingLeft: "1.5rem", lineHeight: 1.8, listStyleType: "disc" }}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <li key={i} style={{ marginBottom: "0.5rem" }}>{t(`postop${i}`)}</li>
                        ))}
                    </ul>
                </div>

                {/* Marcin's expertise */}
                <div style={{ marginBottom: "4rem", background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", borderTop: "3px solid var(--color-primary)" }}>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>{t('expertiseTitle')}</h2>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('expertiseText1')}</p>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('expertiseText2')}</p>
                    <p style={{ lineHeight: 1.8 }}>{t('expertiseText3')}</p>
                </div>

                {/* Cross-link */}
                <div style={{ marginBottom: "4rem", background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", border: "1px solid var(--color-primary)" }}>
                    <h3 style={{ fontSize: "1.3rem", color: "var(--color-primary)", marginBottom: "0.75rem" }}>{t('crossLinkTitle')}</h3>
                    <p style={{ lineHeight: 1.8, marginBottom: "1rem" }}>{t('crossLinkText')}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                        <Link href="/oferta/implantologia" style={{ color: "var(--color-primary)", fontWeight: 600 }}>{t('crossLinkImplant')} →</Link>
                        <Link href="/oferta/leczenie-kanalowe" style={{ color: "var(--color-primary)", fontWeight: 600 }}>{t('crossLinkEndo')} →</Link>
                    </div>
                </div>

                {/* FAQ rozbudowa 4→9 */}
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
