"use client";

import RevealOnScroll from "@/components/RevealOnScroll";
import OfferCarousel from "@/components/OfferCarousel";

export default function OfferPage() {
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
                            Zakres Usług
                        </p>
                        <h1 style={{
                            fontSize: "clamp(3rem, 6vw, 5rem)",
                            color: "var(--color-text-main)",
                            marginBottom: "var(--spacing-md)",
                            fontWeight: 400
                        }}>
                            Nasza Oferta
                        </h1>
                        <p style={{ maxWidth: "600px", margin: "0 auto", color: "var(--color-text-muted)", fontSize: "1.1rem" }}>
                            Kompleksowa opieka stomatologiczna na najwyższym poziomie.
                        </p>
                    </RevealOnScroll>
                </div>
            </section>

            <section className="section" style={{ background: "transparent" }}>
                {/* 
                   Was: var(--color-surface). Changed to transparent to allow video loop to show.
                   The original list had a background. The carousel is transparent.
               */}
                <div className="container" style={{ maxWidth: "100%" }}> {/* Expanded width for carousel */}

                    {/* The New Carousel */}
                    <div style={{ padding: "var(--spacing-lg) 0" }}>
                        <OfferCarousel />
                    </div>

                    <div style={{ marginTop: "var(--spacing-xl)", textAlign: "center", marginBottom: "var(--spacing-xl)" }}>
                        <a href="/kontakt" className="btn-primary" style={{ padding: "1rem 3rem" }}>
                            Skontaktuj się z nami
                        </a>
                    </div>
                </div>
            </section>
        </main>
    );
}
