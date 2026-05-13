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
                // Match the rest of the homepage: dark surface + thin gold accent.
                // Was a teal gradient (#0d4f54 → #062a2d) which clashed with the
                // black/gold palette used elsewhere — restyled 2026-05-13.
                background: 'linear-gradient(180deg, var(--color-surface) 0%, var(--color-background) 100%)',
                color: '#ffffff',
                padding: isCompact ? 'var(--spacing-lg) 0' : 'var(--spacing-xl) 0',
                margin: isCompact ? 'var(--spacing-md) 0' : 'var(--spacing-lg) 0',
                borderTop: '1px solid rgba(var(--color-primary-rgb), 0.18)',
                borderBottom: '1px solid rgba(var(--color-primary-rgb), 0.18)',
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
                        fontSize: '0.78rem',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: 'var(--color-primary)',
                        fontWeight: 600,
                    }}
                >
                    {t('teaserBadge')}
                </span>
                <h2
                    style={{
                        fontFamily: 'var(--font-heading), Georgia, serif',
                        fontSize: isCompact ? 'clamp(1.4rem, 2.8vw, 1.9rem)' : 'clamp(1.6rem, 3vw, 2.2rem)',
                        lineHeight: 1.25,
                        margin: 0,
                        fontWeight: 600,
                        color: 'var(--color-text-main, #ffffff)',
                    }}
                >
                    {t('teaserTitle')}
                </h2>
                <p
                    style={{
                        fontSize: '1rem',
                        lineHeight: 1.65,
                        margin: 0,
                        color: 'var(--color-text-muted, #a8b2b3)',
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
                        padding: '0.75rem 1.4rem',
                        background: 'transparent',
                        color: 'var(--color-primary)',
                        border: '1px solid var(--color-primary)',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        borderRadius: 'var(--radius-sm)',
                        transition: 'background 0.18s ease, color 0.18s ease, transform 0.18s ease',
                    }}
                    className="intl-teaser-cta"
                >
                    {t('teaserCta')}
                    <span aria-hidden="true">→</span>
                </Link>
                <style>{`
                    .intl-teaser-cta:hover {
                        background: var(--color-primary) !important;
                        color: var(--color-background) !important;
                        transform: translateX(2px);
                    }
                `}</style>
            </div>
        </section>
    );
}
