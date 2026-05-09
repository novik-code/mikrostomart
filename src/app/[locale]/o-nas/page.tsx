"use client";

import Image from "next/image";
import { brandI18nParams } from '@/lib/brandConfig';
import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/RevealOnScroll";
import InteriorCollage from "@/components/InteriorCollage";
import { useState } from "react";

export default function AboutPage() {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const t = useTranslations('oNas');

    return (
        <main>
            {/* Intro Section - Editorial Style */}
            <section className="section" style={{ padding: "var(--spacing-xl) 0" }}>
                <div className="container">
                    <RevealOnScroll>
                        <p style={{
                            textAlign: "center",
                            color: "var(--color-primary)",
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            fontSize: "0.9rem",
                            marginBottom: "var(--spacing-md)"
                        }}>
                            {t('tagline')}
                        </p>
                        <h1 style={{
                            fontSize: "clamp(3rem, 6vw, 5rem)",
                            color: "var(--color-text-main)",
                            marginBottom: "var(--spacing-xl)",
                            textAlign: "center",
                            fontWeight: 400,
                            lineHeight: 1.1
                        }}>
                            {t('title')} <br />
                            <span style={{ fontStyle: "italic", color: "var(--color-text-muted)" }}>{t('titleItalic')}</span>
                        </h1>
                    </RevealOnScroll>

                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                        gap: "var(--spacing-xl)",
                        alignItems: "stretch"
                    }}>
                        <RevealOnScroll animation="blur-in" delay={100}>
                            <div style={{
                                minHeight: "500px",
                                height: "100%",
                                width: "100%",
                                position: "relative"
                            }}>
                                <InteriorCollage />
                            </div>
                        </RevealOnScroll>

                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                            <RevealOnScroll delay={200}>
                                <h3 style={{ fontSize: "2rem", marginBottom: "var(--spacing-md)", color: "var(--color-primary)" }}>
                                    {t('mission')}
                                </h3>
                                <p style={{ marginBottom: "var(--spacing-md)", color: "var(--color-text-muted)", fontSize: "1.1rem", lineHeight: 1.8 }}>
                                    {t('missionText1')}
                                </p>
                                <p style={{ color: "var(--color-text-muted)", fontSize: "1.1rem", lineHeight: 1.8 }}>
                                    {t('missionText2', brandI18nParams())}
                                </p>
                            </RevealOnScroll>
                        </div>
                    </div>
                </div>
            </section>

            {/* Ela Nowosielska Section (Image Left, Text Right) */}
            <section className="section" style={{ background: "var(--color-surface)", padding: "var(--spacing-xl) 0", borderBottom: "1px solid var(--color-surface-hover)" }}>
                <div className="container">
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                        gap: "var(--spacing-xl)",
                        alignItems: "center"
                    }}>
                        {/* Image First (Order 1) */}
                        <RevealOnScroll animation="blur-in" delay={100} className="order-1-mobile">
                            <div
                                style={{
                                    width: '100%',
                                    aspectRatio: '3/4',
                                    position: 'relative',
                                    borderRadius: '2px',
                                    border: '1px solid var(--color-surface-hover)',
                                    padding: '10px',
                                    background: 'transparent',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={() => setExpanded(prev => ({ ...prev, 'ela-img': true }))}
                                onMouseLeave={() => setExpanded(prev => ({ ...prev, 'ela-img': false }))}
                            >
                                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                                    <Image
                                        src="/ela-main.jpg"
                                        alt="Elżbieta Nowosielska"
                                        fill
                                        style={{ objectFit: 'cover' }}
                                    />
                                    <Image
                                        src="/ela-final.jpg"
                                        alt="Elżbieta Nowosielska Professional"
                                        fill
                                        style={{
                                            objectFit: 'cover',
                                            opacity: expanded['ela-img'] ? 1 : 0,
                                            transition: 'opacity 0.5s ease-in-out',
                                            filter: 'grayscale(100%)'
                                        }}
                                    />
                                </div>
                            </div>
                        </RevealOnScroll>

                        {/* Text Second (Order 2) */}
                        <div
                            style={{ paddingLeft: "var(--spacing-md)" }}
                            onMouseEnter={() => setExpanded(prev => ({ ...prev, 'ela': true }))}
                            onMouseLeave={() => setExpanded(prev => ({ ...prev, 'ela': false }))}
                        >
                            <RevealOnScroll>
                                <p style={{
                                    color: "var(--color-primary)",
                                    marginBottom: "var(--spacing-sm)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em"
                                }}>
                                    {t('elaRole')}
                                </p>
                                <h2 style={{ fontSize: "3rem", marginBottom: "var(--spacing-md)", lineHeight: 1.1 }}>
                                    Elżbieta Nowosielska
                                </h2>
                                <blockquote style={{
                                    fontStyle: "italic",
                                    marginBottom: "var(--spacing-md)",
                                    color: "var(--color-text-main)",
                                    fontSize: "1.2rem",
                                    borderLeft: "2px solid var(--color-primary)",
                                    paddingLeft: "var(--spacing-md)"
                                }}>
                                    &quot;{t('elaQuote')}&quot;
                                </blockquote>
                                <div style={{ marginBottom: "var(--spacing-sm)", color: "var(--color-text-muted)", fontSize: "1.1rem", lineHeight: 1.6, textAlign: 'justify' }}>
                                    <p style={{ marginBottom: "1rem" }}>
                                        {t('elaText1')}
                                    </p>

                                    <div className={`reveal ${expanded['ela'] ? 'active' : ''}`} style={{
                                        maxHeight: expanded['ela'] ? '1000px' : '0',
                                        overflow: 'hidden',
                                        transition: 'max-height 0.8s ease-in-out',
                                        opacity: expanded['ela'] ? 1 : 0
                                    }}>
                                        <p style={{ marginBottom: "1rem" }}>
                                            {t('elaText2')}
                                        </p>
                                        <p>
                                            {t('elaText3')}
                                        </p>
                                    </div>

                                    {!expanded['ela'] && (
                                        <span style={{
                                            display: 'block',
                                            marginTop: '1rem',
                                            color: 'var(--color-primary)',
                                            fontSize: '0.8rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.1em',
                                            cursor: 'pointer'
                                        }}>
                                            {t('hoverExpand')}
                                        </span>
                                    )}
                                </div>
                            </RevealOnScroll>
                        </div>
                    </div>
                </div>
            </section>

            {/* Marcin Nowosielski Section (Text Left, Image Right) */}
            <section className="section" style={{ background: "var(--color-surface)", padding: "var(--spacing-xl) 0" }}>
                <div className="container">
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                        gap: "var(--spacing-xl)",
                        alignItems: "center"
                    }}>
                        {/* Text First (Order 1 on Desktop) */}
                        <div
                            style={{ paddingRight: "var(--spacing-md)", order: 1 }}
                            onMouseEnter={() => setExpanded(prev => ({ ...prev, 'marcin': true }))}
                            onMouseLeave={() => setExpanded(prev => ({ ...prev, 'marcin': false }))}
                        >
                            <RevealOnScroll>
                                <p style={{
                                    color: "var(--color-primary)",
                                    marginBottom: "var(--spacing-sm)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em"
                                }}>
                                    {t('marcinRole')}
                                </p>
                                <h2 style={{ fontSize: "3rem", marginBottom: "var(--spacing-md)", lineHeight: 1.1 }}>
                                    lek. dent. M. Sc.<br /> Marcin Nowosielski
                                </h2>
                                <blockquote style={{
                                    fontStyle: "italic",
                                    marginBottom: "var(--spacing-md)",
                                    color: "var(--color-text-main)",
                                    fontSize: "1.2rem",
                                    borderLeft: "2px solid var(--color-primary)",
                                    paddingLeft: "var(--spacing-md)"
                                }}>
                                    &quot;{t('marcinQuote')}&quot;
                                </blockquote>
                                <div style={{ marginBottom: "var(--spacing-sm)", color: "var(--color-text-muted)", fontSize: "1.1rem", lineHeight: 1.6, textAlign: 'justify' }}>
                                    <p style={{ marginBottom: "1rem" }}>
                                        {t('marcinText1')}
                                    </p>

                                    <div className={`reveal ${expanded['marcin'] ? 'active' : ''}`} style={{
                                        maxHeight: expanded['marcin'] ? '1000px' : '0',
                                        overflow: 'hidden',
                                        transition: 'max-height 0.8s ease-in-out',
                                        opacity: expanded['marcin'] ? 1 : 0
                                    }}>
                                        <p style={{ marginBottom: "1rem" }}>
                                            {t('marcinText2')}
                                        </p>
                                        <p style={{ marginBottom: "1rem" }}>
                                            {t('marcinText3')}
                                        </p>
                                        <p>
                                            {t('marcinText4')}
                                        </p>
                                    </div>

                                    {!expanded['marcin'] && (
                                        <span style={{
                                            display: 'block',
                                            marginTop: '1rem',
                                            color: 'var(--color-primary)',
                                            fontSize: '0.8rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.1em',
                                            cursor: 'pointer'
                                        }}>
                                            {t('hoverExpand')}
                                        </span>
                                    )}
                                </div>
                            </RevealOnScroll>
                        </div>

                        {/* Image Second (Order 2 on Desktop) */}
                        <RevealOnScroll animation="blur-in" delay={100} className="order-2-mobile" style={{ order: 2 }}>
                            <div
                                style={{
                                    width: '100%',
                                    aspectRatio: '3/4',
                                    position: 'relative',
                                    borderRadius: '2px',
                                    border: '1px solid var(--color-surface-hover)',
                                    padding: '10px',
                                    background: 'transparent',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={() => setExpanded(prev => ({ ...prev, 'marcin-img': true }))}
                                onMouseLeave={() => setExpanded(prev => ({ ...prev, 'marcin-img': false }))}
                            >
                                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                                    <Image
                                        src="/marcin-main.jpg"
                                        alt="Marcin Nowosielski"
                                        fill
                                        style={{ objectFit: 'cover', objectPosition: 'top' }}
                                    />
                                    <Image
                                        src="/marcin-final.jpg"
                                        alt="Marcin Nowosielski Professional"
                                        fill
                                        style={{
                                            objectFit: 'cover',
                                            objectPosition: 'top',
                                            opacity: expanded['marcin-img'] ? 1 : 0,
                                            transition: 'opacity 0.5s ease-in-out',
                                            filter: 'grayscale(100%)'
                                        }}
                                    />
                                </div>
                            </div>
                        </RevealOnScroll>
                    </div>
                </div>
            </section>
        </main>
    );
}
