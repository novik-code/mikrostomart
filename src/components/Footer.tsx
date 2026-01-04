import Image from 'next/image';
import AnimatedPhone from "@/components/AnimatedPhone";
import AnimatedAt from "@/components/AnimatedAt";

export default function Footer() {
    return (
        <footer className="section" style={{
            background: 'var(--color-surface)',
            marginTop: 'auto',
            borderTop: '1px solid var(--color-surface-hover)',
            position: 'relative',
            overflow: 'hidden'
        }}>

            {/* Watermark Logo */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%',
                height: '100%',
                opacity: 0.03,
                pointerEvents: 'none',
                zIndex: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                filter: 'grayscale(100%)' // Optional: make it purely textural
            }}>
                <Image
                    src="/logo-transparent.png"
                    alt="Watermark"
                    fill
                    style={{ objectFit: 'contain', transform: 'scale(1.5)' }}
                />
            </div>

            <div className="container" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--spacing-lg)',
                position: 'relative',
                zIndex: 1
            }}>

                <div>
                    <h3 style={{ color: 'var(--color-primary)', marginBottom: 'var(--spacing-sm)' }}>Mikrostomart</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        Mikroskopowa Stomatologia Artystyczna.<br />
                        Precyzja którą zobaczysz w uśmiechu.
                    </p>
                </div>

                <div>
                    <h4 style={{ color: 'var(--color-text-main)', marginBottom: 'var(--spacing-sm)' }}>Kontakt</h4>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        <a
                            href="https://www.google.com/maps/search/?api=1&query=Mikrostomart+Opole+ul.+Centralna+33a"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}
                            className="hover-underline"
                        >
                            ul. Centralna 33a<br />
                            45-940 Opole/Chmielowice
                        </a>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <a href="tel:+48570270470" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="hover-primary">
                                <AnimatedPhone size={16} color="var(--color-primary)" />
                                570-270-470
                            </a>
                            <a href="tel:+48570810800" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="hover-primary">
                                <AnimatedPhone size={16} color="var(--color-primary)" />
                                570-810-800
                            </a>
                        </div>

                        <a href="mailto:gabinet@mikrostomart.pl" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }} className="hover-primary">
                            <AnimatedAt size={16} color="var(--color-primary)" />
                            gabinet@mikrostomart.pl
                        </a>
                    </div>
                </div>

                <div>
                    <h4 style={{ color: 'var(--color-text-main)', marginBottom: 'var(--spacing-sm)' }}>Godziny otwarcia</h4>
                    <ul style={{ listStyle: 'none', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        <li>Pon - Czw: 9.00 - 20.00</li>
                        <li>Pią: 9.00 - 16.00</li>
                        <li>Sob: Wybrane terminy</li>
                    </ul>
                </div>

            </div>
            <div className="container" style={{
                marginTop: 'var(--spacing-lg)',
                paddingTop: 'var(--spacing-md)',
                borderTop: '1px solid var(--color-surface-hover)',
                textAlign: 'center',
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '2rem',
                flexWrap: 'wrap'
            }}>
                <span>© {new Date().getFullYear()} Mikrostomart. Wszelkie prawa zastrzeżone.</span>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <a
                        href="/faq"
                        style={{ color: 'var(--color-text-muted)', textDecoration: 'none', opacity: 0.7 }}
                        className="hover-underline"
                    >
                        FAQ (Pytania i Odpowiedzi)
                    </a>
                    <a
                        href="/baza-wiedzy"
                        style={{ color: 'var(--color-text-muted)', textDecoration: 'none', opacity: 0.7 }}
                        className="hover-underline"
                    >
                        Baza Wiedzy 📚
                    </a>
                    <a
                        href="/regulamin"
                        style={{ color: 'var(--color-text-muted)', textDecoration: 'none', opacity: 0.7 }}
                        className="hover-underline"
                    >
                        Regulamin
                    </a>
                    <a
                        href="/polityka-prywatnosci"
                        style={{ color: 'var(--color-text-muted)', textDecoration: 'none', opacity: 0.7 }}
                        className="hover-underline"
                    >
                        Polityka Prywatności (RODO)
                    </a>
                    <a
                        href="/zadatek"
                        style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 'bold' }}
                        className="hover-underline"
                    >
                        Wpłać Zadatek
                    </a>
                    <a
                        href="/polityka-cookies"
                        style={{ color: 'var(--color-text-muted)', textDecoration: 'none', opacity: 0.7 }}
                        className="hover-underline"
                    >
                        Polityka Cookies
                    </a>
                </div>
            </div>
        </footer>
    );
}
