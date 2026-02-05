'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PatientData {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    address?: any;
}

export default function SetPassword() {
    const [patientData, setPatientData] = useState<PatientData | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const router = useRouter();

    useEffect(() => {
        const data = sessionStorage.getItem('registration_data');
        if (!data) {
            router.push('/strefa-pacjenta/register/verify');
            return;
        }
        setPatientData(JSON.parse(data));
    }, [router]);

    useEffect(() => {
        // Calculate password strength
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        setPasswordStrength(strength);
    }, [password]);

    const handleSubmit = async () => {
        setError('');

        if (password !== confirmPassword) {
            setError('Hasła nie są identyczne');
            return;
        }

        if (passwordStrength < 3) {
            setError('Hasło jest zbyt słabe. Użyj min. 8 znaków, wielkich i małych liter oraz cyfr.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/patients/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prodentisId: patientData!.id,
                    phone: patientData!.phone,
                    password,
                    email: patientData!.email,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                sessionStorage.removeItem('registration_data');
                router.push('/strefa-pacjenta/login?registered=true');
            } else {
                setError(data.error || 'Wystąpił błąd podczas rejestracji');
            }
        } catch (err) {
            console.error('Registration error:', err);
            setError('Nie udało się połączyć z serwerem. Spróbuj ponownie.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!patientData) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#fff' }}>Ładowanie...</p>
        </div>;
    }

    const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
    const strengthLabels = ['Bardzo słabe', 'Słabe', 'Średnie', 'Dobre', 'Bardzo dobre'];

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
                maxWidth: '580px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '1.5rem',
                padding: '3rem 2.5rem',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}>
                {/* Progress */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2.5rem' }}>
                    {[1, 2, 3].map(step => (
                        <div key={step} style={{
                            width: '60px',
                            height: '4px',
                            background: 'linear-gradient(90deg, #dcb14a, #f0c96c)',
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
                        🔒
                    </div>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        background: 'linear-gradient(135deg, #fff, #dcb14a)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        Ustaw Hasło
                    </h1>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.95rem' }}>
                        Krok 3 z 3: Ostatni krok! Zabezpiecz swoje konto
                    </p>
                </div>

                {/* Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                            }}
                        />

                        {/* Strength Indicator */}
                        {password && (
                            <div style={{ marginTop: '0.75rem' }}>
                                <div style={{
                                    display: 'flex',
                                    gap: '0.25rem',
                                    marginBottom: '0.5rem',
                                }}>
                                    {[1, 2, 3, 4, 5].map(level => (
                                        <div key={level} style={{
                                            flex: 1,
                                            height: '4px',
                                            background: level <= passwordStrength ? strengthColors[passwordStrength - 1] : 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: '2px',
                                            transition: 'all 0.3s',
                                        }} />
                                    ))}
                                </div>
                                <p style={{
                                    fontSize: '0.8rem',
                                    color: passwordStrength > 0 ? strengthColors[passwordStrength - 1] : 'rgba(255, 255, 255, 0.5)',
                                }}>
                                    Siła hasła: {passwordStrength > 0 ? strengthLabels[passwordStrength - 1] : 'Brak'}
                                </p>
                            </div>
                        )}
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
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                            }}
                        />
                    </div>

                    {/* Password Requirements */}
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '0.75rem',
                        padding: '1rem',
                        fontSize: '0.85rem',
                        color: '#60a5fa',
                    }}>
                        <strong>📋 Wymagania:</strong>
                        <ul style={{ margin: '0.5rem 0 0 1.25rem', paddingLeft: 0 }}>
                            <li style={{ opacity: password.length >= 8 ? 1 : 0.5 }}>Minimum 8 znaków</li>
                            <li style={{ opacity: /[A-Z]/.test(password) ? 1 : 0.5 }}>Wielka litera</li>
                            <li style={{ opacity: /[a-z]/.test(password) ? 1 : 0.5 }}>Mała litera</li>
                            <li style={{ opacity: /[0-9]/.test(password) ? 1 : 0.5 }}>Cyfra</li>
                            <li style={{ opacity: /[^A-Za-z0-9]/.test(password) ? 1 : 0.5 }}>Znak specjalny (!@#$%)</li>
                        </ul>
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

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button
                            onClick={() => router.back()}
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '0.5rem',
                                color: '#fff',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.5 : 1,
                            }}
                        >
                            ← Wstecz
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !password || !confirmPassword}
                            style={{
                                flex: 2,
                                padding: '1rem',
                                background: (isLoading || !password || !confirmPassword)
                                    ? 'rgba(220, 177, 74, 0.5)'
                                    : 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: '#000',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: (isLoading || !password || !confirmPassword) ? 'not-allowed' : 'pointer',
                                opacity: (isLoading || !password || !confirmPassword) ? 0.7 : 1,
                            }}
                            onMouseEnter={(e) => {
                                if (!isLoading && password && confirmPassword) {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(220, 177, 74, 0.4)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            {isLoading ? 'Tworzenie konta...' : 'Zakończ rejestrację ✓'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
