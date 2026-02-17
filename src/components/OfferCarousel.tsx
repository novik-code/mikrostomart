"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Microscope, Scan, Wand2, Syringe, Sparkles, Smile, ShieldCheck, Gem } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface OfferItem {
    id: number;
    title: string;
    icon: React.ReactNode;
    shortDesc: string;
    fullDesc: string;
    link: string;
    image: string; // Background image
}

// Icon mapping (stays outside component — no translation needed)
const OFFER_ICONS: React.ReactNode[] = [
    <Microscope key="mic" size={60} className="text-[#dcb14a]" />,
    <Scan key="scan" size={60} className="text-[#dcb14a]" />,
    <Wand2 key="wand" size={60} className="text-[#dcb14a]" />,
    <Sparkles key="spark" size={60} className="text-[#dcb14a]" />,
    <Gem key="gem" size={60} className="text-[#dcb14a]" />,
    <Syringe key="syr" size={60} className="text-[#dcb14a]" />,
    <ShieldCheck key="shield" size={60} className="text-[#dcb14a]" />,
    <Smile key="smile" size={60} className="text-[#dcb14a]" />,
];

const OFFER_IMAGES = [
    "/images/offers/microscope.png",
    "/images/offers/implant.png",
    "/images/offers/laser.png",
    "/images/offers/aesthetic.png",
    "/images/offers/prosthetics.png",
    "/images/offers/anesthesia.png",
    "/images/offers/prophylaxis.png",
    "/images/offers/ortho.png",
];

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 1000 : -1000,
        opacity: 0,
        scale: 0.8
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
        scale: 1
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0,
        scale: 0.8
    })
};

