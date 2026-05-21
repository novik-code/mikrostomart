import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import RevealOnScroll from '@/components/RevealOnScroll';
import CennikChat from './CennikChat';
import { CENNIK_CATEGORIES, CENNIK_FAQ_COUNT } from '@/data/cennik-categories';
import styles from './cennik.module.css';

/**
 * /cennik — SEO-friendly hybrid (K-6, 2026-05-21 NIGHT+1).
 *
 * Architektura:
 * - Server Component (SSR — Googlebot widzi wszystko):
 *   • Hero (premium positioning, scroll-to-chat CTA)
 *   • Kategorie grid 8 cards z widełkami "od X zł" + link do /oferta/[slug]
 *   • FAQ cenowe accordion (8 Q&A, native <details>)
 *   • Scroll anchor #asystent-ai dla CennikChat
 * - Client Island <CennikChat /> — istniejący AI chat (bez zmian funkcjonalnych)
 *
 * Schema.org (w layout.tsx): Service entities (per kategoria) + OfferCatalog wrapper + FAQPage
 *
 * Filozofia D1=B (premium-only, zatwierdzone w K-0):
 * - Bez konkretnych cen per zabieg
 * - Widełki "od X zł" jako premium signal
 * - User chcący konkretnej wyceny → CennikChat (5-10% deep-dive)
 */
