"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import RevealOnScroll from "@/components/RevealOnScroll";
import LazyMapEmbed from "@/components/LazyMapEmbed";
import { brand, brandI18nParams } from "@/lib/brandConfig";
import { formatPhoneForTel } from "@/lib/phoneFormat";

export default function PrzyjezdniPage() {
    const t = useTranslations('przyjezdni');
    const locale = useLocale();
    const phoneTel = formatPhoneForTel(brand.phone1);
    const mapTitle = ({ pl: 'Lokalizacja gabinetu w Opolu', en: 'Our clinic in Opole', de: 'Unser Standort in Opole', ua: 'Розташування клініки в Ополе' } as Record<string, string>)[locale] ?? 'Lokalizacja gabinetu w Opolu';
    const placeUrl = brand.googlePlaceId
        ? `https://www.google.com/maps/place/?q=place_id:${brand.googlePlaceId}`
        : `https://www.google.com/maps/search/?api=1&query=${brand.mapQuery}`;

    const usps = [
        ['usp1Title', 'usp1Desc'],
        ['usp2Title', 'usp2Desc'],
        ['usp3Title', 'usp3Desc'],
        ['usp4Title', 'usp4Desc'],
    ];

    const sections = [
        ['accessTitle', 'accessDesc'],
        ['hotelsTitle', 'hotelsDesc'],
        ['languagesTitle', 'languagesDesc'],
        ['vatTitle', 'vatDesc'],
        ['paymentsTitle', 'paymentsDesc'],
    ];

    return (
        <main>
            {/* Hero */}
            <section className="section" style={{ paddingBottom: 0 }}>
                <div className="container" style={{ maxWidth: '900px', textAlign: 'center' }}>
                    <RevealOnScroll>
                        <h1 style={{
                            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                            color: 'var(--color-text-main)',
                            marginBottom: 'var(--spacing-md)',
                            fontWeight: 400,
                            lineHeight: 1.15,
                        }}>
                            {t('heading')}
                        </h1>
                        <p style={{
                            fontSize: '1.15rem',
                            color: 'var(--color-text-muted)',
                            lineHeight: 1.7,
                            marginBottom: 'var(--spacing-xl)',
                        }}>
                            {t('subtitle')}
                        </p>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Why us — 4 USP cards */}
            <section className="section">
                <div className="container">
                    <RevealOnScroll>
                        <h2 style={{
                            fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
                            textAlign: 'center',
                            marginBottom: 'var(--spacing-xl)',
                            fontWeight: 400,
                        }}>
                            {t('whyTitle')}
                        </h2>
                    </RevealOnScroll>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: 'var(--spacing-lg)',
                        maxWidth: '1100px',
                        margin: '0 auto',
                    }}>
                        {usps.map(([titleKey, descKey], i) => (
                            <RevealOnScroll key={titleKey} delay={i * 80}>
                                <article style={{
                                    padding: 'var(--spacing-lg)',
                                    background: 'var(--color-surface)',
                                    borderRadius: '8px',
                                    height: '100%',
                                    border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
                                }}>
                                    <h3 style={{
                                        fontSize: '1.2rem',
                                        color: 'var(--color-primary)',
                                        marginBottom: '0.75rem',
                                        fontWeight: 600,
                                    }}>
                                        {t(titleKey)}
                                    </h3>
                                    <p style={{ color: 'var(--color-text-main)', fontSize: '0.95rem', lineHeight: 1.7 }}>
                                        {t(descKey)}
                                    </p>
                                </article>
                            </RevealOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* Detail sections — access / hotels / languages / VAT / payments */}
            <section className="section" style={{ background: 'var(--color-surface)' }}>
                <div className="container" style={{ maxWidth: '900px' }}>
                    {sections.map(([titleKey, descKey], i) => (
                        <RevealOnScroll key={titleKey} delay={i * 60}>
                            <article style={{
                                marginBottom: 'var(--spacing-xl)',
                                paddingBottom: 'var(--spacing-lg)',
                                borderBottom: i < sections.length - 1 ? '1px solid rgba(var(--color-primary-rgb), 0.15)' : 'none',
                            }}>
                                <h2 style={{
                                    fontSize: '1.5rem',
                                    color: 'var(--color-primary)',
                                    marginBottom: 'var(--spacing-sm)',
                                    fontWeight: 600,
                                }}>
                                    {t(titleKey)}
                                </h2>
                                <p style={{ color: 'var(--color-text-main)', fontSize: '1.02rem', lineHeight: 1.75 }}>
                                    {t(descKey)}
                                </p>
                            </article>
                        </RevealOnScroll>
                    ))}
                </div>
            </section>

            {/* Mapa + dedykowany geo-landing (1B: lokalny sygnał mapy + fix orphan geo DE/EN) */}
            <section className="section">
                <div className="container" style={{ maxWidth: '900px' }}>
                    <RevealOnScroll>
                        <h2 style={{
                            fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
                            textAlign: 'center',
                            marginBottom: 'var(--spacing-lg)',
                            fontWeight: 400,
                        }}>
                            {mapTitle}
                        </h2>
                        <LazyMapEmbed src={brand.mapEmbedUrl} placeUrl={placeUrl} title={mapTitle} />
                        {(locale === 'de' || locale === 'en') && (
                            <p style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)', fontSize: '1.02rem' }}>
                                {locale === 'de' && (
                                    <Link href="/zahnarzt-opole" className="hover-primary" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                                        → Zahnarzt Opole für deutschsprachige Patienten
                                    </Link>
                                )}
                                {locale === 'en' && (
                                    <Link href="/dentist-opole" className="hover-primary" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                                        → Dentist in Opole for international patients
                                    </Link>
                                )}
                            </p>
                        )}
                    </RevealOnScroll>
                </div>
            </section>

            {/* CTA */}
            <section className="section" style={{ paddingTop: 'var(--spacing-xl)' }}>
                <div className="container" style={{ maxWidth: '720px', textAlign: 'center' }}>
                    <RevealOnScroll>
                        <h2 style={{
                            fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
                            marginBottom: 'var(--spacing-md)',
                            fontWeight: 400,
                        }}>
                            {t('ctaTitle')}
                        </h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 'var(--spacing-lg)' }}>
                            {t('ctaSubtitle')}
                        </p>
                        <div style={{
                            display: 'flex',
                            gap: 'var(--spacing-md)',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                        }}>
                            <Link href="/rezerwacja" className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.05rem' }}>
                                {t('ctaPrimaryLabel')}
                            </Link>
                            <a
                                href={`tel:${phoneTel}`}
                                style={{
                                    padding: '1rem 2rem',
                                    background: 'transparent',
                                    border: '1px solid var(--color-primary)',
                                    color: 'var(--color-primary)',
                                    fontWeight: 600,
                                    borderRadius: '2px',
                                    textDecoration: 'none',
                                    fontSize: '1.05rem',
                                }}
                            >
                                {t('ctaSecondaryLabel', brandI18nParams())}
                            </a>
                        </div>
                    </RevealOnScroll>
                </div>
            </section>
        </main>
    );
}
