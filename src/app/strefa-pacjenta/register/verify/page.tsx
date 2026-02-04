'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VerifyPatient() {
    const [phone, setPhone] = useState('');
    const [firstName, setFirstName] = useState('');
    const [pesel, setPesel] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/patients/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone, firstName, pesel }),
            });

            const data = await response.json();

            if (data.success && data.patient) {
                // Store patient data for next steps
                sessionStorage.setItem('registration_data', JSON.stringify(data.patient));
                router.push('/strefa-pacjenta/register/confirm');
            } else {
                setError(data.message || 'Nie znaleziono pacjenta w systemie. Upewnij się, że dane są poprawne lub skontaktuj się z rejestracją.');
            }
        } catch (err) {
            console.error('Verification error:', err);
            setError('Nie udało się połączyć z serwerem. Spróbuj ponownie.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'radial-gradient(circle at 20% 50%, rgba(220, 177, 74, 0.15), transparent 50%), radial-gradient(circle at 80% 80%, rgba(220, 177, 74, 0.1), transparent 40%), linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '580px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '1.5rem',
                padding: '3rem 2.5rem',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}>
                {/* Progress Steps */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2.5rem' }}>
                    {[1, 2, 3].map(step => (
                        <div key={step} style={{
                            width: '60px',
                            height: '4px',
                            background: step === 1 ? 'linear-gradient(90deg, #dcb14a, #f0c96c)' : 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '2px',
                        }} />
                    ))}
                </div>

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
                        🔐
                    </div>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        background: 'linear-gradient(135deg, #fff, #dcb14a)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        Weryfikacja Danych
                    </h1>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.95rem' }}>
                        Krok 1 z 3: Potwierdź, że jesteś pacjentem naszego gabinetu
                    </p>
                </div>

                {/* Info Box */}
                <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    marginBottom: '2rem',
                    fontSize: '0.9rem',
                    color: '#60a5fa',
                }}>
                    <strong>ℹ️ Informacja</strong><br />
                    Podaj dane, które użyłeś podczas pierwszej wizyty w naszym gabinecie.
                    System sprawdzi je w bazie Prodentis.
                </div>

                {/* Demo Hint */}
                <div style={{
                    background: 'rgba(220, 177, 74, 0.1)',
                    border: '1px solid rgba(220, 177, 74, 0.3)',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    marginBottom: '2rem',
                    fontSize: '0.85rem',
                    color: '#dcb14a',
                }}>
                    <strong>🧪 Demo</strong><br />
                    Tel: <code>792060718</code> | Imię: <code>Ewa</code> | PESEL: <code>61061804181</code>
                </div>

                {/* Form */}
                <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                            placeholder="792 060 718"
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

                    {/* First Name */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                        }}>
                            Imię
                        </label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Ewa"
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

                    {/* PESEL */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                        }}>
                            PESEL
                        </label>
                        <input
                            type="text"
                            value={pesel}
                            onChange={(e) => setPesel(e.target.value.replace(/\D/g, '').slice(0, 11))}
                            placeholder="61061804181"
                            required
                            maxLength={11}
                            pattern="\d{11}"
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
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.5rem' }}>
                            11 cyfr bez myślników
                        </p>
                    </div>

                    {/* Error */}
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

                    {/* Submit */}
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
                        {isLoading ? 'Weryfikacja...' : 'Dalej →'}
                    </button>

                    {/* Back to Login */}
                    <div style={{ textAlign: 'center' }}>
                        <Link
                            href="/strefa-pacjenta/login"
                            style={{
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontSize: '0.9rem',
                                textDecoration: 'none',
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#dcb14a'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
                        >
                            ← Powrót do logowania
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
