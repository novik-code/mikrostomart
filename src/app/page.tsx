"use client";

import YouTubeFeed from "@/components/YouTubeFeed";
import GoogleReviews from "@/components/GoogleReviews";
import Link from "next/link";
import RevealOnScroll from "@/components/RevealOnScroll";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/context/ThemeContext";
import { isDemoMode } from "@/lib/demoMode";
import type { PageSection } from "@/lib/sections";

// ===================== HERO VARIANTS =====================

type HeroLayout = 'centered' | 'split-right' | 'split-left' | 'fullscreen-video' | 'centered-compact';

function HeroSection({ layout = 'centered' }: { layout?: HeroLayout }) {
    const tHero = useTranslations('hero');
    const tCta = useTranslations();

    const tagline = isDemoMode ? 'System zarządzania gabinetem' : tHero('tagline');
    const title1 = tHero('title1');
    const title2 = tHero('title2');
    const desc = isDemoMode
        ? 'Odkryj DensFlow — kompleksowy system do zarządzania gabinetem stomatologicznym. Rezerwacje, panel pacjenta, zarządzanie zespołem i automatyzacja.'
        : tHero('description');
    const ctaText = tCta('bookConsultationCta');

    const textBlock = (
        <>
            <RevealOnScroll animation="blur-in">
                <p style={{
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    color: "var(--color-primary)",
                    fontSize: "0.85rem",
                    marginBottom: "var(--spacing-sm)"
                }}>
                    {tagline}
                </p>
            </RevealOnScroll>
            <RevealOnScroll animation="blur-in" delay={100}>
                <h1 style={{
                    fontSize: layout === 'centered-compact' ? "clamp(2rem, 5vw, 4rem)" : "clamp(3rem, 7vw, 6rem)",
                    marginBottom: "var(--spacing-md)",
                    lineHeight: 1.1,
                    fontWeight: layout === 'fullscreen-video' ? 300 : 400
                }}>
                    {title1} <br />
                    <span style={{ fontStyle: "italic", color: "var(--color-primary-light)" }}>{title2}</span>
                </h1>
            </RevealOnScroll>
            <RevealOnScroll animation="fade-up" delay={200}>
                <p style={{
                    fontSize: "1.1rem",
                    opacity: 0.8,
                    maxWidth: "600px",
                    margin: layout === 'centered' || layout === 'centered-compact' || layout === 'fullscreen-video' ? "0 auto var(--spacing-lg)" : "0 0 var(--spacing-lg)",
                    lineHeight: 1.8
                }}>
                    {desc}
                </p>
                <div style={{ display: "flex", gap: "var(--spacing-md)", justifyContent: layout === 'centered' || layout === 'centered-compact' || layout === 'fullscreen-video' ? "center" : "flex-start" }}>
                    <Link href="/rezerwacja" className="btn-primary" style={{ padding: "1rem 2.5rem", fontSize: "1rem" }}>
                        {ctaText}
                    </Link>
                </div>
            </RevealOnScroll>
        </>
    );

    // --- Centered (default mikrostomart) ---
    if (layout === 'centered') {
        return (
            <section className="section hero" style={{
                minHeight: "90vh", display: "flex", flexDirection: "column",
                justifyContent: "center", alignItems: "center", textAlign: "center",
                position: "relative", overflow: "hidden", padding: "0 var(--spacing-sm)"
            }}>
                <div className="container" style={{ maxWidth: "1000px", zIndex: 1 }}>
                    {textBlock}
                </div>
            </section>
        );
    }

    // --- Centered Compact (like Ambasada Uśmiechu) ---
    if (layout === 'centered-compact') {
        return (
            <section className="section hero" style={{
                minHeight: "60vh", display: "flex", flexDirection: "column",
                justifyContent: "center", alignItems: "center", textAlign: "center",
                position: "relative", overflow: "hidden", padding: "var(--spacing-xl) var(--spacing-sm)",
                background: "var(--color-surface)"
            }}>
                <div className="container" style={{ maxWidth: "800px", zIndex: 1 }}>
                    {textBlock}
                </div>
            </section>
        );
    }

    // --- Fullscreen Video (like Nawrocki Clinic) ---
    if (layout === 'fullscreen-video') {
        return (
            <section className="section hero" style={{
                minHeight: "100vh", display: "flex", flexDirection: "column",
                justifyContent: "center", alignItems: "center", textAlign: "center",
                position: "relative", overflow: "hidden", padding: "0 var(--spacing-sm)"
            }}>
                <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.7) 100%)",
                    zIndex: 1
                }} />
                <div className="container" style={{ maxWidth: "900px", zIndex: 2 }}>
                    {textBlock}
                </div>
            </section>
        );
    }

    // --- Split Right (like LePerle — text left, visual right) ---
    if (layout === 'split-right') {
        return (
            <section className="section hero" style={{
                minHeight: "85vh", display: "flex", alignItems: "center",
                position: "relative", overflow: "hidden", padding: "var(--spacing-xl) var(--spacing-sm)"
            }}>
                <div className="container" style={{ zIndex: 1 }}>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                        gap: "var(--spacing-xl)", alignItems: "center"
                    }}>
                        <div style={{ textAlign: "left" }}>
                            {textBlock}
                        </div>
                        <RevealOnScroll animation="fade-up" delay={300}>
                            <div style={{
                                width: "100%", height: "450px",
                                borderRadius: "var(--radius-lg)",
                                background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                                opacity: 0.15,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "4rem"
                            }}>
                                🦷
                            </div>
                        </RevealOnScroll>
                    </div>
                </div>
            </section>
        );
    }

    // --- Split Left (like One&Only — visual left, text right) ---
    return (
        <section className="section hero" style={{
            minHeight: "90vh", display: "flex", alignItems: "center",
            position: "relative", overflow: "hidden", padding: "var(--spacing-xl) var(--spacing-sm)"
        }}>
            <div className="container" style={{ zIndex: 1 }}>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                    gap: "var(--spacing-xl)", alignItems: "center"
                }}>
                    <RevealOnScroll animation="fade-up">
                        <div style={{
                            width: "100%", height: "500px",
                            borderRadius: "var(--radius-md)",
                            background: "linear-gradient(135deg, var(--color-surface), var(--color-surface-hover))",
                            border: "1px solid var(--color-surface-hover)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "5rem"
                        }}>
                            ✨
                        </div>
                    </RevealOnScroll>
                    <div style={{ textAlign: "left" }}>
                        {textBlock}
                    </div>
                </div>
            </div>
        </section>
    );
}

