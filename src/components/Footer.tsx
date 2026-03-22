"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import AnimatedPhone from "@/components/AnimatedPhone";
import AnimatedAt from "@/components/AnimatedAt";
import NovikCodeCredit from "@/components/NovikCodeCredit";

export default function Footer() {
    const t = useTranslations('footer');

    return (
        <footer className="section" style={{
            background: 'var(--color-surface)',
            marginTop: 'auto',
            borderTop: '1px solid var(--color-surface-hover)',
            position: 'relative',
            overflow: 'hidden'
        }}>

            {/* Watermark Logo */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%',
                height: '100%',
                opacity: 0.03,
                pointerEvents: 'none',
                zIndex: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                filter: 'grayscale(100%)' // Optional: make it purely textural
            }}>
                <Image
                    src="/logo-transparent.png"
                    alt="Watermark"
                    fill
                    style={{ objectFit: 'contain', transform: 'scale(1.5)' }}
                />
            </div>

            <div className="container" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--spacing-lg)',
                position: 'relative',
                zIndex: 1
            }}>

                <div>
                    <h3 style={{ color: 'var(--color-primary)', marginBottom: 'var(--spacing-sm)' }}>Mikrostomart</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        {t('slogan')}<br />
                        {t('sloganSub')}
                    </p>
                </div>

                <div>
                    <h4 style={{ color: 'var(--color-text-main)', marginBottom: 'var(--spacing-sm)' }}>{t('contact')}</h4>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        <a
                            href="https://www.google.com/maps/search/?api=1&query=Mikrostomart+Opole+ul.+Centralna+33a"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}
                            className="hover-underline"
                        >
                            ul. Centralna 33a<br />
                            45-940 Opole/Chmielowice
                        </a>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <a href="tel:+48570270470" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="hover-primary">
                                <AnimatedPhone size={16} color="var(--color-primary)" />
                                570-270-470
                            </a>
                            <a href="tel:+48570810800" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="hover-primary">
                                <AnimatedPhone size={16} color="var(--color-primary)" />
                                570-810-800
                            </a>
                        </div>

                        <a href="mailto:gabinet@mikrostomart.pl" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }} className="hover-primary">
                            <AnimatedAt size={16} color="var(--color-primary)" />
                            gabinet@mikrostomart.pl
                        </a>
                    </div>
                </div>

                <div>
                    <h4 style={{ color: 'var(--color-text-main)', marginBottom: 'var(--spacing-sm)' }}>{t('hours')}</h4>
                    <ul style={{ listStyle: 'none', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        <li>{t('monThu')}</li>
                        <li>{t('fri')}</li>
                        <li>{t('sat')}</li>
                    </ul>
                </div>

            </div>

            {/* ── SEO Site Navigation ── */}
            <nav aria-label="Mapa strony" className="container" style={{
                marginTop: 'var(--spacing-lg)',
                paddingTop: 'var(--spacing-md)',
                borderTop: '1px solid var(--color-surface-hover)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 'var(--spacing-md)',
                position: 'relative',
                zIndex: 1,
            }}>
                <div>
                    <h4 style={{ color: 'var(--color-text-main)', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('contact')}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <Link href="/o-nas" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">O nas</Link>
                        <Link href="/zespol" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Zespół</Link>
                        <Link href="/kontakt" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Kontakt</Link>
                        <Link href="/rezerwacja" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Rezerwacja</Link>
                    </div>
                </div>
                <div>
                    <h4 style={{ color: 'var(--color-text-main)', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Usługi</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <Link href="/oferta" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Oferta</Link>
                        <Link href="/oferta/implantologia" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Implantologia</Link>
                        <Link href="/oferta/leczenie-kanalowe" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Leczenie kanałowe</Link>
                        <Link href="/oferta/stomatologia-estetyczna" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Stomatologia estetyczna</Link>
                        <Link href="/oferta/ortodoncja" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Ortodoncja</Link>
                        <Link href="/oferta/chirurgia" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Chirurgia</Link>
                        <Link href="/oferta/protetyka" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Protetyka</Link>
                        <Link href="/cennik" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Cennik</Link>
                        <Link href="/metamorfozy" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Metamorfozy</Link>
                    </div>
                </div>
                <div>
                    <h4 style={{ color: 'var(--color-text-main)', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Narzędzia</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <Link href="/mapa-bolu" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Mapa bólu</Link>
                        <Link href="/kalkulator-leczenia" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Kalkulator leczenia</Link>
                        <Link href="/porownywarka" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Porównywarka</Link>
                        <Link href="/aplikacja" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Aplikacja</Link>
                    </div>
                </div>
                <div>
                    <h4 style={{ color: 'var(--color-text-main)', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wiedza</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <Link href="/aktualnosci" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Aktualności</Link>
                        <Link href="/baza-wiedzy" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Baza wiedzy</Link>
                        <Link href="/nowosielski" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Blog</Link>
                        <Link href="/sklep" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Sklep</Link>
                    </div>
                </div>
                <div>
                    <h4 style={{ color: 'var(--color-text-main)', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prawne</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <Link href="/regulamin" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Regulamin (Terms of Service)</Link>
                        <Link href="/privacy-policy" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Privacy Policy</Link>
                        <Link href="/rodo" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">RODO</Link>
                        <Link href="/polityka-cookies" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Polityka cookies</Link>
                    </div>
                </div>
            </nav>
            <div className="container" style={{
                marginTop: 'var(--spacing-lg)',
                paddingTop: 'var(--spacing-md)',
                borderTop: '1px solid var(--color-surface-hover)',
                textAlign: 'center',
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '2rem',
                flexWrap: 'wrap'
            }}>
                <span>{t('copyright', { year: new Date().getFullYear() })}</span>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <a
                        href="/faq"
                        style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
                        className="hover-underline"
                    >
                        FAQ
                    </a>
                    <a
                        href="/regulamin"
                        style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
                        className="hover-underline"
                    >
                        {t('terms')}
                    </a>
                    <a
                        href="/rodo"
                        style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
                        className="hover-underline"
                    >
                        RODO
                    </a>
                    <a
                        href="/privacy-policy"
                        style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
                        className="hover-underline"
                    >
                        Privacy Policy
                    </a>
                    <a
                        href="/polityka-cookies"
                        style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
                        className="hover-underline"
                    >
                        {t('cookiePolicy')}
                    </a>
                </div>
            </div>

            {/* Hidden staff access — deliberately inconspicuous */}
            <div style={{
                textAlign: 'center',
                marginTop: '0.75rem',
                paddingBottom: '0.25rem',
                position: 'relative',
                zIndex: 2,
            }}>
                <details style={{ display: 'inline-block' }}>
                    <summary style={{
                        color: 'rgba(255,255,255,0.06)',
                        fontSize: '0.55rem',
                        cursor: 'pointer',
                        listStyle: 'none',
                        userSelect: 'none',
                        padding: '0.5rem 1rem',
                        WebkitTapHighlightColor: 'transparent',
                    }}>
                        {t('backstage')}
                    </summary>
                    <div style={{
                        display: 'flex',
                        gap: '1.5rem',
                        justifyContent: 'center',
                        marginTop: '0.4rem',
                        padding: '0.3rem 0',
                    }}>
                        <Link href="/pracownik" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.7rem', opacity: 0.5, padding: '0.3rem 0.5rem' }}>{t('employee')}</Link>
                        <Link href="/admin" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.7rem', opacity: 0.5, padding: '0.3rem 0.5rem' }}>{t('admin')}</Link>
                    </div>
                </details>
            </div>

            {/* Novik Code Credit — very bottom of footer */}
            <NovikCodeCredit />

        </footer>
    );
}
