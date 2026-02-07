"use client";

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * NovikCodeCredit — Footer credit with epic full-page takeover.
 * 
 * On click: the entire page transitions into the Novik Code logo
 * displayed as a fullscreen background with cinematic effects.
 * Click or ESC to return.
 */
export default function NovikCodeCredit() {
    const [isActive, setIsActive] = useState(false);
    const [rippleOrigin, setRippleOrigin] = useState({ x: 50, y: 100 });

    const handleClick = useCallback((e: React.MouseEvent) => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        setRippleOrigin({ x, y });
        setIsActive(true);
        document.body.style.overflow = 'hidden';
    }, []);

    const handleClose = useCallback(() => {
        setIsActive(false);
        document.body.style.overflow = '';
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isActive) handleClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isActive, handleClose]);

    // Particles for explosion effect
    const particles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        angle: (i / 50) * 360 + Math.random() * 10,
        distance: 150 + Math.random() * 400,
        size: 1.5 + Math.random() * 3.5,
        delay: Math.random() * 0.5,
        duration: 0.6 + Math.random() * 0.8,
    }));

    return (
        <>
            {/* Footer Credit — very bottom of page */}
            <div style={{
                textAlign: 'center',
                padding: '1rem 0 0.75rem',
                position: 'relative',
                zIndex: 1,
            }}>
                <button
                    onClick={handleClick}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.7rem',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        opacity: 0.4,
                        transition: 'opacity 0.3s ease, color 0.3s ease, letter-spacing 0.4s ease',
                        fontFamily: 'inherit',
                        padding: '0.5rem 1rem',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9';
                        e.currentTarget.style.color = '#d4af37';
                        e.currentTarget.style.letterSpacing = '0.25em';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.4';
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                        e.currentTarget.style.letterSpacing = '0.15em';
                    }}
                >
                    Designed and developed by&nbsp;&nbsp;<strong style={{ color: '#d4af37' }}>Novik Code</strong>
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════
                FULLSCREEN TAKEOVER — Logo as background
                ═══════════════════════════════════════════════════ */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        key="novik-takeover"
                        onClick={handleClose}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9999,
                            cursor: 'pointer',
                            overflow: 'hidden',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {/* Layer 1: Expanding black vortex from click point */}
                        <motion.div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: '#000',
                                transformOrigin: `${rippleOrigin.x}% ${rippleOrigin.y}%`,
                            }}
                            initial={{ clipPath: `circle(0% at ${rippleOrigin.x}% ${rippleOrigin.y}%)` }}
                            animate={{ clipPath: `circle(150% at ${rippleOrigin.x}% ${rippleOrigin.y}%)` }}
                            exit={{ clipPath: `circle(0% at 50% 50%)` }}
                            transition={{
                                duration: 0.7,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                        />

                        {/* Layer 2: Fullscreen Logo Background */}
                        <motion.div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundImage: 'url(/novik-code-logo.png)',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                            }}
                            initial={{
                                scale: 1.3,
                                opacity: 0,
                                filter: 'blur(30px) brightness(0.3)',
                            }}
                            animate={{
                                scale: 1,
                                opacity: 1,
                                filter: 'blur(0px) brightness(1)',
                            }}
                            exit={{
                                scale: 1.1,
                                opacity: 0,
                                filter: 'blur(15px) brightness(0.5)',
                            }}
                            transition={{
                                duration: 1.2,
                                delay: 0.3,
                                ease: [0.25, 0.46, 0.45, 0.94],
                            }}
                        />

                        {/* Layer 3: Subtle dark vignette overlay */}
                        <motion.div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
                                pointerEvents: 'none',
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.5 }}
                        />

                        {/* Layer 4: Shockwave rings */}
                        {[0, 1, 2].map((ring) => (
                            <motion.div
                                key={`ring-${ring}`}
                                style={{
                                    position: 'absolute',
                                    width: '200px',
                                    height: '200px',
                                    borderRadius: '50%',
                                    border: `1px solid rgba(212, 175, 55, ${0.25 - ring * 0.06})`,
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    pointerEvents: 'none',
                                }}
                                initial={{ scale: 0, opacity: 0.7 }}
                                animate={{ scale: 8 + ring * 3, opacity: 0 }}
                                transition={{
                                    duration: 2,
                                    delay: 0.4 + ring * 0.2,
                                    ease: 'easeOut',
                                }}
                            />
                        ))}

                        {/* Layer 5: Particle explosion */}
                        {particles.map((p) => (
                            <motion.div
                                key={`particle-${p.id}`}
                                style={{
                                    position: 'absolute',
                                    width: p.size,
                                    height: p.size,
                                    borderRadius: '50%',
                                    background: p.id % 4 === 0
                                        ? '#d4af37'
                                        : p.id % 4 === 1
                                            ? 'rgba(212, 175, 55, 0.5)'
                                            : p.id % 4 === 2
                                                ? 'rgba(255, 200, 100, 0.4)'
                                                : 'rgba(255, 255, 255, 0.3)',
                                    top: '50%',
                                    left: '50%',
                                    pointerEvents: 'none',
                                    boxShadow: p.id % 4 === 0
                                        ? '0 0 8px rgba(212, 175, 55, 0.6)'
                                        : 'none',
                                }}
                                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                                animate={{
                                    x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
                                    y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
                                    opacity: 0,
                                    scale: 1,
                                }}
                                transition={{
                                    duration: p.duration,
                                    delay: 0.3 + p.delay,
                                    ease: 'easeOut',
                                }}
                            />
                        ))}

                        {/* Layer 6: Subtitle text */}
                        <motion.div
                            style={{
                                position: 'absolute',
                                bottom: '12%',
                                left: 0,
                                right: 0,
                                textAlign: 'center',
                                zIndex: 10,
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.6, delay: 1.2 }}
                        >
                            <p style={{
                                color: 'rgba(255,255,255,0.35)',
                                fontSize: '0.7rem',
                                letterSpacing: '0.25em',
                                textTransform: 'uppercase',
                                margin: 0,
                            }}>
                                Design · Development · Innovation
                            </p>
                        </motion.div>

                        {/* Layer 7: "Click to close" hint */}
                        <motion.p
                            style={{
                                position: 'absolute',
                                bottom: '1.5rem',
                                left: 0,
                                right: 0,
                                textAlign: 'center',
                                color: 'rgba(255,255,255,0.15)',
                                fontSize: '0.6rem',
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                zIndex: 10,
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2.5, duration: 0.5 }}
                        >
                            kliknij aby wrócić
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
