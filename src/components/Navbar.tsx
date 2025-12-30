"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Navbar.module.css';

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
                    <Link href="/oferta" className={styles.link}>Oferta</Link>
                    <Link href="/sklep" className={styles.link}>Sklep</Link>
                    <Link href="/kontakt" className={styles.link}>Kontakt</Link>
                </div>

                {/* Appointment Button (Hidden on extremely small screens or kept?) Let's keep it visible or accessible via menu */}
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
                        <Link href="/oferta" className={styles.mobileLink} onClick={closeMenu}>Oferta</Link>
                        <Link href="/sklep" className={styles.mobileLink} onClick={closeMenu}>Sklep</Link>
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
