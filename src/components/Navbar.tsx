"use client";

import { useState, useEffect, useRef } from 'react';
import { Link } from '@/i18n/navigation';
import { usePathname } from '@/i18n/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import styles from './Navbar.module.css';
import { brand } from "@/lib/brandConfig";
import { isDemoMode } from "@/lib/demoMode";

import { useAssistant } from "@/context/AssistantContext";
import { useSimulator } from "@/context/SimulatorContext";
import { useOpinion } from "@/context/OpinionContext";
import { useTheme } from "@/context/ThemeContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// S7-3 LUXURY (2026-05-17): persistent state — recently visited paths
// (localStorage). Used in luxury hamburger overlay's "Recently visited" section.
const RECENT_PATHS_KEY = 'mikrostomart_recent_paths';
const RECENT_PATHS_LIMIT = 6;
function pushRecentPath(path: string) {
    if (typeof window === 'undefined') return;
    try {
        const raw = localStorage.getItem(RECENT_PATHS_KEY);
        const list: string[] = raw ? JSON.parse(raw) : [];
        const filtered = list.filter(p => p !== path);
        filtered.unshift(path);
        localStorage.setItem(RECENT_PATHS_KEY, JSON.stringify(filtered.slice(0, RECENT_PATHS_LIMIT)));
    } catch { /* localStorage may be unavailable */ }
}
function getRecentPaths(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(RECENT_PATHS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

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
    // S7-3 (2026-05-17): nowy state dla luxury menu
    const [topNavToolsOpen, setTopNavToolsOpen] = useState(false);  // desktop Narzędzia ▾
    const [topNavMoreOpen, setTopNavMoreOpen] = useState(false);  // S7-3 fix #5: desktop Dodatki ▾
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['main']));  // mobile collapsible
    const [searchQuery, setSearchQuery] = useState('');  // luxury hamburger search
    const [recentPaths, setRecentPaths] = useState<string[]>([]);

    const pathname = usePathname();

    // Track page visit for "Recently visited" luxury feature.
    useEffect(() => {
        if (!pathname) return;
        // Don't track admin/auth/api/private paths
        if (/^\/(api|admin|pracownik|auth|strefa-pacjenta\/login|qr-display)/.test(pathname)) return;
        pushRecentPath(pathname);
    }, [pathname]);

    // Load recent paths when overlay opens (avoids reading localStorage on every render).
    useEffect(() => {
        if (isMenuOpen) setRecentPaths(getRecentPaths());
    }, [isMenuOpen]);

    const toggleSection = (key: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };
    const { openChat } = useAssistant();
    const { openSimulator } = useSimulator();
    const { openSurvey } = useOpinion();
    const { theme } = useTheme();
    const f = theme.features;
    const t = useTranslations('nav');
    const useTextLogo = theme.navbar.logoMode === 'text';

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    // ================================================================
    // INLINE LAYOUT (LePerle-style): logo-left, links-center, pill CTA-right
    // ================================================================
    if (theme.navbar.layout === 'inline') {
        return (
            <nav className={styles.navbarInline}>
                <div className={`container ${styles.containerInline}`}>
                    {/* Logo — left */}
                    <Link href="/" className={styles.logoInline} onClick={closeMenu}>
                        {useTextLogo ? (
                            <span style={{
                                fontSize: '1.3rem',
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                color: 'var(--color-text-main, #1A1A1A)',
                                fontFamily: 'var(--font-heading, inherit)',
                            }}>
                                {theme.navbar.logoText}
                            </span>
                        ) : (
                            <Image
                                src={isDemoMode ? "/demo-logo.png" : "/logo-transparent.png"}
                                alt={brand.logoAlt}
                                width={574}
                                height={139}
                                sizes="227px"
                                // Explicit width + aspect-ratio fix CLS 0.219 desktop (Option A 2026-05-21):
                                // `width: auto` powodował że browser nie rezerwował miejsca przed
                                // load → layout shift. `aspectRatio` + `height: auto` zachowuje
                                // proporcje gdy maxWidth: 100% ogranicza szerokość na małym viewport
                                // (bez distortion). 227px (desktop) × 139/574 = 55px.
                                style={{ width: '227px', height: 'auto', aspectRatio: '574 / 139', maxWidth: '100%', display: 'block' }}
                                priority
                            />
                        )}
                    </Link>

                    {/* Desktop links — center, always visible */}
                    <div className={styles.inlineLinks}>
                        <Link href="/o-nas" className={styles.inlineLink}>{t('about')}</Link>
                        <Link href="/oferta" className={styles.inlineLink}>{t('services')}</Link>
                        {f.metamorphoses && <Link href="/metamorfozy" className={styles.inlineLink}>{t('transformations')}</Link>}
                        <Link href="/cennik" className={styles.inlineLink}>{t('pricing')}</Link>
                        <Link href="/kontakt" className={styles.inlineLink}>{t('contact')}</Link>
                    </div>

                    {/* Desktop CTA — right, pill shaped */}
                    <div className={styles.inlineCta}>
                        <Link href="/rezerwacja" className={styles.inlineCtaButton}>
                            {t('booking')}
                        </Link>
                    </div>

                    {/* Language Switcher */}
                    <div className={styles.langSwitcherWrapper}>
                        <LanguageSwitcher hidden={isMenuOpen} />
                    </div>

                    {/* Mobile hamburger — H5 (2026-05-10): 44×44 button (WCAG 2.5.5
                        minimum touch target) wrapping 30×21 visual icon. */}
                    <button
                        className={styles.hamburger}
                        onClick={toggleMenu}
                        aria-label="Menu"
                        aria-expanded={isMenuOpen}
                    >
                        <span className={styles.barWrapper}>
                            <span className={`${styles.barInline} ${isMenuOpen ? styles.barInlineOpen : ''}`}></span>
                            <span className={`${styles.barInline} ${isMenuOpen ? styles.barInlineOpen : ''}`}></span>
                            <span className={`${styles.barInline} ${isMenuOpen ? styles.barInlineOpen : ''}`}></span>
                        </span>
                    </button>

                    {/* Mobile Menu Overlay — same as hamburger layout */}
                    <div className={`${styles.mobileMenuInline} ${isMenuOpen ? styles.mobileMenuInlineOpen : ''}`}>
                        <div className={styles.mobileLinksInline}>
                            <Link href="/o-nas" className={styles.mobileLinkInline} onClick={closeMenu}>{t('about')}</Link>
                            <Link href="/oferta" className={styles.mobileLinkInline} onClick={closeMenu}>{t('services')}</Link>
                            {f.metamorphoses && <Link href="/metamorfozy" className={styles.mobileLinkInline} onClick={closeMenu}>{t('transformations')}</Link>}
                            <Link href="/cennik" className={styles.mobileLinkInline} onClick={closeMenu}>{t('pricing')}</Link>
                            <Link href="/kontakt" className={styles.mobileLinkInline} onClick={closeMenu}>{t('contact')}</Link>
                            <Link href="/strefa-pacjenta/" className={styles.mobileLinkInline} onClick={closeMenu}>{t('patientZone')}</Link>
                            <Link href="/rezerwacja" className={styles.inlineCtaButton} onClick={closeMenu} style={{ marginTop: '1rem', display: 'inline-block', textAlign: 'center' }}>
                                {t('booking')}
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>
        );
    }

    // ================================================================
    // HAMBURGER LAYOUT (default mikrostomart): centered hamburger burst
    // ================================================================
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
                        {useTextLogo ? (
                            <span style={{
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                color: 'var(--color-text-main, #1A1A1A)',
                                fontFamily: 'var(--font-heading, inherit)',
                            }}>
                                {theme.navbar.logoText}
                            </span>
                        ) : (
                            <Image
                                src={isDemoMode ? "/demo-logo.png" : "/logo-transparent.png"}
                                alt={brand.logoAlt}
                                width={574}
                                height={139}
                                sizes="247px"
                                // Explicit width + aspect-ratio fix CLS 0.219 desktop (Option A 2026-05-21):
                                // 247px × 139/574 = 60px. aspectRatio + height:auto zapobiega
                                // distortion gdy maxWidth: 100% ogranicza szerokość na małych ekranach.
                                style={{ width: '247px', height: 'auto', aspectRatio: '574 / 139', maxWidth: '100%', display: 'block' }}
                                priority
                            />
                        )}
                    </Link>
                </motion.div>

                {/* ═══════════════════════════════════════════════════
                    S7-3 LUXURY (2026-05-17): DESKTOP TOP NAV — 5 widocznych pozycji
                    Audyt: "Na desktopie standardowa nawigacja jest ukryta za
                    ikoną menu. To wygląda minimalistycznie, ale osłabia użyteczność."
                    Pozycje: Oferta · Cennik · Metamorfozy · Narzędzia ▾ · Kontakt
                    Hamburger (poniżej) zostaje jako uzupełnienie pełnej mapy strony.
                    ═══════════════════════════════════════════════════ */}
                <div className={styles.desktopTopNav}>
                    <Link href="/o-nas" className={styles.topNavLink}>{t('about')}</Link>
                    <Link href="/oferta" className={styles.topNavLink}>{t('services')}</Link>
                    <Link href="/cennik" className={styles.topNavLink}>{t('pricing')}</Link>
                    {f.metamorphoses && (
                        <Link href="/metamorfozy" className={styles.topNavLink}>{t('transformations')}</Link>
                    )}

                    {/* Narzędzia ▾ dropdown */}
                    <div
                        className={styles.topNavDropdownWrapper}
                        onMouseEnter={() => setTopNavToolsOpen(true)}
                        onMouseLeave={() => setTopNavToolsOpen(false)}
                    >
                        <button
                            className={styles.topNavLink}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                            onClick={() => setTopNavToolsOpen(o => !o)}
                            aria-expanded={topNavToolsOpen}
                            aria-haspopup="true"
                        >
                            {t('tools')} <span style={{ fontSize: '0.65em', opacity: 0.7 }}>▾</span>
                        </button>
                        <AnimatePresence>
                            {topNavToolsOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                    className={styles.topNavDropdown}
                                >
                                    {f.painMap && (
                                        <Link href="/mapa-bolu" className={styles.topNavDropdownLink} onClick={() => setTopNavToolsOpen(false)}>
                                            🦷 {t('painMap')}
                                        </Link>
                                    )}
                                    {f.treatmentCalculator && (
                                        <Link href="/kalkulator-leczenia" className={styles.topNavDropdownLink} onClick={() => setTopNavToolsOpen(false)}>
                                            🧮 {t('treatmentCalculator')}
                                        </Link>
                                    )}
                                    {f.comparator && (
                                        <Link href="/porownywarka" className={styles.topNavDropdownLink} onClick={() => setTopNavToolsOpen(false)}>
                                            ⚖️ {t('comparator')}
                                        </Link>
                                    )}
                                    <button
                                        className={styles.topNavDropdownLink}
                                        onClick={() => { openSimulator(); setTopNavToolsOpen(false); }}
                                        style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit', width: '100%' }}
                                    >
                                        ✨ {t('smileSimulator')}
                                    </button>
                                    <Link href="/strefa-pacjenta/" className={styles.topNavDropdownLink} onClick={() => setTopNavToolsOpen(false)}>
                                        👤 {t('patientZone')}
                                    </Link>
                                    <Link href="/aplikacja" className={styles.topNavDropdownLink} onClick={() => setTopNavToolsOpen(false)}>
                                        📱 {t('app')}
                                    </Link>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* S7-3 fix #5 (2026-05-17): Dodatki ▾ dropdown — zawiera
                        items które były w starym hamburger burst, a nie zmieściły
                        się w Narzędzia ▾ (O nas/Aktualności/Baza wiedzy/Blog/Sklep/
                        Zadatek/Selfie/Asystent/Opinion). Audit zachowuje 1:1 stary
                        scope hamburger burst — niczego nie tracimy z menu. */}
                    <div
                        className={styles.topNavDropdownWrapper}
                        onMouseEnter={() => setTopNavMoreOpen(true)}
                        onMouseLeave={() => setTopNavMoreOpen(false)}
                    >
                        <button
                            className={styles.topNavLink}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                            onClick={() => setTopNavMoreOpen(o => !o)}
                            aria-expanded={topNavMoreOpen}
                            aria-haspopup="true"
                        >
                            {t('extras')} <span style={{ fontSize: '0.65em', opacity: 0.7 }}>▾</span>
                        </button>
                        <AnimatePresence>
                            {topNavMoreOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                    className={styles.topNavDropdown}
                                >
                                    {/* O nas przeniesione do desktop top nav (top-level visible) — usunięte z Dodatki żeby uniknąć duplikatu. K-3 follow-up 2026-05-21. */}
                                    <Link href="/aktualnosci" className={styles.topNavDropdownLink} onClick={() => setTopNavMoreOpen(false)}>
                                        📰 {t('news')}
                                    </Link>
                                    {f.knowledgeBase && (
                                        <Link href="/baza-wiedzy" className={styles.topNavDropdownLink} onClick={() => setTopNavMoreOpen(false)}>
                                            📚 {t('knowledgeBase')}
                                        </Link>
                                    )}
                                    {f.blog && (
                                        <Link href="/nowosielski" className={styles.topNavDropdownLink} onClick={() => setTopNavMoreOpen(false)}>
                                            👨‍⚕️ {t('blog')}
                                        </Link>
                                    )}
                                    {f.shop && (
                                        <Link href="/sklep" className={styles.topNavDropdownLink} onClick={() => setTopNavMoreOpen(false)}>
                                            🛍️ {t('shop')}
                                        </Link>
                                    )}
                                    <Link href="/zadatek" className={styles.topNavDropdownLink} onClick={() => setTopNavMoreOpen(false)}>
                                        💳 {t('deposit')}
                                    </Link>
                                    {f.selfie && (
                                        <Link href="/selfie" className={styles.topNavDropdownLink} onClick={() => setTopNavMoreOpen(false)}>
                                            🤳 {t('selfie')}
                                        </Link>
                                    )}
                                    <button
                                        className={styles.topNavDropdownLink}
                                        onClick={() => { openChat(); setTopNavMoreOpen(false); }}
                                        style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit', width: '100%' }}
                                    >
                                        🤖 {t('assistant')}
                                    </button>
                                    <button
                                        className={styles.topNavDropdownLink}
                                        onClick={() => { openSurvey(); setTopNavMoreOpen(false); }}
                                        style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit', width: '100%' }}
                                    >
                                        ⭐ {t('shareOpinion')}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <Link href="/kontakt" className={styles.topNavLink}>{t('contact')}</Link>
                </div>

                {/* ═══════════════════════════════════════════════════
                    DESKTOP: Animated Hamburger Menu (uzupełnienie — pełna mapa strony)
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
                                                        background: 'var(--color-surface, rgba(18, 20, 24, 0.95))',
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
                    S7-3 LUXURY: powiększony button + label "Menu" obok ikony
                    (audyt: drobna ikona menu źle czytelna na mobile).
                    ═══════════════════════════════════════════════════ */}
                <button
                    className={styles.hamburger}
                    onClick={toggleMenu}
                    aria-label={t('menuLabel')}
                    aria-expanded={isMenuOpen}
                >
                    <span className={`${styles.bar} ${isMenuOpen ? styles.barOpen : ''}`}></span>
                    <span className={`${styles.bar} ${isMenuOpen ? styles.barOpen : ''}`}></span>
                    <span className={`${styles.bar} ${isMenuOpen ? styles.barOpen : ''}`}></span>
                    <span className={styles.hamburgerLabel}>{t('menuLabel')}</span>
                </button>

                {/* ═══════════════════════════════════════════════════
                    S7-3 LUXURY (2026-05-17): Mobile menu overlay → site map.
                    Audyt: "Ograniczyć menu mobile do głównych kategorii i
                    rozwinąć podsekcje dopiero po kliknięciu" + luxury bonus:
                    search bar + recently visited chips.
                    ═══════════════════════════════════════════════════ */}
                <div className={`${styles.mobileMenu} ${isMenuOpen ? styles.mobileMenuOpen : ''}`}>
                    <div className={styles.mobileLinks}>
                        {/* LUXURY: Site search */}
                        <input
                            type="search"
                            className={styles.luxurySearch}
                            placeholder={t('mapSearchPlaceholder')}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            aria-label={t('mapSearchPlaceholder')}
                        />

                        {/* LUXURY: Recently visited (chips) */}
                        {recentPaths.length > 0 && !searchQuery && (
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 700 }}>
                                    {t('luxuryRecentlyVisited')}
                                </div>
                                <div>
                                    {recentPaths.slice(0, 6).map(p => (
                                        <Link key={p} href={p} className={styles.luxuryRecentChip} onClick={closeMenu}>
                                            {p === '/' ? '🏠' : p.slice(0, 30)}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(() => {
                            // S7-3: build full link list — used for search filtering + section render
                            type LinkItem = { href?: string; label: string; icon?: string; section: string; onClick?: () => void };
                            const allLinks: LinkItem[] = [
                                // K-3 follow-up 2026-05-21: O nas jako pierwsza pozycja w sekcji main
                                // (przeniesione z sekcji 'other'). Po K-3 personal brand exposure ważne
                                // żeby /o-nas było widoczne z 1 klika z menu.
                                { href: '/o-nas', label: t('about'), icon: 'ℹ️', section: 'main' },
                                // MAIN — najważniejsze CTAs zawsze widoczne
                                { href: '/rezerwacja', label: t('booking'), icon: '📅', section: 'main' },
                                { href: '/oferta', label: t('services'), icon: '🦷', section: 'main' },
                                { href: '/cennik', label: t('pricing'), icon: '💰', section: 'main' },
                                ...(f.metamorphoses ? [{ href: '/metamorfozy', label: t('transformations'), icon: '✨', section: 'main' }] : []),
                                { href: '/kontakt', label: t('contact'), icon: '📞', section: 'main' },
                                // TOOLS
                                ...(f.painMap ? [{ href: '/mapa-bolu', label: t('painMap'), icon: '🦷', section: 'tools' }] : []),
                                ...(f.treatmentCalculator ? [{ href: '/kalkulator-leczenia', label: t('treatmentCalculator'), icon: '🧮', section: 'tools' }] : []),
                                ...(f.comparator ? [{ href: '/porownywarka', label: t('comparator'), icon: '⚖️', section: 'tools' }] : []),
                                { label: t('smileSimulator'), icon: '✨', section: 'tools', onClick: () => { openSimulator(); closeMenu(); } },
                                ...(f.selfie ? [{ href: '/selfie', label: t('selfie'), icon: '🤳', section: 'tools' }] : []),
                                // ACCOUNT
                                { href: '/strefa-pacjenta/', label: t('patientZone'), icon: '👤', section: 'account' },
                                { href: '/aplikacja', label: t('app'), icon: '📱', section: 'account' },
                                { href: '/zadatek', label: t('deposit'), icon: '💳', section: 'account' },
                                // OTHER
                                // O nas przeniesione do section 'main' (pierwsza pozycja) — usunięte z 'other' żeby uniknąć duplikatu. K-3 follow-up.
                                { href: '/aktualnosci', label: t('news'), icon: '📰', section: 'other' },
                                ...(f.knowledgeBase ? [{ href: '/baza-wiedzy', label: t('knowledgeBase'), icon: '📚', section: 'other' }] : []),
                                ...(f.blog ? [{ href: '/nowosielski', label: t('blog'), icon: '👨‍⚕️', section: 'other' }] : []),
                                ...(f.shop ? [{ href: '/sklep', label: t('shop'), icon: '🛍️', section: 'other' }] : []),
                                { label: t('assistant'), icon: '🤖', section: 'other', onClick: () => { openChat(); closeMenu(); } },
                                { label: t('shareOpinion'), icon: '⭐', section: 'other', onClick: () => { openSurvey(); closeMenu(); } },
                            ];

                            // LUXURY: search filter (case-insensitive label match)
                            const q = searchQuery.trim().toLowerCase();
                            const filtered = q
                                ? allLinks.filter(l => l.label.toLowerCase().includes(q))
                                : allLinks;

                            const renderLink = (l: LinkItem, idx: number) => {
                                const content = (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.65rem 1rem' }}>
                                        <span style={{ fontSize: '1.2rem', width: '24px', textAlign: 'center' }}>{l.icon}</span>
                                        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{l.label}</span>
                                    </span>
                                );
                                if (l.href) {
                                    return (
                                        <Link key={`${l.href}-${idx}`} href={l.href} className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', color: '#e2d1b3', textDecoration: 'none' }}>
                                            {content}
                                        </Link>
                                    );
                                }
                                return (
                                    <button key={`btn-${idx}`} onClick={l.onClick} className={styles.mobileLink} style={{ display: 'block', width: '100%', textAlign: 'left', color: '#e2d1b3', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                        {content}
                                    </button>
                                );
                            };

                            // If searching, show flat filtered list (no sections)
                            if (q) {
                                return (
                                    <div>
                                        {filtered.length === 0 && (
                                            <div style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                                                –
                                            </div>
                                        )}
                                        {filtered.map(renderLink)}
                                    </div>
                                );
                            }

                            // Otherwise: 4 collapsible sections, "main" expanded by default
                            const sections: Array<{ key: string; label: string }> = [
                                { key: 'main', label: t('sectionMain') },
                                { key: 'tools', label: t('sectionTools') },
                                { key: 'account', label: t('sectionAccount') },
                                { key: 'other', label: t('sectionOther') },
                            ];

                            return sections.map(({ key, label }) => {
                                const items = allLinks.filter(l => l.section === key);
                                if (items.length === 0) return null;
                                const isOpen = expandedSections.has(key);
                                return (
                                    <div key={key} className={styles.mobileSection}>
                                        <button
                                            className={styles.mobileSectionHeader}
                                            onClick={() => toggleSection(key)}
                                            aria-expanded={isOpen}
                                        >
                                            <span>{label}</span>
                                            <span className={`${styles.mobileSectionChevron} ${isOpen ? styles.mobileSectionChevronOpen : ''}`}>▾</span>
                                        </button>
                                        <AnimatePresence initial={false}>
                                            {isOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                                    className={styles.mobileSectionContent}
                                                >
                                                    {items.map(renderLink)}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>
        </nav>
    );
}
