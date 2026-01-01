import Image from 'next/image';

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
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        ul. Centralna 33a<br />
                        45-940 Opole/Chmielowice<br />
                        <br />
                        Tel: 570-270-470<br />
                        Email: gabinet@mikrostomart.pl
                    </p>
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
                <a
                    href="/regulamin.docx"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-text-muted)', textDecoration: 'underline' }}
                >
                    Regulamin
                </a>
            </div>
        </footer>
    );
}
