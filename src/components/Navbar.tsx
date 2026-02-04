"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Navbar.module.css';

import { useAssistant } from "@/context/AssistantContext";
import { useSimulator } from "@/context/SimulatorContext";

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { openChat } = useAssistant();
    const { openSimulator } = useSimulator();

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    return (
        <nav className={styles.navbar}>
            <div className={`container ${styles.container}`}>
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

                {/* Desktop Links */}
                <div className={styles.links}>
                    <Link href="/o-nas" className={styles.link}>O nas</Link>
                    <Link href="/metamorfozy" className={styles.link}>Metamorfozy</Link>
                    <Link href="/oferta" className={styles.link}>Oferta</Link>
                    <Link href="/aktualnosci" className={styles.link}>Aktualności</Link>

                    {/* DROPDOWN MENU: Usługi Dodatkowe */}
                    <div
                        className={styles.link}
                        style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        onMouseEnter={() => setIsDropdownOpen(true)}
                        onMouseLeave={() => setIsDropdownOpen(false)}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Dodatki <span style={{ fontSize: '0.7em', opacity: 0.7 }}>▼</span>
                        </span>

                        {isDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                paddingTop: '10px', // Hit area buffer
                                cursor: 'default'
                            }}>
                                <div style={{
                                    background: 'var(--color-surface)',
                                    border: '1px solid var(--color-surface-hover)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '0.5rem 0',
                                    minWidth: '260px', // More space
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    backdropFilter: 'blur(10px)',
                                }}>
                                    <Link
                                        href="/mapa-bolu"
                                        className={styles.link}
                                        style={{
                                            display: 'block',
                                            padding: '0.75rem 1.5rem',
                                            width: '100%',
                                            textAlign: 'center',
                                            color: '#dcb14a',
                                            whiteSpace: 'nowrap',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            fontWeight: 'bold',
                                            borderBottom: '1px solid rgba(255,255,255,0.1)'
                                        }}
                                    >
                                        🗺️ Mapa Bólu
                                    </Link>
                                    <Link
                                        href="/baza-wiedzy"
                                        className={styles.link}
                                        style={{
                                            display: 'block',
                                            padding: '0.75rem 1.5rem',
                                            width: '100%',
                                            textAlign: 'center',
                                            color: 'var(--color-text-main)',
                                            whiteSpace: 'nowrap',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}
                                    >
                                        📚 Baza Wiedzy
                                    </Link>
                                    <Link
                                        href="/nowosielski"
                                        className={styles.link}
                                        style={{
                                            display: 'block',
                                            padding: '0.75rem 1.5rem',
                                            width: '100%',
                                            textAlign: 'center',
                                            color: '#d4af37',
                                            whiteSpace: 'nowrap',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        👨‍⚕️ Blog Dr. Marcin
                                    </Link>
                                    <Link
                                        href="/sklep"
                                        className={styles.link}
                                        style={{
                                            display: 'block',
                                            padding: '0.75rem 1.5rem',
                                            width: '100%',
                                            textAlign: 'center',
                                            color: 'var(--color-text-main)',
                                            whiteSpace: 'nowrap',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}
                                    >
                                        🛍️ Sklep
                                    </Link>
                                    <button
                                        onClick={() => {
                                            openSimulator();
                                            setIsDropdownOpen(false);
                                        }}
                                        className={styles.link}
                                        style={{
                                            display: 'block',
                                            padding: '0.75rem 1.5rem',
                                            width: '100%',
                                            textAlign: 'center',
                                            color: 'var(--color-primary)',
                                            whiteSpace: 'nowrap',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✨ Symulator Uśmiechu

                                    </button>
                                    <button
                                        onClick={() => {
                                            openChat();
                                            setIsDropdownOpen(false);
                                        }}
                                        className={styles.link}
                                        style={{
                                            display: 'block',
                                            padding: '0.75rem 1.5rem',
                                            width: '100%',
                                            textAlign: 'center',
                                            color: '#60a5fa', // Blueish
                                            whiteSpace: 'nowrap',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🤖 Wirtualny Asystent
                                    </button>
                                    <Link
                                        href="/zadatek"
                                        className={styles.link}
                                        style={{
                                            display: 'block',
                                            padding: '0.75rem 1.5rem',
                                            width: '100%',
                                            textAlign: 'center',
                                            color: 'var(--color-primary)',
                                            whiteSpace: 'nowrap',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        💳 Wpłać Zadatek
                                    </Link>
                                    <Link
                                        href="/selfie"
                                        className={styles.link}
                                        style={{
                                            display: 'block',
                                            padding: '0.75rem 1.5rem',
                                            width: '100%',
                                            textAlign: 'center',
                                            color: '#ec4899', // Pinkish
                                            whiteSpace: 'nowrap',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        🤳 Selfie z Doktorem
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    <Link href="/strefa-pacjenta/" className={styles.link}>
                        Strefa Pacjenta
                    </Link>
                    <Link href="/kontakt" className={styles.link}>Kontakt</Link>
                </div>

                {/* Appointment Button */}
                <div className={styles.desktopCta}>
                    <Link href="/rezerwacja" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                        Umów wizytę
                    </Link>
                </div>

                {/* Hamburger Button */}
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

                        {/* Mobile Expanded "Dodatki" */}
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Dodatki</div>
                        <Link href="/mapa-bolu" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#dcb14a', fontWeight: 'bold' }}>🗺️ Mapa Bólu</Link>
                        <Link href="/baza-wiedzy" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem' }}>📚 Baza Wiedzy</Link>
                        <Link href="/nowosielski" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem', color: '#d4af37', fontWeight: 'bold' }}>👨‍⚕️ Blog Dr. Marcin</Link>
                        <Link href="/sklep" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem' }}>🛍️ Sklep</Link>
                        <button
                            onClick={() => {
                                openSimulator();
                                closeMenu();
                            }}
                            className={styles.mobileLink}
                            style={{
                                display: 'block',
                                padding: '0.75rem 1.5rem',
                                width: '100%',
                                textAlign: 'center',
                                color: '#dcb14a',
                                fontWeight: 'bold',
                                border: 'none',
                                background: 'transparent',
                                marginTop: '10px'
                            }}
                        >
                            ✨ Symulator Uśmiechu
                        </button>
                        <button
                            onClick={() => {
                                openChat();
                                closeMenu();
                            }}
                            className={styles.mobileLink}
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '0.75rem 1.5rem',
                                textAlign: 'center',
                                color: '#60a5fa',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            🤖 Wirtualny Asystent
                        </button>
                        <Link href="/strefa-pacjenta/" className={styles.mobileLink} onClick={closeMenu}>Strefa Pacjenta</Link>
                        <Link href="/kontakt" className={styles.mobileLink} onClick={closeMenu}>Kontakt</Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