export default async function CennikPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale, namespace: 'cennik' });

    return (
        <main className={styles.cennikPage}>
            <div className="container">
                {/* Hero */}
                <RevealOnScroll priority>
                    <div className={styles.hero}>
                        <h1 className={styles.heroTitle}>
                            {t('heroTitle')} <span className={styles.heroAccent}>{t('heroAccent')}</span>
                        </h1>
                        <p className={styles.heroSubtitle}>
                            {t('heroSubtitle')}
                        </p>
                        <p style={{
                            color: 'var(--color-text-muted)',
                            fontSize: '1rem',
                            marginTop: 'var(--spacing-md)',
                            maxWidth: '640px',
                            marginLeft: 'auto',
                            marginRight: 'auto',
                            lineHeight: 1.6,
                        }}>
                            {t('heroDescription')}
                        </p>
                        <div style={{ marginTop: 'var(--spacing-md)' }}>
                            <a
                                href="#asystent-ai"
                                style={{
                                    display: 'inline-block',
                                    background: 'var(--color-primary)',
                                    color: 'var(--color-background)',
                                    padding: '0.85rem 2rem',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    borderRadius: '2px',
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {t('heroCta')}
                            </a>
                        </div>
                    </div>
                </RevealOnScroll>

                {/* Kategorie usług grid */}
                <section style={{ padding: 'var(--spacing-xl) 0' }}>
                    <RevealOnScroll>
                        <h2 style={{
                            fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
                            textAlign: 'center',
                            color: 'var(--color-primary)',
                            marginBottom: 'var(--spacing-sm)',
                        }}>
                            {t('categoriesHeading')}
                        </h2>
                        <p style={{
                            color: 'var(--color-text-muted)',
                            textAlign: 'center',
                            fontSize: '1rem',
                            marginBottom: 'var(--spacing-lg)',
                            maxWidth: '720px',
                            marginLeft: 'auto',
                            marginRight: 'auto',
                        }}>
                            {t('categoriesIntro')}
                        </p>
                    </RevealOnScroll>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: 'var(--spacing-md)',
                    }}>
                        {CENNIK_CATEGORIES.map((cat) => {
                            const title = t(`${cat.i18nKey}.title`);
                            const desc = t(`${cat.i18nKey}.desc`);
                            const priceLabel = t(`${cat.i18nKey}.priceLabel`);
                            const ctaLabel = cat.href ? t('categoryCtaDetails') : t('categoryCtaAsk');
                            const badgeLabel = cat.badge ? t(`badge_${cat.badge}`) : null;

                            const CardInner = (
                                <article style={{
                                    background: 'var(--color-surface)',
                                    border: '1px solid var(--color-surface-hover)',
                                    borderRadius: '4px',
                                    padding: 'var(--spacing-md) var(--spacing-md) var(--spacing-md)',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'all 0.2s ease',
                                    position: 'relative',
                                }} className="cennik-category-card">
                                    {badgeLabel && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '-10px',
                                            right: 'var(--spacing-md)',
                                            background: 'var(--color-primary)',
                                            color: 'var(--color-background)',
                                            padding: '0.2rem 0.6rem',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            letterSpacing: '0.08em',
                                            textTransform: 'uppercase',
                                            borderRadius: '2px',
                                        }}>
                                            {badgeLabel}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)', lineHeight: 1 }}>{cat.icon}</div>
                                    <h3 style={{
                                        fontSize: '1.2rem',
                                        color: 'var(--color-text-main)',
                                        marginBottom: 'var(--spacing-xs)',
                                        fontWeight: 600,
                                    }}>
                                        {title}
                                    </h3>
                                    <p style={{
                                        color: 'var(--color-text-muted)',
                                        fontSize: '0.95rem',
                                        lineHeight: 1.5,
                                        marginBottom: 'var(--spacing-md)',
                                        flex: 1,
                                    }}>
                                        {desc}
                                    </p>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '0.5rem',
                                        paddingTop: 'var(--spacing-sm)',
                                        borderTop: '1px solid var(--color-surface-hover)',
                                    }}>
                                        <span style={{
                                            color: 'var(--color-primary)',
                                            fontWeight: 600,
                                            fontSize: '1rem',
                                        }}>
                                            {priceLabel}
                                        </span>
                                        <span style={{
                                            color: 'var(--color-text-muted)',
                                            fontSize: '0.85rem',
                                        }}>
                                            {ctaLabel} →
                                        </span>
                                    </div>
                                </article>
                            );

                            return cat.href ? (
                                <Link key={cat.slug} href={cat.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    {CardInner}
                                </Link>
                            ) : (
                                <a key={cat.slug} href="#asystent-ai" style={{ textDecoration: 'none', color: 'inherit' }}>
                                    {CardInner}
                                </a>
                            );
                        })}
                    </div>

                    <p style={{
                        textAlign: 'center',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.9rem',
                        marginTop: 'var(--spacing-md)',
                        fontStyle: 'italic',
                    }}>
                        {t('categoriesFootnote')}
                    </p>
                </section>

                {/* CennikChat (client island, anchor #asystent-ai wewnątrz komponentu) */}
                <section style={{ padding: 'var(--spacing-lg) 0' }}>
                    <RevealOnScroll>
                        <h2 style={{
                            fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
                            textAlign: 'center',
                            color: 'var(--color-primary)',
                            marginBottom: 'var(--spacing-sm)',
                        }}>
                            {t('chatHeading')}
                        </h2>
                        <p style={{
                            color: 'var(--color-text-muted)',
                            textAlign: 'center',
                            fontSize: '1rem',
                            marginBottom: 'var(--spacing-lg)',
                            maxWidth: '720px',
                            marginLeft: 'auto',
                            marginRight: 'auto',
                        }}>
                            {t('chatIntro')}
                        </p>
                    </RevealOnScroll>
                    <CennikChat />
                </section>

                {/* FAQ cenowe (FAQPage schema w layout.tsx) */}
                <section style={{ padding: 'var(--spacing-xl) 0' }}>
                    <RevealOnScroll>
                        <h2 style={{
                            fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
                            textAlign: 'center',
                            color: 'var(--color-primary)',
                            marginBottom: 'var(--spacing-sm)',
                        }}>
                            {t('faqHeading')}
                        </h2>
                        <p style={{
                            color: 'var(--color-text-muted)',
                            textAlign: 'center',
                            fontSize: '1rem',
                            marginBottom: 'var(--spacing-lg)',
                            maxWidth: '640px',
                            marginLeft: 'auto',
                            marginRight: 'auto',
                        }}>
                            {t('faqIntro')}
                        </p>
                    </RevealOnScroll>

                    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
                        {Array.from({ length: CENNIK_FAQ_COUNT }, (_, i) => i + 1).map((n) => (
                            <details
                                key={n}
                                style={{
                                    background: 'var(--color-surface)',
                                    border: '1px solid var(--color-surface-hover)',
                                    borderRadius: '4px',
                                    marginBottom: 'var(--spacing-sm)',
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                }}
                            >
                                <summary style={{
                                    fontWeight: 600,
                                    color: 'var(--color-text-main)',
                                    cursor: 'pointer',
                                    listStyle: 'none',
                                    fontSize: '1rem',
                                    paddingRight: 'var(--spacing-sm)',
                                }}>
                                    {t(`faqQ${n}`)}
                                </summary>
                                <p style={{
                                    color: 'var(--color-text-muted)',
                                    fontSize: '0.95rem',
                                    lineHeight: 1.6,
                                    marginTop: 'var(--spacing-sm)',
                                    paddingTop: 'var(--spacing-sm)',
                                    borderTop: '1px solid var(--color-surface-hover)',
                                }}>
                                    {t(`faqA${n}`)}
                                </p>
                            </details>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}
