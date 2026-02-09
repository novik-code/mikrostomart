"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

/**
 * SplashScreen — Cinematic intro animation
 * 
 * Sequence:
 * 1. Black screen (0.5s)
 * 2. ~80 golden particles drift inward like a star nebula
 * 3. Logo materializes at center with golden glow burst
 * 4. Logo holds center (1.5s)
 * 5. Logo flies to top-left (navbar position), page fades in simultaneously
 * 6. Overlay fully dissolves
 * 
 * Only plays once per session (sessionStorage).
 */

// Star nebula particles — many more, varied sizes
const particles = Array.from({ length: 80 }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 300 + Math.random() * 500;
    return {
        id: i,
        startX: Math.cos(angle) * distance,
        startY: Math.sin(angle) * distance,
        size: 1 + Math.random() * 3.5,
        delay: Math.random() * 1.0,
        opacity: 0.2 + Math.random() * 0.8,
        // Small offset from center to create more natural convergence
        endX: (Math.random() - 0.5) * 40,
        endY: (Math.random() - 0.5) * 30,
    };
});

type Phase = 'idle' | 'particles' | 'logo-center' | 'logo-fly' | 'reveal' | 'done';

export default function SplashScreen({ children }: { children: React.ReactNode }) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [shouldShow, setShouldShow] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
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

    // Slower, more cinematic timeline
    useEffect(() => {
        if (!shouldShow) return;

        const timers: NodeJS.Timeout[] = [];

        // Phase 1: Star nebula particles drift in (0.5s delay → ~1.5s animation)
        timers.push(setTimeout(() => setPhase('particles'), 500));

        // Phase 2: Logo materializes at center (after particles have mostly converged)
        timers.push(setTimeout(() => setPhase('logo-center'), 2000));

        // Phase 3: Logo flies to navbar corner + page starts fading in simultaneously
        timers.push(setTimeout(() => setPhase('logo-fly'), 4000));

        // Phase 4: Overlay fully gone
        timers.push(setTimeout(() => setPhase('reveal'), 5200));

        // Phase 5: Cleanup
        timers.push(setTimeout(() => {
            setPhase('done');
            document.body.style.overflow = '';
        }, 6000));

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

    const showOverlay = isAny('idle', 'particles', 'logo-center', 'logo-fly');
    const showParticles = isAny('particles', 'logo-center');
    const showLogo = isAny('logo-center', 'logo-fly');
    const isLogoFlying = is('logo-fly');
    const isDone = is('done');
    // Page starts fading in when logo flies, fully visible on reveal/done
    const pageVisible = isAny('logo-fly', 'reveal', 'done');

    // When done, render children directly without any wrappers
    if (isDone) {
        return <>{children}</>;
    }

    // Calculate navbar logo target position
    const targetX = mounted && typeof window !== 'undefined' ? -(window.innerWidth / 2 - 140) : -500;
    const targetY = mounted && typeof window !== 'undefined' ? -(window.innerHeight / 2 - 42) : -400;

    return (
        <>
            {/* Page content — always rendered, opacity controlled smoothly */}
            <div style={{
                opacity: pageVisible ? 1 : 0,
                transition: 'opacity 1.2s ease-out',
            }}>
                {children}
            </div>

            {/* Full-screen overlay */}
            {showOverlay && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: '#08090a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        // Fade out the overlay when logo is flying
                        opacity: isLogoFlying ? 0 : 1,
                        transition: 'opacity 1.2s ease-in-out',
                        pointerEvents: isLogoFlying ? 'none' : 'auto',
                    }}
                    onClick={handleSkip}
                >
                    {/* Ambient gold radial bg */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{
                            opacity: isAny('logo-center', 'logo-fly') ? 0.6 : isAny('particles') ? 0.15 : 0,
                            scale: is('logo-center') ? 1.3 : is('logo-fly') ? 2 : is('particles') ? 0.8 : 0.5,
                        }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            width: '600px',
                            height: '600px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, rgba(212,175,55,0.03) 40%, transparent 70%)',
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Star nebula particles */}
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
                                x: is('logo-center') ? p.endX * 0.5 : p.endX,
                                y: is('logo-center') ? p.endY * 0.5 : p.endY,
                                scale: is('logo-center') ? [1, 0.5, 0] : [0, 0.8, 1.2, 1],
                                opacity: is('logo-center') ? [p.opacity, 0.3, 0] : [0, p.opacity * 0.5, p.opacity],
                            }}
                            transition={{
                                duration: is('logo-center') ? 0.8 : 1.2,
                                delay: is('logo-center') ? p.delay * 0.3 : p.delay,
                                ease: [0.23, 1, 0.32, 1],
                            }}
                            style={{
                                position: 'absolute',
                                width: p.size,
                                height: p.size,
                                borderRadius: '50%',
                                background: p.size > 3
                                    ? `radial-gradient(circle, rgba(255,235,130,0.95), rgba(212,175,55,0.3))`
                                    : `radial-gradient(circle, rgba(255,255,220,0.9), rgba(212,175,55,0.2))`,
                                boxShadow: `0 0 ${p.size * 2}px rgba(212,175,55,${p.opacity * 0.4})`,
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
                                        // Fly to navbar position — stay visible during flight
                                        scale: 0.4,
                                        opacity: [1, 0.9, 0.6, 0],
                                        filter: 'blur(1px) brightness(1)',
                                        x: targetX,
                                        y: targetY,
                                    }
                            }
                            transition={
                                is('logo-center')
                                    ? { duration: 1.0, ease: [0.23, 1, 0.32, 1] }
                                    : { duration: 1.0, ease: [0.65, 0, 0.35, 1] }
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
                                    scale: is('logo-center') ? [0.8, 1.5, 1.1] : 0.5,
                                }}
                                transition={{ duration: 1.5, ease: 'easeOut' }}
                                style={{
                                    position: 'absolute',
                                    width: '500px',
                                    height: '200px',
                                    borderRadius: '50%',
                                    background: 'radial-gradient(ellipse, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.05) 50%, transparent 70%)',
                                    pointerEvents: 'none',
                                }}
                            />

                            {/* Shimmer ring expands outward */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
                                animate={{
                                    opacity: is('logo-center') ? [0, 0.5, 0] : 0,
                                    scale: is('logo-center') ? [0.5, 2.0, 3.0] : 0.5,
                                    rotate: 120,
                                }}
                                transition={{ duration: 2.0, ease: 'easeOut' }}
                                style={{
                                    position: 'absolute',
                                    width: '350px',
                                    height: '350px',
                                    borderRadius: '50%',
                                    border: '1px solid rgba(212,175,55,0.25)',
                                    pointerEvents: 'none',
                                }}
                            />

                            {/* Second ring, slower */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.3 }}
                                animate={{
                                    opacity: is('logo-center') ? [0, 0.3, 0] : 0,
                                    scale: is('logo-center') ? [0.3, 1.6, 2.2] : 0.3,
                                }}
                                transition={{ duration: 2.5, ease: 'easeOut', delay: 0.3 }}
                                style={{
                                    position: 'absolute',
                                    width: '280px',
                                    height: '280px',
                                    borderRadius: '50%',
                                    border: '1px solid rgba(212,175,55,0.15)',
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
                            opacity: is('logo-center') ? [0, 0.5, 0.2] : 0,
                        }}
                        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                        style={{
                            position: 'absolute',
                            width: '80%',
                            height: '1px',
                            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), rgba(255,223,100,0.6), rgba(212,175,55,0.4), transparent)',
                            pointerEvents: 'none',
                        }}
                    />

                    {/* "kliknij aby pominąć" hint */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        transition={{ delay: 2.0, duration: 0.8 }}
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
                </div>
            )}
        </>
    );
}
