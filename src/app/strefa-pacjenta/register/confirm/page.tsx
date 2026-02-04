'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { MockPatient } from '@/lib/mock-patient-data';

export default function ConfirmData() {
    const [patientData, setPatientData] = useState<MockPatient | null>(null);
    const [email, setEmail] = useState('');
    const [street, setStreet] = useState('');
    const [houseNumber, setHouseNumber] = useState('');
    const [apartmentNumber, setApartmentNumber] = useState('');
    const [city, setCity] = useState('');
    const [zipCode, setZipCode] = useState('');
    const router = useRouter();

    useEffect(() => {
        const data = sessionStorage.getItem('registration_data');
        if (!data) {
            router.push('/strefa-pacjenta/register/verify');
            return;
        }

        const patient = JSON.parse(data) as any;
        setPatientData(patient);
        setEmail(patient.email || '');

        // Handle address object from Prodentis API
        const addr = patient.address || {};
        setStreet(addr.street || '');
        setHouseNumber(addr.houseNumber || '');
        setApartmentNumber(addr.apartmentNumber || '');
        setCity(addr.city || '');
        setZipCode(addr.postalCode || '');
    }, [router]);

    const handleContinue = () => {
        if (!patientData) return;

        // Validate email before continuing
        if (!email || email.trim() === '') {
            alert('Adres email jest wymagany do utworzenia konta.');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Proszę podać prawidłowy adres email (np. twoj@email.pl)');
            return;
        }

        const updatedData = {
            ...patientData,
            email,
            street,
            houseNumber,
            apartmentNumber,
            city,
            zipCode
        };

        sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
        router.push('/strefa-pacjenta/register/password');
    };

    if (!patientData) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#fff' }}>Ładowanie...</p>
        </div>;
    }

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
                maxWidth: '680px',
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
                            background: step <= 2 ? 'linear-gradient(90deg, #dcb14a, #f0c96c)' : 'rgba(255, 255, 255, 0.1)',
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
                        ✅
                    </div>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        background: 'linear-gradient(135deg, #fff, #dcb14a)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        Potwierdź Dane
                    </h1>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.95rem' }}>
                        Krok 2 z 3: Sprawdź i uzupełnij informacje
                    </p>
                </div>

                {/* Success Message */}
                <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    marginBottom: '2rem',
                    color: '#22c55e',
                }}>
                    <strong>✓ Weryfikacja pomyślna!</strong><br />
                    Znaleźliśmy Cię w naszej bazie. Sprawdź czy dane są aktualne.
                </div>

                {/* Non-editable Data */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                    <h3 style={{ color: '#dcb14a', marginBottom: '1rem', fontSize: '1.1rem' }}>
                        Dane podstawowe (z systemu)
                    </h3>
                    <div style={{ display: 'grid', gap: '0.75rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Imię i nazwisko:</span>
                            <strong>{patientData.firstName} {patientData.lastName}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>PESEL:</span>
                            <strong>{patientData.pesel}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Telefon:</span>
                            <strong>{patientData.phone}</strong>
                        </div>
                    </div>
                </div>

                {/* Editable Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ color: '#dcb14a', fontSize: '1.1rem' }}>
                        Dane kontaktowe (możesz edytować)
                    </h3>

                    {/* Email */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                        }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="twoj@email.pl"
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

                    {/* Address */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '0.9rem',
                                fontWeight: '500',
                            }}>
                                Ulica
                            </label>
                            <input
                                type="text"
                                value={street}
                                onChange={(e) => setStreet(e.target.value)}
                                placeholder="Dworcowa"
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
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '0.9rem',
                                fontWeight: '500',
                            }}>
                                Nr domu
                            </label>
                            <input
                                type="text"
                                value={houseNumber}
                                onChange={(e) => setHouseNumber(e.target.value)}
                                placeholder="15"
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
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '0.9rem',
                                fontWeight: '500',
                            }}>
                                Nr lok.
                            </label>
                            <input
                                type="text"
                                value={apartmentNumber}
                                onChange={(e) => setApartmentNumber(e.target.value)}
                                placeholder="3"
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
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '0.9rem',
                                fontWeight: '500',
                            }}>
                                Miasto
                            </label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="Mikołów"
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
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '0.9rem',
                                fontWeight: '500',
                            }}>
                                Kod pocztowy
                            </label>
                            <input
                                type="text"
                                value={zipCode}
                                onChange={(e) => setZipCode(e.target.value)}
                                placeholder="43-190"
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
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            onClick={() => router.back()}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '0.5rem',
                                color: '#fff',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            ← Wstecz
                        </button>
                        <button
                            onClick={handleContinue}
                            style={{
                                flex: 2,
                                padding: '1rem',
                                background: 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: '#000',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 10px 25px rgba(220, 177, 74, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            Dalej →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
