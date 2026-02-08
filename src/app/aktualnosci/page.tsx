"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import RevealOnScroll from '@/components/RevealOnScroll';

export default function NewsPage() {
    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const res = await fetch('/api/news');
                if (res.ok) {
                    const data = await res.json();
                    setArticles(data);
                }
            } catch (error) {
                console.error("Failed to fetch news:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, []);

    // ... CSS styles remain the same ...
    /* Custom Scrollbar and Responsive Carousel Item Styles */
    <style jsx global>{`
                    .news-carousel::-webkit-scrollbar {
                        display: none;
                    }
                    .news-carousel {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                    
                    /* Responsive Carousel Items */
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
    // ...

    return (
        <main style={{ background: "var(--color-background)" }}>
            <div className="container" style={{ padding: "4rem 2rem 4rem" }}>
                <RevealOnScroll>
                    <h1 style={{
                        fontSize: "clamp(2rem, 5vw, 3.5rem)",
                        marginBottom: "3rem",
                        background: "linear-gradient(135deg, var(--color-text), var(--color-primary))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        textAlign: "center"
                    }}>
                        Aktualności
                    </h1>
                </RevealOnScroll>

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
                        title="Poprzednia"
                        style={{
                            left: '0',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 40,
                            position: 'absolute'
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
                        title="Następna"
                        style={{
                            right: '0',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 40,
                            position: 'absolute'
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
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '4rem 2rem', gap: '1.5rem' }}>
                                <div style={{ width: '48px', height: '48px', border: '3px solid rgba(212,175,55,0.15)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Ładowanie aktualności...</p>
                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                            </div>
                        ) : articles.length === 0 ? (
                            <p style={{ textAlign: "center", width: "100%", padding: "2rem" }}>Brak aktualności.</p>
                        ) : articles.map((article) => (
                            <div
                                key={article.id}
                                className="news-carousel-item"
                            >
                                <div style={{ width: "100%", height: "100%" }}>
                                    <RevealOnScroll animation="fade-up">
                                        <Link href={`/aktualnosci/${article.slug}`} style={{ textDecoration: 'none' }}>
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
                                                        src={article.image || '/images/placeholder.jpg'}
                                                        alt={article.title}
                                                        fill
                                                        style={{ objectFit: "cover" }}
                                                    />
                                                </div>
                                                <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
                                                    <h2 style={{
                                                        fontSize: "1.25rem",
                                                        marginBottom: "1rem",
                                                        color: "var(--color-text)"
                                                    }}>
                                                        {article.title}
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
                                                        {article.excerpt}
                                                    </p>
                                                    <div style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        marginTop: "auto"
                                                    }}>
                                                        <span style={{
                                                            color: "var(--color-primary)",
                                                            fontSize: "0.875rem",
                                                            fontWeight: 600,
                                                        }}>
                                                            {article.date}
                                                        </span>
                                                        <span style={{
                                                            color: "var(--color-primary)",
                                                            fontWeight: 600,
                                                            fontSize: "0.9rem",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "0.5rem"
                                                        }}>
                                                            Czytaj więcej &rarr;
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
            </div>
        </main>
    );
}
