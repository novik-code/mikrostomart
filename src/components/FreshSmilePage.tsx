"use client";

import Link from "next/link";
import RevealOnScroll from "@/components/RevealOnScroll";
import { usePresetId } from "@/context/ThemeContext";
import { getPresetContent, type PresetContent } from "@/lib/presetContent";

// ═══════════════════════════════════════════════════════════════
// FreshSmilePage — Community-focused (AmbasadaUsmiechu-inspired)
// Multi-row header, stats, lavender purple, lead-gen layout
// ═══════════════════════════════════════════════════════════════

export default function FreshSmilePage() {
    const presetId = usePresetId();
    const content = getPresetContent(presetId);

    return (
        <main style={{ background: '#FFFFFF', color: '#1F1F1F' }}>
            <FreshNav content={content} />
            <HeroBanner content={content} />
            <StatsRow content={content} />
            <AboutIntro content={content} />
            <ServicesGrid content={content} />
            <WhyUsSection content={content} />
            <ClinicHighlights content={content} />
            <BlogSection content={content} />
            <TestimonialsSection content={content} />
            <FAQSection content={content} />
            <FreshFooter content={content} />
            <StickyPhoneBar content={content} />
        </main>
    );
}

// ═══════════════════════════════════════════════════════════════
// MULTI-ROW HEADER — Top contacts + "Zapisz się" CTA, bottom nav
// ═══════════════════════════════════════════════════════════════

function FreshNav({ content }: { content: PresetContent }) {
    return (
        <header style={{ position: 'sticky', top: 0, zIndex: 100, background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            {/* Top row: Logo + CTA + Contact */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 40px',
                borderBottom: '1px solid #F0F0F0',
            }}>
                <div style={{
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: 'var(--color-primary, #8B5CF6)',
                    fontFamily: 'Montserrat, sans-serif',
                }}>
                    {content.clinicName}
                </div>

                <Link href="/rezerwacja" style={{
                    background: 'var(--color-primary, #8B5CF6)',
                    color: '#FFFFFF',
                    padding: '10px 28px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    fontFamily: 'Poppins, sans-serif',
                    transition: 'all 0.3s',
                }}>
                    📅 Zapisz się na wizytę
                </Link>

                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Poppins, sans-serif' }}>
                    <span>📍 {content.contact.address.split(',')[0]}</span>
                    <span>📞 {content.contact.phone}</span>
                </div>
            </div>

            {/* Bottom row: Navigation links */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2rem',
                padding: '10px 40px',
                background: '#FAFAFE',
            }}>
                {['Start', 'Zespół', 'Oferta', 'Metamorfozy', 'Strefa Pacjenta', 'Blog', 'FAQ', 'Kontakt'].map(item => (
                    <Link key={item} href={
                        item === 'Start' ? '/' :
                        item === 'Zespół' ? '/o-nas' :
                        item === 'Strefa Pacjenta' ? '/strefa-pacjenta' :
                        `/${item.toLowerCase()}`
                    } style={{
                        color: '#374151',
                        textDecoration: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        fontFamily: 'Poppins, sans-serif',
                        transition: 'color 0.2s',
                        padding: '4px 0',
                        borderBottom: '2px solid transparent',
                    }}>
                        {item}
                    </Link>
                ))}
            </div>
        </header>
    );
}

// ═══════════════════════════════════════════════════════════════
// HERO — Lead magnet / educational banner
// ═══════════════════════════════════════════════════════════════

