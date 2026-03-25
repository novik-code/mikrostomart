"use client";

import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/RevealOnScroll";
import AnimatedPhone from "@/components/AnimatedPhone";
import AnimatedAt from "@/components/AnimatedAt";
import ContactForm from "@/components/ContactForm";
import { brand } from "@/lib/brandConfig";
import { isDemoMode } from "@/lib/demoMode";

export default function ContactPage() {
    const t = useTranslations('kontakt');

    // Demo: generic Warsaw map embed
    const mapSrc = isDemoMode
        ? "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2443.907!2d21.012229!3d52.229676!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x471ecc669a869f01%3A0x72f0be2a88ead3fc!2sWarszawa!5e0!3m2!1spl!2spl"
        : "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2528.274384666504!2d17.86616297693526!3d50.677682371636184!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x471053a479cde783%3A0xe544973347f32770!2sCentralna%2033a%2C%2045-940%20Opole!5e0!3m2!1spl!2spl!4v1714488800000!5m2!1spl!2spl";

    const phone1Raw = brand.phone1.replace(/-/g, '');
    const phone2Raw = brand.phone2.replace(/-/g, '');

    return (
        <main>
            <section className="section" style={{ paddingBottom: 0 }}>
                <div className="container">
                    <RevealOnScroll>
                        <h1 style={{
                            fontSize: "clamp(3rem, 6vw, 6rem)",
                            color: "var(--color-text-main)",
                            marginBottom: "var(--spacing-xl)",
                            textAlign: "center",
                            fontWeight: 400
                        }}>
                            {t('title')}
                        </h1>
                    </RevealOnScroll>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "var(--spacing-xl)" }}>

                        {/* Contact Info */}
                        <RevealOnScroll delay={100} className="h-full">
                            <div style={{ padding: "var(--spacing-lg)", background: "var(--color-surface)", borderRadius: "2px", height: "100%" }}>
                                <h2 style={{ marginBottom: "var(--spacing-lg)", color: "var(--color-primary)" }}>{t('visitUs')}</h2>

                                <div style={{ marginBottom: "var(--spacing-lg)" }}>
                                    <p style={{ color: "var(--color-text-main)", fontSize: "1.2rem", lineHeight: 1.6 }}>
                                        {brand.streetAddress}<br />
                                        {brand.postalCode} {brand.city}
                                    </p>
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(brand.streetAddress + ', ' + brand.postalCode + ' ' + brand.city)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.6rem",
                                            marginTop: "0.75rem",
                                            padding: "0.6rem 1.2rem",
                                            background: "var(--color-primary)",
                                            color: "black",
                                            fontWeight: 700,
                                            fontSize: "0.95rem",
                                            borderRadius: "2px",
                                            textDecoration: "none",
                                            transition: "opacity 0.2s",
                                        }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                                    >
                                        🗺️ Nawiguj do gabinetu
                                    </a>
                                </div>

                                <div style={{ marginBottom: "var(--spacing-lg)" }}>
                                    <div style={{ marginBottom: "1rem" }}>
                                        <a href={`tel:+48${phone1Raw}`} style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "1rem",
                                            color: "var(--color-primary)",
                                            textDecoration: "none",
                                            marginBottom: "0.2rem"
                                        }}>
                                            <AnimatedPhone size={32} color="var(--color-primary)" />
                                            <span style={{ fontSize: "clamp(1.3rem, 5vw, 2rem)", fontWeight: "bold" }}>{brand.phone1}</span>
                                        </a>
                                        <p style={{ paddingLeft: "3rem", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>{t('mainPhone')}</p>
                                    </div>

                                    <div>
                                        <a href={`tel:+48${phone2Raw}`} style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "1rem",
                                            color: "var(--color-primary)",
                                            textDecoration: "none",
                                            marginBottom: "0.2rem"
                                        }}>
                                            <AnimatedPhone size={32} color="var(--color-primary)" />
                                            <span style={{ fontSize: "clamp(1.3rem, 5vw, 2rem)", fontWeight: "bold" }}>{brand.phone2}</span>
                                        </a>
                                        <p style={{ paddingLeft: "3rem", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>{t('altPhone')}</p>
                                    </div>

                                    <div style={{ marginTop: "1.5rem" }}>
                                        <a href={`mailto:${brand.email}`} style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "1rem",
                                            color: "var(--color-primary)",
                                            textDecoration: "none"
                                        }}>
                                            <AnimatedAt size={32} color="var(--color-primary)" />
                                            <span style={{ fontSize: "clamp(0.85rem, 3.5vw, 1.5rem)", wordBreak: "break-all" }}>{brand.email}</span>
                                        </a>
                                    </div>
                                </div>

                                <div style={{ borderTop: "1px solid var(--color-surface-hover)", paddingTop: "var(--spacing-lg)" }}>
                                    <p style={{ marginBottom: "var(--spacing-xs)", color: "var(--color-text-muted)" }}>{t('openingHours')}</p>
                                    <ul style={{ listStyle: "none", color: "var(--color-text-main)", fontSize: "1.1rem", lineHeight: 1.8 }}>
                                        <li><strong>{t('monThu')}</strong> 9.00 - 20.00</li>
                                        <li><strong>{t('fri')}</strong> 9.00 - 16.00</li>
                                        <li><strong>{t('sat')}</strong> {t('satValue')}</li>
                                    </ul>
                                </div>
                            </div>
                        </RevealOnScroll>

                        {/* Map */}
                        <RevealOnScroll delay={200} className="h-full">
                            <div style={{
                                borderRadius: "2px",
                                overflow: "hidden",
                                minHeight: "500px",
                                height: "100%",
                                width: "100%",
                                position: "relative"
                            }}>
                                <iframe
                                    src={mapSrc}
                                    style={{ border: 0, width: "100%", height: "100%", filter: "grayscale(100%) invert(10%) contrast(80%)" }}
                                    allowFullScreen={true}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                ></iframe>
                            </div>
                        </RevealOnScroll>

                    </div>
                </div>
            </section>

            {/* Simple Contact Form */}
            <section className="section">
                <div className="container" style={{ maxWidth: "700px" }}>
                    <RevealOnScroll animation="fade-up">
                        <h2 style={{ textAlign: "center", marginBottom: "var(--spacing-lg)", fontSize: "2rem", fontWeight: 400 }}>
                            {t('formTitle')} <span style={{ color: "var(--color-primary)" }}>{t('formHighlight')}</span>
                        </h2>
                        <ContactForm />
                    </RevealOnScroll>
                </div>
            </section>
        </main>
    );
}
