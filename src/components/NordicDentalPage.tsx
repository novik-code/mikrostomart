"use client";

import Link from "next/link";
import RevealOnScroll from "@/components/RevealOnScroll";
import { usePresetId } from "@/context/ThemeContext";
import { getPresetContent, type PresetContent } from "@/lib/presetContent";

// ═══════════════════════════════════════════════════════════════
// NordicDentalPage — Spa-like minimal luxury (OneandonlyClinic-inspired)
// Minimal sticky nav + hamburger, full-screen hero, 3x3 service grid,
// taupe/gold accents, extreme whitespace, wavy dividers
// ═══════════════════════════════════════════════════════════════

export default function NordicDentalPage() {
    const presetId = usePresetId();
    const content = getPresetContent(presetId);

    return (
        <main style={{ background: '#F7F5F2', color: '#2C2420' }}>
            <NordicNav content={content} />
            <NordicHero content={content} />
            <WavyDivider />
            <InteriorShowcase content={content} />
            <WavyDivider flip />
            <AboutSection content={content} />
            <WavyDivider />
            <ServicesGrid content={content} />
            <WavyDivider flip />
            <FeatureHighlight content={content} />
            <WavyDivider />
            <TestimonialsCarousel content={content} />
            <WavyDivider flip />
            <ContactForm content={content} />
            <NordicFooter content={content} />
        </main>
    );
}

// ═══════════════════════════════════════════════════════════════
// MINIMAL STICKY NAV — Logo left, phone+CTA+hamburger right
// ═══════════════════════════════════════════════════════════════

function NordicNav({ content }: { content: PresetContent }) {
    return (
        <nav style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'rgba(247, 245, 242, 0.95)',
            backdropFilter: 'blur(12px)',
            padding: '16px 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
        }}>
            {/* Logo */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'var(--color-primary, #8B7355)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    fontFamily: 'Lato, sans-serif',
                }}>
                    {content.clinicName.charAt(0)}
                </div>
                <span style={{
                    fontSize: '1.1rem',
                    fontWeight: 400,
                    letterSpacing: '0.05em',
                    color: '#2C2420',
                    fontFamily: '"Playfair Display", serif',
                }}>
                    {content.clinicName}
                </span>
            </div>

            {/* Right: Phone, CTA, Hamburger */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2rem',
            }}>
                <a href={`tel:${content.contact.phone.replace(/\s/g, '')}`} style={{
                    color: '#7A6E64',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontFamily: 'Lato, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}>
                    📞 {content.contact.phone}
                </a>
                <Link href="/rezerwacja" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#7A6E64',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontFamily: 'Lato, sans-serif',
                }}>
                    📅 Umów wizytę
                </Link>
                {/* Hamburger */}
                <button style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    padding: '8px',
                }}>
                    <span style={{ width: '24px', height: '1.5px', background: '#2C2420', display: 'block' }} />
                    <span style={{ width: '24px', height: '1.5px', background: '#2C2420', display: 'block' }} />
                    <span style={{ width: '16px', height: '1.5px', background: '#2C2420', display: 'block' }} />
                </button>
            </div>
        </nav>
    );
}

// ═══════════════════════════════════════════════════════════════
// HERO — Full-screen lifestyle, thin heading bottom-left, dual CTAs
// ═══════════════════════════════════════════════════════════════

