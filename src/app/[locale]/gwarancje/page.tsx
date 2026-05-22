import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { brand, brandI18nParams } from '@/lib/brandConfig';
import RevealOnScroll from '@/components/RevealOnScroll';

/**
 * /gwarancje — L-4 warranty hub (Faza L, 2026-05-21 NIGHT+1).
 *
 * Multi-locale indexable trust signal dla foreign dental tourism. Konsoliduje
 * informacje o gwarancjach (rozproszone w FAQ implant + cennik), dodaje RODO/GDPR
 * trust paragraph + lista akceptowanych ubezpieczeń + Kostenerstattung step-by-step.
 *
 * Struktura:
 * - Hero (warranty hub positioning, CTA do konsultacji)
 * - 6 warranty cards (implant 5y, korona 2y E.max, RCT 1y, veneers 2y,
 *   higienizacja brak, ortodoncja do końca leczenia + 1y retencja)
 * - 3 exclusion cards (palenie, brak higienizacji, urazy mechaniczne)
 * - RODO/GDPR trust section (5 bullets)
 * - Insurance list (5 grup: PL prywatne, EU, DE BEMA/GOZ, UK, UA)
 * - 🇩🇪 Kostenerstattung step-by-step (4 kroki + footnote)
 * - FAQ accordion 8 Q&A
 * - CTA
 */
