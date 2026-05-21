"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/RevealOnScroll";
import AkredytacjeSection from "@/components/about/AkredytacjeSection";
import CvTimeline from "@/components/about/CvTimeline";
import PublicationsList from "@/components/about/PublicationsList";
import TrainingGallery from "@/components/about/TrainingGallery";
import CzelejBook from "@/components/about/CzelejBook";

export default function MarcinPage() {
    const t = useTranslations('zespolMarcin');
    const tO = useTranslations('oNas'); // reuse marcinQuote, marcinText1-4 z istniejących stringów

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
                                        src="/marcin-final.webp"
                                        alt="lek. dent. Marcin Nowosielski, M.Sc. RWTH Aachen"
                                        fill
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        priority
                                        style={{ objectFit: "cover", objectPosition: "top" }}
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
                                lek. dent. M.Sc.<br />
                                <span style={{ fontStyle: "italic" }}>Marcin Nowosielski</span>
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
                                &quot;{tO('marcinQuote')}&quot;
                            </blockquote>
                        </RevealOnScroll>
                    </div>
                </div>
            </section>

            {/* Bio narrative — przeniesione z /o-nas marcinText1-4 (zachowuje tekst, zmienia kontekst) */}
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
                            <p style={{ marginBottom: "1rem" }}>{tO('marcinText1')}</p>
                            <p style={{ marginBottom: "1rem" }}>{tO('marcinText2')}</p>
                            <p style={{ marginBottom: "1rem" }}>{tO('marcinText3')}</p>
                            <p>{tO('marcinText4')}</p>
                        </div>
                    </RevealOnScroll>
                </div>
            </section>

            {/* K-3 sekcje — przeniesione z /o-nas, tu mają swoje natural home */}
            <AkredytacjeSection />
            <CvTimeline />
            <PublicationsList />
            <TrainingGallery />
            <CzelejBook />

            {/* Języki — kluczowy signal dla DACH/EN tourism */}
            <section className="section" style={{ background: "var(--color-surface)", padding: "var(--spacing-xl) 0" }}>
                <div className="container" style={{ maxWidth: "820px" }}>
                    <RevealOnScroll>
                        <h2 style={{
                            fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)",
                            color: "var(--color-primary)",
                            marginBottom: "var(--spacing-md)",
                            textAlign: "center",
                        }}>
                            {t('languagesHeading')}
                        </h2>
                        <p style={{
                            color: "var(--color-text-muted)",
                            fontSize: "1.05rem",
                            lineHeight: 1.7,
                            textAlign: "center",
                            marginBottom: "var(--spacing-md)",
                        }}>
                            {t('languagesIntro')}
                        </p>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: "var(--spacing-md)",
                            maxWidth: "640px",
                            margin: "0 auto",
                        }}>
                            {[
                                { flag: "🇵🇱", label: t('langPL'), level: t('langPLLevel') },
                                { flag: "🇬🇧", label: t('langEN'), level: t('langENLevel') },
                                { flag: "🇩🇪", label: t('langDE'), level: t('langDELevel') },
                            ].map((l) => (
                                <div key={l.label} style={{
                                    background: "var(--color-background)",
                                    border: "1px solid var(--color-surface-hover)",
                                    borderRadius: "2px",
                                    padding: "var(--spacing-md)",
                                    textAlign: "center",
                                }}>
                                    <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{l.flag}</div>
                                    <div style={{ fontWeight: 600, color: "var(--color-text-main)" }}>{l.label}</div>
                                    <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                                        {l.level}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </RevealOnScroll>
                </div>
            </section>

            {/* W mediach — visible social links (Person.sameAs robi to dla Google, ale visible HTML też potrzebne dla user trust) */}
            <section className="section" style={{ padding: "var(--spacing-xl) 0" }}>
                <div className="container" style={{ maxWidth: "820px" }}>
                    <RevealOnScroll>
                        <h2 style={{
                            fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)",
                            color: "var(--color-primary)",
                            marginBottom: "var(--spacing-md)",
                            textAlign: "center",
                        }}>
                            {t('mediaHeading')}
                        </h2>
                        <p style={{
                            color: "var(--color-text-muted)",
                            fontSize: "1rem",
                            lineHeight: 1.6,
                            textAlign: "center",
                            marginBottom: "var(--spacing-md)",
                        }}>
                            {t('mediaIntro')}
                        </p>

                        {/* Featured: Blog ekspercki na nowosielski.pl (Cross-Link Sprint, 2026-05-21) */}
                        <a
                            href="https://nowosielski.pl"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "block",
                                background: "linear-gradient(135deg, var(--color-surface) 0%, var(--color-background) 100%)",
                                border: "1px solid var(--color-primary)",
                                borderRadius: "4px",
                                padding: "var(--spacing-md) var(--spacing-lg)",
                                marginBottom: "var(--spacing-md)",
                                textDecoration: "none",
                                color: "var(--color-text-main)",
                                boxShadow: "0 0 0 0 transparent",
                                transition: "all 0.25s ease",
                            }}
                            className="cross-link-card"
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)", flexWrap: "wrap" }}>
                                <div style={{ fontSize: "2rem", lineHeight: 1 }}>✍️</div>
                                <div style={{ flex: 1, minWidth: "240px" }}>
                                    <div style={{
                                        color: "var(--color-primary)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.12em",
                                        fontSize: "0.75rem",
                                        marginBottom: "0.25rem",
                                    }}>
                                        {t('mediaFeaturedTag')}
                                    </div>
                                    <div style={{
                                        fontSize: "1.15rem",
                                        fontWeight: 600,
                                        marginBottom: "0.25rem",
                                    }}>
                                        {t('mediaFeaturedTitle')} <span style={{ color: "var(--color-primary)" }}>↗</span>
                                    </div>
                                    <div style={{
                                        color: "var(--color-text-muted)",
                                        fontSize: "0.95rem",
                                        lineHeight: 1.5,
                                    }}>
                                        {t('mediaFeaturedDesc')}
                                    </div>
                                </div>
                            </div>
                        </a>

                        <div style={{
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "center",
                            gap: "var(--spacing-sm)",
                        }}>
                            {[
                                { label: "📺 YouTube · @DentistMarcIn", href: "https://www.youtube.com/c/DentistMarcIn" },
                                { label: "📷 Instagram · @nowosielski_marcin", href: "https://www.instagram.com/nowosielski_marcin/" },
                                { label: "🎵 TikTok · @nowosielskimarcin", href: "https://www.tiktok.com/@nowosielskimarcin" },
                                { label: "📘 Facebook", href: "https://www.facebook.com/marcindentist" },
                            ].map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: "inline-block",
                                        padding: "0.6rem 1rem",
                                        background: "var(--color-surface)",
                                        border: "1px solid var(--color-surface-hover)",
                                        borderRadius: "2px",
                                        color: "var(--color-text-main)",
                                        textDecoration: "none",
                                        fontSize: "0.95rem",
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    {link.label}
                                </a>
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
                            href="/rezerwacja"
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
