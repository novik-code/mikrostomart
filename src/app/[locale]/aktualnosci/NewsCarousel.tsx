"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import RevealOnScroll from '@/components/RevealOnScroll';

export interface NewsArticle {
    id: number | string;
    slug: string;
    title: string;
    excerpt: string;
    image: string | null;
    date: string;
}

// S5-2 (2026-05-15): client island for carousel scroll arrows.
// The listing page itself is a server component (SSR-renders <article> cards
// in initial HTML for Googlebot). This island wraps only the interactive
// scroll buttons + scroll container — RevealOnScroll stays inside it because
// it's already a client component.
export default function NewsCarousel({ locale, articles }: { locale: string; articles: NewsArticle[] }) {
    const t = useTranslations('aktualnosci');

    if (articles.length === 0) {
        return <p style={{ textAlign: "center", width: "100%", padding: "2rem" }}>{t('empty')}</p>;
    }

    return (
        <>
            <style jsx global>{`
                .news-carousel::-webkit-scrollbar {
                    display: none;
                }
                .news-carousel {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .news-carousel-item {
                    flex: 0 0 auto;
                    width: clamp(280px, 85vw, 400px);
                    scroll-snap-align: start;
                    scroll-snap-stop: always;
                }
                @media (min-width: 768px) {
                    .news-carousel-item {
                        width: calc(50% - 1rem);
                    }
                }
                @media (min-width: 1024px) {
                    .news-carousel-item {
                        width: calc(33.333% - 1.34rem);
                    }
                }
            `}</style>

            <div style={{ position: "relative", margin: "0 -2rem", padding: "0 2rem" }}>
                <button
                    className="gallery-nav-btn gallery-nav-btn-prev"
                    onClick={() => {
                        const container = document.querySelector('.news-carousel');
                        if (container) container.scrollBy({ left: -320, behavior: 'smooth' });
                    }}
                    title={t('prev')}
                    style={{ left: '0', top: '50%', transform: 'translateY(-50%)', zIndex: 40, position: 'absolute' }}
                >
                    ❮
                </button>

                <button
                    className="gallery-nav-btn gallery-nav-btn-next"
                    onClick={() => {
                        const container = document.querySelector('.news-carousel');
                        if (container) container.scrollBy({ left: 320, behavior: 'smooth' });
                    }}
                    title={t('next')}
                    style={{ right: '0', top: '50%', transform: 'translateY(-50%)', zIndex: 40, position: 'absolute' }}
                >
                    ❯
                </button>

                <div
                    className="news-carousel"
                    style={{
                        display: "flex",
                        overflowX: "auto",
                        gap: "2rem",
                        scrollSnapType: "x mandatory",
                        paddingBottom: "2rem",
                        paddingLeft: "0.5rem",
                        paddingRight: "0.5rem",
                        WebkitOverflowScrolling: "touch",
                    }}
                >
                    {articles.map((article) => (
                        <div key={article.id} className="news-carousel-item">
                            <div style={{ width: "100%", height: "100%" }}>
                                <RevealOnScroll animation="fade-up">
                                    {/* href must include locale prefix (except for default PL) so client-side
                                        navigation stays in the current language. After URL-based i18n migration
                                        (Faza 2), `/aktualnosci/<slug>` resolves to PL — visiting it from EN page
                                        caused mid-navigation locale loss / unclickable cards. */}
                                    <Link href={`${locale === 'pl' ? '' : `/${locale}`}/aktualnosci/${article.slug}`} style={{ textDecoration: 'none' }}>
                                        <article
                                            style={{
                                                background: "var(--color-surface)",
                                                borderRadius: "var(--radius-md)",
                                                overflow: "hidden",
                                                border: "1px solid var(--color-border)",
                                                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                                                height: "100%",
                                                display: "flex",
                                                flexDirection: "column",
                                                minHeight: "450px",
                                            }}
                                            className="hover-card"
                                        >
                                            <div style={{ position: "relative", height: "250px", width: "100%" }}>
                                                <Image
                                                    src={article.image || '/images/placeholder.jpg'}
                                                    alt={article.title}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                    loading="lazy"
                                                    style={{ objectFit: "cover" }}
                                                />
                                            </div>
                                            <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
                                                <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "var(--color-text)" }}>
                                                    {article.title}
                                                </h2>
                                                <p
                                                    style={{
                                                        color: "var(--color-text-muted)",
                                                        fontSize: "0.95rem",
                                                        lineHeight: "1.6",
                                                        marginBottom: "1.5rem",
                                                        flex: 1,
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 3,
                                                        WebkitBoxOrient: "vertical",
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    {article.excerpt}
                                                </p>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                                                    <span style={{ color: "var(--color-primary)", fontSize: "0.875rem", fontWeight: 600 }}>
                                                        {article.date}
                                                    </span>
                                                    <span style={{ color: "var(--color-primary)", fontWeight: 600, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                        {t('readMore')} &rarr;
                                                    </span>
                                                </div>
                                            </div>
                                        </article>
                                    </Link>
                                </RevealOnScroll>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
