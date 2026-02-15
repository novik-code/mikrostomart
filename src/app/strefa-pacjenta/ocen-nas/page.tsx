'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const GOOGLE_REVIEW_URL = 'https://g.page/r/CSYarbrDoYcDEAE/review';

export default function OcenNas() {
    const [isLoading, setIsLoading] = useState(true);
    const [accountStatus, setAccountStatus] = useState<string | null>(null);
    const [patientName, setPatientName] = useState('');
    const router = useRouter();

    const getAuthToken = () => {
        const cookies = document.cookie.split('; ');
        const tokenCookie = cookies.find(c => c.startsWith('patient_token='));
        return tokenCookie ? tokenCookie.split('=')[1] : null;
    };

    useEffect(() => {
        const loadData = async () => {
            const token = getAuthToken();

            if (!token) {
                router.push('/strefa-pacjenta/login');
                return;
            }

            try {
                const res = await fetch('/api/patients/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!res.ok) throw new Error('Unauthorized');

                const data = await res.json();
                setAccountStatus(data.account_status || null);
                setPatientName(data.firstName || '');
            } catch (err) {
                console.error('Failed to load data:', err);
                router.push('/strefa-pacjenta/login');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [router]);

    const handleLogout = () => {
        document.cookie = 'patient_token=; path=/; max-age=0';
        localStorage.removeItem('patient_data');
        router.push('/strefa-pacjenta/login');
    };

    if (isLoading) {
        return <div style={{
            minHeight: '100vh',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
        }}>
            Ładowanie...
        </div>;
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'transparent',
        }}>
            {/* Header */}
            <div style={{
                background: 'rgba(0, 0, 0, 0.5)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '1.5rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#fff',
                        marginBottom: '0.25rem',
                    }}>
                        Strefa Pacjenta
                    </h1>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                        Oceń nas
                    </p>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '0.5rem',
                        color: '#ef4444',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                    }}
                >
                    Wyloguj
                </button>
            </div>

            {/* Navigation */}
            <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '1rem 2rem',
                display: 'flex',
                gap: '1rem',
                overflowX: 'auto',
            }}>
                {[
                    { href: '/strefa-pacjenta/dashboard', label: 'Panel główny', active: false },
                    { href: '/strefa-pacjenta/historia', label: 'Historia wizyt', active: false },
                    { href: '/strefa-pacjenta/profil', label: 'Mój profil', active: false },
                    { href: '/strefa-pacjenta/ocen-nas', label: '⭐ Oceń nas', active: true },
                ].map(link => (
                    <Link
                        key={link.href}
                        href={link.href}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: link.active ? 'rgba(220, 177, 74, 0.15)' : 'transparent',
                            border: link.active ? '1px solid rgba(220, 177, 74, 0.3)' : '1px solid transparent',
                            borderRadius: '0.5rem',
                            color: link.active ? '#dcb14a' : 'rgba(255, 255, 255, 0.7)',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                            fontWeight: link.active ? 'bold' : 'normal',
                            transition: 'all 0.2s',
                        }}
                    >
                        {link.label}
                    </Link>
                ))}
            </div>

            {/* Main Content */}
            <div style={{
                maxWidth: '700px',
                margin: '0 auto',
                padding: '2.5rem 2rem',
            }}>
                {/* Hero section */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '2.5rem',
                }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⭐</div>
                    <h2 style={{
                        color: '#fff',
                        fontSize: '1.8rem',
                        fontWeight: 'bold',
                        marginBottom: '0.75rem',
                        lineHeight: 1.3,
                    }}>
                        {patientName ? `${patientName}, ` : ''}Twoja opinia jest dla nas ważna!
                    </h2>
                    <p style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '1.05rem',
                        lineHeight: 1.7,
                        maxWidth: '550px',
                        margin: '0 auto',
                    }}>
                        Jesteśmy dumni z jakości naszych usług i dbamy o komfort każdego pacjenta. Jeśli jesteś zadowolony/a z wizyty w Mikrostomart — będziemy wdzięczni za Twoją opinię w Google!
                    </p>
                </div>

                {/* QR Code card */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(220, 177, 74, 0.08), rgba(220, 177, 74, 0.03))',
                    border: '1px solid rgba(220, 177, 74, 0.25)',
                    borderRadius: '1.25rem',
                    padding: '2.5rem',
                    textAlign: 'center',
                    marginBottom: '2rem',
                }}>
                    <p style={{
                        color: '#dcb14a',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        marginBottom: '1.5rem',
                        letterSpacing: '0.02em',
                    }}>
                        📱 Zeskanuj kod QR aby przejść do opinii Google
                    </p>

                    {/* QR Code */}
                    <div style={{
                        display: 'inline-block',
                        background: '#fff',
                        borderRadius: '1rem',
                        padding: '1.25rem',
                        boxShadow: '0 8px 32px rgba(220, 177, 74, 0.15)',
                        marginBottom: '1.5rem',
                    }}>
                        <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer">
                            <Image
                                src="/qr-ocen-nas.png"
                                alt="Kod QR — Oceń Mikrostomart w Google"
                                width={200}
                                height={200}
                                style={{
                                    display: 'block',
                                    imageRendering: 'pixelated',
                                }}
                            />
                        </a>
                    </div>

                    <p style={{
                        color: 'rgba(255, 255, 255, 0.45)',
                        fontSize: '0.8rem',
                        marginTop: '0.5rem',
                    }}>
                        Lub kliknij kod QR, aby otworzyć stronę w nowej karcie
                    </p>
                </div>

                {/* CTA Button */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <a
                        href={GOOGLE_REVIEW_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '1rem 2.5rem',
                            background: 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                            border: 'none',
                            borderRadius: '0.75rem',
                            color: '#000',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            textDecoration: 'none',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            boxShadow: '0 4px 20px rgba(220, 177, 74, 0.3)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 8px 30px rgba(220, 177, 74, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(220, 177, 74, 0.3)';
                        }}
                    >
                        ⭐ Zostaw opinię w Google
                    </a>
                </div>

                {/* Why it matters */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '1rem',
                    padding: '2rem',
                    marginBottom: '2rem',
                }}>
                    <h3 style={{
                        color: '#fff',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        marginBottom: '1.25rem',
                    }}>
                        Dlaczego Twoja opinia jest ważna?
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[
                            { icon: '🤝', text: 'Pomagasz innym pacjentom w wyborze sprawdzonego gabinetu' },
                            { icon: '📈', text: 'Motywujesz nasz zespół do ciągłego doskonalenia usług' },
                            { icon: '💬', text: 'Pozytywna opinia to najlepsze wyróżnienie, jakie możemy otrzymać' },
                        ].map((item, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem',
                            }}>
                                <span style={{ fontSize: '1.25rem', lineHeight: '1.4' }}>{item.icon}</span>
                                <p style={{
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    fontSize: '0.95rem',
                                    lineHeight: 1.5,
                                    margin: 0,
                                }}>
                                    {item.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Thank you note */}
                <div style={{
                    textAlign: 'center',
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.03))',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: '1rem',
                }}>
                    <p style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.95rem',
                        lineHeight: 1.6,
                        margin: 0,
                    }}>
                        🙏 <strong style={{ color: '#22c55e' }}>Dziękujemy!</strong> Każda opinia pomaga nam
                        tworzyć jeszcze lepsze doświadczenia dla naszych pacjentów.
                    </p>
                </div>
            </div>
        </div>
    );
}
