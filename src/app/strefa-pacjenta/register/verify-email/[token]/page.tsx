'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifyEmailPage() {
    const router = useRouter();
    const params = useParams();
    const token = params?.token as string;

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Brak tokenu weryfikacyjnego');
            return;
        }

        // Call verification API
        fetch('/api/patients/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setStatus('success');
                    setMessage(data.message);
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Wystąpił błąd podczas weryfikacji');
                }
            })
            .catch(err => {
                console.error('[Verify Email] Error:', err);
                setStatus('error');
                setMessage('Wystąpił błąd podczas weryfikacji');
            });
    }, [token]);

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
                maxWidth: '550px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '1.5rem',
                padding: '3rem 2.5rem',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                textAlign: 'center',
            }}>
                {status === 'loading' && (
                    <>
                        <div style={{
                            fontSize: '4rem',
                            marginBottom: '1.5rem',
                        }}>
                            ⏳
                        </div>
                        <h1 style={{
                            color: '#dcb14a',
                            fontSize: '1.8rem',
                            marginBottom: '1rem',
                        }}>
                            Weryfikacja...
                        </h1>
                        <p style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '1.1rem',
                        }}>
                            Proszę czekać, weryfikujemy Twój adres email
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{
                            fontSize: '4rem',
                            marginBottom: '1.5rem',
                        }}>
                            ✅
                        </div>
                        <h1 style={{
                            color: '#dcb14a',
                            fontSize: '1.8rem',
                            marginBottom: '1rem',
                        }}>
                            Email zweryfikowany!
                        </h1>
                        <p style={{
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: '1.1rem',
                            lineHeight: '1.6',
                            marginBottom: '2rem',
                        }}>
                            {message}
                        </p>

                        <div style={{
                            background: 'rgba(220, 177, 74, 0.1)',
                            border: '2px solid rgba(220, 177, 74, 0.3)',
                            borderRadius: '1rem',
                            padding: '1.5rem',
                            marginBottom: '2rem',
                        }}>
                            <p style={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '0.95rem',
                                lineHeight: '1.6',
                                margin: 0,
                            }}>
                                <strong>⏳ Co dalej?</strong><br />
                                Twoje konto oczekuje na zatwierdzenie przez administratora.<br />
                                Weryfikacja potrwa do <strong>48 godzin</strong>.<br />
                                Otrzymasz powiadomienie emailem po zatwierdzeniu.
                            </p>
                        </div>

                        <Link
                            href="/strefa-pacjenta/login"
                            style={{
                                display: 'inline-block',
                                padding: '1rem 2rem',
                                background: 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: '#000',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                            }}
                        >
                            Przejdź do logowania
                        </Link>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{
                            fontSize: '4rem',
                            marginBottom: '1.5rem',
                        }}>
                            ❌
                        </div>
                        <h1 style={{
                            color: '#ff6b6b',
                            fontSize: '1.8rem',
                            marginBottom: '1rem',
                        }}>
                            Wystąpił błąd
                        </h1>
                        <p style={{
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: '1.1rem',
                            lineHeight: '1.6',
                            marginBottom: '2rem',
                        }}>
                            {message}
                        </p>

                        <div style={{
                            display: 'flex',
                            gap: '1rem',
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                        }}>
                            <Link
                                href="/strefa-pacjenta/register/verify"
                                style={{
                                    padding: '0.875rem 1.5rem',
                                    background: 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    color: '#000',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    textDecoration: 'none',
                                }}
                            >
                                Zarejestruj się ponownie
                            </Link>
                            <Link
                                href="/kontakt"
                                style={{
                                    padding: '0.875rem 1.5rem',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '0.5rem',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    textDecoration: 'none',
                                }}
                            >
                                Skontaktuj się z nami
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
