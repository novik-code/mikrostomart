"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

/**
 * SplashScreen — Cinematic intro animation
 * 
 * Sequence:
 * 1. Black screen (0.3s)
 * 2. Golden particles converge toward center
 * 3. Logo materializes at center with golden glow burst
 * 4. Logo holds center briefly
 * 5. Logo flies to top-left (navbar position) + shrinks
 * 6. Black overlay dissolves, revealing the page
 * 
 * Only plays once per session (sessionStorage).
 */

// Golden particle positions (random-ish starting points)
const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    startX: (Math.random() - 0.5) * 800,
    startY: (Math.random() - 0.5) * 600,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 0.6,
    opacity: 0.3 + Math.random() * 0.7,
}));

type Phase = 'idle' | 'particles' | 'logo-center' | 'logo-fly' | 'reveal' | 'done';

export default function SplashScreen({ children }: { children: React.ReactNode }) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [shouldShow, setShouldShow] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const seen = sessionStorage.getItem('splash-seen');
            if (!seen) {
                setShouldShow(true);
                sessionStorage.setItem('splash-seen', '1');
                document.body.style.overflow = 'hidden';
            } else {
                setPhase('done');
            }
        }
    }, []);

    // Animation timeline
    useEffect(() => {
        if (!shouldShow) return;

        const timers: NodeJS.Timeout[] = [];

        timers.push(setTimeout(() => setPhase('particles'), 300));
        timers.push(setTimeout(() => setPhase('logo-center'), 1200));
        timers.push(setTimeout(() => setPhase('logo-fly'), 2800));
        timers.push(setTimeout(() => setPhase('reveal'), 3600));
        timers.push(setTimeout(() => {
            setPhase('done');
            document.body.style.overflow = '';
        }, 4400));

        return () => {
            timers.forEach(clearTimeout);
            document.body.style.overflow = '';
        };
    }, [shouldShow]);

    const handleSkip = useCallback(() => {
        setPhase('done');
        document.body.style.overflow = '';
    }, []);

    // Helper to check phase without TS narrowing issues
    const is = (p: Phase) => phase === p;
    const isAny = (...ps: Phase[]) => ps.includes(phase);

    const showOverlay = phase !== 'done';
    const showParticles = isAny('particles', 'logo-center');
    const showLogo = isAny('logo-center', 'logo-fly', 'reveal');
    const isRevealing = is('reveal');
    const isLogoFlying = isAny('logo-fly', 'reveal');

    if (!showOverlay) {
        return <>{children}</>;
    }

    return (
        <>
            {/* Page content renders underneath */}
            <div style={{
                opacity: isRevealing ? 1 : 0,
                transition: 'opacity 0.8s ease-out',
                pointerEvents: isRevealing ? 'auto' : 'none'
            }}>
                {children}
            </div>

            {/* Full-screen overlay */}
            <AnimatePresence>
                <motion.div
                    key="splash-overlay"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: isRevealing ? 0 : 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: '#08090a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        pointerEvents: isRevealing ? 'none' : 'auto',
                    }}
                    onClick={handleSkip}
                >
                    {/* Ambient gold radial bg */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{
                            opacity: isAny('logo-center', 'logo-fly') ? 0.6 : 0,
                            scale: is('logo-center') ? 1.2 : is('logo-fly') ? 2 : 0.5,
                        }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            width: '600px',
                            height: '600px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 40%, transparent 70%)',
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Converging particles */}
                    {showParticles && particles.map((p) => (
                        <motion.div
                            key={p.id}
                            initial={{
                                x: p.startX,
                                y: p.startY,
                                scale: 0,
                                opacity: 0,
                            }}
                            animate={{
                                x: 0,
                                y: 0,
                                scale: is('logo-center') ? 0 : [0, 1.5, 1],
                                opacity: is('logo-center') ? 0 : [0, p.opacity, p.opacity],
                            }}
                            transition={{
                                duration: 0.8,
                                delay: p.delay,
                                ease: [0.23, 1, 0.32, 1],
                            }}
                            style={{
                                position: 'absolute',
                                width: p.size,
                                height: p.size,
                                borderRadius: '50%',
                                background: `radial-gradient(circle, rgba(255,223,100,0.9), rgba(212,175,55,0.4))`,
                                boxShadow: `0 0 ${p.size * 3}px rgba(212,175,55,0.5)`,
                                pointerEvents: 'none',
                            }}
                        />
                    ))}

                    {/* Logo — center → fly to top-left */}
                    {showLogo && (
                        <motion.div
                            initial={{
                                scale: 0.3,
                                opacity: 0,
                                filter: 'blur(12px) brightness(2)',
                                x: 0,
                                y: 0,
                            }}
                            animate={
                                is('logo-center')
                                    ? {
                                        scale: 1.15,
                                        opacity: 1,
                                        filter: 'blur(0px) brightness(1.1)',
                                        x: 0,
                                        y: 0,
                                    }
                                    : {
                                        scale: 0.35,
                                        opacity: 0,
                                        filter: 'blur(2px) brightness(1)',
                                        x: typeof window !== 'undefined' ? -(window.innerWidth / 2 - 140) : -500,
                                        y: typeof window !== 'undefined' ? -(window.innerHeight / 2 - 40) : -400,
                                    }
                            }
                            transition={
                                is('logo-center')
                                    ? { duration: 0.8, ease: [0.23, 1, 0.32, 1] }
                                    : { duration: 0.7, ease: [0.77, 0, 0.18, 1] }
                            }
                            style={{
                                position: 'absolute',
                                zIndex: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {/* Golden glow behind logo */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{
                                    opacity: is('logo-center') ? [0, 0.8, 0.4] : 0,
                                    scale: is('logo-center') ? [0.8, 1.4, 1.1] : 0.5,
                                }}
                                transition={{ duration: 1.2, ease: 'easeOut' }}
                                style={{
                                    position: 'absolute',
                                    width: '500px',
                                    height: '200px',
                                    borderRadius: '50%',
                                    background: 'radial-gradient(ellipse, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 50%, transparent 70%)',
                                    pointerEvents: 'none',
                                }}
                            />

                            {/* Shimmer ring */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
                                animate={{
                                    opacity: is('logo-center') ? [0, 0.6, 0] : 0,
                                    scale: is('logo-center') ? [0.5, 1.8, 2.5] : 0.5,
                                    rotate: 90,
                                }}
                                transition={{ duration: 1.5, ease: 'easeOut' }}
                                style={{
                                    position: 'absolute',
                                    width: '350px',
                                    height: '350px',
                                    borderRadius: '50%',
                                    border: '1px solid rgba(212,175,55,0.3)',
                                    pointerEvents: 'none',
                                }}
                            />

                            {/* The logo image */}
                            <Image
                                src="/logo-transparent.png"
                                alt="Mikrostomart"
                                width={440}
                                height={140}
                                style={{
                                    width: 'auto',
                                    height: '100px',
                                    position: 'relative',
                                    zIndex: 2,
                                }}
                                priority
                            />
                        </motion.div>
                    )}

                    {/* Horizontal gold line sweep */}
                    <motion.div
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{
                            scaleX: is('logo-center') ? [0, 1, 0.8] : 0,
                            opacity: is('logo-center') ? [0, 0.6, 0.3] : 0,
                        }}
                        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                        style={{
                            position: 'absolute',
                            width: '80%',
                            height: '1px',
                            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), rgba(255,223,100,0.6), rgba(212,175,55,0.4), transparent)',
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Skip hint */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: !isRevealing ? 0.3 : 0 }}
                        transition={{ delay: 1.5, duration: 0.5 }}
                        style={{
                            position: 'absolute',
                            bottom: '2rem',
                            fontSize: '0.75rem',
                            color: 'rgba(255,255,255,0.4)',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            pointerEvents: 'none',
                        }}
                    >
                        kliknij aby pominąć
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        </>
    );
}
