"use client";

import React, { useState, useEffect } from 'react';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import RevealOnScroll from '@/components/RevealOnScroll';
import { useSimulator } from "@/context/SimulatorContext";
import { useTranslations } from 'next-intl';
import { METAMORPHOSES } from '@/data/metamorphoses';

export default function MetamorphosisGallery({ initialIndex = 0 }: { initialIndex?: number }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const { openSimulator } = useSimulator();
    const t = useTranslations('metamorphosisUI');

    // Tooltip State
    const [activeTooltip, setActiveTooltip] = useState<'left' | 'right' | null>(null);

    // Auto-hide tooltip after 4 seconds
    useEffect(() => {
        if (activeTooltip) {
            const timer = setTimeout(() => {
                setActiveTooltip(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [activeTooltip]);

    // Touch State for Swipe
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    // Minimum swipe distance
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null); // Reset touch end
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            nextSlide();
        } else if (isRightSwipe) {
            prevSlide();
        }
    };

    // Simulator Notification State
    const [showSimulatorPromo, setShowSimulatorPromo] = useState(false);
    const [viewedCount, setViewedCount] = useState(0);

    const handleSlideChange = (newIndex: number) => {
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(newIndex);
            setIsTransitioning(false);

            // Increment viewed count
            setViewedCount(prev => {
                const newCount = prev + 1;
                // Show promo after 1 slide if not already shown
                if (newCount === 1) {
                    setShowSimulatorPromo(true);
                }
                return newCount;
            });
        }, 400);
    };

    const nextSlide = () => {
        if (isTransitioning) return;
        handleSlideChange((currentIndex + 1) % METAMORPHOSES.length);
    };

    const prevSlide = () => {
        if (isTransitioning) return;
        handleSlideChange((currentIndex - 1 + METAMORPHOSES.length) % METAMORPHOSES.length);
    };

    const currentItem = METAMORPHOSES[currentIndex];



    // Notification Component (Inline for simplicity)
    const SimulatorNotification = () => (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            // Wrapper handles centering. Inner handles animation/style.
        }}>
            <div style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-primary)',
                padding: '1rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                minWidth: '300px',
                position: 'relative',
                animation: 'fadeInUp 0.5s ease-out'
            }}>
                <button
                    onClick={() => setShowSimulatorPromo(false)}
                    style={{
                        position: 'absolute',
                        top: '5px',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        fontSize: '1.2rem',
                        cursor: 'pointer'
                    }}
                >
                    &times;
                </button>
                <p style={{ color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {t('inspired')}
                </p>
                <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                    {t('inspiredDesc')}
                </p>
                <button
                    onClick={() => {
                        openSimulator();
                        setShowSimulatorPromo(false); // Close notification after opening
                    }}
                    className="btn-primary"
                    style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem', cursor: 'pointer' }}
                >
                    {t('openSimulator')} ✨
                </button>
            </div>
        </div>
    );

    return (
        <section className="gallery-container">
            {showSimulatorPromo && <SimulatorNotification />}

            {/* Animating Wrapper */}
            <div
                className={isTransitioning ? 'anim-blur-out' : 'anim-blur-in'}
                style={{ width: '100%' }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Slider Component - Square Aspect Ratio */}
                <div style={{
                    maxWidth: '600px',
                    width: '100%',
                    margin: '0 auto',
                    position: 'relative', // Context for absolute buttons and tooltip
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>

                    {/* TOOLTIP OVERLAY */}
                    {activeTooltip && (
                        <div
                            className="gallery-tooltip-responsive"
                            style={{
                                position: 'absolute',
                                // Vertical Position: Higher up as requested
                                top: '20px',
                                // Horizontal Position: Just off-center based on side (Desktop only, Mobile overridden by CSS)
                                [activeTooltip === 'left' ? 'right' : 'left']: '51%',

                                background: 'rgba(18, 20, 24, 0.85)',
                                backdropFilter: 'blur(8px)',
                                padding: '1.5rem',
                                borderRadius: '20px',
                                border: '1px solid var(--color-primary)',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                                zIndex: 30,
                                animation: 'fadeInZoom 0.3s ease forwards',
                                pointerEvents: 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                textAlign: 'center'
                            }}>
                            {/* CSS/SVG Tail */}
                            <svg
                                className="gallery-tooltip-tail"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                style={{
                                    position: 'absolute',
                                    bottom: '-23px', // Push it down outside the box
                                    // If Left Bubble, Tail on Right side. If Right Bubble, Tail on Left side.
                                    [activeTooltip === 'left' ? 'right' : 'left']: '20px',
                                    // Flip horizontally if on the left side to look correct
                                    transform: activeTooltip === 'left' ? 'scaleX(-1)' : 'none',
                                    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))' // Match shadow slightly
                                }}
                            >
                                {/* Organic Tail Shape */}
                                <path
                                    d="M0 0 Q 0 24 24 0 Z" // Curve logic
                                    fill="rgba(18, 20, 24, 0.85)"
                                />
                                {/* Border Line for the tail (Complex to match perfectly, easier to just omit or fake) */}
                            </svg>

                            <h3 style={{
                                color: 'var(--color-primary)',
                                fontSize: '1.2rem',
                                marginBottom: '0.3rem',
                                fontWeight: 'bold'
                            }}>
                                {currentItem.title}
                            </h3>
                            {currentItem.motto && (
                                <p style={{
                                    fontStyle: 'italic',
                                    fontSize: '0.9rem',
                                    marginBottom: '0.5rem',
                                    color: '#fff',
                                    opacity: 0.9
                                }}>
                                    {currentItem.motto}
                                </p>
                            )}
                            <p style={{
                                fontSize: '0.85rem',
                                color: 'var(--color-text-muted)',
                                lineHeight: '1.3'
                            }}>
                                {currentItem.description}
                            </p>
                        </div>
                    )}

                    {/* PREV BUTTON (Arrow) */}
                    <button
                        onClick={prevSlide}
                        className="gallery-nav-btn gallery-nav-btn-prev"
                        title="Poprzednia"
                    >
                        ❮
                    </button>

                    <div style={{
                        width: '100%',
                        aspectRatio: '1/1',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        border: '1px solid var(--color-surface-hover)',
                        position: 'relative'
                    }}>
                        <BeforeAfterSlider
                            key={currentItem.id}
                            beforeImage={currentItem.before}
                            afterImage={currentItem.after}
                            beforeAlt={`Metamorfoza uśmiechu — ${currentItem.title}: stan przed leczeniem | Mikrostomart Opole`}
                            afterAlt={`Metamorfoza uśmiechu — ${currentItem.title}: efekt po leczeniu | Mikrostomart Opole`}
                            onHoverStart={() => setActiveTooltip(currentIndex % 2 === 0 ? 'right' : 'left')}
                        />
                    </div>

                    {/* NEXT BUTTON (Arrow) */}
                    <button
                        onClick={nextSlide}
                        className="gallery-nav-btn gallery-nav-btn-next"
                        title="Następna"
                    >
                        ❯
                    </button>
                </div>

                {/* Counter */}
                <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    {currentIndex + 1} / {METAMORPHOSES.length}
                </div>
            </div>
        </section>
    );
}
