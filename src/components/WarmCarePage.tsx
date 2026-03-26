"use client";

import Link from "next/link";
import RevealOnScroll from "@/components/RevealOnScroll";
import { usePresetId } from "@/context/ThemeContext";
import { getPresetContent, type PresetContent } from "@/lib/presetContent";

// ═══════════════════════════════════════════════════════════════
// WarmCarePage — Warm editorial luxury (MalottkiClinic-inspired)
// Inline nav with dropdowns, serif+sans pairing, sand/cream #FDF9F2,
// curved decorative text, copper/tan accents, blue CTA contrast
// ═══════════════════════════════════════════════════════════════

export default function WarmCarePage() {
    const presetId = usePresetId();
    const content = getPresetContent(presetId);

    return (
        <main style={{ background: '#FDF9F2', color: '#2D1F1A' }}>
            <WarmNav content={content} />
            <EditorialHero content={content} />
            <ServicesVertical content={content} />
            <SocialProofGrid content={content} />
            <MissionStatement content={content} />
            <TestimonialsSlider content={content} />
            <BlogCards content={content} />
            <FAQDualColumn content={content} />
            <WarmFooter content={content} />
            <FloatingCTA />
        </main>
    );
}

// ═══════════════════════════════════════════════════════════════
// INLINE NAV — Full inline with dropdowns, logo left, search right
// ═══════════════════════════════════════════════════════════════

function WarmNav({ content }: { content: PresetContent }) {
    return (
        <nav style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'rgba(253, 249, 242, 0.95)',
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
                gap: '10px',
            }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--color-primary, #3B82F6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                }}>
                    ♡
                </div>
                <span style={{
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: '#2D1F1A',
                    fontFamily: '"Playfair Display", serif',
                }}>
                    {content.clinicName}
                </span>
            </div>

            {/* Inline nav links */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.75rem',
            }}>
                {[
                    { label: 'Oferta', href: '/oferta' },
                    { label: 'Strefa pacjenta', href: '/strefa-pacjenta' },
                    { label: 'Metamorfozy', href: '/metamorfozy' },
                    { label: 'Cennik', href: '/cennik' },
                    { label: 'Blog', href: '/aktualnosci' },
                    { label: 'O Nas', href: '/o-nas' },
                    { label: 'FAQ', href: '/faq' },
                    { label: 'Kontakt', href: '/kontakt' },
                ].map(item => (
                    <Link key={item.label} href={item.href} style={{
                        color: '#2D1F1A',
                        textDecoration: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 400,
                        fontFamily: '"Open Sans", sans-serif',
                        transition: 'color 0.2s',
                    }}>
                        {item.label}
                        {['Oferta', 'Strefa pacjenta', 'Metamorfozy', 'O Nas'].includes(item.label) && (
                            <span style={{ fontSize: '0.6rem', marginLeft: '3px', color: '#7A6A5F' }}>▼</span>
                        )}
                    </Link>
                ))}
            </div>

            {/* Search icon */}
            <button style={{
                background: 'none',
                border: '1.5px solid #2D1F1A',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.9rem',
            }}>
                🔍
            </button>
        </nav>
    );
}

// ═══════════════════════════════════════════════════════════════
// EDITORIAL HERO — Serif heading left, photo right with curved text
// ═══════════════════════════════════════════════════════════════

