"use client";

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useTranslations } from "next-intl";
import RevealOnScroll from '@/components/RevealOnScroll';

const LOCALE_DATE_MAP: Record<string, string> = {
    pl: 'pl-PL',
    en: 'en-GB',
    de: 'de-DE',
    ua: 'uk-UA',
};

export interface BlogPost {
    id: string | number;
    slug: string;
    title: string;
    excerpt?: string | null;
    content?: string | null;
    image?: string | null;
    date: string;
}

// Audyt SEO 2026-06 (P1): wyodrębniony client island. Listing /nowosielski fetchuje
// teraz blog_posts SERWEROWO (page.tsx) i przekazuje posty jako props — dzięki temu
// linki do /nowosielski/[slug] są w SSR HTML (crawlowalne). Karuzela (strzałki scroll)
// pozostaje interaktywna po stronie klienta.
export default function NowosielskiCarousel({ posts, locale }: { posts: BlogPost[]; locale: string }) {
    const t = useTranslations('nowosielski');
    const dateLocale = LOCALE_DATE_MAP[locale] || 'pl-PL';

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

            {/* Carousel Container with Arrows */}
            <div style={{ position: "relative", margin: "0 -2rem", padding: "0 2rem" }}>

                {/* LEFT ARROW */}
                <button
                    className="gallery-nav-btn gallery-nav-btn-prev"
                    onClick={() => {
                        const container = document.querySelector('.news-carousel');
                        if (container) {
                            container.scrollBy({ left: -320, behavior: 'smooth' });
                        }
                    }}
                    title={t('prev')}
                    style={{
                        left: '0',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 40,
                        position: 'absolute',
                        background: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem'
                    }}
                >
                    ❮
                </button>

                {/* RIGHT ARROW */}
                <button
                    className="gallery-nav-btn gallery-nav-btn-next"
                    onClick={() => {
                        const container = document.querySelector('.news-carousel');
                        if (container) {
                            container.scrollBy({ left: 320, behavior: 'smooth' });
                        }
                    }}
                    title={t('next')}
                    style={{
                        right: '0',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 40,
                        position: 'absolute',
                        background: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem'
                    }}
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
                        WebkitOverflowScrolling: "touch"
                    }}>
                    {posts.length === 0 ? (
                        <p style={{ textAlign: "center", width: "100%", padding: "2rem" }}>{t('empty')}</p>
                    ) : posts.map((post) => (
                        <div key={post.id} className="news-carousel-item">
                            <div style={{ width: "100%", height: "100%" }}>
                                <RevealOnScroll animation="fade-up">
                                    <Link href={`/nowosielski/${post.slug}`} style={{ textDecoration: 'none' }}>
                                        <article style={{
                                            background: "var(--color-surface)",
                                            borderRadius: "var(--radius-md)",
                                            overflow: "hidden",
                                            border: "1px solid var(--color-border)",
                                            transition: "transform 0.3s ease, box-shadow 0.3s ease",
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            minHeight: "450px"
                                        }}
                                            className="hover-card"
                                        >
                                            <div style={{ position: "relative", height: "250px", width: "100%" }}>
                                                <Image
                                                    src={post.image?.startsWith('http') ? post.image : (post.image || '/images/placeholder.jpg')}
                                                    alt={post.title}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                    loading="lazy"
                                                    style={{ objectFit: "cover" }}
                                                />
                                            </div>
                                            <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
                                                <h2 style={{
                                                    fontSize: "1.25rem",
                                                    marginBottom: "1rem",
                                                    color: "var(--color-text)",
                                                    lineHeight: 1.3
                                                }}>
                                                    {post.title}
                                                </h2>
                                                <p style={{
                                                    color: "var(--color-text-muted)",
                                                    fontSize: "0.95rem",
                                                    lineHeight: "1.6",
                                                    marginBottom: "1.5rem",
                                                    flex: 1,
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 3,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden"
                                                }}>
                                                    {post.excerpt || (post.content || '').replace(/<[^>]*>?/gm, '').substring(0, 150) + '...'}
                                                </p>
                                                <div style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    marginTop: "auto"
                                                }}>
                                                    <span style={{
                                                        color: "#d4af37",
                                                        fontSize: "0.875rem",
                                                        fontWeight: 600,
                                                    }}>
                                                        {new Date(post.date).toLocaleDateString(dateLocale)}
                                                    </span>
                                                    <span style={{
                                                        color: "#d4af37",
                                                        fontWeight: 600,
                                                        fontSize: "0.9rem",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "0.5rem"
                                                    }}>
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
