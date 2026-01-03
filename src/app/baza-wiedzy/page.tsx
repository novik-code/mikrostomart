"use client";

import Link from 'next/link';
import Image from 'next/image';
import { articles } from '@/data/knowledgeBaseArticles';
import RevealOnScroll from '@/components/RevealOnScroll';

export default function KnowledgeBasePage() {
    return (
        <main style={{ background: "var(--color-background)" }}>
            <div className="container" style={{ padding: "4rem 2rem 4rem" }}>
                <RevealOnScroll>
                    <h1 style={{
                        fontSize: "clamp(2rem, 5vw, 3.5rem)",
                        marginBottom: "1rem",
                        background: "linear-gradient(135deg, var(--color-text), var(--color-primary))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        textAlign: "center"
                    }}>
                        Baza Wiedzy
                    </h1>
                    <p style={{
                        textAlign: "center",
                        color: "var(--color-text-muted)",
                        maxWidth: "600px",
                        margin: "0 auto 3rem",
                        fontSize: "1.1rem"
                    }}>
                        Rzetelna wiedza stomatologiczna w pigułce. Przygotowana przez naszych ekspertów.
                    </p>
                </RevealOnScroll>

                {/* Custom Scrollbar and Responsive Carousel Item Styles */}
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

                <div
                    className="news-carousel"
                    style={{
                        display: "flex",
                        overflowX: "auto",
                        gap: "2rem",
                        scrollSnapType: "x mandatory",
                        paddingBottom: "2rem", // Space for shadow/hover
                        margin: "0 -2rem",     // Negative margin to allow full-width scroll on mobile
                        paddingLeft: "2rem",   // Internal padding to align first item
                        paddingRight: "2rem",  // Internal padding to verify last item visibility
                        WebkitOverflowScrolling: "touch"
                    }}>
                    {articles.map((article) => (
                        <div
                            key={article.id}
                            className="news-carousel-item"
                        >
                            <div style={{ width: "100%", height: "100%" }}>
                                <RevealOnScroll animation="fade-up">
                                    <Link href={`/baza-wiedzy/${article.slug}`} style={{ textDecoration: 'none' }}>
                                        <article style={{
                                            background: "var(--color-surface)",
                                            borderRadius: "var(--radius-md)",
                                            overflow: "hidden",
                                            border: "1px solid var(--color-border)",
                                            transition: "transform 0.3s ease, box-shadow 0.3s ease",
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            minHeight: "450px" // Uniform height
                                        }}
                                            className="hover-card"
                                        >
                                            <div style={{ position: "relative", height: "250px", width: "100%" }}>
                                                <Image
                                                    src={article.image}
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
        </main>
    );
}
