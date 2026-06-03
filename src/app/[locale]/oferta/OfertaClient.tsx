"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { brandI18nParams } from '@/lib/brandConfig';
import RevealOnScroll from "@/components/RevealOnScroll";
import OfferCarousel from "@/components/OfferCarousel";
import { OFERTA_SERVICES } from "@/data/ofertaServices";

export default function OfferPage() {
    const t = useTranslations('oferta');
    const ts = useTranslations('ofertaServices');

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
                            {t('description', brandI18nParams())}
                        </p>
                    </RevealOnScroll>
                </div>
            </section>

            <section className="section" style={{ background: "transparent" }}>
                <div className="container" style={{ maxWidth: "100%" }}>
                    <div style={{ padding: "var(--spacing-lg) 0" }}>
                        <OfferCarousel />
                    </div>

                    {/* Siatka usług — nawigacja do stron szczegółowych /oferta/[slug].
                        Data-driven z src/data/ofertaServices.ts (nowa strona usługi
                        pojawia się tu automatycznie). Rozwiązuje discoverability
                        (wcześniej strony usług były dostępne tylko z Footera/sitemap). */}
                    <RevealOnScroll priority>
                        <div style={{ maxWidth: "1100px", margin: "var(--spacing-xl) auto 0", textAlign: "center" }}>
                            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", marginBottom: "0.75rem" }}>{ts('gridTitle')}</h2>
                            <p style={{ color: "var(--color-text-muted)", maxWidth: "640px", margin: "0 auto 2.5rem", lineHeight: 1.7 }}>{ts('gridSubtitle')}</p>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", textAlign: "left" }}>
                                {OFERTA_SERVICES.map(({ slug, key }) => (
                                    <Link
                                        key={slug}
                                        href={`/oferta/${slug}`}
                                        className="hover-primary"
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "0.5rem",
                                            background: "var(--color-surface)",
                                            padding: "1.5rem",
                                            borderRadius: "1rem",
                                            border: "1px solid var(--color-border)",
                                            textDecoration: "none",
                                            transition: "border-color 0.2s, transform 0.2s",
                                        }}
                                    >
                                        <span style={{ color: "var(--color-primary)", fontSize: "1.15rem", fontWeight: 600 }}>{ts(`${key}Name`)}</span>
                                        <span style={{ color: "var(--color-text-muted)", lineHeight: 1.6, fontSize: "0.95rem" }}>{ts(`${key}Desc`)}</span>
                                        <span style={{ color: "var(--color-primary)", fontWeight: 600, marginTop: "0.25rem" }}>{ts('cardCta')} →</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </RevealOnScroll>

                    <div style={{ marginTop: "var(--spacing-xl)", textAlign: "center", marginBottom: "var(--spacing-xl)" }}>
                        <Link href="/kontakt" className="btn-primary" style={{ padding: "1rem 3rem" }}>
                            {t('contactCta')}
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
