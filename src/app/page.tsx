"use client";

import YouTubeFeed from "@/components/YouTubeFeed";
import GoogleReviews from "@/components/GoogleReviews";
import Link from "next/link";
import RevealOnScroll from "@/components/RevealOnScroll";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/context/ThemeContext";
import type { PageSection } from "@/lib/sections";

// ===================== SECTION COMPONENTS =====================

function HeroSection() {
    const tHero = useTranslations('hero');
    const tCta = useTranslations();
    return (
        <section className="section hero" style={{
            minHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            padding: "0 var(--spacing-sm)"
        }}>
            <div className="container" style={{ maxWidth: "1000px", zIndex: 1 }}>
                <RevealOnScroll animation="blur-in">
                    <p style={{
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                        color: "var(--color-primary)",
                        fontSize: "0.9rem",
                        marginBottom: "var(--spacing-sm)"
                    }}>
                        {tHero('tagline')}
                    </p>
                </RevealOnScroll>
                <RevealOnScroll animation="blur-in" delay={100}>
                    <h1 style={{
                        fontSize: "clamp(3rem, 7vw, 6rem)",
                        marginBottom: "var(--spacing-md)",
                        lineHeight: 1.1,
                        fontWeight: 400
                    }}>
                        {tHero('title1')} <br />
                        <span style={{ fontStyle: "italic", color: "var(--color-primary-light)" }}>{tHero('title2')}</span>
                    </h1>
                </RevealOnScroll>
                <RevealOnScroll animation="fade-up" delay={200}>
                    <p style={{
                        fontSize: "1.1rem",
                        opacity: 0.8,
                        maxWidth: "600px",
                        margin: "0 auto var(--spacing-lg)",
                        lineHeight: 1.8
                    }}>
                        {tHero('description')}
                    </p>
                    <div style={{ display: "flex", gap: "var(--spacing-md)", justifyContent: "center" }}>
                        <Link href="/rezerwacja" className="btn-primary" style={{ padding: "1rem 2.5rem", fontSize: "1rem" }}>
                            {tCta('bookConsultationCta')}
                        </Link>
                    </div>
                </RevealOnScroll>
            </div>
        </section>
    );
}

function ValuesSection() {
    const tValues = useTranslations('values');
    return (
        <section className="section container">
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "var(--spacing-lg)",
                borderTop: "1px solid var(--color-surface-hover)",
                paddingTop: "var(--spacing-lg)"
            }}>
                <RevealOnScroll delay={0}>
                    <div>
                        <h3 style={{ fontSize: "1.5rem", marginBottom: "var(--spacing-sm)", color: "var(--color-primary)" }}>{tValues('precision')}</h3>
                        <p style={{ color: "var(--color-text-muted)" }}>{tValues('precisionDesc')}</p>
                    </div>
                </RevealOnScroll>
                <RevealOnScroll delay={100}>
                    <div>
                        <h3 style={{ fontSize: "1.5rem", marginBottom: "var(--spacing-sm)", color: "var(--color-primary)" }}>{tValues('aesthetics')}</h3>
                        <p style={{ color: "var(--color-text-muted)" }}>{tValues('aestheticsDesc')}</p>
                    </div>
                </RevealOnScroll>
                <RevealOnScroll delay={200}>
                    <div>
                        <h3 style={{ fontSize: "1.5rem", marginBottom: "var(--spacing-sm)", color: "var(--color-primary)" }}>{tValues('comfort')}</h3>
                        <p style={{ color: "var(--color-text-muted)" }}>{tValues('comfortDesc')}</p>
                    </div>
                </RevealOnScroll>
            </div>
        </section>
    );
}

function NarrativeSection({ onInteraction }: { onInteraction: () => void }) {
    const tNarrative = useTranslations('narrative');
    return (
        <section className="section" style={{ background: "var(--color-surface)" }}>
            <div className="container">
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                    gap: "var(--spacing-xl)",
                    alignItems: "center"
                }}>
                    <div style={{ order: 2 }}>
                        <RevealOnScroll animation="blur-in">
                            <div style={{
                                width: "100%",
                                height: "500px",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--color-surface-hover)",
                                overflow: "hidden",
                                position: "relative"
                            }}>
                                <BeforeAfterSlider
                                    beforeImage="/metamorphosis_before.jpg"
                                    afterImage="/metamorphosis_after.jpg"
                                    onInteraction={onInteraction}
                                />
                            </div>
                        </RevealOnScroll>
                    </div>
                    <div style={{ order: 1 }}>
                        <RevealOnScroll>
                            <h2 style={{ fontSize: "3rem", marginBottom: "var(--spacing-md)" }}>
                                {tNarrative('title1')} <br />
                                <span style={{ color: "var(--color-primary)" }}>{tNarrative('title2')}</span>
                            </h2>
                            <p style={{ marginBottom: "var(--spacing-sm)", color: "var(--color-text-muted)" }}>
                                {tNarrative('description1')}
                            </p>
                            <p style={{ marginBottom: "var(--spacing-md)", color: "var(--color-text-muted)" }}>
                                {tNarrative('description2')}
                            </p>
                        </RevealOnScroll>
                    </div>
                </div>
            </div>
        </section>
    );
}

