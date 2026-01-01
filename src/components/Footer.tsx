import Image from 'next/image';

export default function Footer() {
    return (
        <footer className="section" style={{ background: 'var(--color-surface)', marginTop: 'auto', borderTop: '1px solid var(--color-surface-hover)' }}>
            <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-lg)' }}>

                <div>
                    <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                        <Image
                            src="/logo-transparent.png"
                            alt="Mikrostomart"
                            width={200}
                            height={60}
                            style={{
                                objectFit: 'contain',
                                marginLeft: '-10px'
                            }}
                        />
                    </div>
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
            <div className="container" style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-surface-hover)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                © {new Date().getFullYear()} Mikrostomart. Wszelkie prawa zastrzeżone.
            </div>
        </footer>
    );
}
