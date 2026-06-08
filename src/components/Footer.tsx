"use client";

import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import AnimatedPhone from "@/components/AnimatedPhone";
import AnimatedAt from "@/components/AnimatedAt";
import NovikCodeCredit from "@/components/NovikCodeCredit";
import { brand } from "@/lib/brandConfig";
import { isDemoMode } from "@/lib/demoMode";
import { formatPhoneForTel } from "@/lib/phoneFormat";

export default function Footer() {
    const t = useTranslations('footer');
    const tn = useTranslations('footer.seoNav');
    const locale = useLocale();

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
                    src={isDemoMode ? "/demo-logo.png" : "/logo-transparent.png"}
                    alt="Watermark"
                    fill
                    sizes="(max-width: 768px) 100vw, 1200px"
                    aria-hidden="true"
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
                    <h3 style={{ color: 'var(--color-primary)', marginBottom: 'var(--spacing-sm)' }}>{brand.name}</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        {t('slogan')}<br />
                        {t('sloganSub')}
                    </p>
                </div>

                <div>
                    <h4 style={{ color: 'var(--color-text-main)', marginBottom: 'var(--spacing-sm)' }}>{t('contact')}</h4>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${brand.mapQuery}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}
                            className="hover-underline"
                        >
                            {brand.streetAddress}<br />
                            {brand.postalCode} {brand.city}
                        </a>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <a href={`tel:${formatPhoneForTel(brand.phone1)}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="hover-primary">
                                <AnimatedPhone size={16} color="var(--color-primary)" />
                                {brand.phone1}
                            </a>
                            <a href={`tel:${formatPhoneForTel(brand.phone2)}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="hover-primary">
                                <AnimatedPhone size={16} color="var(--color-primary)" />
                                {brand.phone2}
                            </a>
                        </div>

                        <a href={`mailto:${brand.email}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }} className="hover-primary">
                            <AnimatedAt size={16} color="var(--color-primary)" />
                            {brand.email}
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

            {/* ── SEO Site Navigation ──
                Faza fix-footer (2026-05-10): wszystkie linki używają teraz `Link` z
                @/i18n/navigation (auto-locale-prefix: /baza-wiedzy → /en/baza-wiedzy
                gdy user na /en). Wszystkie labels lokalizowane przez `footer.seoNav`
                namespace. Link /zespol zmieniony na /o-nas (bezpośrednio, bez chain
                redirect który dla /en/zespol mógł dawać 404). */}
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
                        <Link href="/o-nas" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('about')}</Link>
                        <Link href="/o-nas" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('team')}</Link>
                        <Link href="/dentysta-opole-centrum" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('dentistOpoleCentre')}</Link>
                        <Link href="/dla-pacjentow-przyjezdnych" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('intlPatients')}</Link>
                        {/* 1B: dedykowane geo-landingi pokazywane tylko w ich indeksowanym locale
                            (DE→/de/zahnarzt-opole, EN→/en/dentist-opole) — daje orphanom internal link
                            z każdej strony w danym locale, bez linkowania do noindex w innych locale. */}
                        {locale === 'de' && (
                            <Link href="/zahnarzt-opole" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Zahnarzt Opole</Link>
                        )}
                        {locale === 'en' && (
                            <Link href="/dentist-opole" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">Dentist in Opole</Link>
                        )}
                        <Link href="/kontakt" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{t('contact')}</Link>
                        <Link href="/rezerwacja" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('booking')}</Link>
                    </div>
                </div>
                <div>
                    <h4 style={{ color: 'var(--color-text-main)', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tn('servicesHeading')}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <Link href="/oferta" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('services')}</Link>
                        <Link href="/oferta/implantologia" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('implants')}</Link>
                        <Link href="/oferta/all-on-4" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('allon4')}</Link>
                        <Link href="/implanty-opole" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('implantyOpole')}</Link>
                        <Link href="/oferta/leczenie-kanalowe" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('rootCanal')}</Link>
                        <Link href="/leczenie-kanalowe-opole-mikroskop" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('rootCanalOpoleMicroscope')}</Link>
                        <Link href="/oferta/laser" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('laser')}</Link>
                        <Link href="/oferta/stomatologia-estetyczna" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('aesthetic')}</Link>
                        <Link href="/oferta/ortodoncja" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('orthodontics')}</Link>
                        <Link href="/oferta/chirurgia" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('surgery')}</Link>
                        <Link href="/oferta/protetyka" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('prosthodontics')}</Link>
                        <Link href="/oferta/periodontologia" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('periodontologia')}</Link>
                        <Link href="/oferta/stomatologia-dziecieca" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('pediatric')}</Link>
                        <Link href="/oferta/stomatologia-zachowawcza" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('conservative')}</Link>
                        <Link href="/cennik" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('pricing')}</Link>
                        <Link href="/metamorfozy" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('metamorphoses')}</Link>
                    </div>
                </div>
                <div>
                    <h4 style={{ color: 'var(--color-text-main)', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tn('toolsHeading')}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <Link href="/mapa-bolu" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('painMap')}</Link>
                        <Link href="/kalkulator-leczenia" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('treatmentCalculator')}</Link>
                        <Link href="/porownywarka" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('comparator')}</Link>
                        <Link href="/aplikacja" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('appLanding')}</Link>
                    </div>
                </div>
                <div>
                    <h4 style={{ color: 'var(--color-text-main)', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tn('knowledgeHeading')}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <Link href="/aktualnosci" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('news')}</Link>
                        <Link href="/baza-wiedzy" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('knowledge')}</Link>
                        <Link href="/akredytacje" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('akredytacje')}</Link>
                        <Link href="/nowosielski" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('blog')}</Link>
                        <a href="https://nowosielski.pl" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('externalBlog')}</a>
                        <Link href="/sklep" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('shop')}</Link>
                    </div>
                </div>
                <div>
                    <h4 style={{ color: 'var(--color-text-main)', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tn('legalHeading')}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <Link href="/regulamin" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('termsLink')}</Link>
                        <Link href="/gwarancje" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('warranties')}</Link>
                        <Link href="/privacy-policy" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('privacyLink')}</Link>
                        <Link href="/rodo" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('rodoLink')}</Link>
                        <Link href="/polityka-cookies" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem' }} className="hover-primary">{tn('cookiesLink')}</Link>
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
                    <Link href="/faq" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }} className="hover-underline">{tn('faq')}</Link>
                    <Link href="/regulamin" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }} className="hover-underline">{t('terms')}</Link>
                    <Link href="/rodo" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }} className="hover-underline">{tn('rodoLink')}</Link>
                    <Link href="/privacy-policy" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }} className="hover-underline">{tn('privacyLink')}</Link>
                    <Link href="/polityka-cookies" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }} className="hover-underline">{t('cookiePolicy')}</Link>
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
                        {/* Internal staff routes — NIE locale-aware (poza [locale] segment),
                            używamy zwykłego anchor `<a>` żeby uniknąć dodawania prefixu. */}
                        <a href="/pracownik" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.7rem', opacity: 0.5, padding: '0.3rem 0.5rem' }}>{t('employee')}</a>
                        <a href="/admin" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.7rem', opacity: 0.5, padding: '0.3rem 0.5rem' }}>{t('admin')}</a>
                    </div>
                </details>
            </div>

            {/* Novik Code Credit — very bottom of footer */}
            <NovikCodeCredit />

        </footer>
    );
}
