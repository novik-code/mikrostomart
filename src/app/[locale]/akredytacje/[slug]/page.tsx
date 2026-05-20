import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AKREDYTACJE, getAkredytacjaBySlug } from '@/data/akredytacje';

interface Params {
    locale: string;
    slug: string;
}

export function generateStaticParams() {
    const locales = ['pl', 'en', 'de', 'ua'];
    return locales.flatMap((locale) =>
        AKREDYTACJE.map((acc) => ({ locale, slug: acc.slug }))
    );
}

export default async function AkredytacjaDetail({ params }: { params: Promise<Params> }) {
    const { locale, slug } = await params;
    const entry = getAkredytacjaBySlug(slug);
    if (!entry) notFound();

    setRequestLocale(locale);
    const t = await getTranslations({ locale, namespace: 'akredytacje' });

    const facts = t.raw(`${slug}.facts`) as string[];

    return (
        <main
            className="section container"
            style={{
                paddingTop: 'var(--spacing-xl)',
                paddingBottom: 'var(--spacing-xl)',
                maxWidth: 880,
                margin: '0 auto',
            }}
        >
            {/* Back navigation */}
            <nav style={{ marginBottom: 'var(--spacing-md)' }}>
                <Link
                    href="/akredytacje"
                    style={{
                        color: 'var(--color-text-muted)',
                        fontSize: '0.92rem',
                        textDecoration: 'none',
                    }}
                >
                    {t('backToList')}
                </Link>
            </nav>

            {/* Hero */}
            <header style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 18px',
                        border: '1px solid var(--color-primary)',
                        borderRadius: 999,
                        color: 'var(--color-primary)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginBottom: 'var(--spacing-md)',
                    }}
                >
                    {t(`${slug}.label`)}
                </div>
                <h1
                    style={{
                        fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
                        fontWeight: 400,
                        fontFamily: 'var(--font-heading)',
                        color: 'var(--color-text-main)',
                        marginBottom: 'var(--spacing-md)',
                        lineHeight: 1.2,
                    }}
                >
                    {t(`${slug}.fullName`)}
                </h1>
                <p
                    style={{
                        fontSize: '1.1rem',
                        color: 'var(--color-text-main)',
                        lineHeight: 1.6,
                        marginBottom: 'var(--spacing-md)',
                    }}
                >
                    {t(`${slug}.hero`)}
                </p>

                {/* Key facts inline list */}
                <ul
                    style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: '0 0 var(--spacing-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                    }}
                >
                    {facts.map((fact, i) => (
                        <li
                            key={i}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                color: 'var(--color-text-muted)',
                                fontSize: '0.95rem',
                                lineHeight: 1.5,
                            }}
                        >
                            <span style={{ color: 'var(--color-primary)', marginTop: 4, fontSize: '0.6rem' }}>●</span>
                            {fact}
                        </li>
                    ))}
                </ul>

                {/* Year metadata */}
                {(entry.foundedYear || entry.marcinSince) && (
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 'var(--spacing-md)',
                            paddingTop: 'var(--spacing-sm)',
                            borderTop: '1px solid var(--color-surface-hover)',
                            color: 'var(--color-text-muted)',
                            fontSize: '0.85rem',
                        }}
                    >
                        {entry.foundedYear && (
                            <div>
                                <span style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    {t('foundedLabel')}:
                                </span>{' '}
                                <strong style={{ color: 'var(--color-text-main)' }}>{entry.foundedYear}</strong>
                            </div>
                        )}
                        {entry.marcinSince && (
                            <div>
                                <span style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    {t('marcinSinceLabel')}:
                                </span>{' '}
                                <strong style={{ color: 'var(--color-text-main)' }}>{entry.marcinSince}</strong>
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* Co to znaczy dla pacjenta */}
            <section style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h2
                    style={{
                        fontSize: 'clamp(1.4rem, 2.5vw, 1.75rem)',
                        fontWeight: 400,
                        fontFamily: 'var(--font-heading)',
                        color: 'var(--color-text-main)',
                        marginBottom: 'var(--spacing-md)',
                    }}
                >
                    {t('meaningHeading')}
                </h2>
                <p
                    style={{
                        fontSize: '1rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.7,
                    }}
                >
                    {t(`${slug}.meaning`)}
                </p>
            </section>

            {/* Rola Marcina w organizacji */}
            <section
                style={{
                    marginBottom: 'var(--spacing-xl)',
                    padding: 'var(--spacing-md)',
                    border: '1px solid var(--color-surface-hover)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface, rgba(255,255,255,0.02))',
                }}
            >
                <h2
                    style={{
                        fontSize: 'clamp(1.4rem, 2.5vw, 1.75rem)',
                        fontWeight: 400,
                        fontFamily: 'var(--font-heading)',
                        color: 'var(--color-primary)',
                        marginBottom: 'var(--spacing-md)',
                    }}
                >
                    {t('marcinRoleHeading')}
                </h2>
                <p
                    style={{
                        fontSize: '1rem',
                        color: 'var(--color-text-main)',
                        lineHeight: 1.7,
                    }}
                >
                    {t(`${slug}.marcinRole`)}
                </p>
            </section>

            {/* Source links */}
            <section style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h2
                    style={{
                        fontSize: 'clamp(1.2rem, 2vw, 1.5rem)',
                        fontWeight: 400,
                        fontFamily: 'var(--font-heading)',
                        color: 'var(--color-text-main)',
                        marginBottom: 'var(--spacing-md)',
                    }}
                >
                    {t('sourceHeading')}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    {entry.externalUrl && (
                        <a
                            href={entry.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: 'var(--color-primary)',
                                textDecoration: 'none',
                                fontSize: '0.95rem',
                            }}
                        >
                            → {t('sourceOriginalLink')} ({entry.externalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')})
                        </a>
                    )}
                    <a
                        href={entry.webarchiveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            color: 'var(--color-primary)',
                            textDecoration: 'none',
                            fontSize: '0.95rem',
                        }}
                    >
                        → {t('sourceWebarchiveLink')}
                    </a>
                </div>
                <p
                    style={{
                        marginTop: 'var(--spacing-sm)',
                        fontSize: '0.82rem',
                        color: 'var(--color-text-muted)',
                        fontStyle: 'italic',
                        lineHeight: 1.5,
                    }}
                >
                    {t('sourceWebarchiveNote')}
                </p>
            </section>
        </main>
    );
}
