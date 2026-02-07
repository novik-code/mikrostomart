"use client";

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * NovikCodeCredit — Footer credit with epic full-page takeover animation.
 * 
 * On click: page content gets sucked into a vortex, then the Novik Code logo
 * explodes outward with particle effects, shockwave rings, and a cinematic reveal.
 * Click again or press ESC to return.
 */
export default function NovikCodeCredit() {
    const [isActive, setIsActive] = useState(false);
    const [rippleOrigin, setRippleOrigin] = useState({ x: 50, y: 50 });

    const handleClick = useCallback((e: React.MouseEvent) => {
        // Calculate click position as percentage for radial effects
        const rect = document.documentElement.getBoundingClientRect();
        const x = ((e.clientX) / window.innerWidth) * 100;
        const y = ((e.clientY) / window.innerHeight) * 100;
        setRippleOrigin({ x, y });
        setIsActive(true);
        // Lock scroll
        document.body.style.overflow = 'hidden';
    }, []);

    const handleClose = useCallback(() => {
        setIsActive(false);
        document.body.style.overflow = '';
    }, []);

    // ESC to close
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isActive) handleClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isActive, handleClose]);

    // Generate random particles
    const particles = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        angle: (i / 40) * 360,
        distance: 100 + Math.random() * 300,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 0.4,
        duration: 0.8 + Math.random() * 0.6,
    }));

    return (
        <>
            {/* Footer Credit Text */}
            <div style={{
                textAlign: 'center',
                padding: '1.5rem 0 0.5rem',
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
                        fontSize: '0.75rem',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        opacity: 0.5,
                        transition: 'opacity 0.3s ease, color 0.3s ease, letter-spacing 0.3s ease',
                        fontFamily: 'inherit',
                        padding: '0.5rem 1rem',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.color = '#d4af37';
                        e.currentTarget.style.letterSpacing = '0.25em';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.5';
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                        e.currentTarget.style.letterSpacing = '0.15em';
                    }}
                >
                    Designed and developed by&nbsp;&nbsp;<strong style={{ color: '#d4af37' }}>Novik Code</strong>
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════
                EPIC FULL-PAGE TAKEOVER ANIMATION
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
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Layer 1: Black Hole Vortex Background */}
                        <motion.div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: `radial-gradient(circle at ${rippleOrigin.x}% ${rippleOrigin.y}%, #000 0%, #050505 50%, #0a0a0a 100%)`,
                                transformOrigin: `${rippleOrigin.x}% ${rippleOrigin.y}%`,
                            }}
                            initial={{ scale: 0, borderRadius: '50%' }}
                            animate={{ scale: 3, borderRadius: '0%' }}
                            exit={{ scale: 0, borderRadius: '50%' }}
                            transition={{
                                duration: 0.6,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                        />

                        {/* Layer 2: Shockwave Rings */}
                        {[0, 1, 2].map((ring) => (
                            <motion.div
                                key={`ring-${ring}`}
                                style={{
                                    position: 'absolute',
                                    width: '200px',
                                    height: '200px',
                                    borderRadius: '50%',
                                    border: `1px solid rgba(212, 175, 55, ${0.3 - ring * 0.08})`,
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    pointerEvents: 'none',
                                }}
                                initial={{ scale: 0, opacity: 0.8 }}
                                animate={{ scale: 6 + ring * 2, opacity: 0 }}
                                transition={{
                                    duration: 1.5,
                                    delay: 0.3 + ring * 0.15,
                                    ease: 'easeOut',
                                }}
                            />
                        ))}

                        {/* Layer 3: Particle Explosion */}
                        {particles.map((p) => (
                            <motion.div
                                key={`particle-${p.id}`}
                                style={{
                                    position: 'absolute',
                                    width: p.size,
                                    height: p.size,
                                    borderRadius: '50%',
                                    background: p.id % 3 === 0
                                        ? '#d4af37'
                                        : p.id % 3 === 1
                                            ? 'rgba(212, 175, 55, 0.6)'
                                            : 'rgba(255, 255, 255, 0.4)',
                                    top: '50%',
                                    left: '50%',
                                    pointerEvents: 'none',
                                    boxShadow: p.id % 3 === 0
                                        ? '0 0 6px rgba(212, 175, 55, 0.8)'
                                        : 'none',
                                }}
                                initial={{
                                    x: 0,
                                    y: 0,
                                    opacity: 1,
                                    scale: 0,
                                }}
                                animate={{
                                    x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
                                    y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
                                    opacity: 0,
                                    scale: 1,
                                }}
                                transition={{
                                    duration: p.duration,
                                    delay: 0.4 + p.delay,
                                    ease: 'easeOut',
                                }}
                            />
                        ))}

                        {/* Layer 4: Rotating Glow Ring behind logo */}
                        <motion.div
                            style={{
                                position: 'absolute',
                                width: '500px',
                                height: '500px',
                                borderRadius: '50%',
                                background: 'conic-gradient(from 0deg, transparent 0%, rgba(212,175,55,0.1) 25%, transparent 50%, rgba(212,175,55,0.05) 75%, transparent 100%)',
                                pointerEvents: 'none',
                            }}
                            initial={{ scale: 0, rotate: 0, opacity: 0 }}
                            animate={{ scale: 1, rotate: 360, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{
                                scale: { duration: 0.8, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] },
                                rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
                                opacity: { duration: 0.5, delay: 0.3 },
                            }}
                        />

                        {/* Layer 5: Outer Glow Pulse */}
                        <motion.div
                            style={{
                                position: 'absolute',
                                width: '400px',
                                height: '400px',
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)',
                                pointerEvents: 'none',
                            }}
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.5, 1.2, 1.4, 1.3] }}
                            transition={{
                                duration: 3,
                                delay: 0.5,
                                repeat: Infinity,
                                repeatType: 'mirror' as const,
                            }}
                        />

                        {/* Layer 6: THE LOGO — Cinematic Reveal */}
                        <motion.div
                            style={{
                                position: 'relative',
                                zIndex: 10,
                                width: '320px',
                                height: '320px',
                                maxWidth: '80vw',
                                maxHeight: '80vw',
                            }}
                            initial={{
                                scale: 0,
                                rotate: -180,
                                filter: 'blur(20px) brightness(3)',
                            }}
                            animate={{
                                scale: 1,
                                rotate: 0,
                                filter: 'blur(0px) brightness(1)',
                            }}
                            exit={{
                                scale: 0,
                                rotate: 90,
                                filter: 'blur(10px) brightness(2)',
                            }}
                            transition={{
                                type: 'spring' as const,
                                damping: 15,
                                stiffness: 100,
                                mass: 1.2,
                                delay: 0.4,
                            }}
                        >
                            <Image
                                src="/novik-code-logo.png"
                                alt="Novik Code"
                                fill
                                style={{
                                    objectFit: 'contain',
                                    filter: 'drop-shadow(0 0 30px rgba(212,175,55,0.3))',
                                }}
                                priority
                            />
                        </motion.div>

                        {/* Layer 7: Text Below Logo */}
                        <motion.div
                            style={{
                                position: 'relative',
                                zIndex: 10,
                                textAlign: 'center',
                                marginTop: '2rem',
                            }}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.6, delay: 0.9 }}
                        >
                            <p style={{
                                color: '#d4af37',
                                fontSize: '1.1rem',
                                fontWeight: 300,
                                letterSpacing: '0.3em',
                                textTransform: 'uppercase',
                                margin: 0,
                                textShadow: '0 0 20px rgba(212,175,55,0.3)',
                            }}>
                                Novik Code
                            </p>
                            <motion.p
                                style={{
                                    color: 'rgba(255,255,255,0.4)',
                                    fontSize: '0.7rem',
                                    letterSpacing: '0.2em',
                                    textTransform: 'uppercase',
                                    marginTop: '0.5rem',
                                }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.3, duration: 0.5 }}
                            >
                                Design · Development · Innovation
                            </motion.p>
                        </motion.div>

                        {/* Layer 8: "Click to close" hint */}
                        <motion.p
                            style={{
                                position: 'absolute',
                                bottom: '2rem',
                                color: 'rgba(255,255,255,0.2)',
                                fontSize: '0.65rem',
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                zIndex: 10,
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2, duration: 0.5 }}
                        >
                            kliknij aby wrócić
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