// ===================== EXISTING SECTIONS =====================

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
                                width: "100%", height: "500px",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--color-surface-hover)",
                                overflow: "hidden", position: "relative"
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
                            display: 'inline-block', padding: '1rem 2.5rem',
                            background: '#000', color: 'var(--color-primary)',
                            borderRadius: 'var(--radius-md)', fontWeight: 700,
                            fontSize: '1rem', textDecoration: 'none', transition: 'transform 0.2s',
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

// ===================== NEW SECTIONS =====================

function OfferSection() {
    const services = [
        { icon: '🦷', title: 'Stomatologia zachowawcza', desc: 'Leczenie próchnicy, wypełnienia, endodoncja' },
        { icon: '✨', title: 'Stomatologia estetyczna', desc: 'Licówki, bonding, wybielanie zębów' },
        { icon: '🔧', title: 'Implantologia', desc: 'Implanty zębowe, odbudowa uzębienia' },
        { icon: '😁', title: 'Ortodoncja', desc: 'Invisalign, aparaty stałe i ruchome' },
        { icon: '🏥', title: 'Chirurgia stomatologiczna', desc: 'Ekstrakcje, zabiegi chirurgiczne' },
        { icon: '🛡️', title: 'Profilaktyka', desc: 'Higiena, scaling, fluoryzacja' },
    ];
    return (
        <section className="section" style={{ background: 'var(--color-surface)' }}>
            <div className="container">
                <RevealOnScroll>
                    <h2 style={{
                        fontSize: '2.5rem', textAlign: 'center',
                        marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-main)'
                    }}>
                        Nasza <span style={{ color: 'var(--color-primary)' }}>oferta</span>
                    </h2>
                </RevealOnScroll>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 'var(--spacing-md)',
                }}>
                    {services.map((s, i) => (
                        <RevealOnScroll key={i} delay={i * 80}>
                            <Link href="/oferta" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    background: 'var(--color-background)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--color-surface-hover)',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    cursor: 'pointer',
                                }}>
                                    <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-xs)' }}>{s.icon}</div>
                                    <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>{s.title}</h3>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>{s.desc}</p>
                                </div>
                            </Link>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}

