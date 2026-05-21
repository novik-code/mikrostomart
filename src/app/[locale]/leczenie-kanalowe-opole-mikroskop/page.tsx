import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { brandI18nParams } from '@/lib/brandConfig';
import RevealOnScroll from '@/components/RevealOnScroll';
import GoogleReviews from '@/components/GoogleReviews';

/**
 * /leczenie-kanalowe-opole-mikroskop — L-2a local geo page (Faza L, 2026-05-21).
 *
 * Specjalistyczna endodoncja mikroskopowa — dyscyplina nr 1 Marcina.
 * Geo queries: "leczenie kanałowe Opole", "endodoncja Opole", "leczenie kanałowe
 * pod mikroskopem Opole". PL-only — foreign noindex w layout.tsx.
 *
 * Struktura analogiczna do /implanty-opole z L-1.
 */
export default async function LeczenieKanaloweOpolePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale, namespace: 'leczenieKanaloweOpoleMikroskop' });

    return (
        <main>
            {/* Hero */}
            <section style={{ padding: 'var(--spacing-xl) 0', background: 'linear-gradient(180deg, var(--color-background) 0%, var(--color-surface) 100%)' }}>
                <div className="container" style={{ maxWidth: '900px', textAlign: 'center' }}>
                    <RevealOnScroll priority>
                        <p style={{
                            color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.2em',
                            fontSize: '0.85rem', marginBottom: 'var(--spacing-sm)',
                        }}>{t('heroTagline')}</p>
                        <h1 style={{
                            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', marginBottom: 'var(--spacing-sm)',
                            lineHeight: 1.1, fontWeight: 400,
                        }}>
                            {t('heroTitle')} <span style={{ color: 'var(--color-primary)', fontStyle: 'italic' }}>{t('heroAccent')}</span>
                        </h1>
                        <p style={{
                            fontSize: '1.15rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)',
                            lineHeight: 1.6, maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto',
                        }}>{t('heroLead')}</p>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link href="/rezerwacja" style={{
                                display: 'inline-block', background: 'var(--color-primary)', color: 'var(--color-background)',
                                padding: '1rem 2.5rem', fontSize: '1.05rem', fontWeight: 600, textDecoration: 'none',
                                borderRadius: '2px', letterSpacing: '0.05em', textTransform: 'uppercase',
                            }}>{t('heroCta')}</Link>
                            <Link href="/cennik" style={{
                                display: 'inline-block', background: 'transparent', color: 'var(--color-text-main)',
                                padding: '1rem 2.5rem', fontSize: '1.05rem', fontWeight: 600, textDecoration: 'none',
                                borderRadius: '2px', letterSpacing: '0.05em', textTransform: 'uppercase',
                                border: '1px solid var(--color-surface-hover)',
                            }}>{t('heroCtaSecondary')}</Link>
                        </div>
                    </RevealOnScroll>
                </div>
            </section>

            {/* 3 USPs */}
            <section style={{ padding: 'var(--spacing-xl) 0' }}>
                <div className="container" style={{ maxWidth: '1100px' }}>
                    <RevealOnScroll>
                        <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', textAlign: 'center', color: 'var(--color-primary)', marginBottom: 'var(--spacing-sm)' }}>{t('whyHeading')}</h2>
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', fontSize: '1rem', marginBottom: 'var(--spacing-lg)', maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto' }}>{t('whyIntro')}</p>
                    </RevealOnScroll>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                        {[1, 2, 3].map((n) => (
                            <RevealOnScroll key={n}>
                                <article style={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-hover)', borderRadius: '4px', padding: 'var(--spacing-md)', height: '100%' }}>
                                    <h3 style={{ fontSize: '1.15rem', color: 'var(--color-text-main)', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>{t(`why${n}Title`)}</h3>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>{t(`why${n}Desc`)}</p>
                                </article>
                            </RevealOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* Procedura 5 kroków */}
            <section style={{ padding: 'var(--spacing-xl) 0', background: 'var(--color-surface)' }}>
                <div className="container" style={{ maxWidth: '820px' }}>
                    <RevealOnScroll>
                        <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', textAlign: 'center', color: 'var(--color-primary)', marginBottom: 'var(--spacing-sm)' }}>{t('procedureHeading')}</h2>
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', fontSize: '1rem', marginBottom: 'var(--spacing-lg)' }}>{t('procedureIntro')}</p>
                    </RevealOnScroll>
                    <ol style={{ listStyle: 'none', counterReset: 'step', padding: 0 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                            <li key={n} style={{
                                background: 'var(--color-background)', border: '1px solid var(--color-surface-hover)',
                                borderRadius: '4px', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)',
                                counterIncrement: 'step', position: 'relative', paddingLeft: 'calc(var(--spacing-md) * 2 + 1.5rem)',
                            }}>
                                <span style={{
                                    position: 'absolute', left: 'var(--spacing-md)', top: 'var(--spacing-md)',
                                    background: 'var(--color-primary)', color: 'var(--color-background)', width: '2rem',
                                    height: '2rem', borderRadius: '50%', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontWeight: 700, fontSize: '1rem',
                                }} aria-hidden="true">{n}</span>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>{t(`procedureStep${n}`)}</p>
                            </li>
                        ))}
                    </ol>
                    <p style={{ textAlign: 'center', marginTop: 'var(--spacing-md)', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                        {t('procedureDeepLink')}{' '}
                        <Link href="/oferta/leczenie-kanalowe" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{t('procedureDeepLinkLabel')}</Link>
                    </p>
                </div>
            </section>

            {/* Lokalizacja */}
            <section style={{ padding: 'var(--spacing-xl) 0' }}>
                <div className="container" style={{ maxWidth: '1100px' }}>
                    <RevealOnScroll>
                        <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', textAlign: 'center', color: 'var(--color-primary)', marginBottom: 'var(--spacing-sm)' }}>{t('locationHeading')}</h2>
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', fontSize: '1rem', marginBottom: 'var(--spacing-lg)' }}>{t('locationIntro')}</p>
                    </RevealOnScroll>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--spacing-md)' }}>
                        {[1, 2, 3, 4].map((n) => (
                            <RevealOnScroll key={n}>
                                <article style={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-hover)', borderRadius: '4px', padding: 'var(--spacing-md)', height: '100%' }}>
                                    <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-main)', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>{t(`loc${n}Title`)}</h3>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>{t(`loc${n}Desc`)}</p>
                                </article>
                            </RevealOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* Doktor Marcin */}
            <section style={{ padding: 'var(--spacing-xl) 0', background: 'var(--color-surface)' }}>
                <div className="container" style={{ maxWidth: '820px' }}>
                    <RevealOnScroll>
                        <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', textAlign: 'center', color: 'var(--color-primary)', marginBottom: 'var(--spacing-sm)' }}>{t('doctorHeading')}</h2>
                        <p style={{ color: 'var(--color-text-main)', textAlign: 'center', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 'var(--spacing-md)', fontStyle: 'italic' }}>{t('doctorLead')}</p>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.7, textAlign: 'justify', marginBottom: 'var(--spacing-md)' }}>{t('doctorBio')}</p>
                        <div style={{ textAlign: 'center' }}>
                            <Link href="/zespol/marcin-nowosielski" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}>{t('doctorCta')}</Link>
                        </div>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Reviews */}
            <section style={{ padding: 'var(--spacing-xl) 0' }}>
                <div className="container">
                    <RevealOnScroll>
                        <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', textAlign: 'center', color: 'var(--color-primary)', marginBottom: 'var(--spacing-sm)' }}>{t('reviewsHeading')}</h2>
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', fontSize: '1rem', marginBottom: 'var(--spacing-lg)', maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto' }}>{t('reviewsIntro')}</p>
                    </RevealOnScroll>
                    <GoogleReviews />
                </div>
            </section>

            {/* FAQ */}
            <section style={{ padding: 'var(--spacing-xl) 0', background: 'var(--color-surface)' }}>
                <div className="container" style={{ maxWidth: '820px' }}>
                    <RevealOnScroll>
                        <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', textAlign: 'center', color: 'var(--color-primary)', marginBottom: 'var(--spacing-lg)' }}>{t('faqHeading')}</h2>
                    </RevealOnScroll>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                        <details key={n} style={{
                            background: 'var(--color-background)', border: '1px solid var(--color-surface-hover)',
                            borderRadius: '4px', marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm) var(--spacing-md)',
                        }}>
                            <summary style={{ fontWeight: 600, color: 'var(--color-text-main)', cursor: 'pointer', listStyle: 'none', fontSize: '1rem' }}>{t(`faqQ${n}`)}</summary>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginTop: 'var(--spacing-sm)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-surface-hover)' }}>{t(`faqA${n}`)}</p>
                        </details>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section style={{
                background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-background) 100%)',
                padding: 'var(--spacing-xl) 0', borderTop: '1px solid var(--color-surface-hover)',
            }}>
                <div className="container" style={{ maxWidth: '720px', textAlign: 'center' }}>
                    <RevealOnScroll>
                        <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', color: 'var(--color-primary)', marginBottom: 'var(--spacing-sm)' }}>{t('ctaHeading')}</h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: 'var(--spacing-md)' }}>{t('ctaLead')}</p>
                        <Link href="/rezerwacja" style={{
                            display: 'inline-block', background: 'var(--color-primary)', color: 'var(--color-background)',
                            padding: '1rem 2.5rem', fontSize: '1.05rem', fontWeight: 600, textDecoration: 'none',
                            borderRadius: '2px', letterSpacing: '0.05em', textTransform: 'uppercase',
                        }}>{t('ctaButton')}</Link>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginTop: 'var(--spacing-sm)' }}>{t('ctaPhone', brandI18nParams())}</p>
                    </RevealOnScroll>
                </div>
            </section>
        </main>
    );
}