function HeroBanner({ content }: { content: PresetContent }) {
    return (
        <section style={{
            position: 'relative',
            padding: '80px 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh',
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
                <source src="https://cdn.pixabay.com/video/2020/05/14/39025-420236784_large.mp4" type="video/mp4" />
            </video>
            {/* Lavender overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(243,240,255,0.88) 0%, rgba(250,250,254,0.85) 50%, rgba(237,233,255,0.88) 100%)',
                zIndex: 1,
            }} />
            <div style={{
                maxWidth: '1200px',
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4rem',
                alignItems: 'center',
                position: 'relative',
                zIndex: 2,
            }}>
                <div>
                    <RevealOnScroll>
                        <p style={{
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.15em',
                            color: 'var(--color-primary, #8B5CF6)',
                            marginBottom: '0.75rem',
                            fontFamily: 'Poppins, sans-serif',
                            fontWeight: 600,
                        }}>
                            {content.hero.label}
                        </p>
                        <h1 style={{
                            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                            fontWeight: 700,
                            color: '#1F1F1F',
                            lineHeight: 1.2,
                            marginBottom: '1.5rem',
                            fontFamily: 'Montserrat, sans-serif',
                        }}>
                            {content.hero.title1}{' '}
                            <span style={{ color: 'var(--color-primary, #8B5CF6)' }}>
                                {content.hero.title2}
                            </span>
                        </h1>
                        <p style={{
                            fontSize: '1rem',
                            color: '#6B7280',
                            lineHeight: 1.7,
                            marginBottom: '2rem',
                            fontFamily: 'Poppins, sans-serif',
                        }}>
                            {content.hero.description}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <Link href="/rezerwacja" style={{
                                background: 'var(--color-primary, #8B5CF6)',
                                color: '#FFFFFF',
                                padding: '12px 32px',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                fontFamily: 'Poppins, sans-serif',
                            }}>
                                Umów wizytę
                            </Link>
                            <Link href="/oferta" style={{
                                background: 'transparent',
                                color: 'var(--color-primary, #8B5CF6)',
                                border: '2px solid var(--color-primary, #8B5CF6)',
                                padding: '12px 32px',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                fontFamily: 'Poppins, sans-serif',
                            }}>
                                Poznaj ofertę
                            </Link>
                        </div>
                    </RevealOnScroll>
                </div>

                {/* Right: Visual placeholder */}
                <RevealOnScroll animation="fade-up" delay={200}>
                    <div style={{
                        background: 'var(--color-primary, #8B5CF6)',
                        borderRadius: '20px',
                        padding: '60px 40px',
                        textAlign: 'center',
                        color: '#FFFFFF',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: '-20px',
                            right: '-20px',
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.1)',
                        }} />
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📖</div>
                        <h3 style={{
                            fontSize: '1.4rem',
                            fontWeight: 700,
                            marginBottom: '0.75rem',
                            fontFamily: 'Montserrat, sans-serif',
                        }}>
                            Bezpłatny poradnik
                        </h3>
                        <p style={{
                            fontSize: '0.9rem',
                            opacity: 0.9,
                            marginBottom: '1.5rem',
                            fontFamily: 'Poppins, sans-serif',
                        }}>
                            Dowiedz się, jak dbać o zdrowy uśmiech
                        </p>
                        <button style={{
                            background: '#FFFFFF',
                            color: 'var(--color-primary, #8B5CF6)',
                            border: 'none',
                            padding: '12px 32px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            fontFamily: 'Poppins, sans-serif',
                        }}>
                            Pobierz →
                        </button>
                    </div>
                </RevealOnScroll>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// STATS — 4-column purple numbers + icons
// ═══════════════════════════════════════════════════════════════

function StatsRow({ content }: { content: PresetContent }) {
    const icons = ['👥', '👑', '🔧', '📅'];
    return (
        <section style={{ padding: '60px 40px', background: '#FFFFFF' }}>
            <div style={{
                maxWidth: '1100px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '2rem',
                textAlign: 'center',
            }}>
                {content.stats.map((stat, i) => (
                    <RevealOnScroll key={i} delay={i * 100}>
                        <div style={{
                            padding: '30px 20px',
                            borderRadius: '16px',
                            background: '#FAFAFE',
                            border: '1px solid #F0F0F0',
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icons[i % 4]}</div>
                            <div style={{
                                fontSize: '2.5rem',
                                fontWeight: 700,
                                color: 'var(--color-primary, #8B5CF6)',
                                fontFamily: 'Montserrat, sans-serif',
                                lineHeight: 1,
                                marginBottom: '0.5rem',
                            }}>
                                {stat.number}
                            </div>
                            <div style={{
                                fontSize: '0.8rem',
                                color: '#6B7280',
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 500,
                            }}>
                                {stat.label}
                            </div>
                        </div>
                    </RevealOnScroll>
                ))}
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// ABOUT INTRO — "Uśmiech zaczyna się tutaj!" style
// ═══════════════════════════════════════════════════════════════

function AboutIntro({ content }: { content: PresetContent }) {
    return (
        <section style={{
            padding: '80px 40px',
            background: '#FAFAFE',
            borderTop: '3px solid var(--color-primary, #8B5CF6)',
        }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
                <RevealOnScroll>
                    <h2 style={{
                        fontSize: 'clamp(2rem, 4vw, 3rem)',
                        fontWeight: 700,
                        color: 'var(--color-primary, #8B5CF6)',
                        marginBottom: '1.5rem',
                        fontFamily: 'Montserrat, sans-serif',
                    }}>
                        {content.about.title} {content.about.titleItalic}
                    </h2>
                    <p style={{
                        fontSize: '1.05rem',
                        color: '#555',
                        lineHeight: 1.8,
                        marginBottom: '2rem',
                        fontFamily: 'Poppins, sans-serif',
                    }}>
                        {content.about.intro}
                    </p>
                    <Link href="/o-nas" style={{
                        background: 'var(--color-primary, #8B5CF6)',
                        color: '#FFFFFF',
                        padding: '12px 32px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        fontFamily: 'Poppins, sans-serif',
                    }}>
                        Więcej o nas →
                    </Link>
                </RevealOnScroll>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// SERVICES — 2-column white cards with purple left border
// ═══════════════════════════════════════════════════════════════

function ServicesGrid({ content }: { content: PresetContent }) {
    return (
        <section style={{ padding: '80px 40px', background: '#FFFFFF' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <RevealOnScroll>
                    <h2 style={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: '#1F1F1F',
                        marginBottom: '0.5rem',
                        fontFamily: 'Montserrat, sans-serif',
                        textAlign: 'center',
                    }}>
                        W czym możemy <span style={{ color: 'var(--color-primary, #8B5CF6)' }}>Ci pomóc?</span>
                    </h2>
                    <p style={{
                        textAlign: 'center',
                        color: '#6B7280',
                        marginBottom: '3rem',
                        fontFamily: 'Poppins, sans-serif',
                    }}>
                        Kompleksowa opieka stomatologiczna
                    </p>
                </RevealOnScroll>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1rem',
                }}>
                    {content.services.map((svc, i) => (
                        <RevealOnScroll key={i} delay={i * 80}>
                            <Link href="/oferta" style={{ textDecoration: 'none' }}>
                                <div style={{
                                    background: '#FFFFFF',
                                    border: '1px solid #F0F0F0',
                                    borderLeft: '4px solid var(--color-primary, #8B5CF6)',
                                    borderRadius: '12px',
                                    padding: '24px 28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.3s',
                                    cursor: 'pointer',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ fontSize: '1.5rem' }}>{svc.icon}</span>
                                        <div>
                                            <h3 style={{
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                color: '#1F1F1F',
                                                fontFamily: 'Montserrat, sans-serif',
                                                marginBottom: '0.25rem',
                                            }}>
                                                {svc.title}
                                            </h3>
                                            <p style={{
                                                fontSize: '0.8rem',
                                                color: '#6B7280',
                                                fontFamily: 'Poppins, sans-serif',
                                            }}>
                                                {svc.desc}
                                            </p>
                                        </div>
                                    </div>
                                    <span style={{ color: 'var(--color-primary, #8B5CF6)', fontSize: '1.2rem' }}>→</span>
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
// WHY US — Text + stacked images
// ═══════════════════════════════════════════════════════════════

function WhyUsSection({ content }: { content: PresetContent }) {
    return (
        <section style={{
            padding: '80px 40px',
            background: '#FAFAFE',
        }}>
            <div style={{
                maxWidth: '1100px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4rem',
                alignItems: 'center',
            }}>
                {/* Left: Philosophy cards */}
                <div>
                    <RevealOnScroll>
                        <h2 style={{
                            fontSize: '2rem',
                            fontWeight: 700,
                            color: '#1F1F1F',
                            marginBottom: '2rem',
                            fontFamily: 'Montserrat, sans-serif',
                        }}>
                            Dlaczego warto wybrać{' '}
                            <span style={{ color: 'var(--color-primary, #8B5CF6)' }}>{content.clinicName}?</span>
                        </h2>
                    </RevealOnScroll>
                    {content.philosophy.map((item, i) => (
                        <RevealOnScroll key={i} delay={i * 100}>
                            <div style={{
                                display: 'flex',
                                gap: '1rem',
                                marginBottom: '1.5rem',
                                alignItems: 'flex-start',
                            }}>
                                <div style={{
                                    minWidth: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: 'var(--color-primary, #8B5CF6)',
                                    color: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    fontFamily: 'Montserrat, sans-serif',
                                }}>
                                    {item.number}
                                </div>
                                <div>
                                    <h3 style={{
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        color: '#1F1F1F',
                                        marginBottom: '0.25rem',
                                        fontFamily: 'Montserrat, sans-serif',
                                    }}>
                                        {item.title}
                                    </h3>
                                    <p style={{
                                        fontSize: '0.85rem',
                                        color: '#6B7280',
                                        lineHeight: 1.6,
                                        fontFamily: 'Poppins, sans-serif',
                                    }}>
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>

                {/* Right: Stacked image placeholders */}
                <RevealOnScroll animation="fade-up" delay={200}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {['🏥 Gabinet', '👨‍⚕️ Zespół', '🔬 Technologia'].map((item, i) => (
                            <div key={i} style={{
                                background: `hsl(${260 + i * 10}, 60%, ${92 - i * 3}%)`,
                                borderRadius: '16px',
                                padding: '40px',
                                textAlign: 'center',
                                fontSize: '1rem',
                                color: '#555',
                                fontFamily: 'Poppins, sans-serif',
                            }}>
                                {item}
                            </div>
                        ))}
                    </div>
                </RevealOnScroll>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// CLINIC HIGHLIGHTS — Infrastructure features
// ═══════════════════════════════════════════════════════════════

function ClinicHighlights({ content }: { content: PresetContent }) {
    const highlights = [
        { icon: '🅿️', label: 'Bezpłatny parking', desc: 'Ponad 20 miejsc parkingowych dla pacjentów' },
        { icon: '🌬️', label: 'Filtry HEPA', desc: 'System oczyszczania powietrza w każdym gabinecie' },
        { icon: '🧸', label: 'Kącik zabaw', desc: 'Strefa dla dzieci z zabawkami i kolorowankami' },
        { icon: '♿', label: 'Dostępność', desc: 'Podjazd i winda dla osób niepełnosprawnych' },
    ];

    return (
        <section style={{ padding: '60px 40px', background: '#FFFFFF' }}>
            <div style={{
                maxWidth: '1100px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1.5rem',
            }}>
                {highlights.map((h, i) => (
                    <RevealOnScroll key={i} delay={i * 80}>
                        <div style={{
                            textAlign: 'center',
                            padding: '30px 20px',
                            borderRadius: '16px',
                            background: '#FAFAFE',
                            border: '1px solid #F0F0F0',
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{h.icon}</div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1F1F1F', marginBottom: '0.25rem', fontFamily: 'Montserrat, sans-serif' }}>
                                {h.label}
                            </h4>
                            <p style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Poppins, sans-serif' }}>
                                {h.desc}
                            </p>
                        </div>
                    </RevealOnScroll>
                ))}
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// BLOG — Expert tips card grid
// ═══════════════════════════════════════════════════════════════

function BlogSection({ content }: { content: PresetContent }) {
    return (
        <section style={{ padding: '80px 40px', background: '#FAFAFE' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <RevealOnScroll>
                    <h2 style={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: '#1F1F1F',
                        marginBottom: '2rem',
                        textAlign: 'center',
                        fontFamily: 'Montserrat, sans-serif',
                    }}>
                        Porady <span style={{ color: 'var(--color-primary, #8B5CF6)' }}>eksperta</span>
                    </h2>
                </RevealOnScroll>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1.5rem',
                }}>
                    {content.blogPosts.map((post, i) => (
                        <RevealOnScroll key={i} delay={i * 100}>
                            <Link href="/aktualnosci" style={{ textDecoration: 'none' }}>
                                <div style={{
                                    background: '#FFFFFF',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    border: '1px solid #F0F0F0',
                                    transition: 'transform 0.3s, box-shadow 0.3s',
                                    cursor: 'pointer',
                                }}>
                                    <div style={{
                                        background: `hsl(${260 + i * 15}, 50%, 90%)`,
                                        padding: '40px',
                                        textAlign: 'center',
                                        fontSize: '2rem',
                                    }}>
                                        📰
                                    </div>
                                    <div style={{ padding: '20px' }}>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            background: '#F3F0FF',
                                            color: 'var(--color-primary, #8B5CF6)',
                                            padding: '4px 12px',
                                            borderRadius: '100px',
                                            fontWeight: 600,
                                            fontFamily: 'Poppins, sans-serif',
                                        }}>
                                            {post.category}
                                        </span>
                                        <h3 style={{
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            color: '#1F1F1F',
                                            marginTop: '0.75rem',
                                            marginBottom: '0.5rem',
                                            fontFamily: 'Montserrat, sans-serif',
                                        }}>
                                            {post.title}
                                        </h3>
                                        <p style={{
                                            fontSize: '0.8rem',
                                            color: '#6B7280',
                                            fontFamily: 'Poppins, sans-serif',
                                        }}>
                                            {post.excerpt}
                                        </p>
                                    </div>
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
// TESTIMONIALS — Simple review cards
// ═══════════════════════════════════════════════════════════════

function TestimonialsSection({ content }: { content: PresetContent }) {
    return (
        <section style={{ padding: '80px 40px', background: '#FFFFFF' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <RevealOnScroll>
                    <h2 style={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: '#1F1F1F',
                        marginBottom: '2rem',
                        textAlign: 'center',
                        fontFamily: 'Montserrat, sans-serif',
                    }}>
                        Opinie naszych <span style={{ color: 'var(--color-primary, #8B5CF6)' }}>pacjentów</span>
                    </h2>
                </RevealOnScroll>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1.5rem',
                }}>
                    {content.testimonials.map((t, i) => (
                        <RevealOnScroll key={i} delay={i * 100}>
                            <div style={{
                                background: '#FAFAFE',
                                borderRadius: '16px',
                                padding: '28px',
                                border: '1px solid #F0F0F0',
                            }}>
                                <div style={{ fontSize: '1rem', color: '#FFC107', marginBottom: '0.75rem' }}>
                                    ⭐⭐⭐⭐⭐
                                </div>
                                <p style={{
                                    fontSize: '0.9rem',
                                    color: '#555',
                                    lineHeight: 1.7,
                                    marginBottom: '1rem',
                                    fontFamily: 'Poppins, sans-serif',
                                    fontStyle: 'italic',
                                }}>
                                    &ldquo;{t.quote}&rdquo;
                                </p>
                                <div style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: '#1F1F1F',
                                    fontFamily: 'Montserrat, sans-serif',
                                }}>
                                    {t.name}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--color-primary, #8B5CF6)',
                                    fontFamily: 'Poppins, sans-serif',
                                }}>
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
// FAQ — Accordion section
// ═══════════════════════════════════════════════════════════════

function FAQSection({ content }: { content: PresetContent }) {
    return (
        <section style={{ padding: '80px 40px', background: '#FAFAFE' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <RevealOnScroll>
                    <h2 style={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: '#1F1F1F',
                        marginBottom: '2rem',
                        textAlign: 'center',
                        fontFamily: 'Montserrat, sans-serif',
                    }}>
                        Najczęściej zadawane <span style={{ color: 'var(--color-primary, #8B5CF6)' }}>pytania</span>
                    </h2>
                </RevealOnScroll>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {content.faqs.slice(0, 5).map((faq, i) => (
                        <RevealOnScroll key={i} delay={i * 60}>
                            <details style={{
                                background: '#FFFFFF',
                                borderRadius: '12px',
                                border: '1px solid #F0F0F0',
                                overflow: 'hidden',
                            }}>
                                <summary style={{
                                    padding: '18px 24px',
                                    fontSize: '0.95rem',
                                    fontWeight: 600,
                                    color: '#1F1F1F',
                                    cursor: 'pointer',
                                    fontFamily: 'Montserrat, sans-serif',
                                    listStyle: 'none',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}>
                                    {faq.q}
                                    <span style={{ color: 'var(--color-primary, #8B5CF6)' }}>+</span>
                                </summary>
                                <div style={{
                                    padding: '0 24px 18px',
                                    fontSize: '0.85rem',
                                    color: '#6B7280',
                                    lineHeight: 1.7,
                                    fontFamily: 'Poppins, sans-serif',
                                }}>
                                    {faq.a}
                                </div>
                            </details>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// FOOTER — Lavender with Map + Links + Quick Access
// ═══════════════════════════════════════════════════════════════

function FreshFooter({ content }: { content: PresetContent }) {
    return (
        <footer style={{
            background: '#F3F0FF',
            padding: '60px 40px 30px',
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '3rem',
            }}>
                {/* Contact + CTA */}
                <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1F1F1F', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
                        {content.clinicName}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.8, marginBottom: '1.5rem', fontFamily: 'Poppins, sans-serif' }}>
                        📍 {content.contact.address}<br />
                        📞 {content.contact.phone}<br />
                        ✉️ {content.contact.email}<br />
                        🕐 {content.contact.hours}
                    </p>
                    <Link href="/rezerwacja" style={{
                        display: 'inline-block',
                        background: 'var(--color-primary, #8B5CF6)',
                        color: '#FFFFFF',
                        padding: '10px 24px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        fontFamily: 'Poppins, sans-serif',
                    }}>
                        📅 Zapisz się na wizytę
                    </Link>
                </div>

                {/* Quick Access */}
                <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#6B7280', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
                        Szybki dostęp
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {[
                            { label: 'Oferta', href: '/oferta' },
                            { label: 'O nas', href: '/o-nas' },
                            { label: 'Metamorfozy', href: '/metamorfozy' },
                            { label: 'Blog', href: '/aktualnosci' },
                            { label: 'FAQ', href: '/faq' },
                            { label: 'Kontakt', href: '/kontakt' },
                            { label: 'Strefa pacjenta', href: '/strefa-pacjenta' },
                            { label: 'Asystent AI', href: '#' },
                        ].map(item => (
                            <Link key={item.label} href={item.href} style={{
                                color: '#555',
                                textDecoration: 'none',
                                fontSize: '0.85rem',
                                fontFamily: 'Poppins, sans-serif',
                            }}>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Reviews widget placeholder */}
                <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#6B7280', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
                        Oceny pacjentów
                    </h4>
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        padding: '24px',
                        textAlign: 'center',
                        border: '1px solid #E9E5F5',
                    }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-primary, #8B5CF6)', fontFamily: 'Montserrat, sans-serif' }}>
                            4.9
                        </div>
                        <div style={{ fontSize: '1rem', color: '#FFC107', marginBottom: '0.5rem' }}>⭐⭐⭐⭐⭐</div>
                        <p style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Poppins, sans-serif' }}>
                            na podstawie 200+ opinii
                        </p>
                        <Link href="/strefa-pacjenta" style={{
                            display: 'inline-block',
                            marginTop: '1rem',
                            background: 'var(--color-primary, #8B5CF6)',
                            color: '#FFFFFF',
                            padding: '8px 20px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            textDecoration: 'none',
                            fontFamily: 'Poppins, sans-serif',
                        }}>
                            Rejestracja online
                        </Link>
                    </div>
                </div>
            </div>

            {/* Sub-footer */}
            <div style={{
                maxWidth: '1200px',
                margin: '40px auto 0',
                paddingTop: '20px',
                borderTop: '1px solid #E9E5F5',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#AAA',
                fontFamily: 'Poppins, sans-serif',
            }}>
                <span>© 2025 {content.clinicName}. Wszelkie prawa zastrzeżone.</span>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {['Polityka prywatności', 'Regulamin', 'RODO'].map(l => (
                        <Link key={l} href="#" style={{ color: '#AAA', textDecoration: 'none', fontSize: '0.75rem' }}>{l}</Link>
                    ))}
                </div>
            </div>
        </footer>
    );
}

// ═══════════════════════════════════════════════════════════════
// STICKY PHONE BAR — Bottom fixed phone CTA
// ═══════════════════════════════════════════════════════════════

function StickyPhoneBar({ content }: { content: PresetContent }) {
    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 90,
            background: 'var(--color-primary, #8B5CF6)',
            color: '#FFFFFF',
            padding: '10px 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            fontFamily: 'Poppins, sans-serif',
        }}>
            📞 Zadzwoń: <a href={`tel:${content.contact.phone.replace(/\s/g, '')}`} style={{ color: '#FFFFFF', textDecoration: 'none' }}>{content.contact.phone}</a>
        </div>
    );
}
