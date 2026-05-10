"use client";

import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/RevealOnScroll";

export default function ProtetykaPage() {
    const t = useTranslations('protetyka');

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

                {/* Types of prosthetics */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>{t('typesTitle')}</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "1rem", border: "1px solid var(--color-border)" }}>
                                <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem", fontSize: "1.1rem" }}>{t(`type${i}Title`)}</h3>
                                <p style={{ color: "var(--color-text-muted)", lineHeight: "1.6" }}>{t(`type${i}Text`)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Digital workflow highlight */}
                <div style={{ marginBottom: "4rem" }}>
                    <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "1rem", border: "1px solid var(--color-primary)", maxWidth: "800px", margin: "0 auto" }}>
                        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--color-primary)" }}>{t('digitalTitle')}</h2>
                        <p style={{ lineHeight: "1.8" }}>{t('digitalText')}</p>
                    </div>
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
