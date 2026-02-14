"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Navbar.module.css';

import { useAssistant } from "@/context/AssistantContext";
import { useSimulator } from "@/context/SimulatorContext";
import { useOpinion } from "@/context/OpinionContext";

/* ═══════════════════════════════════════════
   FRAMER MOTION ANIMATION VARIANTS
   Links "burst" outward from hamburger center
   ═══════════════════════════════════════════ */

// Left container: reverse stagger (items nearest hamburger appear first)
const leftContainerVariants = {
    hidden: { opacity: 1 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.07,
            staggerDirection: -1,   // Reverse: last child (nearest hamburger) first
            delayChildren: 0.1,
        }
    },
    exit: {
        opacity: 1,
        transition: {
            staggerChildren: 0.04,
            staggerDirection: 1,    // Normal order on exit
        }
    }
};

// Right container: normal stagger (first child nearest hamburger first)
const rightContainerVariants = {
    hidden: { opacity: 1 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.07,
            staggerDirection: 1,
            delayChildren: 0.1,
        }
    },
    exit: {
        opacity: 1,
        transition: {
            staggerChildren: 0.04,
            staggerDirection: -1,
        }
    }
};

// Left links slide from right (from hamburger center) → left
const leftLinkVariants = {
    hidden: {
        opacity: 0,
        x: 40,
        scale: 0.8,
        filter: 'blur(8px)',
    },
    visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        filter: 'blur(0px)',
        transition: {
            type: 'spring' as const,
            damping: 20,
            stiffness: 250,
            mass: 0.8,
        }
    },
    exit: {
        opacity: 0,
        x: 30,
        scale: 0.9,
        filter: 'blur(6px)',
        transition: { duration: 0.15, ease: 'easeIn' as const }
    }
};

// Right links slide from left (from hamburger center) → right
const rightLinkVariants = {
    hidden: {
        opacity: 0,
        x: -40,
        scale: 0.8,
        filter: 'blur(8px)',
    },
    visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        filter: 'blur(0px)',
        transition: {
            type: 'spring' as const,
            damping: 20,
            stiffness: 250,
            mass: 0.8,
        }
    },
    exit: {
        opacity: 0,
        x: -30,
        scale: 0.9,
        filter: 'blur(6px)',
        transition: { duration: 0.15, ease: 'easeIn' as const }
    }
};


