"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/RevealOnScroll";

export default function ElaPage() {
    const t = useTranslations('zespolEla');
    const tO = useTranslations('oNas'); // reuse elaQuote, elaText1-3 z istniejących stringów

    return (
        <main>
            {/* Hero — portrait + intro */}
            <section className="section" style={{ padding: "var(--spacing-xl) 0" }}>
                <div className="container">
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                        gap: "var(--spacing-xl)",
                        alignItems: "center",
                    }}>
                        <RevealOnScroll animation="blur-in" priority>
                            <div style={{
                                width: "100%",
                                aspectRatio: "3/4",
                                position: "relative",
                                borderRadius: "2px",
                                border: "1px solid var(--color-surface-hover)",
                                padding: "10px",
                            }}>
                                <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
                                    <Image
                                        src="/ela-final.webp"
                                        alt="hig. stom. Elżbieta Nowosielska"
                                        fill
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        priority
                                        style={{ objectFit: "cover" }}
                                    />
                                </div>
                            </div>
                        </RevealOnScroll>

                        <RevealOnScroll priority>
                            <p style={{
                                color: "var(--color-primary)",
                                textTransform: "uppercase",
                                letterSpacing: "0.2em",
                                fontSize: "0.85rem",
                                marginBottom: "var(--spacing-sm)",
                            }}>
                                {t('heroTagline')}
                            </p>
                            <h1 style={{
                                fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
                                marginBottom: "var(--spacing-sm)",
                                lineHeight: 1.1,
                                fontWeight: 400,
                            }}>
                                hig. stom.<br />
                                <span style={{ fontStyle: "italic" }}>Elżbieta Nowosielska</span>
                            </h1>
                            <p style={{
                                fontSize: "1.15rem",
                                color: "var(--color-text-muted)",
                                marginBottom: "var(--spacing-md)",
                                lineHeight: 1.6,
                            }}>
                                {t('heroLead')}
                            </p>
                            <blockquote style={{
                                fontStyle: "italic",
                                color: "var(--color-text-main)",
                                fontSize: "1.05rem",
                                borderLeft: "2px solid var(--color-primary)",
                                paddingLeft: "var(--spacing-md)",
                                margin: 0,
                            }}>
                                &quot;{tO('elaQuote')}&quot;
                            </blockquote>
                        </RevealOnScroll>
                    </div>
                </div>
            </section>

            {/* Bio narrative — przeniesione z /o-nas elaText1-3 */}
            <section className="section" style={{ background: "var(--color-surface)", padding: "var(--spacing-xl) 0" }}>
                <div className="container" style={{ maxWidth: "820px" }}>
                    <RevealOnScroll>
                        <h2 style={{
                            fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)",
                            color: "var(--color-primary)",
                            marginBottom: "var(--spacing-lg)",
                            textAlign: "center",
                        }}>
                            {t('bioHeading')}
                        </h2>
                        <div style={{ color: "var(--color-text-muted)", fontSize: "1.05rem", lineHeight: 1.7, textAlign: "justify" }}>
                            <p style={{ marginBottom: "1rem" }}>{tO('elaText1')}</p>
                            <p style={{ marginBottom: "1rem" }}>{tO('elaText2')}</p>
                            <p>{tO('elaText3')}</p>
                        </div>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Specjalizacje — 4 cards */}
            <section className="section" style={{ padding: "var(--spacing-xl) 0" }}>
                <div className="container" style={{ maxWidth: "1100px" }}>
                    <RevealOnScroll>
                        <h2 style={{
                            fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)",
                            color: "var(--color-primary)",
                            marginBottom: "var(--spacing-md)",
                            textAlign: "center",
                        }}>
                            {t('specialtiesHeading')}
                        </h2>
                        <p style={{
                            color: "var(--color-text-muted)",
                            fontSize: "1.05rem",
                            lineHeight: 1.6,
                            textAlign: "center",
                            marginBottom: "var(--spacing-lg)",
                            maxWidth: "720px",
                            margin: "0 auto var(--spacing-lg)",
                        }}>
                            {t('specialtiesIntro')}
                        </p>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                            gap: "var(--spacing-md)",
                        }}>
                            {[
                                { icon: "✨", title: t('spec1Title'), desc: t('spec1Desc') },
                                { icon: "🛡️", title: t('spec2Title'), desc: t('spec2Desc') },
                                { icon: "📚", title: t('spec3Title'), desc: t('spec3Desc') },
                                { icon: "🦷", title: t('spec4Title'), desc: t('spec4Desc') },
                            ].map((s) => (
                                <div key={s.title} style={{
                                    background: "var(--color-surface)",
                                    border: "1px solid var(--color-surface-hover)",
                                    borderRadius: "2px",
                                    padding: "var(--spacing-md)",
                                }}>
                                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{s.icon}</div>
                                    <h3 style={{
                                        fontSize: "1.1rem",
                                        color: "var(--color-text-main)",
                                        marginBottom: "0.5rem",
                                    }}>
                                        {s.title}
                                    </h3>
                                    <p style={{
                                        fontSize: "0.95rem",
                                        color: "var(--color-text-muted)",
                                        lineHeight: 1.5,
                                        margin: 0,
                                    }}>
                                        {s.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </RevealOnScroll>
                </div>
            </section>

            {/* CTA box */}
            <section className="section" style={{
                background: "linear-gradient(135deg, var(--color-surface) 0%, var(--color-background) 100%)",
                padding: "var(--spacing-xl) 0",
                borderTop: "1px solid var(--color-surface-hover)",
            }}>
                <div className="container" style={{ maxWidth: "720px", textAlign: "center" }}>
                    <RevealOnScroll>
                        <h2 style={{
                            fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                            color: "var(--color-primary)",
                            marginBottom: "var(--spacing-sm)",
                        }}>
                            {t('ctaTitle')}
                        </h2>
                        <p style={{
                            color: "var(--color-text-muted)",
                            fontSize: "1.1rem",
                            lineHeight: 1.6,
                            marginBottom: "var(--spacing-md)",
                        }}>
                            {t('ctaLead')}
                        </p>
                        <Link
                            href="/rezerwacja?reason=higienizacja"
                            style={{
                                display: "inline-block",
                                background: "var(--color-primary)",
                                color: "var(--color-background)",
                                padding: "1rem 2.5rem",
                                fontSize: "1.05rem",
                                fontWeight: 600,
                                textDecoration: "none",
                                borderRadius: "2px",
                                letterSpacing: "0.05em",
                                textTransform: "uppercase",
                            }}
                        >
                            {t('ctaButton')}
                        </Link>
                    </RevealOnScroll>
                </div>
            </section>
        </main>
    );
}
