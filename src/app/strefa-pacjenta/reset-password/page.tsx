'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordRequest() {
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsLoading(true);

        try {
            const response = await fetch('/api/patients/reset-password/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone: phone.replace(/\s/g, '') }),
            });

            const data = await response.json();

            if (data.success) {
                setMessage({ type: 'success', text: data.message });
                // Redirect to login after 5 seconds
                setTimeout(() => {
                    router.push('/strefa-pacjenta/login');
                }, 5000);
            } else {
                setMessage({ type: 'error', text: data.error || 'Wystąpił błąd' });
            }
        } catch (err) {
            console.error('Reset request error:', err);
            setMessage({ type: 'error', text: 'Nie udało się połączyć z serwerem' });
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
                        🔑
                    </div>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        background: 'linear-gradient(135deg, #fff, #dcb14a)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        Resetowanie Hasła
                    </h1>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.95rem' }}>
                        Podaj numer telefonu, a wyślemy link resetujący na Twój email
                    </p>
                </div>

                {/* Success/Error Message */}
                {message && (
                    <div style={{
                        background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        borderRadius: '0.75rem',
                        padding: '1rem',
                        marginBottom: '2rem',
                        color: message.type === 'success' ? '#22c55e' : '#ef4444',
                    }}>
                        <strong>{message.type === 'success' ? '✓ Sukces!' : '⚠️ Błąd'}</strong><br />
                        {message.text}
                        {message.type === 'success' && (
                            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                                Przekierowanie do logowania za 5 sekund...
                            </p>
                        )}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                            placeholder="790 740 770"
                            required
                            disabled={isLoading || message?.type === 'success'}
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

                    {/* Info */}
                    <div style={{
                        background: 'rgba(220, 177, 74, 0.1)',
                        border: '1px solid rgba(220, 177, 74, 0.3)',
                        borderRadius: '0.5rem',
                        padding: '0.875rem',
                        fontSize: '0.85rem',
                        color: '#dcb14a',
                    }}>
                        💡 Link resetujący będzie ważny przez 1 godzinę
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading || message?.type === 'success'}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: (isLoading || message?.type === 'success') ? 'rgba(220, 177, 74, 0.5)' : 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                            border: 'none',
                            borderRadius: '0.5rem',
                            color: '#000',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: (isLoading || message?.type === 'success') ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: (isLoading || message?.type === 'success') ? 0.7 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading && message?.type !== 'success') {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 10px 25px rgba(220, 177, 74, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {isLoading ? 'Wysyłanie...' : 'Wyślij link resetujący'}
                    </button>

                    {/* Links */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '1rem',
                        fontSize: '0.9rem',
                    }}>
                        <Link
                            href="/strefa-pacjenta/login"
                            style={{
                                color: '#dcb14a',
                                textDecoration: 'none',
                                transition: 'opacity 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                            ← Powrót do logowania
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
        </div>
    );
}
