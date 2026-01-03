"use client";

import { reviews } from "@/data/reviews";
import RevealOnScroll from "./RevealOnScroll";
import { Star, Quote } from "lucide-react";
import Image from "next/image";

// Simple "G" logo for Google (Google Colors)
const GoogleLogo = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

export default function GoogleReviews() {
    return (
        <section className="section" style={{ background: "var(--color-surface)", paddingBottom: "6rem" }}>
            <div className="container">
                <RevealOnScroll>
                    <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                            <GoogleLogo />
                            <h2 style={{ fontSize: "2rem", color: "var(--color-text)", fontWeight: 400 }}>
                                Opinie Pacjentów
                            </h2>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--color-text)" }}>5.0</span>
                            <div style={{ display: "flex", gap: "2px" }}>
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={20} fill="#FBBC05" color="#FBBC05" />
                                ))}
                            </div>
                            <span style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>(na podstawie opinii Google)</span>
                        </div>
                    </div>
                </RevealOnScroll>

                {/* Scroller */}
                <div
                    className="reviews-scroller"
                    style={{
                        display: "flex",
                        gap: "2rem",
                        overflowX: "auto",
                        padding: "1rem", // space for shadow
                        paddingBottom: "2rem",
                        scrollSnapType: "x mandatory",
                        margin: "0 -2rem", // Bleed on mobile
                        paddingLeft: "2rem",
                        paddingRight: "2rem",
                        WebkitOverflowScrolling: "touch",
                        scrollbarWidth: "none",
                        msOverflowStyle: "none"
                    }}
                >
                    {reviews.map((review, index) => (
                        <RevealOnScroll key={review.id} delay={index * 100 as 0 | 100 | 200} className="review-card-wrapper">
                            <div
                                style={{
                                    background: "var(--color-background)",
                                    padding: "2rem",
                                    borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--color-surface-hover)",
                                    minWidth: "300px",
                                    maxWidth: "350px",
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                                    scrollSnapAlign: "center",
                                    position: "relative"
                                }}
                            >
                                <Quote
                                    size={40}
                                    style={{
                                        position: "absolute",
                                        top: "1rem",
                                        right: "1rem",
                                        color: "var(--color-primary)",
                                        opacity: 0.1
                                    }}
                                />

                                <div style={{ display: "flex", gap: "2px", marginBottom: "1rem" }}>
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={16} fill="#FBBC05" color="#FBBC05" />
                                    ))}
                                </div>

                                <p style={{
                                    fontSize: "0.95rem",
                                    lineHeight: "1.6",
                                    color: "var(--color-text-muted)",
                                    marginBottom: "1.5rem",
                                    flex: 1,
                                    fontStyle: "italic"
                                }}>
                                    "{review.text}"
                                </p>

                                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "auto" }}>
                                    <div style={{
                                        width: "40px",
                                        height: "40px",
                                        borderRadius: "50%",
                                        background: "var(--color-primary-light)",
                                        color: "var(--color-primary)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: "bold",
                                        fontSize: "1.2rem"
                                    }}>
                                        {review.author.charAt(0)}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: "bold", fontSize: "0.9rem", color: "var(--color-text)" }}>
                                            {review.author}
                                        </p>
                                        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                                            {review.date}
                                        </p>
                                    </div>
                                    <div style={{ marginLeft: "auto" }}>
                                        <GoogleLogo />
                                    </div>
                                </div>
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>

                <style jsx global>{`
                    .reviews-scroller::-webkit-scrollbar {
                        display: none;
                    }
                    .review-card-wrapper {
                        flex: 0 0 auto;
                    }
                `}</style>
            </div>
        </section>
    );
}