function EditorialHero({ content }: { content: PresetContent }) {
    return (
        <section style={{
            position: 'relative',
            padding: '80px 60px 100px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4rem',
            alignItems: 'center',
            minHeight: '85vh',
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
                <source src="https://cdn.pixabay.com/video/2025/06/13/285771_large.mp4" type="video/mp4" />
            </video>
            {/* Warm cream overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(253,249,242,0.88) 0%, rgba(253,249,242,0.82) 100%)',
                zIndex: 1,
            }} />
            {/* Left: Serif heading */}
            <div style={{ position: 'relative', zIndex: 2 }}>
                <RevealOnScroll animation="blur-in">
                    <p style={{
                        fontSize: '0.85rem',
                        color: '#7A6A5F',
                        marginBottom: '1rem',
                        fontFamily: '"Open Sans", sans-serif',
                    }}>
                        {content.hero.label}
                    </p>
                    <h1 style={{
                        fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                        fontWeight: 300,
                        lineHeight: 1.1,
                        color: '#2D1F1A',
                        marginBottom: '2rem',
                        fontFamily: '"Playfair Display", serif',
                    }}>
                        {content.hero.title1}{' '}
                        <span style={{
                            fontStyle: 'italic',
                            color: 'var(--color-primary, #3B82F6)',
                        }}>
                            {content.hero.title2}
                        </span>
                    </h1>
                    <p style={{
                        fontSize: '1rem',
                        color: '#7A6A5F',
                        lineHeight: 1.7,
                        marginBottom: '2rem',
                        maxWidth: '480px',
                        fontFamily: '"Open Sans", sans-serif',
                    }}>
                        {content.hero.description}
                    </p>
                    <Link href="/rezerwacja" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '14px 32px',
                        background: 'var(--color-primary, #3B82F6)',
                        color: '#FFFFFF',
                        borderRadius: '100px',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        fontFamily: '"Open Sans", sans-serif',
                        transition: 'all 0.3s',
                    }}>
                        Umów się na wizytę
                        <span style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                        }}>
                            →
                        </span>
                    </Link>
                </RevealOnScroll>
            </div>

            {/* Right: Photo placeholder with curved text */}
            <RevealOnScroll animation="fade-up" delay={200}>
                <div style={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <div style={{
                        width: '400px',
                        height: '450px',
                        borderRadius: '200px 200px 40px 40px',
                        background: 'linear-gradient(180deg, #E8DDD4 0%, #D4C8BC 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '6rem',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        😊
                        {/* Curved text simulation */}
                        <div style={{
                            position: 'absolute',
                            width: '320px',
                            height: '320px',
                            borderRadius: '50%',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <svg viewBox="0 0 200 200" style={{ position: 'absolute', width: '100%', height: '100%' }}>
                                <defs>
                                    <path id="circlePath" d="M 100, 100 m -80, 0 a 80,80 0 1,1 160,0 a 80,80 0 1,1 -160,0" />
                                </defs>
                                <text style={{ fontSize: '11px', fill: '#FFFFFF', fontFamily: '"Playfair Display", serif', fontStyle: 'italic' }}>
                                    <textPath href="#circlePath">
                                        Twój uśmiech jest dla nas najważniejszy! ✦ {content.clinicName} ✦
                                    </textPath>
                                </text>
                            </svg>
                        </div>
                    </div>
                </div>
            </RevealOnScroll>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// SERVICES — Vertical interactive cards with diamond separators
// ═══════════════════════════════════════════════════════════════

function ServicesVertical({ content }: { content: PresetContent }) {
    return (
        <section style={{
            padding: '80px 60px',
            background: '#FFFFFF',
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '4rem' }}>
                {/* Left: Intro box */}
                <RevealOnScroll>
                    <div style={{
                        background: '#E8DDD4',
                        borderRadius: '24px',
                        padding: '40px 32px',
                        alignSelf: 'start',
                        position: 'sticky',
                        top: '100px',
                    }}>
                        <p style={{
                            fontSize: '0.7rem',
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            color: '#7A6A5F',
                            marginBottom: '0.75rem',
                            fontFamily: '"Open Sans", sans-serif',
                        }}>
                            Nasza oferta
                        </p>
                        <h2 style={{
                            fontSize: '2rem',
                            fontWeight: 300,
                            color: '#2D1F1A',
                            marginBottom: '1rem',
                            lineHeight: 1.2,
                            fontFamily: '"Playfair Display", serif',
                        }}>
                            Kompleksowa opieka{' '}
                            <span style={{ fontStyle: 'italic' }}>stomatologiczna</span>
                        </h2>
                        <p style={{
                            fontSize: '0.85rem',
                            color: '#7A6A5F',
                            lineHeight: 1.7,
                            fontFamily: '"Open Sans", sans-serif',
                        }}>
                            Od profilaktyki po zaawansowane zabiegi estetyczne. Znajdź rozwiązanie dopasowane do Twoich potrzeb.
                        </p>
                    </div>
                </RevealOnScroll>

                {/* Right: Vertical cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {content.services.map((svc, i) => (
                        <RevealOnScroll key={i} delay={([0, 100, 200, 300] as const)[i % 4]}>
                            <Link href="/oferta" style={{ textDecoration: 'none' }}>
                                <div style={{
                                    padding: '24px 0',
                                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ fontSize: '1.5rem' }}>{svc.icon}</span>
                                        <div>
                                            <h3 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: 400,
                                                color: '#2D1F1A',
                                                fontFamily: '"Playfair Display", serif',
                                            }}>
                                                {svc.title}
                                            </h3>
                                            <p style={{
                                                fontSize: '0.8rem',
                                                color: '#7A6A5F',
                                                fontFamily: '"Open Sans", sans-serif',
                                            }}>
                                                {svc.desc}
                                            </p>
                                        </div>
                                    </div>
                                    <span style={{
                                        color: 'var(--color-primary, #3B82F6)',
                                        fontSize: '1.1rem',
                                        fontWeight: 300,
                                    }}>
                                        →
                                    </span>
                                </div>
                            </Link>
                            {i < content.services.length - 1 && (
                                <div style={{ textAlign: 'center', padding: '4px 0', fontSize: '0.5rem', color: '#D4C8BC' }}>
                                    ◆
                                </div>
                            )}
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// SOCIAL PROOF — Asymmetric rounded images + large stats
// ═══════════════════════════════════════════════════════════════

function SocialProofGrid({ content }: { content: PresetContent }) {
    return (
        <section style={{
            padding: '80px 60px',
            background: '#FDF9F2',
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '1.5rem',
                    marginBottom: '3rem',
                }}>
                    {content.gallery.slice(0, 4).map((img, i) => (
                        <RevealOnScroll key={i} delay={([0, 100, 200, 300] as const)[i % 4]}>
                            <div style={{
                                background: '#E8DDD4',
                                borderRadius: i % 2 === 0 ? '8px 40px 8px 40px' : '40px 8px 40px 8px',
                                height: '200px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2.5rem',
                            }}>
                                {img.emoji}
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>

                {/* Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '2rem',
                    textAlign: 'center',
                }}>
                    {content.stats.map((stat, i) => (
                        <RevealOnScroll key={i} delay={i * 100}>
                            <div>
                                <div style={{
                                    fontSize: 'clamp(2rem, 4vw, 3rem)',
                                    fontWeight: 700,
                                    color: '#2D1F1A',
                                    fontFamily: '"Playfair Display", serif',
                                    lineHeight: 1,
                                    marginBottom: '0.5rem',
                                }}>
                                    {stat.number}
                                </div>
                                <div style={{
                                    fontSize: '0.8rem',
                                    color: '#7A6A5F',
                                    fontFamily: '"Open Sans", sans-serif',
                                }}>
                                    {stat.label}
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
// MISSION STATEMENT — Full-width centered serif
// ═══════════════════════════════════════════════════════════════

function MissionStatement({ content }: { content: PresetContent }) {
    return (
        <section style={{
            padding: '100px 60px',
            background: '#2D1F1A',
            textAlign: 'center',
        }}>
            <RevealOnScroll>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <p style={{
                        fontSize: '0.7rem',
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase',
                        color: '#D4C8BC',
                        marginBottom: '1.5rem',
                        fontFamily: '"Open Sans", sans-serif',
                    }}>
                        Nasza misja
                    </p>
                    <h2 style={{
                        fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
                        fontWeight: 300,
                        color: '#FFFFFF',
                        lineHeight: 1.4,
                        fontFamily: '"Playfair Display", serif',
                        fontStyle: 'italic',
                    }}>
                        &ldquo;{content.about.mission}&rdquo;
                    </h2>
                </div>
            </RevealOnScroll>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// TESTIMONIALS — Photo left + quote card right
// ═══════════════════════════════════════════════════════════════

function TestimonialsSlider({ content }: { content: PresetContent }) {
    return (
        <section style={{
            padding: '80px 60px',
            background: '#FFFFFF',
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <RevealOnScroll>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <p style={{
                            fontSize: '0.7rem',
                            letterSpacing: '0.25em',
                            textTransform: 'uppercase',
                            color: '#7A6A5F',
                            marginBottom: '0.75rem',
                            fontFamily: '"Open Sans", sans-serif',
                        }}>
                            Opinie pacjentów
                        </p>
                        <h2 style={{
                            fontSize: '2.5rem',
                            fontWeight: 300,
                            color: '#2D1F1A',
                            fontFamily: '"Playfair Display", serif',
                        }}>
                            Co o nas <span style={{ fontStyle: 'italic' }}>mówią</span>
                        </h2>
                    </div>
                </RevealOnScroll>

                {content.testimonials.map((t, i) => (
                    <RevealOnScroll key={i} delay={([0, 100, 200, 300] as const)[i % 3]}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '200px 1fr',
                            gap: '2rem',
                            alignItems: 'center',
                            marginBottom: '2rem',
                            padding: '24px',
                            background: '#FDF9F2',
                            borderRadius: '20px',
                        }}>
                            <div style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                background: '#E8DDD4',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2.5rem',
                                margin: '0 auto',
                            }}>
                                {['👩', '👨', '👩‍🦱'][i % 3]}
                            </div>
                            <div>
                                <div style={{ color: '#FFC107', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                                    ★★★★★
                                </div>
                                <p style={{
                                    fontSize: '1rem',
                                    color: '#2D1F1A',
                                    lineHeight: 1.7,
                                    marginBottom: '1rem',
                                    fontFamily: '"Open Sans", sans-serif',
                                    fontStyle: 'italic',
                                }}>
                                    &ldquo;{t.quote}&rdquo;
                                </p>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2D1F1A', fontFamily: '"Playfair Display", serif' }}>
                                    {t.name}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-primary, #3B82F6)', fontFamily: '"Open Sans", sans-serif' }}>
                                    {t.treatment}
                                </div>
                            </div>
                        </div>
                    </RevealOnScroll>
                ))}
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// BLOG — Horizontal cards with rounded thumbnails
// ═══════════════════════════════════════════════════════════════

function BlogCards({ content }: { content: PresetContent }) {
    return (
        <section style={{
            padding: '80px 60px',
            background: '#FDF9F2',
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <RevealOnScroll>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <p style={{
                            fontSize: '0.7rem',
                            letterSpacing: '0.25em',
                            textTransform: 'uppercase',
                            color: '#7A6A5F',
                            marginBottom: '0.75rem',
                            fontFamily: '"Open Sans", sans-serif',
                        }}>
                            Blog
                        </p>
                        <h2 style={{
                            fontSize: '2.5rem',
                            fontWeight: 300,
                            color: '#2D1F1A',
                            fontFamily: '"Playfair Display", serif',
                        }}>
                            Ostatnie <span style={{ fontStyle: 'italic' }}>artykuły</span>
                        </h2>
                    </div>
                </RevealOnScroll>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1.5rem',
                }}>
                    {content.blogPosts.map((post, i) => (
                        <RevealOnScroll key={i} delay={([0, 100, 200, 300] as const)[i % 4]}>
                            <Link href="/aktualnosci" style={{ textDecoration: 'none' }}>
                                <div style={{
                                    background: '#FFFFFF',
                                    borderRadius: '20px',
                                    overflow: 'hidden',
                                    transition: 'transform 0.3s',
                                    cursor: 'pointer',
                                }}>
                                    <div style={{
                                        background: '#E8DDD4',
                                        padding: '40px',
                                        textAlign: 'center',
                                        fontSize: '2rem',
                                        borderRadius: '0 0 40% 40%',
                                    }}>
                                        📝
                                    </div>
                                    <div style={{ padding: '20px' }}>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            color: '#7A6A5F',
                                            fontFamily: '"Open Sans", sans-serif',
                                        }}>
                                            {post.date} · {post.category}
                                        </span>
                                        <h3 style={{
                                            fontSize: '1rem',
                                            fontWeight: 400,
                                            color: '#2D1F1A',
                                            marginTop: '0.5rem',
                                            fontFamily: '"Playfair Display", serif',
                                        }}>
                                            {post.title}
                                        </h3>
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
// FAQ — Dual-column accordion
// ═══════════════════════════════════════════════════════════════

function FAQDualColumn({ content }: { content: PresetContent }) {
    const half = Math.ceil(content.faqs.length / 2);
    const left = content.faqs.slice(0, half);
    const right = content.faqs.slice(half);

    return (
        <section style={{
            padding: '80px 60px',
            background: '#FFFFFF',
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <RevealOnScroll>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{
                            fontSize: '2.5rem',
                            fontWeight: 300,
                            color: '#2D1F1A',
                            fontFamily: '"Playfair Display", serif',
                        }}>
                            Często zadawane <span style={{ fontStyle: 'italic' }}>pytania</span>
                        </h2>
                    </div>
                </RevealOnScroll>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.5rem',
                }}>
                    {[left, right].map((col, ci) => (
                        <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {col.map((faq, fi) => (
                                <RevealOnScroll key={fi} delay={([0, 100, 200, 300] as const)[(ci * half + fi) % 4]}>
                                    <details style={{
                                        background: '#FDF9F2',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                    }}>
                                        <summary style={{
                                            padding: '18px 24px',
                                            fontSize: '0.9rem',
                                            fontWeight: 400,
                                            color: '#2D1F1A',
                                            cursor: 'pointer',
                                            fontFamily: '"Playfair Display", serif',
                                            listStyle: 'none',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}>
                                            {faq.q}
                                            <span style={{ color: 'var(--color-primary, #3B82F6)' }}>+</span>
                                        </summary>
                                        <div style={{
                                            padding: '0 24px 18px',
                                            fontSize: '0.82rem',
                                            color: '#7A6A5F',
                                            lineHeight: 1.7,
                                            fontFamily: '"Open Sans", sans-serif',
                                        }}>
                                            {faq.a}
                                        </div>
                                    </details>
                                </RevealOnScroll>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// FOOTER — Multi-tier: contact boxes + treatment links + legal
// ═══════════════════════════════════════════════════════════════

function WarmFooter({ content }: { content: PresetContent }) {
    return (
        <footer>
            {/* Contact tier — 4 boxes */}
            <div style={{
                background: '#E8DDD4',
                padding: '40px 60px',
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '1.5rem',
                }}>
                    {[
                        { icon: '📱', label: 'Social media', value: 'FB · IG · YT · TikTok' },
                        { icon: '📍', label: 'Adres', value: content.contact.address },
                        { icon: '📞', label: 'Telefon', value: content.contact.phone },
                        { icon: '🕐', label: 'Godziny', value: content.contact.hours },
                    ].map((item, i) => (
                        <div key={i} style={{
                            background: '#D4C8BC',
                            borderRadius: '16px',
                            padding: '24px',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                            <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7A6A5F', marginBottom: '0.5rem', fontFamily: '"Open Sans", sans-serif' }}>
                                {item.label}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#2D1F1A', fontFamily: '"Open Sans", sans-serif' }}>
                                {item.value}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Treatment links tier */}
            <div style={{
                background: '#2D1F1A',
                padding: '40px 60px',
                color: '#FFFFFF',
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '2rem',
                }}>
                    {/* Services column */}
                    <div>
                        <h4 style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', fontFamily: '"Open Sans", sans-serif' }}>
                            Usługi
                        </h4>
                        {content.services.slice(0, 5).map((svc, i) => (
                            <Link key={i} href="/oferta" style={{
                                display: 'block', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.8rem', padding: '2px 0',
                                fontFamily: '"Open Sans", sans-serif',
                            }}>
                                {svc.title}
                            </Link>
                        ))}
                    </div>

                    {/* Subpages */}
                    <div>
                        <h4 style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', fontFamily: '"Open Sans", sans-serif' }}>
                            Strony
                        </h4>
                        {['O Nas', 'Oferta', 'Cennik', 'Metamorfozy', 'Blog', 'FAQ', 'Kontakt'].map(l => (
                            <Link key={l} href={`/${l.toLowerCase().replace(/ /g, '-')}`} style={{
                                display: 'block', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.8rem', padding: '2px 0',
                                fontFamily: '"Open Sans", sans-serif',
                            }}>
                                {l}
                            </Link>
                        ))}
                    </div>

                    {/* Patient zone */}
                    <div>
                        <h4 style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', fontFamily: '"Open Sans", sans-serif' }}>
                            Strefa pacjenta
                        </h4>
                        {[
                            { label: 'Logowanie', href: '/strefa-pacjenta/login' },
                            { label: 'Historia wizyt', href: '/strefa-pacjenta/historia' },
                            { label: 'Profil', href: '/strefa-pacjenta/profil' },
                            { label: 'Rezerwacja', href: '/rezerwacja' },
                        ].map(item => (
                            <Link key={item.label} href={item.href} style={{
                                display: 'block', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.8rem', padding: '2px 0',
                                fontFamily: '"Open Sans", sans-serif',
                            }}>
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* App modules */}
                    <div>
                        <h4 style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', fontFamily: '"Open Sans", sans-serif' }}>
                            Aplikacja
                        </h4>
                        {[
                            { label: 'Asystent AI', href: '#' },
                            { label: 'Symulator uśmiechu', href: '/symulator' },
                            { label: 'Mapa bólu', href: '#' },
                            { label: 'Sklep', href: '/sklep' },
                        ].map(item => (
                            <Link key={item.label} href={item.href} style={{
                                display: 'block', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.8rem', padding: '2px 0',
                                fontFamily: '"Open Sans", sans-serif',
                            }}>
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* Admin/Employee */}
                    <div>
                        <h4 style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', fontFamily: '"Open Sans", sans-serif' }}>
                            Zarządzanie
                        </h4>
                        {[
                            { label: 'Panel administracyjny', href: '/admin' },
                            { label: 'Strefa pracownika', href: '/strefa-pracownika' },
                        ].map(item => (
                            <Link key={item.label} href={item.href} style={{
                                display: 'block', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.8rem', padding: '2px 0',
                                fontFamily: '"Open Sans", sans-serif',
                            }}>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Legal sub-footer */}
            <div style={{
                background: '#1A110D',
                padding: '16px 60px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.3)',
                fontFamily: '"Open Sans", sans-serif',
            }}>
                <span>© 2025 {content.clinicName}. Wszelkie prawa zastrzeżone.</span>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {['Polityka prywatności', 'RODO', 'Regulamin'].map(l => (
                        <Link key={l} href="#" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: '0.7rem' }}>{l}</Link>
                    ))}
                </div>
            </div>
        </footer>
    );
}

// ═══════════════════════════════════════════════════════════════
// FLOATING CTA — Fixed blue button bottom-right
// ═══════════════════════════════════════════════════════════════

function FloatingCTA() {
    return (
        <Link href="/rezerwacja" style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 90,
            background: 'var(--color-primary, #3B82F6)',
            color: '#FFFFFF',
            padding: '14px 28px',
            borderRadius: '100px',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            fontFamily: '"Open Sans", sans-serif',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s',
        }}>
            📅 Umów się na wizytę
        </Link>
    );
}
