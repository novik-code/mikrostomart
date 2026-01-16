"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import RevealOnScroll from '@/components/RevealOnScroll';
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client (Client-side)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = 'force-dynamic';

export default function BlogPage() {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                // Fetch directly from Supabase client-side for simplicity/speed matching News
                const { data, error } = await supabase
                    .from('blog_posts')
                    .select('*')
                    .eq('is_published', true) // Only published posts
                    .order('date', { ascending: false });

                if (error) throw error;
                setPosts(data || []);
            } catch (error) {
                console.error("Failed to fetch blog posts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    /* Reuse Styles from News */
    return (
        <main style={{ background: "var(--color-background)", minHeight: '100vh' }}>
            <div className="container" style={{ padding: "4rem 2rem 4rem" }}>
                <RevealOnScroll>
                    <h1 style={{
                        fontSize: "clamp(2rem, 5vw, 3.5rem)",
                        marginBottom: "3rem",
                        background: "linear-gradient(135deg, var(--color-text), #d4af37)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        textAlign: "center"
                    }}>
                        Blog Dr. Marcina
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
                        title="Następna"
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
                        {loading ? (
                            <p style={{ textAlign: "center", width: "100%", padding: "2rem" }}>Ładowanie postów...</p>
                        ) : posts.length === 0 ? (
                            <p style={{ textAlign: "center", width: "100%", padding: "2rem" }}>Brak wpisów.</p>
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
                                                        {/* Strip HTML tags for excerpt */}
                                                        {post.excerpt || post.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...'}
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
                                                            {new Date(post.date).toLocaleDateString('pl-PL')}
                                                        </span>
                                                        <span style={{
                                                            color: "#d4af37",
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
