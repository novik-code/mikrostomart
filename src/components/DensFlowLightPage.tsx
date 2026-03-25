"use client";

import Link from "next/link";
import RevealOnScroll from "@/components/RevealOnScroll";

// ═══════════════════════════════════════════════════════════════
// DensFlowLightPage — A completely standalone luxury clinic page
// Inspired by leperle.pl — NO shared components with mikrostomart
// ═══════════════════════════════════════════════════════════════

export default function DensFlowLightPage() {
    return (
        <main style={{ background: 'var(--color-background, #FAFAFA)' }}>
            <HeroLePerle />
            <StatsBar />
            <ServicesSection />
            <PhilosophySection />
            <TeamSection />
            <DarkCTASection />
            <TestimonialsSection />
        </main>
    );
}

// ═══════════════════════════════════════════════════════════════
// 1. HERO — Centered, large elegant text, dual pill CTAs
// ═══════════════════════════════════════════════════════════════

function HeroLePerle() {
    return (
        <section style={{
            minHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: '120px 24px 80px',
            background: 'var(--color-background, #FAFAFA)',
        }}>
            <RevealOnScroll animation="blur-in">
                <p style={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.25em',
                    color: 'var(--color-primary, #9D7D5D)',
                    fontSize: '0.8rem',
                    marginBottom: '1.5rem',
                    fontWeight: 500,
                }}>
                    Stomatologia estetyczna
                </p>
            </RevealOnScroll>

            <RevealOnScroll animation="blur-in" delay={100}>
                <h1 style={{
                    fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                    fontWeight: 300,
                    lineHeight: 1.15,
                    color: 'var(--color-text-main, #1A1A1A)',
                    maxWidth: '800px',
                    marginBottom: '1.5rem',
                    letterSpacing: '-0.01em',
                }}>
                    Twoja droga do{' '}
                    <span style={{
                        fontWeight: 500,
                        fontStyle: 'italic',
                        color: 'var(--color-primary, #9D7D5D)',
                    }}>
                        pięknego uśmiechu
                    </span>
                </h1>
            </RevealOnScroll>

            <RevealOnScroll animation="fade-up" delay={200}>
                <p style={{
                    fontSize: '1.1rem',
                    color: 'var(--color-text-muted, #6B6B6B)',
                    maxWidth: '550px',
                    lineHeight: 1.8,
                    marginBottom: '2.5rem',
                }}>
                    Łączymy precyzję stomatologii z indywidualnym podejściem.
                    Każdy uśmiech projektujemy z dbałością o naturalne piękno.
                </p>
            </RevealOnScroll>

            <RevealOnScroll animation="fade-up" delay={300}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Link href="/rezerwacja" style={{
                        padding: '0.85rem 2.5rem',
                        background: 'var(--color-primary, #9D7D5D)',
                        color: '#FFFFFF',
                        borderRadius: '100px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'all 0.3s ease',
                        letterSpacing: '0.02em',
                    }}>
                        Umów wizytę
                    </Link>
                    <Link href="/oferta" style={{
                        padding: '0.85rem 2.5rem',
                        background: 'transparent',
                        color: 'var(--color-primary, #9D7D5D)',
                        border: '1.5px solid var(--color-primary, #9D7D5D)',
                        borderRadius: '100px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'all 0.3s ease',
                        letterSpacing: '0.02em',
                    }}>
                        Poznaj ofertę
                    </Link>
                </div>
            </RevealOnScroll>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// 2. STATS BAR — 4 large numbers with labels
// ═══════════════════════════════════════════════════════════════

function StatsBar() {
    const stats = [
        { number: '527+', label: 'Metamorfoz uśmiechu' },
        { number: '15', label: 'Lat doświadczenia' },
        { number: '98%', label: 'Zadowolonych pacjentów' },
        { number: '12', label: 'Specjalistów w zespole' },
    ];

    return (
        <section style={{
            padding: '60px 24px',
            background: 'var(--color-surface, #FFFFFF)',
            borderTop: '1px solid rgba(0,0,0,0.04)',
            borderBottom: '1px solid rgba(0,0,0,0.04)',
        }}>
            <div style={{
                maxWidth: '1100px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '2rem',
                textAlign: 'center',
            }}>
                {stats.map((stat, i) => (
                    <RevealOnScroll key={i} delay={([0, 100, 200, 300] as const)[i % 4]}>
                        <div>
                            <div style={{
                                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                                fontWeight: 300,
                                color: 'var(--color-primary, #9D7D5D)',
                                lineHeight: 1,
                                marginBottom: '0.5rem',
                                letterSpacing: '-0.02em',
                            }}>
                                {stat.number}
                            </div>
                            <div style={{
                                fontSize: '0.8rem',
                                color: 'var(--color-text-muted, #6B6B6B)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
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
// 3. SERVICES — Dark rounded cards, 3-column grid
// ═══════════════════════════════════════════════════════════════

function ServicesSection() {
    const services = [
        {
            title: 'Metamorfozy uśmiechu',
            desc: 'Kompleksowe planowanie i realizacja nowego uśmiechu — od projektu cyfrowego po efekt końcowy, który zmienia życie.',
            gradient: 'linear-gradient(135deg, #2C2C2C, #1A1A1A)',
        },
        {
            title: 'Licówki porcelanowe',
            desc: 'Ultra-cienkie licówki, które odtwarzają naturalną strukturę zęba. Trwałość i estetyka na najwyższym poziomie.',
            gradient: 'linear-gradient(135deg, #3A3A3A, #1A1A1A)',
        },
        {
            title: 'Invisalign',
            desc: 'Niewidoczne nakładki prostujące zęby. Komfort noszenia i doskonałe efekty w dyskretnej formie.',
            gradient: 'linear-gradient(135deg, #2C2C2C, #1F1F1F)',
        },
        {
            title: 'Implanty zębowe',
            desc: 'Najnowocześniejsze systemy implantologiczne. Precyzyjne wszczepienie z nawigacją 3D dla optymalnych efektów.',
            gradient: 'linear-gradient(135deg, #333333, #1A1A1A)',
        },
        {
            title: 'Wybielanie zębów',
            desc: 'Profesjonalne wybielanie z ochroną szkliwa. Natychmiastowy efekt świetlistego, naturalnego uśmiechu.',
            gradient: 'linear-gradient(135deg, #2E2E2E, #1A1A1A)',
        },
        {
            title: 'Protetyka cyfrowa',
            desc: 'Korony i mosty projektowane cyfrowo. Idealnie dopasowane, wytrzymałe i estetyczne odbudowy protetyczne.',
            gradient: 'linear-gradient(135deg, #353535, #1A1A1A)',
        },
    ];

    return (
        <section style={{ padding: '120px 24px', background: 'var(--color-background, #FAFAFA)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <RevealOnScroll>
                    <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                        <p style={{
                            textTransform: 'uppercase',
                            letterSpacing: '0.2em',
                            color: 'var(--color-primary, #9D7D5D)',
                            fontSize: '0.75rem',
                            marginBottom: '1rem',
                            fontWeight: 500,
                        }}>
                            Nasze usługi
                        </p>
                        <h2 style={{
                            fontSize: 'clamp(2rem, 4vw, 3rem)',
                            fontWeight: 300,
                            color: 'var(--color-text-main, #1A1A1A)',
                            lineHeight: 1.2,
                        }}>
                            Specjalizujemy się w{' '}
                            <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--color-primary, #9D7D5D)' }}>
                                pięknych uśmiechach
                            </span>
                        </h2>
                    </div>
                </RevealOnScroll>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '1.25rem',
                }}>
                    {services.map((service, i) => (
                        <RevealOnScroll key={i} delay={([0, 100, 200, 300] as const)[i % 4]}>
                            <Link href="/oferta" style={{ textDecoration: 'none' }}>
                                <div style={{
                                    background: service.gradient,
                                    borderRadius: '20px',
                                    padding: '40px 32px',
                                    minHeight: '220px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-end',
                                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}>
                                    {/* Subtle accent line */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '24px',
                                        left: '32px',
                                        width: '32px',
                                        height: '2px',
                                        background: 'var(--color-primary, #9D7D5D)',
                                        borderRadius: '1px',
                                    }} />
                                    <h3 style={{
                                        fontSize: '1.35rem',
                                        fontWeight: 500,
                                        color: '#FFFFFF',
                                        marginBottom: '0.75rem',
                                        lineHeight: 1.3,
                                    }}>
                                        {service.title}
                                    </h3>
                                    <p style={{
                                        fontSize: '0.85rem',
                                        color: 'rgba(255,255,255,0.55)',
                                        lineHeight: 1.7,
                                    }}>
                                        {service.desc}
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
// 4. PHILOSOPHY — Large rounded capsule cards
// ═══════════════════════════════════════════════════════════════

function PhilosophySection() {
    const values = [
        {
            title: 'Bezbolesne leczenie',
            desc: 'Stosujemy najnowocześniejsze metody znieczulenia i sedacji. Komfort pacjenta jest naszym priorytetem podczas każdego zabiegu.',
            number: '01',
        },
        {
            title: 'Indywidualne podejście',
            desc: 'Każdy pacjent jest wyjątkowy. Projektujemy plan leczenia dopasowany do Twoich potrzeb, oczekiwań i naturalnej anatomii uśmiechu.',
            number: '02',
        },
        {
            title: 'Nowoczesna technologia',
            desc: 'Skaner 3D, mikroskop endodontyczny, nawigacja chirurgiczna. Pracujemy z najlepszą technologią, aby zapewnić precyzję i bezpieczeństwo.',
            number: '03',
        },
    ];

    return (
        <section style={{
            padding: '120px 24px',
            background: 'var(--color-surface, #FFFFFF)',
        }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <RevealOnScroll>
                    <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                        <p style={{
                            textTransform: 'uppercase',
                            letterSpacing: '0.2em',
                            color: 'var(--color-primary, #9D7D5D)',
                            fontSize: '0.75rem',
                            marginBottom: '1rem',
                            fontWeight: 500,
                        }}>
                            Nasza filozofia
                        </p>
                        <h2 style={{
                            fontSize: 'clamp(2rem, 4vw, 3rem)',
                            fontWeight: 300,
                            color: 'var(--color-text-main, #1A1A1A)',
                        }}>
                            Dlaczego{' '}
                            <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--color-primary, #9D7D5D)' }}>
                                nam zaufać?
                            </span>
                        </h2>
                    </div>
                </RevealOnScroll>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {values.map((value, i) => (
                        <RevealOnScroll key={i} delay={([0, 100, 200, 300] as const)[i % 4]}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '2rem',
                                padding: '40px',
                                background: 'var(--color-background, #FAFAFA)',
                                borderRadius: '24px',
                                border: '1px solid rgba(0,0,0,0.04)',
                            }}>
                                <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 200,
                                    color: 'var(--color-primary, #9D7D5D)',
                                    minWidth: '40px',
                                    opacity: 0.5,
                                    lineHeight: 1,
                                    paddingTop: '4px',
                                }}>
                                    {value.number}
                                </div>
                                <div>
                                    <h3 style={{
                                        fontSize: '1.3rem',
                                        fontWeight: 500,
                                        color: 'var(--color-text-main, #1A1A1A)',
                                        marginBottom: '0.75rem',
                                    }}>
                                        {value.title}
                                    </h3>
                                    <p style={{
                                        fontSize: '0.95rem',
                                        color: 'var(--color-text-muted, #6B6B6B)',
                                        lineHeight: 1.8,
                                        maxWidth: '600px',
                                    }}>
                                        {value.desc}
                                    </p>
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
// 5. TEAM — Horizontal cards on warm beige background
// ═══════════════════════════════════════════════════════════════

function TeamSection() {
    const team = [
        { name: 'Dr Anna Kowalska', role: 'Stomatologia estetyczna', initials: 'AK' },
        { name: 'Dr Jan Nowak', role: 'Implantologia i chirurgia', initials: 'JN' },
        { name: 'Dr Maria Wiśniewska', role: 'Ortodoncja i Invisalign', initials: 'MW' },
        { name: 'Dr Piotr Zieliński', role: 'Endodoncja mikroskopowa', initials: 'PZ' },
    ];

    return (
        <section style={{
            padding: '120px 24px',
            background: 'rgba(157, 125, 93, 0.06)',
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <RevealOnScroll>
                    <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                        <p style={{
                            textTransform: 'uppercase',
                            letterSpacing: '0.2em',
                            color: 'var(--color-primary, #9D7D5D)',
                            fontSize: '0.75rem',
                            marginBottom: '1rem',
                            fontWeight: 500,
                        }}>
                            Nasz zespół
                        </p>
                        <h2 style={{
                            fontSize: 'clamp(2rem, 4vw, 3rem)',
                            fontWeight: 300,
                            color: 'var(--color-text-main, #1A1A1A)',
                        }}>
                            Specjaliści, którym{' '}
                            <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--color-primary, #9D7D5D)' }}>
                                możesz zaufać
                            </span>
                        </h2>
                    </div>
                </RevealOnScroll>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1.5rem',
                }}>
                    {team.map((member, i) => (
                        <RevealOnScroll key={i} delay={([0, 100, 200, 300] as const)[i % 4]}>
                            <div style={{
                                background: 'var(--color-surface, #FFFFFF)',
                                borderRadius: '20px',
                                padding: '40px 28px',
                                textAlign: 'center',
                                border: '1px solid rgba(0,0,0,0.04)',
                            }}>
                                {/* Avatar circle with gradient */}
                                <div style={{
                                    width: '90px',
                                    height: '90px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--color-primary, #9D7D5D), var(--color-primary-dark, #7A5F42))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 1.25rem',
                                    fontSize: '1.3rem',
                                    fontWeight: 300,
                                    color: '#FFFFFF',
                                    letterSpacing: '0.05em',
                                }}>
                                    {member.initials}
                                </div>
                                <h3 style={{
                                    fontSize: '1.05rem',
                                    fontWeight: 600,
                                    color: 'var(--color-text-main, #1A1A1A)',
                                    marginBottom: '0.4rem',
                                }}>
                                    {member.name}
                                </h3>
                                <p style={{
                                    fontSize: '0.8rem',
                                    color: 'var(--color-primary, #9D7D5D)',
                                    fontWeight: 500,
                                    letterSpacing: '0.02em',
                                }}>
                                    {member.role}
                                </p>
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// 6. DARK CTA — Full-width black rounded container
// ═══════════════════════════════════════════════════════════════

function DarkCTASection() {
    return (
        <section style={{ padding: '40px 24px', background: 'var(--color-background, #FAFAFA)' }}>
            <RevealOnScroll>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    background: '#1A1A1A',
                    borderRadius: '32px',
                    padding: '80px 40px',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Decorative gradient */}
                    <div style={{
                        position: 'absolute',
                        top: '-50%',
                        right: '-20%',
                        width: '400px',
                        height: '400px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(157,125,93,0.08) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }} />

                    <p style={{
                        textTransform: 'uppercase',
                        letterSpacing: '0.2em',
                        color: 'var(--color-primary, #9D7D5D)',
                        fontSize: '0.75rem',
                        marginBottom: '1.5rem',
                        fontWeight: 500,
                    }}>
                        Zacznij już dziś
                    </p>
                    <h2 style={{
                        fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                        fontWeight: 300,
                        color: '#FFFFFF',
                        lineHeight: 1.2,
                        marginBottom: '1.25rem',
                        maxWidth: '700px',
                        margin: '0 auto 1.25rem',
                    }}>
                        Twój nowy uśmiech{' '}
                        <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--color-primary, #9D7D5D)' }}>
                            czeka na Ciebie
                        </span>
                    </h2>
                    <p style={{
                        fontSize: '1rem',
                        color: 'rgba(255,255,255,0.45)',
                        maxWidth: '500px',
                        margin: '0 auto 2.5rem',
                        lineHeight: 1.7,
                    }}>
                        Bezpłatna konsultacja online lub w gabinecie.
                        Porozmawiajmy o planie leczenia dopasowanym do Ciebie.
                    </p>
                    <Link href="/rezerwacja" style={{
                        display: 'inline-block',
                        padding: '0.85rem 3rem',
                        background: '#FFFFFF',
                        color: '#1A1A1A',
                        borderRadius: '100px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'all 0.3s ease',
                        letterSpacing: '0.02em',
                    }}>
                        Umów bezpłatną konsultację
                    </Link>
                </div>
            </RevealOnScroll>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════
// 7. TESTIMONIALS — Clean text quotes
// ═══════════════════════════════════════════════════════════════

function TestimonialsSection() {
    const testimonials = [
        {
            quote: 'Pierwszy raz w życiu nie bałam się wizyty u dentysty. Atmosfera, podejście i efekty — wszystko na najwyższym poziomie.',
            name: 'Katarzyna M.',
            treatment: 'Licówki porcelanowe',
        },
        {
            quote: 'Po latach kompleksów w końcu mogę się uśmiechać bez skrępowania. Metamorfoza zmieniła moje życie.',
            name: 'Marcin W.',
            treatment: 'Metamorfoza uśmiechu',
        },
        {
            quote: 'Profesjonalizm i cierpliwość na każdym etapie leczenia. Efekty Invisalign przerosły moje oczekiwania.',
            name: 'Agnieszka K.',
            treatment: 'Invisalign',
        },
    ];

    return (
        <section style={{
            padding: '120px 24px',
            background: 'var(--color-surface, #FFFFFF)',
        }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <RevealOnScroll>
                    <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                        <p style={{
                            textTransform: 'uppercase',
                            letterSpacing: '0.2em',
                            color: 'var(--color-primary, #9D7D5D)',
                            fontSize: '0.75rem',
                            marginBottom: '1rem',
                            fontWeight: 500,
                        }}>
                            Opinie pacjentów
                        </p>
                        <h2 style={{
                            fontSize: 'clamp(2rem, 4vw, 3rem)',
                            fontWeight: 300,
                            color: 'var(--color-text-main, #1A1A1A)',
                        }}>
                            Co mówią{' '}
                            <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--color-primary, #9D7D5D)' }}>
                                nasi pacjenci
                            </span>
                        </h2>
                    </div>
                </RevealOnScroll>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {testimonials.map((t, i) => (
                        <RevealOnScroll key={i} delay={([0, 100, 200, 300] as const)[i % 4]}>
                            <div style={{
                                padding: '40px',
                                background: 'var(--color-background, #FAFAFA)',
                                borderRadius: '20px',
                                border: '1px solid rgba(0,0,0,0.04)',
                                position: 'relative',
                            }}>
                                {/* Rating stars */}
                                <div style={{
                                    display: 'flex',
                                    gap: '3px',
                                    marginBottom: '1rem',
                                }}>
                                    {[1,2,3,4,5].map(s => (
                                        <span key={s} style={{
                                            color: 'var(--color-primary, #9D7D5D)',
                                            fontSize: '0.9rem',
                                        }}>★</span>
                                    ))}
                                </div>

                                <p style={{
                                    fontSize: '1.1rem',
                                    color: 'var(--color-text-main, #1A1A1A)',
                                    lineHeight: 1.8,
                                    fontStyle: 'italic',
                                    fontWeight: 300,
                                    marginBottom: '1.5rem',
                                }}>
                                    &ldquo;{t.quote}&rdquo;
                                </p>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {/* Avatar */}
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, var(--color-primary, #9D7D5D), var(--color-primary-dark, #7A5F42))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#FFF',
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                    }}>
                                        {t.name.split(' ').map(w => w[0]).join('')}
                                    </div>
                                    <div>
                                        <div style={{
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            color: 'var(--color-text-main, #1A1A1A)',
                                        }}>
                                            {t.name}
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--color-primary, #9D7D5D)',
                                        }}>
                                            {t.treatment}
                                        </div>
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
