"use client";

import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/RevealOnScroll";
import OfferCarousel from "@/components/OfferCarousel";

export default function OfferPage() {
    const t = useTranslations('oferta');

    return (
        <main>
            <section className="section" style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="container" style={{ textAlign: "center" }}>
                    <RevealOnScroll>
                        <p style={{
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            color: "var(--color-primary)",
                            fontSize: "0.9rem",
                            marginBottom: "var(--spacing-md)"
                        }}>
                            {t('tagline')}
                        </p>
                        <h1 style={{
                            fontSize: "clamp(3rem, 6vw, 5rem)",
                            color: "var(--color-text-main)",
                            marginBottom: "var(--spacing-md)",
                            fontWeight: 400
                        }}>
                            {t('title')}
                        </h1>
                        <p style={{ maxWidth: "600px", margin: "0 auto", color: "var(--color-text-muted)", fontSize: "1.1rem" }}>
                            {t('description')}
                        </p>
                    </RevealOnScroll>
                </div>
            </section>

            <section className="section" style={{ background: "transparent" }}>
                <div className="container" style={{ maxWidth: "100%" }}>
                    <div style={{ padding: "var(--spacing-lg) 0" }}>
                        <OfferCarousel />
                    </div>

                    <div style={{ marginTop: "var(--spacing-xl)", textAlign: "center", marginBottom: "var(--spacing-xl)" }}>
                        <a href="/kontakt" className="btn-primary" style={{ padding: "1rem 3rem" }}>
                            {t('contactCta')}
                        </a>
                    </div>
                </div>
            </section>
        </main>
    );
}
