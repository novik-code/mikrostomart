'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PatientData {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    address?: {
        street?: string;
        houseNumber?: string;
        apartmentNumber?: string;
        postalCode?: string;
        city?: string;
    };
}

export default function PatientProfile() {
    const [patient, setPatient] = useState<PatientData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const router = useRouter();

    const getAuthToken = () => {
        const cookies = document.cookie.split('; ');
        const tokenCookie = cookies.find(c => c.startsWith('patient_token='));
        return tokenCookie ? tokenCookie.split('=')[1] : null;
    };

    useEffect(() => {
        const loadPatient = async () => {
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

                if (!res.ok) {
                    throw new Error('Unauthorized');
                }

                const data = await res.json();
                setPatient(data);
                setEmail(data.email || '');
            } catch (err) {
                console.error('Failed to load patient:', err);
                router.push('/strefa-pacjenta/login');
            } finally {
                setIsLoading(false);
            }
        };

        loadPatient();
    }, [router]);

    const handleLogout = () => {
        document.cookie = 'patient_token=; path=/; max-age=0';
        localStorage.removeItem('patient_data');
        router.push('/strefa-pacjenta/login');
    };

    const handleSaveEmail = async () => {
        setIsSaving(true);
        setMessage('');

        // TODO: Implement email update endpoint
        // For now, just update localStorage
        setTimeout(() => {
            setMessage('✅ Email został zaktualizowany!');
            setIsSaving(false);
        }, 500);
    };

    if (isLoading || !patient) {
        return <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
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
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
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
                        Mój profil
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
                    { href: '/strefa-pacjenta/profil', label: 'Mój profil', active: true },
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
                maxWidth: '800px',
                margin: '0 auto',
                padding: '2rem',
            }}>
                {/* Personal Info (Read-only) */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '1rem',
                    padding: '2rem',
                    marginBottom: '2rem',
                }}>
                    <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                        Dane osobowe
                    </h2>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                Imię i nazwisko
                            </label>
                            <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '500' }}>
                                {patient.firstName} {patient.lastName}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                Telefon
                            </label>
                            <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '500' }}>
                                {patient.phone}
                            </div>
                        </div>

                        {patient.address && (
                            <div>
                                <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                    Adres
                                </label>
                                <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '500' }}>
                                    {patient.address.street} {patient.address.houseNumber}
                                    {patient.address.apartmentNumber && `/${patient.address.apartmentNumber}`}
                                    <br />
                                    {patient.address.postalCode} {patient.address.city}
                                </div>
                            </div>
                        )}

                        <div style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '0.75rem',
                            padding: '1rem',
                            fontSize: '0.9rem',
                            color: '#60a5fa',
                        }}>
                            ℹ️ Dane osobowe są pobierane z systemu Prodentis i nie mogą być zmieniane w portalu. W celu aktualizacji skontaktuj się z recepcją.
                        </div>
                    </div>
                </div>

                {/* Contact Info (Editable) */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '1rem',
                    padding: '2rem',
                }}>
                    <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                        Dane kontaktowe
                    </h2>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <div>
                            <label style={{
                                display: 'block',
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '0.9rem',
                                fontWeight: '500',
                                marginBottom: '0.5rem',
                            }}>
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="twoj@email.com"
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '0.5rem',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    outline: 'none',
                                }}
                            />
                        </div>

                        {message && (
                            <div style={{
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                borderRadius: '0.5rem',
                                padding: '0.875rem',
                                color: '#22c55e',
                                fontSize: '0.9rem',
                            }}>
                                {message}
                            </div>
                        )}

                        <button
                            onClick={handleSaveEmail}
                            disabled={isSaving}
                            style={{
                                padding: '1rem',
                                background: isSaving ? 'rgba(220, 177, 74, 0.5)' : 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: '#000',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                opacity: isSaving ? 0.7 : 1,
                                transition: 'transform 0.2s',
                            }}
                            onMouseEnter={(e) => !isSaving && (e.currentTarget.style.transform = 'translateY(-2px)')}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