function NordicHero({ content }: { content: PresetContent }) {
    return (
        <section style={{
            position: 'relative',
            minHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '0 60px 100px',
            overflow: 'hidden',
        }}>
            {/* Video background */}
            <video
                autoPlay
                muted
                loop
                playsInline
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 0,
                }}
            >
                <source src="https://cdn.pixabay.com/video/2025/07/01/288798_large.mp4" type="video/mp4" />
            </video>
            {/* Warm overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(247,245,242,0.82) 0%, rgba(237,232,226,0.78) 100%)',
                zIndex: 1,
            }} />
            {/* Decorative circle */}
            <div style={{
                position: 'absolute',
                width: '500px',
                height: '500px',
                borderRadius: '50%',
                border: '1px solid rgba(139, 115, 85, 0.12)',
                top: '10%',
                right: '10%',
                zIndex: 1,
            }} />
            <div style={{
                position: 'absolute',
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                background: 'rgba(139, 115, 85, 0.06)',
                top: '20%',
                right: '15%',
                zIndex: 1,
            }} />

            <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px' }}>
                <RevealOnScroll animation="blur-in">
                    <h1 style={{
                        fontSize: 'clamp(3rem, 6vw, 5rem)',
                        fontWeight: 300,
                        lineHeight: 1.1,
                        color: '#2C2420',
                        marginBottom: '2rem',
                        fontFamily: '"Playfair Display", serif',
                        letterSpacing: '-0.01em',
                    }}>
                        {content.hero.title1}<br />
                        <span style={{ fontStyle: 'italic', color: 'var(--color-primary, #8B7355)' }}>
                            {content.hero.title2}
                        </span>
                    </h1>
                </RevealOnScroll>

                <RevealOnScroll animation="fade-up" delay={200}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Link href="/rezerwacja" style={{
                            padding: '14px 36px',
                            background: 'var(--color-primary, #8B7355)',
                            color: '#FFFFFF',
                            borderRadius: '100px',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            fontFamily: 'Lato, sans-serif',
                            transition: 'all 0.3s',
                        }}>
                            Umów wizytę →
                        </Link>
                        <Link href="/oferta" style={{
                            padding: '14px 36px',
                            background: 'transparent',
                            color: '#2C2420',
                            border: '1.5px solid var(--color-primary, #8B7355)',
                            borderRadius: '100px',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            fontFamily: 'Lato, sans-serif',
                            transition: 'all 0.3s',
                        }}>
                            Sprawdź ofertę
                        </Link>
                    </div>
                </RevealOnScroll>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// WAVY DIVIDER — SVG wavy line separator
// ═══════════════════════════════════════════════════════════════

