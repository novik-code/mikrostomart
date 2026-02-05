'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PatientLogin() {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showWorkflowModal, setShowWorkflowModal] = useState(false);
    const router = useRouter();

    // Show workflow modal on first visit
    useEffect(() => {
        const hasSeenWorkflow = localStorage.getItem('hasSeenPatientWorkflow');
        if (!hasSeenWorkflow) {
            setShowWorkflowModal(true);
            localStorage.setItem('hasSeenPatientWorkflow', 'true');
        }
    }, []);


    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/patients/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone, password }),
            });

            const data = await response.json();

            if (response.ok && data.success && data.token) {
                // Store JWT token in cookie
                document.cookie = `patient_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;

                // Store patient data in localStorage
                localStorage.setItem('patient_data', JSON.stringify(data.patient));

                router.push('/strefa-pacjenta/dashboard');
            } else {
                setError(data.error || 'Nieprawidłowy numer telefonu lub hasło');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Nie udało się połączyć z serwerem. Spróbuj ponownie.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '480px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '1.5rem',
                padding: '3rem 2.5rem',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        fontSize: '2.5rem',
                    }}>
                        🩺
                    </div>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        background: 'linear-gradient(135deg, #fff, #dcb14a)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        Strefa Pacjenta
                    </h1>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.95rem' }}>
                        Zaloguj się do swojego konta
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Phone */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                        }}>
                            Numer telefonu
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="570 270 470"
                            required
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '0.5rem',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'all 0.2s',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#dcb14a';
                                e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                            }}
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                        }}>
                            Hasło
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '0.5rem',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'all 0.2s',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#dcb14a';
                                e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                            }}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '0.5rem',
                            padding: '0.875rem',
                            color: '#ef4444',
                            fontSize: '0.9rem',
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: isLoading ? 'rgba(220, 177, 74, 0.5)' : 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                            border: 'none',
                            borderRadius: '0.5rem',
                            color: '#000',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: isLoading ? 0.7 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 10px 25px rgba(220, 177, 74, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {isLoading ? 'Logowanie...' : 'Zaloguj się'}
                    </button>

                    {/* Links */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.9rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                    }}>
                        <Link
                            href="/strefa-pacjenta/reset-password"
                            style={{
                                color: '#dcb14a',
                                textDecoration: 'none',
                                transition: 'opacity 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                            Zapomniałeś hasła?
                        </Link>
                        <Link
                            href="/strefa-pacjenta/register/verify"
                            style={{
                                color: '#dcb14a',
                                textDecoration: 'none',
                                transition: 'opacity 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                            Zarejestruj się
                        </Link>
                    </div>
                </form>

                {/* Back to Home */}
                <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <Link
                        href="/"
                        style={{
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontSize: '0.9rem',
                            textDecoration: 'none',
                            transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#dcb14a'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
                    >
                        ← Powrót do strony głównej
                    </Link>
                </div>
            </div>

            {/* Workflow Modal - Shows once on first visit */}
            {showWorkflowModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '2rem',
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.98), rgba(10, 10, 10, 0.98))',
                        border: '2px solid rgba(220, 177, 74, 0.3)',
                        borderRadius: '1.5rem',
                        maxWidth: '650px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '3rem 2.5rem',
                        boxShadow: '0 25px 100px rgba(220, 177, 74, 0.2)',
                    }}>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                            <div style={{
                                fontSize: '3.5rem',
                                marginBottom: '1rem',
                            }}>
                                🚀
                            </div>
                            <h2 style={{
                                fontSize: '2rem',
                                background: 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                marginBottom: '0.5rem',
                            }}>
                                Witaj w Strefie Pacjenta!
                            </h2>
                            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1rem' }}>
                                Poznaj proces rejestracji i korzystania z systemu
                            </p>
                        </div>

                        {/* Steps */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Step 1 */}
                            <div style={{
                                background: 'rgba(220, 177, 74, 0.08)',
                                border: '1px solid rgba(220, 177, 74, 0.2)',
                                borderRadius: '1rem',
                                padding: '1.5rem',
                            }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{
                                        background: 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                                        borderRadius: '50%',
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        color: '#000',
                                        flexShrink: 0,
                                    }}>
                                        1
                                    </div>
                                    <div>
                                        <h3 style={{ color: '#dcb14a', marginBottom: '0.5rem', fontSize: '1.15rem' }}>
                                            Rejestracja konta
                                        </h3>
                                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                            Kliknij "Zarejestruj się" i podaj dane użyte podczas pierwszej wizyty (telefon, imię, PESEL).
                                            System zweryfikuje je w bazie Mikrostomart.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div style={{
                                background: 'rgba(34, 197, 94, 0.08)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                borderRadius: '1rem',
                                padding: '1.5rem',
                            }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{
                                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                        borderRadius: '50%',
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        color: '#fff',
                                        flexShrink: 0,
                                    }}>
                                        2
                                    </div>
                                    <div>
                                        <h3 style={{ color: '#22c55e', marginBottom: '0.5rem', fontSize: '1.15rem' }}>
                                            Weryfikacja email
                                        </h3>
                                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                            Otrzymasz link weryfikacyjny na podany email (ważny 24h).
                                            Kliknij w link, aby potwierdzić adres email.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div style={{
                                background: 'rgba(59, 130, 246, 0.08)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                borderRadius: '1rem',
                                padding: '1.5rem',
                            }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{
                                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                        borderRadius: '50%',
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        color: '#fff',
                                        flexShrink: 0,
                                    }}>
                                        3
                                    </div>
                                    <div>
                                        <h3 style={{ color: '#3b82f6', marginBottom: '0.5rem', fontSize: '1.15rem' }}>
                                            Zatwierdzenie przez administratora
                                        </h3>
                                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                            Twoje konto zostanie sprawdzone przez nasz zespół (zwykle do 48h).
                                            Otrzymasz email z informacją o zatwierdzeniu.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div style={{
                                background: 'rgba(168, 85, 247, 0.08)',
                                border: '1px solid rgba(168, 85, 247, 0.2)',
                                borderRadius: '1rem',
                                padding: '1.5rem',
                            }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{
                                        background: 'linear-gradient(135deg, #a855f7, #9333ea)',
                                        borderRadius: '50%',
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        color: '#fff',
                                        flexShrink: 0,
                                    }}>
                                        4
                                    </div>
                                    <div>
                                        <h3 style={{ color: '#a855f7', marginBottom: '0.5rem', fontSize: '1.15rem' }}>
                                            Pełny dostęp do portalu
                                        </h3>
                                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                            Po zatwierdzeniu uzyskasz dostęp do historii wizyt, dokumentacji medycznej,
                                            możliwości umawiania wizyt i zarządzania swoim kontem.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Info */}
                        <div style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            borderRadius: '0.75rem',
                            padding: '1.25rem',
                            marginTop: '2rem',
                            textAlign: 'center',
                        }}>
                            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', margin: 0 }}>
                                💡 <strong>Wskazówka:</strong> Możesz się zalogować zaraz po weryfikacji email,
                                ale pełny dostęp do danych otrzymasz dopiero po akceptacji przez administratora.
                            </p>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => setShowWorkflowModal(false)}
                            style={{
                                marginTop: '2rem',
                                width: '100%',
                                padding: '1rem',
                                background: 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                                border: 'none',
                                borderRadius: '0.75rem',
                                color: '#000',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 10px 30px rgba(220, 177, 74, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            Rozumiem, rozpocznij! 🚀
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
