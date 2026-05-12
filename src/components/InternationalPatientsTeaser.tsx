"use client";

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

/**
 * Teaser block surfacing /dla-pacjentow-przyjezdnych throughout the site.
 *
 * Why (J-5, 2026-05-12): the dedicated international-patients page exists
 * since H7 sprint (parking + multilingual staff + hotels + A4 access) but is
 * orphan in the site graph — only Footer linked it. DE/EN/UA visitors landing
 * on the homepage or /kontakt have no signal that there's a page tailored to
 * them, even though they're the main audience for dental tourism positioning.
 *
 * This component is used twice (homepage + /kontakt). Locale-aware copy from
 * `przyjezdni.teaser*` translations — same component, four languages.
 *
 * Premium styling mirrors the J-3 OG cards: deep-teal gradient + gold accent
 * + serif headline. Stands out from the surrounding section backgrounds
 * without breaking visual cohesion.
 */
export default function InternationalPatientsTeaser({ variant = 'wide' }: { variant?: 'wide' | 'compact' }) {
    const t = useTranslations('przyjezdni');

    const isCompact = variant === 'compact';

    return (
        <section
            aria-label={t('teaserBadge')}
            style={{
                background: 'linear-gradient(135deg, #0d4f54 0%, #062a2d 100%)',
                color: '#ffffff',
                padding: isCompact ? 'var(--spacing-lg) 0' : 'var(--spacing-xl) 0',
                margin: isCompact ? 'var(--spacing-md) 0' : 'var(--spacing-lg) 0',
                borderRadius: isCompact ? 'var(--radius-md)' : 0,
            }}
        >
            <div
                className="container"
                style={{
                    maxWidth: isCompact ? '900px' : '1100px',
                    margin: '0 auto',
                    padding: '0 var(--spacing-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 'var(--spacing-sm)',
                }}
            >
                <span
                    style={{
                        fontSize: '0.85rem',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: '#d4af37',
                        fontWeight: 600,
                    }}
                >
                    {t('teaserBadge')}
                </span>
                <h2
                    style={{
                        fontFamily: 'var(--font-heading), Georgia, serif',
                        fontSize: isCompact ? 'clamp(1.5rem, 3vw, 2rem)' : 'clamp(1.8rem, 3.5vw, 2.5rem)',
                        lineHeight: 1.2,
                        margin: 0,
                        fontWeight: 600,
                        color: '#ffffff',
                    }}
                >
                    {t('teaserTitle')}
                </h2>
                <p
                    style={{
                        fontSize: '1.05rem',
                        lineHeight: 1.6,
                        margin: 0,
                        color: '#cfd8d9',
                        maxWidth: '780px',
                    }}
                >
                    {t('teaserDesc')}
                </p>
                <Link
                    href="/dla-pacjentow-przyjezdnych"
                    style={{
                        marginTop: 'var(--spacing-sm)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.85rem 1.6rem',
                        background: '#d4af37',
                        color: '#062a2d',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '1rem',
                        borderRadius: 'var(--radius-sm)',
                        transition: 'transform 0.18s ease, background 0.18s ease',
                    }}
                    className="intl-teaser-cta"
                >
                    {t('teaserCta')}
                    <span aria-hidden="true">→</span>
                </Link>
                <style>{`
                    .intl-teaser-cta:hover {
                        background: #ffd961 !important;
                        transform: translateX(2px);
                    }
                `}</style>
            </div>
        </section>
    );
}