function WavyDivider({ flip }: { flip?: boolean }) {
    return (
        <div style={{
            height: '40px',
            overflow: 'hidden',
            transform: flip ? 'scaleY(-1)' : 'none',
            background: 'transparent',
        }}>
            <svg viewBox="0 0 1200 40" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                <path d="M0,20 C300,40 600,0 900,20 C1050,30 1150,15 1200,20 L1200,40 L0,40 Z"
                    fill="rgba(139, 115, 85, 0.06)" />
            </svg>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// INTERIOR SHOWCASE — Full-width with overlay text
// ═══════════════════════════════════════════════════════════════

function InteriorShowcase({ content }: { content: PresetContent }) {
    return (
        <section style={{
            background: '#EDE8E2',
            padding: '100px 60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            minHeight: '50vh',
            position: 'relative',
        }}>
            <div style={{
                position: 'absolute',
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                border: '1px solid rgba(139,115,85,0.15)',
                top: '20%',
                left: '10%',
            }} />
            <RevealOnScroll>
                <p style={{
                    fontSize: '0.7rem',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    color: 'var(--color-primary, #8B7355)',
                    marginBottom: '1rem',
                    fontFamily: 'Lato, sans-serif',
                }}>
                    Wnętrza gabinetu
                </p>
                <h2 style={{
                    fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                    fontWeight: 300,
                    color: '#2C2420',
                    fontFamily: '"Playfair Display", serif',
                    marginBottom: '1rem',
                }}>
                    Komfort i <span style={{ fontStyle: 'italic' }}>elegancja</span>
                </h2>
                <p style={{
                    fontSize: '1rem',
                    color: '#7A6E64',
                    maxWidth: '550px',
                    margin: '0 auto',
                    lineHeight: 1.7,
                    fontFamily: 'Lato, sans-serif',
                }}>
                    {content.about.intro.split('.')[0]}.
                </p>
            </RevealOnScroll>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// ABOUT — 2-column: photo left, mission right
// ═══════════════════════════════════════════════════════════════

function AboutSection({ content }: { content: PresetContent }) {
    return (
        <section style={{
            padding: '100px 60px',
            background: '#F7F5F2',
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4rem',
                alignItems: 'center',
            }}>
                {/* Left: Visual */}
                <RevealOnScroll>
                    <div style={{
                        background: '#EDE8E2',
                        borderRadius: '20px',
                        padding: '80px 40px',
                        textAlign: 'center',
                        fontSize: '4rem',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: '-20px',
                            right: '-20px',
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            border: '1px solid rgba(139,115,85,0.2)',
                        }} />
                        👨‍⚕️👩‍⚕️
                    </div>
                </RevealOnScroll>

                {/* Right: Text */}
                <RevealOnScroll animation="fade-up" delay={150}>
                    <div>
                        <p style={{
                            fontSize: '0.7rem',
                            letterSpacing: '0.25em',
                            textTransform: 'uppercase',
                            color: 'var(--color-primary, #8B7355)',
                            marginBottom: '1rem',
                            fontFamily: 'Lato, sans-serif',
                        }}>
                            O nas
                        </p>
                        <h2 style={{
                            fontSize: '2.5rem',
                            fontWeight: 300,
                            color: '#2C2420',
                            marginBottom: '1.5rem',
                            lineHeight: 1.2,
                            fontFamily: '"Playfair Display", serif',
                        }}>
                            {content.about.title}{' '}
                            <span style={{ fontStyle: 'italic' }}>{content.about.titleItalic}</span>
                        </h2>
                        <p style={{
                            fontSize: '0.95rem',
                            color: '#7A6E64',
                            lineHeight: 1.8,
                            marginBottom: '2rem',
                            fontFamily: 'Lato, sans-serif',
                        }}>
                            {content.about.intro}
                        </p>
                        <Link href="/o-nas" style={{
                            display: 'inline-block',
                            padding: '12px 36px',
                            background: 'var(--color-primary, #8B7355)',
                            color: '#FFFFFF',
                            borderRadius: '100px',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                            fontFamily: 'Lato, sans-serif',
                        }}>
                            Poznaj nas →
                        </Link>
                    </div>
                </RevealOnScroll>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// SERVICES — Spacious 3x3 grid, large whitespace cards, line icons
// ═══════════════════════════════════════════════════════════════

function ServicesGrid({ content }: { content: PresetContent }) {
    return (
        <section style={{
            padding: '100px 60px',
            background: '#FFFFFF',
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <RevealOnScroll>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <p style={{
                            fontSize: '0.7rem',
                            letterSpacing: '0.25em',
                            textTransform: 'uppercase',
                            color: 'var(--color-primary, #8B7355)',
                            marginBottom: '0.75rem',
                            fontFamily: 'Lato, sans-serif',
                        }}>
                            Zakres usług
                        </p>
                        <h2 style={{
                            fontSize: '2.5rem',
                            fontWeight: 300,
                            color: '#2C2420',
                            fontFamily: '"Playfair Display", serif',
                        }}>
                            Nasza <span style={{ fontStyle: 'italic' }}>oferta</span>
                        </h2>
                    </div>
                </RevealOnScroll>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1.5rem',
                }}>
                    {content.services.slice(0, 6).map((svc, i) => (
                        <RevealOnScroll key={i} delay={i * 80}>
                            <Link href="/oferta" style={{ textDecoration: 'none' }}>
                                <div style={{
                                    background: '#F7F5F2',
                                    borderRadius: '20px',
                                    padding: '40px 32px',
                                    textAlign: 'center',
                                    transition: 'all 0.3s',
                                    cursor: 'pointer',
                                    minHeight: '180px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                }}>
                                    <div style={{
                                        fontSize: '2rem',
                                        color: 'var(--color-primary, #8B7355)',
                                    }}>
                                        {svc.icon}
                                    </div>
                                    <h3 style={{
                                        fontSize: '1rem',
                                        fontWeight: 500,
                                        color: '#2C2420',
                                        fontFamily: '"Playfair Display", serif',
                                    }}>
                                        {svc.title}
                                    </h3>
                                </div>
                            </Link>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// FEATURE HIGHLIGHT — Alternating 2-column: text + tall image
// ═══════════════════════════════════════════════════════════════

function FeatureHighlight({ content }: { content: PresetContent }) {
    return (
        <section style={{
            padding: '100px 60px',
            background: '#F7F5F2',
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {content.philosophy.map((item, i) => (
                    <RevealOnScroll key={i} delay={i * 150}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: i % 2 === 0 ? '1fr 1fr' : '1fr 1fr',
                            gap: '4rem',
                            alignItems: 'center',
                            marginBottom: i < content.philosophy.length - 1 ? '4rem' : 0,
                            direction: i % 2 === 1 ? 'rtl' : 'ltr',
                        }}>
                            <div style={{ direction: 'ltr' }}>
                                <span style={{
                                    fontSize: '0.7rem',
                                    letterSpacing: '0.2em',
                                    textTransform: 'uppercase',
                                    color: 'var(--color-primary, #8B7355)',
                                    fontFamily: 'Lato, sans-serif',
                                }}>
                                    {item.number}
                                </span>
                                <h3 style={{
                                    fontSize: '2rem',
                                    fontWeight: 300,
                                    color: '#2C2420',
                                    marginTop: '0.5rem',
                                    marginBottom: '1rem',
                                    lineHeight: 1.2,
                                    fontFamily: '"Playfair Display", serif',
                                }}>
                                    {item.title}
                                </h3>
                                <p style={{
                                    fontSize: '0.95rem',
                                    color: '#7A6E64',
                                    lineHeight: 1.8,
                                    fontFamily: 'Lato, sans-serif',
                                }}>
                                    {item.desc}
                                </p>
                            </div>
                            <div style={{
                                background: '#EDE8E2',
                                borderRadius: '20px',
                                minHeight: '300px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '3rem',
                                direction: 'ltr',
                            }}>
                                {['✨', '🔬', '🌿'][i % 3]}
                            </div>
                        </div>
                    </RevealOnScroll>
                ))}
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// TESTIMONIALS — Simple cards with gold stars
// ═══════════════════════════════════════════════════════════════

function TestimonialsCarousel({ content }: { content: PresetContent }) {
    return (
        <section style={{
            padding: '100px 60px',
            background: '#FFFFFF',
        }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
                <RevealOnScroll>
                    <p style={{
                        fontSize: '0.7rem',
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase',
                        color: 'var(--color-primary, #8B7355)',
                        marginBottom: '0.75rem',
                        fontFamily: 'Lato, sans-serif',
                    }}>
                        Opinie
                    </p>
                    <h2 style={{
                        fontSize: '2.5rem',
                        fontWeight: 300,
                        color: '#2C2420',
                        marginBottom: '3rem',
                        fontFamily: '"Playfair Display", serif',
                    }}>
                        Co mówią nasi <span style={{ fontStyle: 'italic' }}>pacjenci</span>
                    </h2>
                </RevealOnScroll>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '2rem',
                }}>
                    {content.testimonials.map((t, i) => (
                        <RevealOnScroll key={i} delay={i * 100}>
                            <div style={{
                                background: '#F7F5F2',
                                borderRadius: '20px',
                                padding: '36px 28px',
                                textAlign: 'left',
                            }}>
                                <div style={{ color: '#C5A55A', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                    ★★★★★
                                </div>
                                <p style={{
                                    fontSize: '0.9rem',
                                    color: '#2C2420',
                                    lineHeight: 1.7,
                                    marginBottom: '1.5rem',
                                    fontFamily: 'Lato, sans-serif',
                                    fontStyle: 'italic',
                                }}>
                                    &ldquo;{t.quote}&rdquo;
                                </p>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2C2420', fontFamily: '"Playfair Display", serif' }}>
                                    {t.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-primary, #8B7355)', fontFamily: 'Lato, sans-serif' }}>
                                    {t.treatment}
                                </div>
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// CONTACT FORM — 2-column: form left, info right
// ═══════════════════════════════════════════════════════════════

function ContactForm({ content }: { content: PresetContent }) {
    return (
        <section style={{
            padding: '100px 60px',
            background: '#EDE8E2',
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4rem',
                alignItems: 'start',
            }}>
                <RevealOnScroll>
                    <div>
                        <p style={{
                            fontSize: '0.7rem',
                            letterSpacing: '0.25em',
                            textTransform: 'uppercase',
                            color: 'var(--color-primary, #8B7355)',
                            marginBottom: '0.75rem',
                            fontFamily: 'Lato, sans-serif',
                        }}>
                            Kontakt
                        </p>
                        <h2 style={{
                            fontSize: '2.5rem',
                            fontWeight: 300,
                            color: '#2C2420',
                            marginBottom: '2rem',
                            fontFamily: '"Playfair Display", serif',
                        }}>
                            Napisz <span style={{ fontStyle: 'italic' }}>do nas</span>
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {['Imię i nazwisko', 'Email', 'Telefon'].map(label => (
                                <input key={label} type="text" placeholder={label} style={{
                                    padding: '14px 20px',
                                    border: '1px solid rgba(139,115,85,0.2)',
                                    borderRadius: '12px',
                                    background: '#FFFFFF',
                                    fontSize: '0.9rem',
                                    fontFamily: 'Lato, sans-serif',
                                    color: '#2C2420',
                                    outline: 'none',
                                    width: '100%',
                                    boxSizing: 'border-box',
                                }} />
                            ))}
                            <textarea placeholder="Wiadomość" rows={4} style={{
                                padding: '14px 20px',
                                border: '1px solid rgba(139,115,85,0.2)',
                                borderRadius: '12px',
                                background: '#FFFFFF',
                                fontSize: '0.9rem',
                                fontFamily: 'Lato, sans-serif',
                                color: '#2C2420',
                                outline: 'none',
                                resize: 'vertical',
                                width: '100%',
                                boxSizing: 'border-box',
                            }} />
                            <button style={{
                                padding: '14px 36px',
                                background: 'var(--color-primary, #8B7355)',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '100px',
                                fontSize: '0.9rem',
                                fontFamily: 'Lato, sans-serif',
                                cursor: 'pointer',
                                width: 'fit-content',
                            }}>
                                Wyślij wiadomość →
                            </button>
                        </div>
                    </div>
                </RevealOnScroll>

                <RevealOnScroll animation="fade-up" delay={200}>
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: '20px',
                        padding: '40px',
                    }}>
                        <h3 style={{
                            fontSize: '1.2rem',
                            fontWeight: 400,
                            color: '#2C2420',
                            marginBottom: '1.5rem',
                            fontFamily: '"Playfair Display", serif',
                        }}>
                            Dane kontaktowe
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[
                                { icon: '📍', value: content.contact.address },
                                { icon: '📞', value: content.contact.phone },
                                { icon: '✉️', value: content.contact.email },
                                { icon: '🕐', value: content.contact.hours },
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                                    <span style={{ fontSize: '0.9rem', color: '#7A6E64', fontFamily: 'Lato, sans-serif' }}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(139,115,85,0.1)' }}>
                            <h4 style={{ fontSize: '0.8rem', color: 'var(--color-primary, #8B7355)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem', fontFamily: 'Lato, sans-serif' }}>
                                Moduły aplikacji
                            </h4>
                            {[
                                { label: 'Strefa pacjenta', href: '/strefa-pacjenta' },
                                { label: 'Rezerwacja online', href: '/rezerwacja' },
                                { label: 'Symulator uśmiechu', href: '/symulator' },
                                { label: 'Metamorfozy', href: '/metamorfozy' },
                            ].map(item => (
                                <Link key={item.label} href={item.href} style={{
                                    display: 'block',
                                    color: '#7A6E64',
                                    textDecoration: 'none',
                                    fontSize: '0.85rem',
                                    fontFamily: 'Lato, sans-serif',
                                    padding: '4px 0',
                                }}>
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </RevealOnScroll>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// FOOTER — Clean minimal
// ═══════════════════════════════════════════════════════════════

function NordicFooter({ content }: { content: PresetContent }) {
    return (
        <footer style={{
            background: '#2C2420',
            padding: '60px 60px 30px',
            color: '#FFFFFF',
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '3rem',
            }}>
                <div>
                    <h4 style={{ fontSize: '1.2rem', fontFamily: '"Playfair Display", serif', fontWeight: 400, marginBottom: '1rem' }}>
                        {content.clinicName}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, fontFamily: 'Lato, sans-serif' }}>
                        {content.tagline}
                    </p>
                </div>
                <div>
                    <h4 style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', fontFamily: 'Lato, sans-serif' }}>
                        Usługi
                    </h4>
                    {content.services.slice(0, 5).map((svc, i) => (
                        <Link key={i} href="/oferta" style={{
                            display: 'block',
                            color: 'rgba(255,255,255,0.7)',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                            padding: '3px 0',
                            fontFamily: 'Lato, sans-serif',
                        }}>
                            {svc.title}
                        </Link>
                    ))}
                </div>
                <div>
                    <h4 style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', fontFamily: 'Lato, sans-serif' }}>
                        Kontakt
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, fontFamily: 'Lato, sans-serif' }}>
                        {content.contact.address}<br />
                        {content.contact.phone}<br />
                        {content.contact.email}
                    </p>
                </div>
                <div>
                    <h4 style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', fontFamily: 'Lato, sans-serif' }}>
                        Strefa pacjenta
                    </h4>
                    {[
                        { label: 'Logowanie', href: '/strefa-pacjenta/login' },
                        { label: 'Rejestracja', href: '/strefa-pacjenta' },
                        { label: 'Panel admin', href: '/admin' },
                        { label: 'Strefa pracownika', href: '/strefa-pracownika' },
                    ].map(item => (
                        <Link key={item.label} href={item.href} style={{
                            display: 'block',
                            color: 'rgba(255,255,255,0.7)',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                            padding: '3px 0',
                            fontFamily: 'Lato, sans-serif',
                        }}>
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>

            <div style={{
                maxWidth: '1200px',
                margin: '40px auto 0',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'Lato, sans-serif',
            }}>
                <span>© 2025 {content.clinicName}</span>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {['Polityka prywatności', 'RODO', 'Regulamin'].map(l => (
                        <Link key={l} href="#" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '0.75rem' }}>{l}</Link>
                    ))}
                </div>
            </div>
        </footer>
    );
}
