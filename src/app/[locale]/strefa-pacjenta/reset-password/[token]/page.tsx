'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordConfirm() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();
    const params = useParams();
    const token = params.token as string;

    useEffect(() => {
        // Validate token on page load
        const validateToken = async () => {
            if (!token) {
                setTokenValid(false);
                setIsValidating(false);
                return;
            }

            try {
                // We don't have a validate endpoint, so we'll just check if token exists
                // The actual validation will happen when submitting
                setTokenValid(true);
            } catch (err) {
                setTokenValid(false);
            } finally {
                setIsValidating(false);
            }
        };

        validateToken();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Hasła nie są identyczne' });
            return;
        }

        // Validate password length
        if (newPassword.length < 8) {
            setMessage({ type: 'error', text: 'Hasło musi mieć minimum 8 znaków' });
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/patients/reset-password/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await response.json();

            if (data.success) {
                setMessage({ type: 'success', text: data.message });
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/strefa-pacjenta/login');
                }, 3000);
            } else {
                setMessage({ type: 'error', text: data.error || 'Wystąpił błąd' });
            }
        } catch (err) {
            console.error('Password reset error:', err);
            setMessage({ type: 'error', text: 'Nie udało się połączyć z serwerem' });
        } finally {
            setIsLoading(false);
        }
    };

    if (isValidating) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
            }}>
                Sprawdzanie linku...
            </div>
        );
    }

    if (!tokenValid && !token) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
            }}>
                <div style={{
                    maxWidth: '480px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '1rem',
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#ef4444',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                    <h2 style={{ marginBottom: '1rem', color: '#fff' }}>Nieprawidłowy Link</h2>
                    <p style={{ marginBottom: '1.5rem' }}>
                        Link resetujący jest nieprawidłowy lub wygasł.
                    </p>
                    <Link
                        href="/strefa-pacjenta/reset-password"
                        style={{
                            display: 'inline-block',
                            padding: '0.75rem 1.5rem',
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                            color: '#000',
                            textDecoration: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: 'bold',
                        }}
                    >
                        Poproś o nowy link
                    </Link>
                </div>
            </div>
        );
    }

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
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        fontSize: '2.5rem',
                    }}>
                        🔒
                    </div>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        background: 'linear-gradient(135deg, #fff, var(--color-primary))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        Nowe Hasło
                    </h1>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.95rem' }}>
                        Ustaw nowe bezpieczne hasło do swojego konta
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
                                Przekierowanie do logowania za 3 sekundy...
                            </p>
                        )}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* New Password */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                        }}>
                            Nowe hasło
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Minimum 8 znaków"
                                required
                                disabled={isLoading || message?.type === 'success'}
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    paddingRight: '3rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '0.5rem',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'var(--color-primary)';
                                    e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-primary)',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                }}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                        }}>
                            Potwierdź hasło
                        </label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Powtórz hasło"
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
                                e.target.style.borderColor = 'var(--color-primary)';
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
                        background: 'rgba(var(--color-primary-rgb), 0.1)',
                        border: '1px solid rgba(var(--color-primary-rgb), 0.3)',
                        borderRadius: '0.5rem',
                        padding: '0.875rem',
                        fontSize: '0.85rem',
                        color: 'var(--color-primary)',
                    }}>
                        💡 Hasło musi mieć minimum 8 znaków
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading || message?.type === 'success'}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: (isLoading || message?.type === 'success') ? 'rgba(var(--color-primary-rgb), 0.5)' : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
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
                                e.currentTarget.style.boxShadow = '0 10px 25px rgba(var(--color-primary-rgb), 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {isLoading ? 'Zapisywanie...' : 'Ustaw nowe hasło'}
                    </button>
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
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
                    >
                        ← Powrót do strony głównej
                    </Link>
                </div>
            </div>
        </div>
    );
}