export default async function GwarancjePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale, namespace: 'gwarancje' });

    const warranties = ['Implant', 'Crown', 'Endo', 'Veneer', 'Hygiene', 'Ortho'];
    const exclusions = [1, 2, 3];
    const insurances = [1, 2, 3, 4, 5];

    return (
        <main>
            {/* Hero */}
            <section style={{ padding: 'var(--spacing-xl) 0', background: 'linear-gradient(180deg, var(--color-background) 0%, var(--color-surface) 100%)' }}>
                <div className="container" style={{ maxWidth: '900px', textAlign: 'center' }}>
                    <RevealOnScroll priority>
                        <p style={{ color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.85rem', marginBottom: 'var(--spacing-sm)' }}>{t('heroTagline')}</p>
                        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', marginBottom: 'var(--spacing-sm)', lineHeight: 1.1, fontWeight: 400 }}>{t('heroTitle')}</h1>
                        <p style={{ fontSize: '1.15rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)', lineHeight: 1.6, maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto' }}>{t('heroLead')}</p>
                        <Link href="/rezerwacja" style={{
                            display: 'inline-block', background: 'var(--color-primary)', color: 'var(--color-background)',
                            padding: '1rem 2.5rem', fontSize: '1.05rem', fontWeight: 600, textDecoration: 'none',
                            borderRadius: '2px', letterSpacing: '0.05em', textTransform: 'uppercase',
                        }}>{t('heroCta')}</Link>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Warranty per zabieg — 6 cards */}
            <section style={{ padding: 'var(--spacing-xl) 0' }}>
                <div className="container" style={{ maxWidth: '1100px' }}>
                    <RevealOnScroll>
                        <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', textAlign: 'center', color: 'var(--color-primary)', marginBottom: 'var(--spacing-sm)' }}>{t('warrantyHeading')}</h2>
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', fontSize: '1rem', marginBottom: 'var(--spacing-lg)', maxWidth: '820px', marginLeft: 'auto', marginRight: 'auto' }}>{t('warrantyIntro')}</p>
                    </RevealOnScroll>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--spacing-md)' }}>
                        {warranties.map((w) => (
                            <RevealOnScroll key={w}>
                                <article style={{
                                    background: 'var(--color-surface)', border: '1px solid var(--color-surface-hover)',
                                    borderRadius: '4px', padding: 'var(--spacing-md)', height: '100%',
                                }}>
                                    <h3 style={{ fontSize: '1.15rem', color: 'var(--color-text-main)', marginBottom: 'var(--spacing-xs)', fontWeight: 600 }}>{t(`warranty${w}Title`)}</h3>
                                    <p style={{
                                        color: 'var(--color-primary)', fontSize: '0.9rem', fontWeight: 600,
                                        marginBottom: 'var(--spacing-sm)', letterSpacing: '0.02em',
                                    }}>{t(`warranty${w}Period`)}</p>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', lineHeight: 1.55 }}>{t(`warranty${w}Scope`)}</p>
                                </article>
                            </RevealOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* Exclusions — 3 cards */}
            <section style={{ padding: 'var(--spacing-xl) 0', background: 'var(--color-surface)' }}>
                <div className="container" style={{ maxWidth: '1100px' }}>
                    <RevealOnScroll>
                        <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', textAlign: 'center', color: 'var(--color-primary)', marginBottom: 'var(--spacing-sm)' }}>{t('exclusionsHeading')}</h2>
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', fontSize: '1rem', marginBottom: 'var(--spacing-lg)', maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto' }}>{t('exclusionsIntro')}</p>
                    </RevealOnScroll>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                        {exclusions.map((n) => (
                            <RevealOnScroll key={n}>
                                <article style={{
                                    background: 'var(--color-background)', border: '1px solid var(--color-surface-hover)',
                                    borderRadius: '4px', padding: 'var(--spacing-md)', height: '100%',
                                }}>
                                    <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-main)', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>{t(`exclusion${n}Title`)}</h3>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>{t(`exclusion${n}Desc`)}</p>
                                </article>
                            </RevealOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* RODO/GDPR trust */}
            <section style={{ padding: 'var(--spacing-xl) 0' }}>
                <div className="container" style={{ maxWidth: '820px' }}>
                    <RevealOnScroll>
                        <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', textAlign: 'center', color: 'var(--color-primary)', marginBottom: 'var(--spacing-sm)' }}>{t('rodoHeading')}</h2>
                        <p style={{ color: 'var(--color-text-main)', textAlign: 'center', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 'var(--spacing-md)', fontStyle: 'italic' }}>{t('rodoLead')}</p>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {[1, 2, 3, 4, 5].map((n) => (
                                <li key={n} style={{
                                    color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6,
                                    padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--color-surface-hover)',
                                }}>
                                    {t(`rodoBullet${n}`)}
                                </li>
                            ))}
                        </ul>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Insurance list */}
            <section style={{ padding: 'var(--spacing-xl) 0', background: 'var(--color-surface)' }}>
                <div className="container" style={{ maxWidth: '820px' }}>
                    <RevealOnScroll>
                        <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', textAlign: 'center', color: 'var(--color-primary)', marginBottom: 'var(--spacing-sm)' }}>{t('insuranceHeading')}</h2>
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', fontSize: '1rem', marginBottom: 'var(--spacing-lg)' }}>{t('insuranceIntro')}</p>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: 'var(--spacing-md)' }}>
                            {insurances.map((n) => (
                                <li key={n} style={{
                                    color: 'var(--color-text-main)', fontSize: '1rem', lineHeight: 1.5,
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                    background: 'var(--color-background)',
                                    border: '1px solid var(--color-surface-hover)',
                                    borderRadius: '4px',
                                    marginBottom: 'var(--spacing-xs)',
                                }}>
                                    {t(`insurance${n}`)}
                                </li>
                            ))}
                        </ul>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.55, fontStyle: 'italic' }}>{t('insuranceFootnote')}</p>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Kostenerstattung — 4 kroki */}
            <section style={{ padding: 'var(--spacing-xl) 0', background: 'linear-gradient(180deg, var(--color-background) 0%, var(--color-surface) 100%)' }}>
                <div className="container" style={{ maxWidth: '820px' }}>
                    <RevealOnScroll>
                        <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', textAlign: 'center', color: 'var(--color-primary)', marginBottom: 'var(--spacing-sm)' }}>{t('kostenerstattungHeading')}</h2>
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', fontSize: '1rem', marginBottom: 'var(--spacing-lg)' }}>{t('kostenerstattungLead')}</p>
                    </RevealOnScroll>
                    <ol style={{ listStyle: 'none', counterReset: 'step', padding: 0 }}>
                        {[1, 2, 3, 4].map((n) => (
                            <li key={n} style={{
                                background: 'var(--color-surface)', border: '1px solid var(--color-surface-hover)',
                                borderRadius: '4px', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)',
                                counterIncrement: 'step', position: 'relative', paddingLeft: 'calc(var(--spacing-md) * 2 + 1.5rem)',
                            }}>
                                <span style={{
                                    position: 'absolute', left: 'var(--spacing-md)', top: 'var(--spacing-md)',
                                    background: 'var(--color-primary)', color: 'var(--color-background)', width: '2rem',
                                    height: '2rem', borderRadius: '50%', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontWeight: 700, fontSize: '1rem',
                                }} aria-hidden="true">{n}</span>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>{t(`kostenerstattungStep${n}`)}</p>
                            </li>
                        ))}
                    </ol>
                    <p style={{ marginTop: 'var(--spacing-md)', color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.55, fontStyle: 'italic', textAlign: 'center' }}>{t('kostenerstattungFootnote')}</p>
                </div>
            </section>

            {/* FAQ */}
            <section style={{ padding: 'var(--spacing-xl) 0' }}>
                <div className="container" style={{ maxWidth: '820px' }}>
                    <RevealOnScroll>
                        <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', textAlign: 'center', color: 'var(--color-primary)', marginBottom: 'var(--spacing-lg)' }}>{t('faqHeading')}</h2>
                    </RevealOnScroll>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <details key={n} style={{
                            background: 'var(--color-surface)', border: '1px solid var(--color-surface-hover)',
                            borderRadius: '4px', marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm) var(--spacing-md)',
                        }}>
                            <summary style={{ fontWeight: 600, color: 'var(--color-text-main)', cursor: 'pointer', listStyle: 'none', fontSize: '1rem' }}>{t(`faqQ${n}`)}</summary>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginTop: 'var(--spacing-sm)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-surface-hover)' }}>
                                {t(`faqA${n}`, { phone1: brand.phone1, email: brand.email })}
                            </p>
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
