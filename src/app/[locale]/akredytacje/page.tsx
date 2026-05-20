import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AKREDYTACJE } from '@/data/akredytacje';
import { breadcrumbHref, localizedBreadcrumb } from '@/lib/seo';

// /akredytacje — index page wszystkich akredytacji.
// K-2b (2026-05-20): pills w TrustStats linkują do tych podstron zamiast external.

export default async function AkredytacjeIndex({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale, namespace: 'akredytacje' });

    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'akredytacje' },
    ]);

    return (
        <main className="section container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-xl)' }}>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            <header style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto var(--spacing-xl)' }}>
                <h1
                    style={{
                        fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                        fontWeight: 400,
                        fontFamily: 'var(--font-heading)',
                        color: 'var(--color-text-main)',
                        marginBottom: 'var(--spacing-md)',
                    }}
                >
                    {t('indexHeading')}
                </h1>
                <p
                    style={{
                        fontSize: '1.05rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.6,
                    }}
                >
                    {t('indexLead')}
                </p>
            </header>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-xl)',
                }}
            >
                {AKREDYTACJE.map((acc) => {
                    const fullName = t(`${acc.slug}.fullName`);
                    const hero = t(`${acc.slug}.hero`);
                    return (
                        <Link
                            key={acc.slug}
                            href={`/akredytacje/${acc.slug}` as any}
                            style={{ textDecoration: 'none' }}
                        >
                            <article
                                style={{
                                    height: '100%',
                                    padding: 'var(--spacing-md)',
                                    border: '1px solid var(--color-surface-hover)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--color-surface, rgba(255,255,255,0.02))',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={undefined}
                                className="akredytacja-card"
                            >
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '6px 14px',
                                        border: '1px solid var(--color-primary)',
                                        borderRadius: 999,
                                        color: 'var(--color-primary)',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        alignSelf: 'flex-start',
                                        marginBottom: 'var(--spacing-sm)',
                                    }}
                                >
                                    {acc.label}
                                </div>
                                <h2
                                    style={{
                                        fontSize: '1.15rem',
                                        fontWeight: 500,
                                        color: 'var(--color-text-main)',
                                        marginBottom: 'var(--spacing-sm)',
                                        fontFamily: 'var(--font-heading)',
                                        lineHeight: 1.3,
                                    }}
                                >
                                    {fullName}
                                </h2>
                                <p
                                    style={{
                                        fontSize: '0.92rem',
                                        color: 'var(--color-text-muted)',
                                        lineHeight: 1.5,
                                        marginBottom: 'var(--spacing-md)',
                                        flexGrow: 1,
                                    }}
                                >
                                    {hero}
                                </p>
                                <div
                                    style={{
                                        fontSize: '0.85rem',
                                        color: 'var(--color-primary)',
                                        fontWeight: 500,
                                        letterSpacing: '0.02em',
                                    }}
                                >
                                    {t('indexCardCta')} →
                                </div>
                            </article>
                        </Link>
                    );
                })}
            </div>

            <nav style={{ textAlign: 'center' }}>
                <Link
                    href="/"
                    style={{
                        color: 'var(--color-text-muted)',
                        fontSize: '0.92rem',
                        textDecoration: 'none',
                        borderBottom: '1px solid var(--color-text-muted)',
                        paddingBottom: 2,
                    }}
                >
                    {t('indexBackToHome')}
                </Link>
            </nav>

            <style>{`
                .akredytacja-card:hover {
                    transform: translateY(-4px);
                    border-color: var(--color-primary) !important;
                    box-shadow: 0 8px 24px rgba(220, 177, 74, 0.15);
                }
            `}</style>
        </main>
    );
}
