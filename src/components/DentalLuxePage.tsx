"use client";

import Link from "next/link";
import RevealOnScroll from "@/components/RevealOnScroll";
import { usePresetId } from "@/context/ThemeContext";
import { getPresetContent, type PresetContent } from "@/lib/presetContent";

// ═══════════════════════════════════════════════════════════════
// DentalLuxePage — Cinematic dark luxury (NawrockiClinic-inspired)
// Split-center nav, full-screen video hero, 100vh sections, 50/50 splits
// ═══════════════════════════════════════════════════════════════

export default function DentalLuxePage() {
    const presetId = usePresetId();
    const content = getPresetContent(presetId);

    return (
        <main style={{ background: '#0A0A0A', color: '#F5F5F5' }}>
            <LuxeNav content={content} />
            <VideoHero content={content} />
            <VideoSectionTwo content={content} />
            <SplitAbout content={content} />
            <ServicesStrip content={content} />
            <SplitTeam content={content} />
            <TestimonialsFullWidth content={content} />
            <StatsSection content={content} />
            <LuxeFooter content={content} />
        </main>
    );
}

// ═══════════════════════════════════════════════════════════════
// SPLIT-CENTER NAVBAR — Logo centered, links split left/right
// ═══════════════════════════════════════════════════════════════

function LuxeNav({ content }: { content: PresetContent }) {
    return (
        <nav style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            padding: '20px 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        }}>
            {/* Left nav links */}
            <div style={{
                display: 'flex',
                gap: '2rem',
                alignItems: 'center',
                flex: 1,
            }}>
                {['O nas', 'Oferta', 'Metamorfozy', 'Cennik'].map(item => (
                    <Link key={item} href={`/${item.toLowerCase().replace(/ /g, '-')}`} style={{
                        color: 'rgba(255,255,255,0.85)',
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        fontWeight: 400,
                        transition: 'color 0.3s',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        {item}
                    </Link>
                ))}
            </div>

            {/* Center logo */}
            <div style={{
                textAlign: 'center',
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
            }}>
                <span style={{
                    fontSize: '1.5rem',
                    fontWeight: 300,
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color: '#FFFFFF',
                    fontFamily: 'Inter, sans-serif',
                }}>
                    {content.clinicName.split(' ')[0]}
                </span>
                <span style={{
                    width: '1px',
                    height: '28px',
                    background: 'rgba(255,255,255,0.4)',
                    display: 'inline-block',
                }} />
                <span style={{
                    fontSize: '1.5rem',
                    fontWeight: 300,
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color: '#FFFFFF',
                    fontFamily: 'Inter, sans-serif',
                }}>
                    {content.clinicName.split(' ').slice(1).join(' ') || 'CLINIC'}
                </span>
            </div>

            {/* Right nav links + CTA */}
            <div style={{
                display: 'flex',
                gap: '2rem',
                alignItems: 'center',
                flex: 1,
                justifyContent: 'flex-end',
            }}>
                {['Aktualności', 'FAQ', 'Kontakt'].map(item => (
                    <Link key={item} href={`/${item.toLowerCase().replace(/ś/g, 's').replace(/ /g, '-')}`} style={{
                        color: 'rgba(255,255,255,0.85)',
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        fontWeight: 400,
                        transition: 'color 0.3s',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        {item}
                    </Link>
                ))}
                <Link href="/rezerwacja" style={{
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.5)',
                    padding: '8px 24px',
                    borderRadius: '100px',
                    fontSize: '0.75rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    transition: 'all 0.3s',
                    fontFamily: 'Inter, sans-serif',
                }}>
                    Umów wizytę
                </Link>
            </div>
        </nav>
    );
}

// ═══════════════════════════════════════════════════════════════
// FULL-SCREEN VIDEO HERO — Centered uppercase heading + pill CTA
// ═══════════════════════════════════════════════════════════════

function VideoHero({ content }: { content: PresetContent }) {
    return (
        <section style={{
            position: 'relative',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'center',
            textAlign: 'center',
            padding: '0 24px 120px',
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
                <source src="https://cdn.pixabay.com/video/2019/03/11/21936-322869299_large.mp4" type="video/mp4" />
            </video>
            {/* Dark overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.7) 100%)',
                zIndex: 1,
            }} />
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `
                    radial-gradient(ellipse at 30% 50%, rgba(197, 165, 90, 0.08) 0%, transparent 50%),
                    radial-gradient(ellipse at 70% 30%, rgba(197, 165, 90, 0.05) 0%, transparent 50%)
                `,
                zIndex: 1,
            }} />

            {/* Animated gradient glow */}
            <div style={{
                position: 'absolute',
                width: '600px',
                height: '600px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(197, 165, 90, 0.12) 0%, transparent 70%)',
                top: '20%',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 0,
                animation: 'pulse 8s ease-in-out infinite',
            }} />

            <div style={{ position: 'relative', zIndex: 2, maxWidth: '900px' }}>
                <RevealOnScroll animation="blur-in">
                    <h1 style={{
                        fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                        fontWeight: 300,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        lineHeight: 1.3,
                        marginBottom: '2rem',
                        color: '#FFFFFF',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        {content.hero.title1}<br />
                        <span style={{ fontWeight: 500 }}>{content.hero.title2}</span>
                    </h1>
                </RevealOnScroll>

                <RevealOnScroll animation="fade-up" delay={200}>
                    <p style={{
                        fontSize: '1rem',
                        color: 'rgba(255,255,255,0.7)',
                        maxWidth: '600px',
                        margin: '0 auto 2.5rem',
                        lineHeight: 1.8,
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        {content.hero.description}
                    </p>
                </RevealOnScroll>

                <RevealOnScroll animation="fade-up" delay={400}>
                    <Link href="/rezerwacja" style={{
                        display: 'inline-block',
                        padding: '14px 48px',
                        border: '1px solid rgba(255,255,255,0.5)',
                        borderRadius: '100px',
                        color: '#FFFFFF',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        transition: 'all 0.3s',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        Zapraszamy
                    </Link>
                </RevealOnScroll>
            </div>

            <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; transform: translateX(-50%) scale(1); } 50% { opacity: 0.8; transform: translateX(-50%) scale(1.1); } }`}</style>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// VIDEO SECTION 2 — Second full-screen cinematic section
// ═══════════════════════════════════════════════════════════════

function VideoSectionTwo({ content }: { content: PresetContent }) {
    return (
        <section style={{
            position: 'relative',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: '0 24px',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #0D0D0D 0%, #141414 100%)',
        }}>
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `
                    radial-gradient(ellipse at 60% 40%, rgba(197, 165, 90, 0.06) 0%, transparent 60%)
                `,
            }} />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px' }}>
                <RevealOnScroll animation="blur-in">
                    <p style={{
                        fontSize: '0.75rem',
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase',
                        color: 'var(--color-primary, #C5A55A)',
                        marginBottom: '1.5rem',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        {content.tagline}
                    </p>
                    <h2 style={{
                        fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                        fontWeight: 300,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        lineHeight: 1.3,
                        marginBottom: '1.5rem',
                        color: '#FFFFFF',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        Profesjonalna i<br />
                        <span style={{ fontWeight: 500 }}>doświadczona kadra</span>
                    </h2>
                    <p style={{
                        fontSize: '1rem',
                        color: 'rgba(255,255,255,0.6)',
                        maxWidth: '550px',
                        margin: '0 auto 2.5rem',
                        lineHeight: 1.7,
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        {content.philosophy[0]?.desc || 'Nasz zespół specjalistów łączy wieloletnie doświadczenie z pasją do doskonałości.'}
                    </p>
                </RevealOnScroll>
                <RevealOnScroll animation="fade-up" delay={200}>
                    <Link href="/o-nas" style={{
                        display: 'inline-block',
                        padding: '12px 40px',
                        border: '1px solid rgba(255,255,255,0.4)',
                        borderRadius: '100px',
                        color: '#FFFFFF',
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        transition: 'all 0.3s',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        Poznaj zespół
                    </Link>
                </RevealOnScroll>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// 50/50 SPLIT — About section with image + text
// ═══════════════════════════════════════════════════════════════

function SplitAbout({ content }: { content: PresetContent }) {
    return (
        <section style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            minHeight: '70vh',
        }}>
            {/* Left: Clinic interior placeholder */}
            <div style={{
                background: `
                    linear-gradient(135deg, #1A1A1A 0%, #0D0D0D 100%)
                `,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(circle at 30% 40%, rgba(197,165,90,0.1) 0%, transparent 60%)',
                }} />
                <div style={{
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    border: '1px solid rgba(197,165,90,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '4rem',
                    position: 'relative',
                    zIndex: 1,
                }}>
                    🏥
                </div>
            </div>

            {/* Right: About text */}
            <div style={{
                background: '#F5F5F5',
                padding: '80px 60px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
            }}>
                <RevealOnScroll>
                    <p style={{
                        fontSize: '0.7rem',
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase',
                        color: '#8A8A8A',
                        marginBottom: '1rem',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        {content.about.tagline}
                    </p>
                    <h2 style={{
                        fontSize: 'clamp(2rem, 3vw, 3rem)',
                        fontWeight: 300,
                        color: '#1A1A1A',
                        marginBottom: '1.5rem',
                        lineHeight: 1.2,
                        letterSpacing: '-0.01em',
                        fontFamily: '"Cormorant Garamond", serif',
                    }}>
                        {content.about.title}{' '}
                        <span style={{ fontStyle: 'italic' }}>{content.about.titleItalic}</span>
                    </h2>
                    <p style={{
                        fontSize: '0.95rem',
                        color: '#555',
                        lineHeight: 1.8,
                        marginBottom: '2rem',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        {content.about.intro}
                    </p>
                    <Link href="/o-nas" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 36px',
                        background: '#1A1A1A',
                        color: '#FFFFFF',
                        borderRadius: '100px',
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        transition: 'all 0.3s',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 500,
                        width: 'fit-content',
                    }}>
                        Dowiedz się więcej →
                    </Link>
                </RevealOnScroll>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// SERVICES STRIP — Horizontal service cards on dark background
// ═══════════════════════════════════════════════════════════════

function ServicesStrip({ content }: { content: PresetContent }) {
    return (
        <section style={{
            background: '#0A0A0A',
            padding: '100px 40px',
        }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <RevealOnScroll>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        marginBottom: '3rem',
                    }}>
                        <div>
                            <p style={{
                                fontSize: '0.7rem',
                                letterSpacing: '0.25em',
                                textTransform: 'uppercase',
                                color: 'var(--color-primary, #C5A55A)',
                                marginBottom: '0.75rem',
                                fontFamily: 'Inter, sans-serif',
                            }}>
                                Zakres usług
                            </p>
                            <h2 style={{
                                fontSize: 'clamp(2rem, 3vw, 3rem)',
                                fontWeight: 300,
                                color: '#F5F5F5',
                                lineHeight: 1.2,
                                fontFamily: '"Cormorant Garamond", serif',
                            }}>
                                Nasza <span style={{ fontStyle: 'italic' }}>oferta</span>
                            </h2>
                        </div>
                        <Link href="/oferta" style={{
                            color: 'var(--color-primary, #C5A55A)',
                            textDecoration: 'none',
                            fontSize: '0.8rem',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            border: '1px solid var(--color-primary, #C5A55A)',
                            padding: '10px 30px',
                            borderRadius: '100px',
                            transition: 'all 0.3s',
                            fontFamily: 'Inter, sans-serif',
                        }}>
                            Pełna oferta →
                        </Link>
                    </div>
                </RevealOnScroll>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1.5px',
                }}>
                    {content.services.slice(0, 6).map((svc, i) => (
                        <RevealOnScroll key={i} delay={i * 100}>
                            <Link href="/oferta" style={{ textDecoration: 'none' }}>
                                <div style={{
                                    background: '#141414',
                                    padding: '48px 36px',
                                    minHeight: '200px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-end',
                                    transition: 'background 0.4s',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: '24px',
                                        right: '24px',
                                        fontSize: '2rem',
                                        opacity: 0.3,
                                    }}>
                                        {svc.icon}
                                    </div>
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: '2px',
                                        background: 'var(--color-primary, #C5A55A)',
                                        transform: 'scaleX(0)',
                                        transformOrigin: 'left',
                                        transition: 'transform 0.4s ease',
                                    }} />
                                    <h3 style={{
                                        fontSize: '1.1rem',
                                        fontWeight: 400,
                                        color: '#F5F5F5',
                                        marginBottom: '0.5rem',
                                        fontFamily: 'Inter, sans-serif',
                                    }}>
                                        {svc.title}
                                    </h3>
                                    <p style={{
                                        fontSize: '0.85rem',
                                        color: 'rgba(255,255,255,0.5)',
                                        lineHeight: 1.6,
                                        fontFamily: 'Inter, sans-serif',
                                    }}>
                                        {svc.desc}
                                    </p>
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
// 50/50 SPLIT — Team (reversed: text left, photo right)
// ═══════════════════════════════════════════════════════════════

function SplitTeam({ content }: { content: PresetContent }) {
    return (
        <section style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            minHeight: '70vh',
        }}>
            {/* Left: Team text */}
            <div style={{
                background: '#F5F5F5',
                padding: '80px 60px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
            }}>
                <RevealOnScroll>
                    <p style={{
                        fontSize: '0.7rem',
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase',
                        color: '#8A8A8A',
                        marginBottom: '1rem',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        Nasz zespół
                    </p>
                    <h2 style={{
                        fontSize: 'clamp(2rem, 3vw, 3rem)',
                        fontWeight: 300,
                        color: '#1A1A1A',
                        marginBottom: '2rem',
                        lineHeight: 1.2,
                        fontFamily: '"Cormorant Garamond", serif',
                    }}>
                        Doświadczeni <span style={{ fontStyle: 'italic' }}>specjaliści</span>
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                        {content.team.map((member, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                            }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: '#1A1A1A',
                                    color: 'var(--color-primary, #C5A55A)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    fontFamily: 'Inter, sans-serif',
                                }}>
                                    {member.initials}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.95rem', color: '#1A1A1A', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
                                        {member.name}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#8A8A8A', fontFamily: 'Inter, sans-serif' }}>
                                        {member.role}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Link href="/o-nas" style={{
                        display: 'inline-block',
                        padding: '12px 36px',
                        background: '#1A1A1A',
                        color: '#FFFFFF',
                        borderRadius: '100px',
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        transition: 'all 0.3s',
                        fontFamily: 'Inter, sans-serif',
                        width: 'fit-content',
                    }}>
                        Poznaj nas →
                    </Link>
                </RevealOnScroll>
            </div>

            {/* Right: Team visual placeholder */}
            <div style={{
                background: 'linear-gradient(135deg, #141414 0%, #0A0A0A 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(circle at 70% 50%, rgba(197,165,90,0.08) 0%, transparent 60%)',
                }} />
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                    position: 'relative',
                    zIndex: 1,
                }}>
                    {content.team.map((member, i) => (
                        <div key={i} style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            background: 'rgba(197,165,90,0.1)',
                            border: '1px solid rgba(197,165,90,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                        }}>
                            {member.emoji}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// TESTIMONIALS — Clean, full-width on dark background
// ═══════════════════════════════════════════════════════════════

function TestimonialsFullWidth({ content }: { content: PresetContent }) {
    return (
        <section style={{
            background: '#0A0A0A',
            padding: '100px 40px',
        }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
                <RevealOnScroll>
                    <p style={{
                        fontSize: '0.7rem',
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase',
                        color: 'var(--color-primary, #C5A55A)',
                        marginBottom: '1rem',
                        fontFamily: 'Inter, sans-serif',
                    }}>
                        Opinie pacjentów
                    </p>
                    <h2 style={{
                        fontSize: 'clamp(2rem, 3vw, 3rem)',
                        fontWeight: 300,
                        color: '#F5F5F5',
                        marginBottom: '3rem',
                        fontFamily: '"Cormorant Garamond", serif',
                    }}>
                        To, co mówią <span style={{ fontStyle: 'italic' }}>nasi pacjenci</span>
                    </h2>
                </RevealOnScroll>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '2rem',
                }}>
                    {content.testimonials.map((t, i) => (
                        <RevealOnScroll key={i} delay={i * 150}>
                            <div style={{
                                background: '#141414',
                                padding: '40px 32px',
                                textAlign: 'left',
                                position: 'relative',
                            }}>
                                <div style={{
                                    fontSize: '3rem',
                                    color: 'var(--color-primary, #C5A55A)',
                                    opacity: 0.3,
                                    lineHeight: 1,
                                    marginBottom: '1rem',
                                    fontFamily: 'Georgia, serif',
                                }}>
                                    &ldquo;
                                </div>
                                <p style={{
                                    fontSize: '0.95rem',
                                    color: 'rgba(255,255,255,0.8)',
                                    lineHeight: 1.7,
                                    marginBottom: '1.5rem',
                                    fontFamily: 'Inter, sans-serif',
                                    fontStyle: 'italic',
                                }}>
                                    {t.quote}
                                </p>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: '#F5F5F5', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
                                        {t.name}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-primary, #C5A55A)', fontFamily: 'Inter, sans-serif' }}>
                                        {t.treatment}
                                    </div>
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
// STATS — Horizontal stats bar
// ═══════════════════════════════════════════════════════════════

function StatsSection({ content }: { content: PresetContent }) {
    return (
        <section style={{
            background: '#F5F5F5',
            padding: '80px 40px',
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '2rem',
                textAlign: 'center',
            }}>
                {content.stats.map((stat, i) => (
                    <RevealOnScroll key={i} delay={i * 100}>
                        <div>
                            <div style={{
                                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                                fontWeight: 300,
                                color: '#1A1A1A',
                                lineHeight: 1,
                                marginBottom: '0.5rem',
                                fontFamily: '"Cormorant Garamond", serif',
                            }}>
                                {stat.number}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#8A8A8A',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                fontFamily: 'Inter, sans-serif',
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
// LUXE FOOTER — 4-column grid on light gray
// ═══════════════════════════════════════════════════════════════

function LuxeFooter({ content }: { content: PresetContent }) {
    return (
        <footer style={{
            background: '#F5F5F5',
            borderTop: '1px solid rgba(0,0,0,0.08)',
            padding: '60px 40px 30px',
        }}>
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '3rem',
            }}>
                {/* Contact */}
                <div>
                    <h4 style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '1rem', fontFamily: 'Inter, sans-serif' }}>
                        Kontakt
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.8, fontFamily: 'Inter, sans-serif' }}>
                        {content.contact.address}<br />
                        {content.contact.phone}<br />
                        {content.contact.email}
                    </p>
                </div>

                {/* Hours */}
                <div>
                    <h4 style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '1rem', fontFamily: 'Inter, sans-serif' }}>
                        Godziny otwarcia
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.8, fontFamily: 'Inter, sans-serif' }}>
                        {content.contact.hours}
                    </p>
                </div>

                {/* Quick links */}
                <div>
                    <h4 style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '1rem', fontFamily: 'Inter, sans-serif' }}>
                        Szybki dostęp
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {['Oferta', 'Zespół', 'Metamorfozy', 'Cennik', 'Blog', 'FAQ'].map(item => (
                            <Link key={item} href={`/${item.toLowerCase()}`} style={{
                                color: '#555',
                                textDecoration: 'none',
                                fontSize: '0.85rem',
                                fontFamily: 'Inter, sans-serif',
                                transition: 'color 0.2s',
                            }}>
                                {item}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* App modules */}
                <div>
                    <h4 style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '1rem', fontFamily: 'Inter, sans-serif' }}>
                        Dla pacjentów
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {[
                            { label: 'Strefa pacjenta', href: '/strefa-pacjenta' },
                            { label: 'Rezerwacja online', href: '/rezerwacja' },
                            { label: 'Sklep', href: '/sklep' },
                            { label: 'Asystent AI', href: '#' },
                        ].map(item => (
                            <Link key={item.label} href={item.href} style={{
                                color: '#555',
                                textDecoration: 'none',
                                fontSize: '0.85rem',
                                fontFamily: 'Inter, sans-serif',
                                transition: 'color 0.2s',
                            }}>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div style={{
                maxWidth: '1400px',
                margin: '40px auto 0',
                paddingTop: '20px',
                borderTop: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <p style={{ fontSize: '0.75rem', color: '#AAA', fontFamily: 'Inter, sans-serif' }}>
                    © 2025 {content.clinicName}. Wszelkie prawa zastrzeżone.
                </p>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {['Polityka prywatności', 'Regulamin', 'RODO'].map(item => (
                        <Link key={item} href="#" style={{
                            color: '#AAA',
                            textDecoration: 'none',
                            fontSize: '0.75rem',
                            fontFamily: 'Inter, sans-serif',
                        }}>
                            {item}
                        </Link>
                    ))}
                </div>
            </div>
        </footer>
    );
}
