"use client";

import { useTranslations } from "next-intl";
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
                    </ul>
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

                {/* FAQ */}
                <div style={{ marginBottom: "4rem" }}>
                    <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>{t('faqTitle')}</h2>

                    <div className="space-y-6">
                        <div>
                            <h3 style={{ fontSize: "1.2rem", color: "var(--color-primary)", marginBottom: "0.5rem" }}>{t('faqQ1')}</h3>
                            <p>{t('faqA1')}</p>
                        </div>
                        <div>
                            <h3 style={{ fontSize: "1.2rem", color: "var(--color-primary)", marginBottom: "0.5rem" }}>{t('faqQ2')}</h3>
                            <p>{t('faqA2')}</p>
                        </div>
                        <div>
                            <h3 style={{ fontSize: "1.2rem", color: "var(--color-primary)", marginBottom: "0.5rem" }}>{t('faqQ3')}</h3>
                            <p>{t('faqA3')}</p>
                        </div>
                        <div>
                            <h3 style={{ fontSize: "1.2rem", color: "var(--color-primary)", marginBottom: "0.5rem" }}>{t('faqQ4')}</h3>
                            <p>{t('faqA4')}</p>
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: "center", marginTop: "4rem" }}>
                    <a href="/kontakt" className="btn-primary" style={{ padding: "1rem 3rem", fontSize: "1.2rem" }}>{t('ctaConsult')}</a>
                </div>

            </RevealOnScroll>
        </main>
    );
}