function FAQSection() {
    const [openIdx, setOpenIdx] = useState<number | null>(null);
    const faqs = [
        { q: 'Jak umówić się na wizytę?', a: 'Możesz zarezerwować wizytę online przez nasz formularz rezerwacyjny, zadzwonić do rejestracji lub napisać do nas przez formularz kontaktowy.' },
        { q: 'Czy przyjmujecie pacjentów z bólem zęba w trybie pilnym?', a: 'Tak, staramy się przyjmować pacjentów z ostrym bólem w dniu zgłoszenia. Prosimy o kontakt telefoniczny.' },
        { q: 'Jakie metody płatności akceptujecie?', a: 'Akceptujemy gotówkę, karty płatnicze, BLIK oraz oferujemy możliwość płatności ratalnej.' },
        { q: 'Czy oferujecie leczenie w znieczuleniu?', a: 'Tak, wszystkie zabiegi mogą być wykonane w znieczuleniu miejscowym. Na życzenie oferujemy również sedację.' },
        { q: 'Ile kosztuje pierwsza wizyta?', a: 'Pierwsza konsultacja jest wyceniana indywidualnie. Skontaktuj się z nami, aby poznać szczegóły.' },
    ];
    return (
        <section className="section">
            <div className="container" style={{ maxWidth: '800px' }}>
                <RevealOnScroll>
                    <h2 style={{
                        fontSize: '2.5rem', textAlign: 'center',
                        marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-main)'
                    }}>
                        Najczęściej zadawane <span style={{ color: 'var(--color-primary)' }}>pytania</span>
                    </h2>
                </RevealOnScroll>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {faqs.map((faq, i) => (
                        <RevealOnScroll key={i} delay={i * 60}>
                            <div style={{
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-surface-hover)',
                                overflow: 'hidden', background: 'var(--color-surface)',
                            }}>
                                <button
                                    onClick={() => setOpenIdx(openIdx === i ? null : i)}
                                    style={{
                                        width: '100%', padding: '1rem 1.25rem',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        color: 'var(--color-text-main)', fontSize: '1rem', fontWeight: 600,
                                        textAlign: 'left',
                                    }}
                                >
                                    {faq.q}
                                    <span style={{
                                        transform: openIdx === i ? 'rotate(180deg)' : '', transition: 'transform 0.2s',
                                        fontSize: '1.2rem', color: 'var(--color-primary)', flexShrink: 0, marginLeft: '1rem'
                                    }}>▼</span>
                                </button>
                                {openIdx === i && (
                                    <div style={{
                                        padding: '0 1.25rem 1rem',
                                        color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.7,
                                    }}>
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}

function TeamSection() {
    const team = [
        { name: 'Dr Anna Kowalska', role: 'Stomatologia estetyczna', emoji: '👩‍⚕️' },
        { name: 'Dr Jan Nowak', role: 'Implantologia', emoji: '👨‍⚕️' },
        { name: 'Dr Maria Wiśniewska', role: 'Ortodoncja', emoji: '👩‍⚕️' },
        { name: 'Dr Piotr Zieliński', role: 'Chirurgia stomatologiczna', emoji: '👨‍⚕️' },
    ];
    return (
        <section className="section" style={{ background: 'var(--color-surface)' }}>
            <div className="container">
                <RevealOnScroll>
                    <h2 style={{
                        fontSize: '2.5rem', textAlign: 'center',
                        marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-main)'
                    }}>
                        Nasz <span style={{ color: 'var(--color-primary)' }}>zespół</span>
                    </h2>
                    <p style={{
                        textAlign: 'center', color: 'var(--color-text-muted)',
                        marginBottom: 'var(--spacing-lg)', maxWidth: '500px', margin: '0 auto var(--spacing-lg)'
                    }}>
                        Poznaj specjalistów, którzy zadbają o Twój uśmiech
                    </p>
                </RevealOnScroll>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 'var(--spacing-md)',
                }}>
                    {team.map((member, i) => (
                        <RevealOnScroll key={i} delay={i * 100}>
                            <div style={{
                                textAlign: 'center', padding: 'var(--spacing-lg) var(--spacing-md)',
                                background: 'var(--color-background)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-surface-hover)'
                            }}>
                                <div style={{
                                    width: '100px', height: '100px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto var(--spacing-sm)', fontSize: '2.5rem', opacity: 0.9
                                }}>
                                    {member.emoji}
                                </div>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.3rem', color: 'var(--color-text-main)' }}>{member.name}</h3>
                                <p style={{ color: 'var(--color-primary)', fontSize: '0.85rem' }}>{member.role}</p>
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}

function ContactSection() {
    return (
        <section className="section">
            <div className="container">
                <RevealOnScroll>
                    <h2 style={{
                        fontSize: '2.5rem', textAlign: 'center',
                        marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-main)'
                    }}>
                        <span style={{ color: 'var(--color-primary)' }}>Skontaktuj się</span> z nami
                    </h2>
                </RevealOnScroll>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: 'var(--spacing-xl)', alignItems: 'start'
                }}>
                    <RevealOnScroll>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {[
                                { icon: '📍', label: 'Adres', value: 'ul. Przykładowa 12, 00-000 Miasto' },
                                { icon: '📞', label: 'Telefon', value: '+48 123 456 789' },
                                { icon: '✉️', label: 'Email', value: 'kontakt@gabinet.pl' },
                                { icon: '🕐', label: 'Godziny', value: 'Pon-Pt: 8:00-20:00, Sob: 9:00-14:00' },
                            ].map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex', gap: '1rem', alignItems: 'flex-start',
                                    padding: 'var(--spacing-sm)',
                                    background: 'var(--color-surface)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--color-surface-hover)',
                                }}>
                                    <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '0.9rem' }}>{item.label}</div>
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{item.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </RevealOnScroll>
                    <RevealOnScroll delay={100}>
                        <div style={{
                            padding: 'var(--spacing-md)',
                            background: 'var(--color-surface)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-surface-hover)',
                        }}>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: 'var(--spacing-sm)', color: 'var(--color-primary)' }}>
                                Napisz do nas
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <input placeholder="Imię i nazwisko" style={inputStyle} />
                                <input placeholder="Email" type="email" style={inputStyle} />
                                <input placeholder="Telefon" type="tel" style={inputStyle} />
                                <textarea placeholder="Wiadomość..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                                <Link href="/kontakt" className="btn-primary" style={{
                                    display: 'block', textAlign: 'center',
                                    padding: '0.8rem', fontSize: '0.95rem'
                                }}>
                                    Wyślij wiadomość
                                </Link>
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>
            </div>
        </section>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.7rem 0.9rem',
    background: 'var(--color-background)',
    border: '1px solid var(--color-surface-hover)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-main)', fontSize: '0.9rem',
    outline: 'none',
};

