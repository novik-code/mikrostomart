"use client";

import { useEffect, useState } from "react";
import RevealOnScroll from "./RevealOnScroll";
import { Youtube, Instagram, Facebook } from "lucide-react";

// Fallback data if API key is not configured
const FALLBACK_VIDEOS = [
    { id: "vGAu6rdJ8WQ", title: "Cinematic Dentistry - Mikrostomart Promo" },
    { id: "sReE0lZ-vK8", title: "Root Canal Treatment Then vs Now ⚔️ Dentist: it's NOT THE PAST!" },
    { id: "8uA6aMhE8rE", title: "FROM ABSCESS TO NEW TOOTH! Dentist: HOW I DESIGN A CROWN ON AN IMPLANT!" },
    { id: "5gQ6Q_jZ-2s", title: "Is an implant like a concrete post? 🏗️ Dentist: WHY REMOVING IT IS NOT THE SAME" },
];

export default function YouTubeFeed() {
    const [videos, setVideos] = useState<any[]>(FALLBACK_VIDEOS);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [videosPerPage, setVideosPerPage] = useState(3);
    const [isApiWorking, setIsApiWorking] = useState(false);

    useEffect(() => {
        // Fetch from our internal API
        const fetchVideos = async () => {
            try {
                const res = await fetch('/api/youtube');
                if (res.ok) {
                    const data = await res.json();
                    if (data.videos && data.videos.length > 0) {
                        setVideos(data.videos); // Use API data
                        setIsApiWorking(true);
                    }
                }
            } catch (error) {
                console.log("Using fallback videos (API not configured or failed)");
            }
        };

        fetchVideos();
    }, []);

    // Responsive items per page
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setVideosPerPage(1);
            } else if (window.innerWidth < 1024) {
                setVideosPerPage(2);
            } else {
                setVideosPerPage(3);
            }
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const nextSlide = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex + videosPerPage >= videos.length ? 0 : prevIndex + 1
        );
    };

    const prevSlide = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === 0 ? Math.max(0, videos.length - videosPerPage) : prevIndex - 1
        );
    };

    const visibleVideos = videos.slice(currentIndex, currentIndex + videosPerPage);

    return (
        <section className="section" style={{ background: "var(--color-background)" }}>
            <div className="container">
                <RevealOnScroll>
                    <h2 style={{ textAlign: "center", marginBottom: "var(--spacing-xl)", color: "var(--color-primary)" }}>
                        Zobacz nas na YouTube
                    </h2>
                </RevealOnScroll>

                <div style={{ position: "relative", padding: "0 var(--spacing-md)" }}>

                    {/* Left Arrow */}
                    <button onClick={prevSlide} style={{
                        position: "absolute",
                        left: "-10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "rgba(255,255,255,0.1)",
                        color: "var(--color-primary)",
                        padding: "1rem",
                        borderRadius: "50%",
                        zIndex: 10,
                        fontSize: "1.5rem",
                        cursor: "pointer",
                        border: "1px solid var(--color-surface-hover)"
                    }}>
                        ←
                    </button>

                    <div style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${videosPerPage}, 1fr)`,
                        gap: "var(--spacing-lg)",
                        transition: "all 0.3s ease"
                    }}>
                        {visibleVideos.map((video, index) => (
                            <RevealOnScroll key={`${video.id}-${index}`} delay={index * 100 as 0 | 100 | 200}>
                                <div style={{
                                    background: "var(--color-surface)",
                                    borderRadius: "var(--radius-md)",
                                    overflow: "hidden",
                                    border: "1px solid var(--color-surface-hover)",
                                    height: "100%"
                                }}>
                                    <div style={{
                                        position: "relative",
                                        paddingBottom: "56.25%", /* 16:9 */
                                        height: 0,
                                        background: "#000"
                                    }}>
                                        <iframe
                                            src={`https://www.youtube.com/embed/${video.id}`}
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                left: 0,
                                                width: "100%",
                                                height: "100%",
                                                border: 0
                                            }}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                    <div style={{ padding: "var(--spacing-md)" }}>
                                        <h3 style={{
                                            fontSize: "1rem",
                                            color: "var(--color-text-main)",
                                            lineHeight: 1.4,
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden"
                                        }}>
                                            {video.title}
                                        </h3>
                                    </div>
                                </div>
                            </RevealOnScroll>
                        ))}
                    </div>

                    {/* Right Arrow */}
                    <button onClick={nextSlide} style={{
                        position: "absolute",
                        right: "-10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "rgba(255,255,255,0.1)",
                        color: "var(--color-primary)",
                        padding: "1rem",
                        borderRadius: "50%",
                        zIndex: 10,
                        fontSize: "1.5rem",
                        cursor: "pointer",
                        border: "1px solid var(--color-surface-hover)"
                    }}>
                        →
                    </button>

                </div>

                <div style={{ textAlign: "center", marginTop: "var(--spacing-lg)" }}>
                    <RevealOnScroll animation="fade-up">
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '1.5rem',
                            flexWrap: 'wrap'
                        }}>
                            {[
                                {
                                    icon: <Youtube size={28} />,
                                    url: "https://www.youtube.com/@DentistMarcIn",
                                    color: "#FF0000",
                                    label: "YouTube",
                                    hoverColor: "rgba(255,0,0,0.1)"
                                },
                                {
                                    icon: <Instagram size={28} />,
                                    url: "https://www.instagram.com/mikrostomart_opole/",
                                    color: "#E1306C",
                                    label: "Mikrostomart IG",
                                    hoverColor: "rgba(225,48,108,0.1)"
                                },
                                {
                                    icon: <Instagram size={28} />,
                                    url: "https://www.instagram.com/nowosielski_marcin/",
                                    color: "#E1306C",
                                    label: "Dr Marcin IG",
                                    hoverColor: "rgba(225,48,108,0.1)"
                                },
                                {
                                    icon: <Facebook size={28} />,
                                    url: "https://www.facebook.com/mikrostomart/",
                                    color: "#1877F2",
                                    label: "Mikrostomart FB",
                                    hoverColor: "rgba(24,119,242,0.1)"
                                },
                                {
                                    icon: <Facebook size={28} />,
                                    url: "https://www.facebook.com/marcindentist/",
                                    color: "#1877F2",
                                    label: "Dr Marcin FB",
                                    hoverColor: "rgba(24,119,242,0.1)"
                                },
                                {
                                    icon: (
                                        <svg
                                            width="28"
                                            height="28"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            stroke="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                        </svg>
                                    ),
                                    url: "https://www.tiktok.com/@nowosielskimarcin",
                                    color: "#000000",
                                    label: "TikTok",
                                    hoverColor: "rgba(0,0,0,0.1)",
                                    isDark: true // Flag for dark mode adjustment if needed
                                },
                            ].map((social, idx) => (
                                <a
                                    key={idx}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={social.label}
                                    className="social-icon-btn"
                                    style={{
                                        color: social.color === "#000000" && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? "#fff" : social.color,
                                        // Dynamic color fix for TikTok in dark mode handled by CSS usually, but here inline.
                                        // Actually better to use CSS variable or utility.
                                        // Let's rely on a className and style.
                                        background: 'transparent',
                                        padding: '12px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                        border: `1px solid ${social.color}20`
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.2)';
                                        e.currentTarget.style.background = social.hoverColor;
                                        e.currentTarget.style.boxShadow = `0 10px 20px -10px ${social.color}`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    {social.icon}
                                </a>
                            ))}
                        </div>

                        {!isApiWorking && (
                            <p style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                                * Wyświetlam wybrane filmy. Aby widzieć najnowsze, skonfiguruj API.
                            </p>
                        )}
                    </RevealOnScroll>
                </div>
            </div>
        </section>
    );
}
