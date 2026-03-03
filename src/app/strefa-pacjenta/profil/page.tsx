'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePatientAuth } from '@/hooks/usePatientAuth';

interface PatientData {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    locale: string;
    address?: {
        street?: string;
        houseNumber?: string;
        apartmentNumber?: string;
        postalCode?: string;
        city?: string;
    };
}

export default function PatientProfile() {
    const { patient, isLoading, accountStatus, logout, getAuthToken } = usePatientAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [email, setEmail] = useState('');
    const [locale, setLocale] = useState('pl');
    const [message, setMessage] = useState('');
    const [emailLoaded, setEmailLoaded] = useState(false);
    const router = useRouter();

    // Sync email/locale from patient data once loaded
    if (patient && !emailLoaded) {
        setEmail(patient.email || '');
        setLocale(patient.locale || 'pl');
        setEmailLoaded(true);
    }

    const handleSaveEmail = async () => {
        setIsSaving(true);
        setMessage('');

        try {
            const token = getAuthToken();
            const res = await fetch('/api/patients/me', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ email, locale }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage('❌ ' + (data.error || 'Nie udało się zaktualizować emaila'));
                return;
            }

            setMessage('✅ Email został zaktualizowany!');
        } catch (err) {
            console.error('Failed to update email:', err);
            setMessage('❌ Wystąpił błąd podczas zapisywania');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || !patient) {
        return <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.9rem',
        }}>
            Ładowanie danych...
        </div>;
    }

    return (
        <>

            {/* Main Content */}
            {accountStatus === null || accountStatus === 'active' ? (
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
                                ℹ️ Dane osobowe są pobierane z systemu Mikrostomart i nie mogą być zmieniane w portalu. W celu aktualizacji skontaktuj się z recepcją.
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

                            {/* Language Preference */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    marginBottom: '0.5rem',
                                }}>
                                    Preferowany język / Preferred language
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {[
                                        { code: 'pl', flag: '🇵🇱', label: 'Polski' },
                                        { code: 'en', flag: '🇬🇧', label: 'English' },
                                        { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
                                        { code: 'ua', flag: '🇺🇦', label: 'Українська' },
                                    ].map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => setLocale(lang.code)}
                                            style={{
                                                padding: '0.625rem 1rem',
                                                background: locale === lang.code
                                                    ? 'rgba(220, 177, 74, 0.2)'
                                                    : 'rgba(255, 255, 255, 0.05)',
                                                border: locale === lang.code
                                                    ? '2px solid rgba(220, 177, 74, 0.6)'
                                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '0.5rem',
                                                color: locale === lang.code ? '#dcb14a' : 'rgba(255, 255, 255, 0.7)',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem',
                                                fontWeight: locale === lang.code ? 'bold' : 'normal',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {lang.flag} {lang.label}
                                        </button>
                                    ))}
                                </div>
                                <p style={{
                                    color: 'rgba(255, 255, 255, 0.4)',
                                    fontSize: '0.8rem',
                                    marginTop: '0.5rem',
                                }}>
                                    Powiadomienia email i SMS będą wysyłane w wybranym języku
                                </p>
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
            ) : (
                // Pending or Rejected - Show restricted access
                <div style={{
                    maxWidth: '800px',
                    margin: '3rem auto',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                }}>
                    <div style={{
                        fontSize: '4rem',
                        marginBottom: '1.5rem',
                    }}>
                        🔒
                    </div>
                    <h2 style={{
                        color: '#dcb14a',
                        fontSize: '1.8rem',
                        marginBottom: '1rem',
                    }}>
                        Dostęp ograniczony
                    </h2>
                    <p style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '1.1rem',
                        lineHeight: 1.6,
                    }}>
                        Twoje konto wymaga zatwierdzenia przez administratora.<br />
                        Profil będzie dostępny po weryfikacji.
                    </p>
                </div>
            )}
        </>
    );
}