function GallerySection() {
    const images = [
        { emoji: '🏥', label: 'Recepcja' },
        { emoji: '💺', label: 'Gabinet' },
        { emoji: '🔬', label: 'Laboratorium' },
        { emoji: '🛋️', label: 'Poczekalnia' },
        { emoji: '🪥', label: 'Sterylizacja' },
        { emoji: '🌿', label: 'Relaks' },
    ];
    return (
        <section className="section">
            <div className="container">
                <RevealOnScroll>
                    <h2 style={{
                        fontSize: '2.5rem', textAlign: 'center',
                        marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-main)'
                    }}>
                        Nasza <span style={{ color: 'var(--color-primary)' }}>klinika</span>
                    </h2>
                </RevealOnScroll>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--spacing-sm)',
                }}>
                    {images.map((img, i) => (
                        <RevealOnScroll key={i} delay={i * 60}>
                            <div style={{
                                aspectRatio: '4/3', borderRadius: 'var(--radius-md)',
                                background: `linear-gradient(135deg, var(--color-surface), var(--color-surface-hover))`,
                                border: '1px solid var(--color-surface-hover)',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                gap: '0.5rem', overflow: 'hidden',
                            }}>
                                <span style={{ fontSize: '2.5rem' }}>{img.emoji}</span>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{img.label}</span>
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ===================== SECTION RENDERER =====================

function renderSection(section: PageSection, onInteraction: () => void, features: any) {
    let content: React.ReactNode = null;
    switch (section.type) {
        case 'hero':
            content = <HeroSection layout={(section.config?.heroLayout as HeroLayout) || 'centered'} />; break;
        case 'values':
            content = <ValuesSection />; break;
        case 'narrative':
            content = <NarrativeSection onInteraction={onInteraction} />; break;
        case 'youtube':
            content = features.youtubeSection ? <YouTubeFeed /> : null; break;
        case 'reviews':
            content = features.googleReviews ? <GoogleReviews /> : null; break;
        case 'offer':
            content = <OfferSection />; break;
        case 'faq':
            content = <FAQSection />; break;
        case 'team':
            content = <TeamSection />; break;
        case 'contact':
            content = <ContactSection />; break;
        case 'gallery':
            content = <GallerySection />; break;
        case 'cta-banner':
            content = <CTABannerSection config={section.config} />; break;
        case 'text-block':
            content = <TextBlockSection config={section.config} />; break;
        default:
            content = null;
    }
    if (!content) return null;
    return (
        <div key={section.id} data-section={section.id}>
            {content}
        </div>
    );
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
        fetch('/api/sections', { cache: 'no-store' })
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
                            position: "absolute", top: "5px", right: "5px",
                            background: "none", border: "none", cursor: "pointer",
                            fontSize: "1.2rem", lineHeight: 1, color: "var(--color-text-muted)"
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