export default function OfferCarousel() {
    const [[page, direction], setPage] = useState([0, 0]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPaused, setIsPaused] = useState(false); // Pause auto-play on hover
    const t = useTranslations('offerItems');

    // Build translated offer items
    const OFFERS: OfferItem[] = useMemo(() =>
        Array.from({ length: 8 }, (_, i) => {
            const n = i + 1;
            return {
                id: n,
                title: t(`offer${n}title`),
                icon: OFFER_ICONS[i],
                shortDesc: t(`offer${n}short`),
                fullDesc: t(`offer${n}full`),
                link: '/rezerwacja',
                image: OFFER_IMAGES[i],
            };
        }),
        [t]
    );

    const activeIndex = Math.abs(page % OFFERS.length);
    const offer = OFFERS[activeIndex];

    const paginate = (newDirection: number) => {
        setPage([page + newDirection, newDirection]);
        setIsExpanded(false); // Reset expansion on slide change
    };

    // Auto-play Effect
    useEffect(() => {
        if (isPaused) return;
        const timer = setInterval(() => {
            paginate(1);
        }, 5000); // 5 seconds
        return () => clearInterval(timer);
    }, [page, isPaused]); // Re-run when page changes or pause state changes

    const swipeConfidenceThreshold = 2000;
    const swipePower = (offset: number, velocity: number) => {
        return Math.abs(offset) * velocity;
    };

    return (
        <section
            className="relative w-full flex items-center justify-center overflow-hidden py-12 md:py-24"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Transparent background to allow global video to show through */}
            <div className="absolute inset-0 z-0 bg-transparent" />

            <div className="relative z-20 w-full max-w-6xl px-4 md:px-12 h-full flex flex-col justify-center">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={page}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={1}
                        onDragEnd={(e, { offset, velocity }) => {
                            const swipe = swipePower(offset.x, velocity.x);

                            if (swipe < -swipeConfidenceThreshold) {
                                paginate(1);
                            } else if (swipe > swipeConfidenceThreshold) {
                                paginate(-1);
                            }
                        }}
                        className="w-full cursor-grab active:cursor-grabbing select-none"
                        style={{ touchAction: "pan-y" }}
                    >
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                            gap: "var(--spacing-xl)",
                            alignItems: "center",
                            maxWidth: "1200px",
                            margin: "0 auto",
                            position: "relative" // Context for arrows
                        }}>
                            {/* Navigation Arrows (Inside Content) */}
                            <button
                                className="gallery-nav-btn gallery-nav-btn-prev"
                                onClick={(e) => { e.stopPropagation(); paginate(-1); }}
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

                            <button
                                className="gallery-nav-btn gallery-nav-btn-next"
                                onClick={(e) => { e.stopPropagation(); paginate(1); }}
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

                            {/* LEFT: Image Frame (Team Member Style) */}
                            <div className="flex justify-center md:justify-end order-1">
                                <div
                                    style={{
                                        width: '100%',
                                        maxWidth: '400px',
                                        aspectRatio: '3/4',
                                        position: 'relative',
                                        borderRadius: '2px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        padding: '10px',
                                        background: 'transparent',
                                    }}
                                >
                                    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                                        <Image
                                            src={offer.image}
                                            alt={offer.title}
                                            fill
                                            style={{ objectFit: 'cover' }}
                                            priority
                                            draggable={false} // Prevent image drag interfering with swipe
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Text Content (Team Member Style) - Order 2 */}
                            <div className="order-2 text-left" style={{ paddingLeft: "var(--spacing-md)" }}>
                                <p style={{
                                    color: "#dcb14a",
                                    marginBottom: "1rem",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em",
                                    fontSize: "0.875rem"
                                }}>
                                    {t('sectionLabel')}
                                </p>
                                <h2 style={{
                                    fontSize: "clamp(2rem, 4vw, 3rem)",
                                    marginBottom: "2rem",
                                    lineHeight: 1.1,
                                    fontFamily: 'serif',
                                    color: 'white'
                                }}>
                                    {offer.title}
                                </h2>
                                <blockquote style={{
                                    fontStyle: "italic",
                                    marginBottom: "2rem",
                                    color: "#e5e7eb",
                                    fontSize: "1.2rem",
                                    borderLeft: "2px solid #dcb14a",
                                    paddingLeft: "1.5rem"
                                }}>
                                    "{offer.shortDesc}"
                                </blockquote>
                                <div style={{ marginBottom: "1rem", color: "#9ca3af", fontSize: "1.1rem", lineHeight: 1.6 }}>
                                    {/* Brief part always visible + JUSTIFIED */}
                                    <p style={{ marginBottom: "1rem", textAlign: "justify" }}>
                                        {offer.fullDesc.split('.')[0]}.
                                    </p>

                                    {/* Expandable Part */}
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{
                                            height: isExpanded ? "auto" : 0,
                                            opacity: isExpanded ? 1 : 0
                                        }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div style={{ paddingTop: '1rem' }}>
                                            {/* JUSTIFIED TEXT */}
                                            <p style={{ marginBottom: "1rem", textAlign: "justify" }}>
                                                {offer.fullDesc.substring(offer.fullDesc.indexOf('.') + 1)}
                                            </p>
                                            {/* CENTERED CTA BUTTON */}
                                            <div className="flex justify-center w-full mb-4">
                                                <Link
                                                    href={offer.link}
                                                    className="
                                                        inline-flex items-center gap-3 px-8 py-3 
                                                        bg-[#dcb14a] text-black 
                                                        hover:bg-white hover:scale-105 active:scale-95
                                                        transition-all duration-300
                                                        rounded-[2px] 
                                                        uppercase tracking-wider text-sm font-bold
                                                        shadow-[0_0_20px_rgba(220,177,74,0.3)]
                                                    "
                                                >
                                                    {t('bookVisit')} <ChevronRight size={16} strokeWidth={3} />
                                                </Link>
                                            </div>
                                        </div>
                                    </motion.div>

                                    <button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            marginTop: '1rem',
                                            color: '#dcb14a',
                                            fontSize: '0.8rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.1em',
                                            padding: '0.5rem 0',
                                            cursor: 'pointer',
                                            background: 'transparent',
                                            border: 'none',
                                            outline: 'none'
                                        }}
                                    >
                                        {isExpanded ? t('collapse') : t('expand')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Pagination Dots - Moved below content */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-30">
                {OFFERS.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            const diff = i - activeIndex;
                            if (diff !== 0) paginate(diff);
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-8 bg-[#dcb14a]' : 'w-1.5 bg-white/20 hover:bg-white/40'
                            }`}
                    />
                ))}
            </div>
        </section>
    );
}

const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
};