export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { openChat } = useAssistant();
    const { openSimulator } = useSimulator();
    const { openSurvey } = useOpinion();

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    return (
        <nav className={styles.navbar}>
            <div className={`container ${styles.container}`}>
                <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.92, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    transition={{
                        duration: 0.6,
                        ease: [0.23, 1, 0.32, 1],
                        delay: 0.1,
                    }}
                >
                    <Link href="/" className={styles.logo} onClick={closeMenu}>
                        <Image
                            src="/logo-transparent.png"
                            alt="Mikrostomart Logo"
                            width={220}
                            height={70}
                            style={{ width: 'auto', height: '50px' }}
                            priority
                        />
                    </Link>
                </motion.div>

                {/* ═══════════════════════════════════════════════════
                    DESKTOP: Animated Hamburger Menu
                    Links burst outward from center on hover
                    ═══════════════════════════════════════════════════ */}
                <div
                    className={styles.desktopMenuWrapper}
                    onMouseEnter={() => setIsDesktopMenuOpen(true)}
                    onMouseLeave={() => { setIsDesktopMenuOpen(false); setIsDropdownOpen(false); }}
                >
                    {/* Left Links — burst leftward */}
                    <AnimatePresence>
                        {isDesktopMenuOpen && (
                            <motion.div
                                className={styles.linksLeft}
                                variants={leftContainerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                key="left-links"
                            >
                                <motion.div variants={leftLinkVariants} className={styles.linkWrapper}>
                                    <Link href="/o-nas" className={styles.link}>O nas</Link>
                                </motion.div>
                                <motion.div variants={leftLinkVariants} className={styles.linkWrapper}>
                                    <Link href="/metamorfozy" className={styles.link}>Metamorfozy</Link>
                                </motion.div>
                                <motion.div variants={leftLinkVariants} className={styles.linkWrapper}>
                                    <Link href="/oferta" className={styles.link}>Oferta</Link>
                                </motion.div>
                                <motion.div variants={leftLinkVariants} className={styles.linkWrapper}>
                                    <Link href="/aktualnosci" className={styles.link}>Aktualności</Link>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Desktop Hamburger Icon — dissolves when expanded */}
                    <motion.div
                        className={styles.desktopHamburger}
                        animate={isDesktopMenuOpen ? {
                            scale: 0.4,
                            rotate: 180,
                            opacity: 0,
                        } : {
                            scale: 1,
                            rotate: 0,
                            opacity: 1,
                        }}
                        transition={{
                            type: 'spring',
                            damping: 18,
                            stiffness: 200,
                        }}
                    >
                        <span className={styles.desktopBar}></span>
                        <span className={styles.desktopBar}></span>
                        <span className={styles.desktopBar}></span>
                    </motion.div>

                    {/* Right Links — burst rightward */}
                    <AnimatePresence>
                        {isDesktopMenuOpen && (
                            <motion.div
                                className={styles.linksRight}
                                variants={rightContainerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                key="right-links"
                            >
                                {/* DROPDOWN: Dodatki */}
                                <motion.div variants={rightLinkVariants} className={styles.linkWrapper}>
                                    <div
                                        className={styles.link}
                                        style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        onMouseEnter={() => setIsDropdownOpen(true)}
                                        onMouseLeave={() => setIsDropdownOpen(false)}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            Dodatki <span style={{ fontSize: '0.7em', opacity: 0.7 }}>▼</span>
                                        </span>

                                        <AnimatePresence>
                                            {isDropdownOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -5, scale: 0.97 }}
                                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '100%',
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        paddingTop: '10px',
                                                        cursor: 'default',
                                                        zIndex: 200,
                                                    }}
                                                >
                                                    <div style={{
                                                        background: 'rgba(18, 20, 24, 0.95)',
                                                        border: '1px solid rgba(212, 175, 55, 0.15)',
                                                        borderRadius: 'var(--radius-md)',
                                                        padding: '0.5rem 0',
                                                        minWidth: '260px',
                                                        boxShadow: '0 15px 40px rgba(0,0,0,0.6), 0 0 20px rgba(212,175,55,0.05)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        backdropFilter: 'blur(16px)',
                                                    }}>
                                                        <Link href="/mapa-bolu" className={styles.dropdownLink} style={{ color: '#dcb14a', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                            🗺️ Mapa Bólu
                                                        </Link>
                                                        <Link href="/kalkulator-leczenia" className={styles.dropdownLink} style={{ color: '#38bdf8', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                            🧮 Kalkulator Leczenia
                                                        </Link>
                                                        <Link href="/porownywarka" className={styles.dropdownLink} style={{ color: '#a855f7', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                            ⚖️ Porównywarka
                                                        </Link>
                                                        <Link href="/cennik" className={styles.dropdownLink} style={{ color: '#10b981', fontWeight: 'bold' }}>
                                                            💰 Cennik
                                                        </Link>
                                                        <Link href="/baza-wiedzy" className={styles.dropdownLink}>
                                                            📚 Baza Wiedzy
                                                        </Link>
                                                        <Link href="/nowosielski" className={styles.dropdownLink} style={{ color: '#d4af37', fontWeight: 'bold' }}>
                                                            👨‍⚕️ Blog Dr. Marcin
                                                        </Link>
                                                        <Link href="/sklep" className={styles.dropdownLink}>
                                                            🛍️ Sklep
                                                        </Link>
                                                        <button
                                                            onClick={() => { openSimulator(); setIsDropdownOpen(false); }}
                                                            className={styles.dropdownLink}
                                                            style={{ color: 'var(--color-primary)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'center' }}
                                                        >
                                                            ✨ Symulator Uśmiechu
                                                        </button>
                                                        <button
                                                            onClick={() => { openChat(); setIsDropdownOpen(false); }}
                                                            className={styles.dropdownLink}
                                                            style={{ color: '#60a5fa', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'center' }}
                                                        >
                                                            🤖 Wirtualny Asystent
                                                        </button>
                                                        <Link href="/zadatek" className={styles.dropdownLink} style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
                                                            💳 Wpłać Zadatek
                                                        </Link>
                                                        <Link href="/selfie" className={styles.dropdownLink} style={{ color: '#ec4899', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                            🤳 Selfie z Doktorem
                                                        </Link>
                                                        <button
                                                            onClick={() => { openSurvey(); setIsDropdownOpen(false); }}
                                                            className={styles.dropdownLink}
                                                            style={{ color: '#f59e0b', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold' }}
                                                        >
                                                            ⭐ Podziel się opinią
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>

                                <motion.div variants={rightLinkVariants} className={styles.linkWrapper}>
                                    <Link href="/strefa-pacjenta/" className={styles.link}>Strefa Pacjenta</Link>
                                </motion.div>
                                <motion.div variants={rightLinkVariants} className={styles.linkWrapper}>
                                    <Link href="/kontakt" className={styles.link}>Kontakt</Link>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Appointment Button — Desktop only */}
                <div className={styles.desktopCta}>
                    <Link href="/rezerwacja" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                        Umów wizytę
                    </Link>
                </div>

                {/* ═══════════════════════════════════════════════════
                    MOBILE: Classic Hamburger + Full-screen Overlay
                    Completely unchanged from previous implementation
                    ═══════════════════════════════════════════════════ */}
                <button
                    className={styles.hamburger}
                    onClick={toggleMenu}
                    aria-label="Menu"
                    aria-expanded={isMenuOpen}
                >
                    <span className={`${styles.bar} ${isMenuOpen ? styles.barOpen : ''}`}></span>
                    <span className={`${styles.bar} ${isMenuOpen ? styles.barOpen : ''}`}></span>
                    <span className={`${styles.bar} ${isMenuOpen ? styles.barOpen : ''}`}></span>
                </button>

                {/* Mobile Menu Overlay */}
                <div className={`${styles.mobileMenu} ${isMenuOpen ? styles.mobileMenuOpen : ''}`}>
                    <div className={styles.mobileLinks}>
                        <Link href="/o-nas" className={styles.mobileLink} onClick={closeMenu}>O nas</Link>
                        <Link href="/metamorfozy" className={styles.mobileLink} onClick={closeMenu}>Metamorfozy</Link>
                        <Link href="/oferta" className={styles.mobileLink} onClick={closeMenu}>Oferta</Link>
                        <Link href="/aktualnosci" className={styles.mobileLink} onClick={closeMenu}>Aktualności</Link>

                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Dodatki</div>
                        <Link href="/mapa-bolu" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#dcb14a', fontWeight: 'bold' }}>🗺️ Mapa Bólu</Link>
                        <Link href="/kalkulator-leczenia" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#38bdf8', fontWeight: 'bold' }}>🧮 Kalkulator Leczenia</Link>
                        <Link href="/porownywarka" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#a855f7', fontWeight: 'bold' }}>⚖️ Porównywarka</Link>
                        <Link href="/cennik" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#10b981', fontWeight: 'bold' }}>💰 Cennik</Link>
                        <Link href="/baza-wiedzy" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem' }}>📚 Baza Wiedzy</Link>
                        <Link href="/nowosielski" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#d4af37', fontWeight: 'bold' }}>👨‍⚕️ Blog Dr. Marcin</Link>
                        <Link href="/sklep" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem' }}>🛍️ Sklep</Link>
                        <Link href="/zadatek" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>💳 Wpłać Zadatek</Link>
                        <Link href="/selfie" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#ec4899', fontWeight: 'bold' }}>🤳 Selfie z Doktorem</Link>
                        <button
                            onClick={() => { openSimulator(); closeMenu(); }}
                            className={styles.mobileLink}
                            style={{ display: 'block', padding: '0.75rem 1.5rem', width: '100%', textAlign: 'center', color: '#dcb14a', fontWeight: 'bold', border: 'none', background: 'transparent', marginTop: '10px' }}
                        >
                            ✨ Symulator Uśmiechu
                        </button>
                        <button
                            onClick={() => { openChat(); closeMenu(); }}
                            className={styles.mobileLink}
                            style={{ display: 'block', width: '100%', padding: '0.75rem 1.5rem', textAlign: 'center', color: '#60a5fa', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            🤖 Wirtualny Asystent
                        </button>
                        <button
                            onClick={() => { openSurvey(); closeMenu(); }}
                            className={styles.mobileLink}
                            style={{ display: 'block', width: '100%', padding: '0.75rem 1.5rem', textAlign: 'center', color: '#f59e0b', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            ⭐ Podziel się opinią
                        </button>
                        <Link href="/strefa-pacjenta/" className={styles.mobileLink} onClick={closeMenu}>Strefa Pacjenta</Link>
                        <Link href="/kontakt" className={styles.mobileLink} onClick={closeMenu}>Kontakt</Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
