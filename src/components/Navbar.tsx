"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import styles from './Navbar.module.css';

import { useAssistant } from "@/context/AssistantContext";
import { useSimulator } from "@/context/SimulatorContext";
import { useOpinion } from "@/context/OpinionContext";
import { useTheme } from "@/context/ThemeContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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
    const { theme } = useTheme();
    const f = theme.features;
    const t = useTranslations('nav');

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
                                    <Link href="/o-nas" className={styles.link}>{t('about')}</Link>
                                </motion.div>
                                {f.metamorphoses && <motion.div variants={leftLinkVariants} className={styles.linkWrapper}>
                                    <Link href="/metamorfozy" className={styles.link}>{t('transformations')}</Link>
                                </motion.div>}
                                <motion.div variants={leftLinkVariants} className={styles.linkWrapper}>
                                    <Link href="/oferta" className={styles.link}>{t('services')}</Link>
                                </motion.div>
                                <motion.div variants={leftLinkVariants} className={styles.linkWrapper}>
                                    <Link href="/aktualnosci" className={styles.link}>{t('news')}</Link>
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
                                            {t('extras')} <span style={{ fontSize: '0.7em', opacity: 0.7 }}>▼</span>
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
                                                        border: '1px solid rgba(var(--color-primary-dark-rgb), 0.15)',
                                                        borderRadius: 'var(--radius-md)',
                                                        padding: '0.5rem 0',
                                                        minWidth: '260px',
                                                        boxShadow: '0 15px 40px rgba(0,0,0,0.6), 0 0 20px rgba(var(--color-primary-dark-rgb),0.05)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        backdropFilter: 'blur(16px)',
                                                    }}>
                                                        {f.painMap && <Link href="/mapa-bolu" className={styles.dropdownLink} style={{ color: '#e2d1b3', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                            🗺️ {t('painMap')}
                                                        </Link>}
                                                        {f.treatmentCalculator && <Link href="/kalkulator-leczenia" className={styles.dropdownLink} style={{ color: '#e2d1b3', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                            🧮 {t('treatmentCalculator')}
                                                        </Link>}
                                                        {f.comparator && <Link href="/porownywarka" className={styles.dropdownLink} style={{ color: '#e2d1b3', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                            ⚖️ {t('comparator')}
                                                        </Link>}
                                                        <Link href="/cennik" className={styles.dropdownLink} style={{ color: '#e2d1b3', fontWeight: 'bold' }}>
                                                            💰 {t('pricing')}
                                                        </Link>
                                                        {f.knowledgeBase && <Link href="/baza-wiedzy" className={styles.dropdownLink} style={{ color: '#e2d1b3' }}>
                                                            📚 {t('knowledgeBase')}
                                                        </Link>}
                                                        {f.blog && <Link href="/nowosielski" className={styles.dropdownLink} style={{ color: '#e2d1b3', fontWeight: 'bold' }}>
                                                            👨‍⚕️ {t('blog')}
                                                        </Link>}
                                                        {f.shop && <Link href="/sklep" className={styles.dropdownLink} style={{ color: '#e2d1b3' }}>
                                                            🛍️ {t('shop')}
                                                        </Link>}
                                                        {f.simulatorModal && <button
                                                            onClick={() => { openSimulator(); setIsDropdownOpen(false); }}
                                                            className={styles.dropdownLink}
                                                            style={{ color: '#e2d1b3', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'center' }}
                                                        >
                                                            ✨ {t('smileSimulator')}
                                                        </button>}
                                                        {f.assistantTeaser && <button
                                                            onClick={() => { openChat(); setIsDropdownOpen(false); }}
                                                            className={styles.dropdownLink}
                                                            style={{ color: '#e2d1b3', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'center' }}
                                                        >
                                                            🤖 {t('assistant')}
                                                        </button>}
                                                        <Link href="/zadatek" className={styles.dropdownLink} style={{ color: '#e2d1b3', fontWeight: 'bold' }}>
                                                            💳 {t('deposit')}
                                                        </Link>
                                                        {f.selfie && <Link href="/selfie" className={styles.dropdownLink} style={{ color: '#e2d1b3', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                            🤳 {t('selfie')}
                                                        </Link>}
                                                        <button
                                                            onClick={() => { openSurvey(); setIsDropdownOpen(false); }}
                                                            className={styles.dropdownLink}
                                                            style={{ color: '#e2d1b3', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold' }}
                                                        >
                                                            ⭐ {t('shareOpinion')}
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>

                                <motion.div variants={rightLinkVariants} className={styles.linkWrapper}>
                                    <Link href="/strefa-pacjenta/" className={styles.link}>{t('patientZone')}</Link>
                                </motion.div>
                                <motion.div variants={rightLinkVariants} className={styles.linkWrapper}>
                                    <Link href="/kontakt" className={styles.link}>{t('contact')}</Link>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Appointment Button — Desktop only */}
                <div className={styles.desktopCta}>
                    <Link href="/rezerwacja" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                        {t('booking')}
                    </Link>
                </div>

                {/* Language Switcher — always visible, hides when mobile menu open */}
                <div className={styles.langSwitcherWrapper}>
                    <LanguageSwitcher hidden={isMenuOpen} />
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
                        <Link href="/o-nas" className={styles.mobileLink} onClick={closeMenu}>{t('about')}</Link>
                        {f.metamorphoses && <Link href="/metamorfozy" className={styles.mobileLink} onClick={closeMenu}>{t('transformations')}</Link>}
                        <Link href="/oferta" className={styles.mobileLink} onClick={closeMenu}>{t('services')}</Link>
                        <Link href="/aktualnosci" className={styles.mobileLink} onClick={closeMenu}>{t('news')}</Link>

                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('extras')}</div>
                        {f.painMap && <Link href="/mapa-bolu" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#e2d1b3', fontWeight: 'bold' }}>🗺️ {t('painMap')}</Link>}
                        {f.treatmentCalculator && <Link href="/kalkulator-leczenia" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#e2d1b3', fontWeight: 'bold' }}>🧮 {t('treatmentCalculator')}</Link>}
                        {f.comparator && <Link href="/porownywarka" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#e2d1b3', fontWeight: 'bold' }}>⚖️ {t('comparator')}</Link>}
                        <Link href="/cennik" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#e2d1b3', fontWeight: 'bold' }}>💰 {t('pricing')}</Link>
                        {f.knowledgeBase && <Link href="/baza-wiedzy" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#e2d1b3' }}>📚 {t('knowledgeBase')}</Link>}
                        {f.blog && <Link href="/nowosielski" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#e2d1b3', fontWeight: 'bold' }}>👨‍⚕️ {t('blog')}</Link>}
                        {f.shop && <Link href="/sklep" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#e2d1b3' }}>🛍️ {t('shop')}</Link>}
                        <Link href="/zadatek" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#e2d1b3', fontWeight: 'bold' }}>💳 {t('deposit')}</Link>
                        {f.selfie && <Link href="/selfie" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#e2d1b3', fontWeight: 'bold' }}>🤳 {t('selfie')}</Link>}
                        <button
                            onClick={() => { openSimulator(); closeMenu(); }}
                            className={styles.mobileLink}
                            style={{ display: 'block', padding: '0.75rem 1.5rem', width: '100%', textAlign: 'center', color: '#e2d1b3', fontWeight: 'bold', border: 'none', background: 'transparent', marginTop: '10px' }}
                        >
                            ✨ {t('smileSimulator')}
                        </button>
                        <button
                            onClick={() => { openChat(); closeMenu(); }}
                            className={styles.mobileLink}
                            style={{ display: 'block', width: '100%', padding: '0.75rem 1.5rem', textAlign: 'center', color: '#e2d1b3', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            🤖 {t('assistant')}
                        </button>
                        <button
                            onClick={() => { openSurvey(); closeMenu(); }}
                            className={styles.mobileLink}
                            style={{ display: 'block', width: '100%', padding: '0.75rem 1.5rem', textAlign: 'center', color: '#e2d1b3', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            ⭐ {t('shareOpinion')}
                        </button>
                        <Link href="/strefa-pacjenta/" className={styles.mobileLink} onClick={closeMenu}>{t('patientZone')}</Link>
                        <Link href="/kontakt" className={styles.mobileLink} onClick={closeMenu}>{t('contact')}</Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
