"use client";

import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/RevealOnScroll";

export default function OrtodoncjaPage() {
    const t = useTranslations('ortodoncja');

    return (
        <main className="section container">
            <RevealOnScroll>
                <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                    <p style={{ textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--color-primary)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>{t('tagline')}</p>
                    <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", marginBottom: "1rem" }}>{t('title')}</h1>
                    <h2 style={{ fontSize: "1.5rem", color: "var(--color-text-muted)", fontWeight: 400 }}>{t('subtitle')}</h2>
                </div>

                <div style={{ maxWidth: "800px", margin: "0 auto", marginBottom: "4rem", lineHeight: "1.8" }}>
                    <p className="mb-4">{t('intro1')}</p>
                    <p className="mb-4">{t('intro2')}</p>
                </div>

                {/* How it works */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>{t('howTitle')}</h2>
                    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", alignItems: "flex-start" }}>
                                <div style={{ minWidth: "40px", height: "40px", borderRadius: "50%", background: "var(--color-primary)", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>{i}</div>
                                <div>
                                    <h3 style={{ fontSize: "1.1rem", marginBottom: "0.3rem" }}>{t(`step${i}Title`)}</h3>
                                    <p style={{ color: "var(--color-text-muted)", lineHeight: "1.6" }}>{t(`step${i}Text`)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Benefits */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>{t('benefitsTitle')}</h2>
                    <ul style={{ paddingLeft: "1.5rem", lineHeight: "1.8", listStyleType: "disc", maxWidth: "800px", margin: "0 auto" }}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <li key={i} className="mb-2">{t(`benefit${i}`)}</li>
                        ))}
                    </ul>
                </div>

                {/* FAQ */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>{t('faqTitle')}</h2>
                    <div className="space-y-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i}>
                                <h3 style={{ fontSize: "1.2rem", color: "var(--color-primary)", marginBottom: "0.5rem" }}>{t(`faqQ${i}`)}</h3>
                                <p>{t(`faqA${i}`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ textAlign: "center", marginTop: "4rem" }}>
                    <a href="/kontakt" className="btn-primary" style={{ padding: "1rem 3rem", fontSize: "1.2rem" }}>{t('cta')}</a>
                </div>
            </RevealOnScroll>
        </main>
    );
}
