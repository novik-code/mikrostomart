"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";
import PerformerCard from "@/components/PerformerCard";

export default function OrtodoncjaPage() {
    const t = useTranslations('ortodoncja');

    return (
        <main className="section container">
            {/* K-4 hotfix lesson (commit 7ee833d): <RevealOnScroll priority> dla
                długich service pages — bez tego content opacity:0 forever. */}
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

                {/* Filozofia ortodoncji */}
                <div style={{ marginBottom: "4rem", background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", border: "1px solid var(--color-primary)" }}>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem", color: "var(--color-primary)" }}>{t('philosophyTitle')}</h2>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('philosophyText1')}</p>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('philosophyText2')}</p>
                    <p style={{ lineHeight: 1.8 }}>{t('philosophyText3')}</p>
                </div>

                {/* Clear Correct workflow — 4 numbered steps (rozbudowane) */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('howTitle')}</h2>
                    <p style={{ marginBottom: "2rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('howIntro')}</p>
                    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{
                                display: "grid",
                                gridTemplateColumns: "auto 1fr",
                                gap: "1rem",
                                marginBottom: "1.5rem",
                                background: "var(--color-surface)",
                                padding: "1.5rem",
                                borderRadius: "0.75rem",
                                border: "1px solid var(--color-surface-hover)",
                            }}>
                                <div style={{ minWidth: "44px", height: "44px", borderRadius: "50%", background: "var(--color-primary)", color: "var(--color-background)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.1rem" }}>{i}</div>
                                <div>
                                    <h3 style={{ fontSize: "1.1rem", marginBottom: "0.3rem", color: "var(--color-primary)" }}>{t(`step${i}Title`)}</h3>
                                    <p style={{ color: "var(--color-text-muted)", lineHeight: "1.7" }}>{t(`step${i}Text`)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Porównanie 3 metod */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('comparisonTitle')}</h2>
                    <p style={{ marginBottom: "2rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('comparisonIntro')}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{
                                background: "var(--color-surface)",
                                padding: "1.5rem",
                                borderRadius: "0.75rem",
                                border: i === 1 ? "2px solid var(--color-primary)" : "1px solid var(--color-surface-hover)",
                                position: "relative",
                            }}>
                                {i === 1 && (
                                    <span style={{
                                        position: "absolute",
                                        top: "-12px",
                                        right: "16px",
                                        background: "var(--color-primary)",
                                        color: "var(--color-background)",
                                        fontSize: "0.7rem",
                                        padding: "0.25rem 0.6rem",
                                        borderRadius: "1rem",
                                        fontWeight: 600,
                                        letterSpacing: "0.05em",
                                        textTransform: "uppercase",
                                    }}>{t('comparisonBadge')}</span>
                                )}
                                <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem", fontSize: "1.1rem" }}>{t(`method${i}Title`)}</h3>
                                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.75rem", fontStyle: "italic" }}>{t(`method${i}Meta`)}</p>
                                <p style={{ lineHeight: 1.6, marginBottom: "0.75rem", fontSize: "0.95rem" }}>{t(`method${i}Text`)}</p>
                                <p style={{ fontSize: "0.85rem", color: "var(--color-primary)", margin: 0 }}>{t(`method${i}When`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Czas leczenia + komfort */}
                <div style={{ marginBottom: "4rem", background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem" }}>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>{t('timelineTitle')}</h2>
                    <p style={{ marginBottom: "1.5rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('timelineIntro')}</p>
                    <ul style={{ paddingLeft: 0, listStyle: "none", display: "grid", gap: "0.75rem" }}>
                        {[1, 2, 3, 4].map(i => (
                            <li key={i} style={{
                                background: "var(--color-background)",
                                padding: "1rem",
                                borderRadius: "0.5rem",
                                borderLeft: "3px solid var(--color-primary)",
                                lineHeight: 1.7,
                            }}>
                                <strong style={{ color: "var(--color-primary)" }}>{t(`timelineCase${i}When`)}</strong>{" → "}
                                {t(`timelineCase${i}Then`)}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Retencja */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t('retentionTitle')}</h2>
                    <p style={{ marginBottom: "1rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>{t('retentionIntro')}</p>
                    <ul style={{ paddingLeft: "1.5rem", lineHeight: 1.8, listStyleType: "disc" }}>
                        {[1, 2, 3].map(i => (
                            <li key={i} style={{ marginBottom: "0.5rem" }}>{t(`retentionPoint${i}`)}</li>
                        ))}
                    </ul>
                </div>

                {/* Dzieci + wczesna interwencja */}
                <div style={{ marginBottom: "4rem", background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem" }}>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>{t('kidsTitle')}</h2>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('kidsText1')}</p>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('kidsText2')}</p>
                    <p style={{ lineHeight: 1.8 }}>{t('kidsText3')}</p>
                </div>

                {/* Benefits (rozbudowane z 5 do 7) */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>{t('benefitsTitle')}</h2>
                    <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8", listStyleType: "disc", maxWidth: "800px", margin: "0 auto" }}>
                        {[1, 2, 3, 4, 5, 6, 7].map(i => (
                            <li key={i} className="mb-2">{t(`benefit${i}`)}</li>
                        ))}
                    </ul>
                </div>

                {/* Marcin's perspective */}
                <div style={{ marginBottom: "4rem", background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", borderTop: "3px solid var(--color-primary)" }}>
                    <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>{t('marcinTitle')}</h2>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('marcinText1')}</p>
                    <p style={{ marginBottom: "1rem", lineHeight: 1.8 }}>{t('marcinText2')}</p>
                    <p style={{ lineHeight: 1.8 }}>{t('marcinText3')}</p>
                </div>

                {/* Cross-link */}
                <div style={{ marginBottom: "4rem", background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", border: "1px solid var(--color-primary)" }}>
                    <h3 style={{ fontSize: "1.3rem", color: "var(--color-primary)", marginBottom: "0.75rem" }}>{t('crossLinkTitle')}</h3>
                    <p style={{ lineHeight: 1.8, marginBottom: "1rem" }}>{t('crossLinkText')}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                        <Link href="/oferta/stomatologia-estetyczna" style={{ color: "var(--color-primary)", fontWeight: 600 }}>{t('crossLinkEstetyczna')} →</Link>
                        <Link href="/oferta/chirurgia" style={{ color: "var(--color-primary)", fontWeight: 600 }}>{t('crossLinkChirurgia')} →</Link>
                    </div>
                </div>

                {/* FAQ 4 → 9 */}
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
