"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Navbar.module.css';

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
                                        href="/sklep"
                                        className={styles.link}
                                        style={{
                                            display: 'block',
                                            padding: '0.75rem 1.5rem',
                                            width: '100%',
                                            textAlign: 'left',
                                            color: 'var(--color-text-main)',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        🛍️ Sklep
                                    </Link>
                                    <Link
                                        href="/symulator"
                                        className={styles.link}
                                        style={{
                                            display: 'block',
                                            padding: '0.75rem 1.5rem',
                                            width: '100%',
                                            textAlign: 'left',
                                            color: 'var(--color-primary)',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        ✨ Symulator Uśmiechu
                                    </Link>
                                    {/* Future items can be added here */}
                                </div>
                            </div>
                        )}
                    </div>

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
                        <div style={{ padding: '1rem 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', width: '100%' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Dodatki</div>
                            <Link href="/sklep" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', marginBottom: '0.5rem' }}>🛍️ Sklep</Link>
                            <Link href="/symulator" className={styles.mobileLink} onClick={closeMenu} style={{ display: 'block', color: 'var(--color-primary)' }}>✨ Symulator AI</Link>
                        </div>

                        <Link href="/kontakt" className={styles.mobileLink} onClick={closeMenu}>Kontakt</Link>
                        <Link href="/rezerwacja" className="btn-primary" onClick={closeMenu} style={{ marginTop: '1rem', width: '100%', textAlign: 'center' }}>
                            Umów wizytę
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
