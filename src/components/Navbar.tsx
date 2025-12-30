import Link from 'next/link';
import Image from 'next/image';
import styles from './Navbar.module.css';

export default function Navbar() {
    return (
        <nav className={styles.navbar}>
            <div className={`container ${styles.container}`}>
                <Link href="/" className={styles.logo}>
                    <Image
                        src="/logo-transparent.png"
                        alt="Mikrostomart Logo"
                        width={220}
                        height={70}
                        style={{ width: 'auto', height: '65px' }}
                        priority
                    />
                </Link>

                <div className={styles.links}>
                    <Link href="/o-nas" className={styles.link}>O nas</Link>
                    <Link href="/oferta" className={styles.link}>Oferta</Link>
                    <Link href="/sklep" className={styles.link}>Sklep</Link>
                    <Link href="/kontakt" className={styles.link}>Kontakt</Link>
                </div>

                <Link href="/rezerwacja" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    Umów wizytę
                </Link>
            </div>
        </nav>
    );
}
