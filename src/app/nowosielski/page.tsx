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

                {/* Grid Layout (Simpler than Carousel for many posts, or match Grid) */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: "2rem"
                }}>
                    {loading ? (
                        <p style={{ textAlign: "center", width: "100%", padding: "2rem" }}>Ładowanie postów...</p>
                    ) : posts.length === 0 ? (
                        <p style={{ textAlign: "center", width: "100%", padding: "2rem" }}>Brak wpisów.</p>
                    ) : posts.map((post) => (
                        <RevealOnScroll key={post.id} animation="fade-up">
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
                                    minHeight: "400px"
                                }}
                                    className="hover-card"
                                >
                                    <div style={{ position: "relative", height: "200px", width: "100%" }}>
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
                    ))}
                </div>
            </div>
        </main>
    );
}