function CTABannerSection({ config }: { config: Record<string, any> }) {
    return (
        <section style={{
            padding: 'var(--spacing-xl) 0',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
            textAlign: 'center',
        }}>
            <div className="container">
                <RevealOnScroll>
                    <h2 style={{ fontSize: '2.5rem', color: '#000', marginBottom: 'var(--spacing-sm)' }}>
                        {config.title || 'Umów wizytę'}
                    </h2>
                    <p style={{ fontSize: '1.1rem', color: 'rgba(0,0,0,0.7)', marginBottom: 'var(--spacing-md)' }}>
                        {config.subtitle || 'Zadbaj o swój uśmiech już dziś'}
                    </p>
                    <Link
                        href={config.buttonLink || '/rezerwacja'}
                        style={{
                            display: 'inline-block',
                            padding: '1rem 2.5rem',
                            background: '#000',
                            color: 'var(--color-primary)',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 700,
                            fontSize: '1rem',
                            textDecoration: 'none',
                            transition: 'transform 0.2s',
                        }}
                    >
                        {config.buttonText || 'Umów się'}
                    </Link>
                </RevealOnScroll>
            </div>
        </section>
    );
}

function TextBlockSection({ config }: { config: Record<string, any> }) {
    if (!config.content) return null;
    return (
        <section className="section container">
            <RevealOnScroll>
                <div
                    style={{ maxWidth: '800px', margin: '0 auto', lineHeight: 1.8 }}
                    dangerouslySetInnerHTML={{ __html: config.content }}
                />
            </RevealOnScroll>
        </section>
    );
}

// ===================== SECTION RENDERER =====================

function renderSection(section: PageSection, onInteraction: () => void, features: any) {
    switch (section.type) {
        case 'hero':
            return <HeroSection key={section.id} />;
        case 'values':
            return <ValuesSection key={section.id} />;
        case 'narrative':
            return <NarrativeSection key={section.id} onInteraction={onInteraction} />;
        case 'youtube':
            return features.youtubeSection ? <YouTubeFeed key={section.id} /> : null;
        case 'reviews':
            return features.googleReviews ? <GoogleReviews key={section.id} /> : null;
        case 'cta-banner':
            return <CTABannerSection key={section.id} config={section.config} />;
        case 'text-block':
            return <TextBlockSection key={section.id} config={section.config} />;
        default:
            return null;
    }
}

// ===================== DEFAULT SECTIONS =====================

const DEFAULT_ORDER: PageSection[] = [
    { id: 'hero', type: 'hero', visible: true, order: 0, config: {} },
    { id: 'values', type: 'values', visible: true, order: 1, config: {} },
    { id: 'narrative', type: 'narrative', visible: true, order: 2, config: {} },
    { id: 'youtube', type: 'youtube', visible: true, order: 3, config: {} },
    { id: 'reviews', type: 'reviews', visible: true, order: 4, config: {} },
];

// ===================== MAIN PAGE =====================

export default function Home() {
    const [showNotification, setShowNotification] = useState(false);
    const [sections, setSections] = useState<PageSection[]>(DEFAULT_ORDER);
    const tNotification = useTranslations('notification');
    const { theme } = useTheme();
    const f = theme.features;

    // Load sections config
    useEffect(() => {
        fetch('/api/sections')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setSections(data.sort((a: PageSection, b: PageSection) => a.order - b.order));
                }
            })
            .catch(() => { /* use defaults */ });
    }, []);

    return (
        <main>
            {/* Render sections in configured order */}
            {sections
                .filter(s => s.visible)
                .map(section => renderSection(section, () => setShowNotification(true), f))
            }

            {/* Dynamic Notification Toast */}
            {showNotification && (
                <div style={{
                    position: "fixed",
                    bottom: "2rem",
                    right: "2rem",
                    background: "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid var(--color-primary-light)",
                    padding: "1rem 1.5rem",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                    zIndex: 100,
                    animation: "slideIn 0.5s ease-out forwards",
                    maxWidth: "300px"
                }}>
                    <button
                        onClick={() => setShowNotification(false)}
                        style={{
                            position: "absolute",
                            top: "5px",
                            right: "5px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "1.2rem",
                            lineHeight: 1,
                            color: "var(--color-text-muted)"
                        }}
                    >
                        &times;
                    </button>
                    <p style={{ marginBottom: "0.5rem", fontWeight: "bold", color: "var(--color-primary)" }}>
                        {tNotification('likeEffect')}
                    </p>
                    <Link href="/metamorfozy?slide=1" className="btn-primary" style={{ display: "block", textAlign: "center", fontSize: "0.9rem" }}>
                        {tNotification('seeMore')}
                    </Link>
                </div>
            )}
            <style jsx>{`
                @keyframes slideIn {
                    from { transform: translateY(100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </main>
    );
}
