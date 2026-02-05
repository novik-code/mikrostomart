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
    const [showEmailMismatchModal, setShowEmailMismatchModal] = useState(false);
    const [emailConfirmed, setEmailConfirmed] = useState(false);
    const [prodentisEmail, setProdentisEmail] = useState<string | null>(null);
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

        // Store Prodentis email for comparison
        setProdentisEmail(patient.email || null);

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

        // Check for email mismatch with Prodentis
        const normalizedUserEmail = email.trim().toLowerCase();
        const normalizedProdentisEmail = prodentisEmail?.trim().toLowerCase();

        if (normalizedProdentisEmail && normalizedUserEmail !== normalizedProdentisEmail) {
            // Email mismatch detected
            if (!emailConfirmed) {
                setShowEmailMismatchModal(true);
                return;
            }
        }

        // Proceed with registration
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
            background: 'transparent',
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
                                placeholder="Kwiatowa"
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
                                placeholder="10"
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
                                placeholder="5"
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
                                placeholder="Warszawa"
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
                                placeholder="00-001"
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

            {/* Email Mismatch Warning Modal */}
            {showEmailMismatchModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem',
                }}>
                    <div style={{
                        background: 'rgba(26, 26, 26, 0.98)',
                        border: '2px solid rgba(220, 177, 74, 0.3)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        maxWidth: '500px',
                        width: '100%',
                        boxShadow: '0 20px 60px rgba(220, 177, 74, 0.2)',
                    }}>
                        <div style={{
                            fontSize: '3rem',
                            textAlign: 'center',
                            marginBottom: '1rem',
                        }}>
                            ⚠️
                        </div>
                        <h3 style={{
                            color: '#dcb14a',
                            fontSize: '1.5rem',
                            marginBottom: '1rem',
                            textAlign: 'center',
                        }}>
                            Niezgodność adresu email
                        </h3>
                        <p style={{
                            color: 'rgba(255, 255, 255, 0.9)',
                            marginBottom: '1.5rem',
                            lineHeight: '1.6',
                        }}>
                            Email w naszej bazie danych to:<br />
                            <strong style={{ color: '#dcb14a' }}>{prodentisEmail}</strong>
                        </p>
                        <p style={{
                            color: 'rgba(255, 255, 255, 0.9)',
                            marginBottom: '1.5rem',
                            lineHeight: '1.6',
                        }}>
                            Ty podałeś:<br />
                            <strong style={{ color: '#dcb14a' }}>{email}</strong>
                        </p>
                        <p style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            marginBottom: '1.5rem',
                            fontSize: '0.9rem',
                        }}>
                            Czy jesteś pewien, że chcesz użyć tego adresu email?
                        </p>

                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '1rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '0.5rem',
                            marginBottom: '1.5rem',
                            cursor: 'pointer',
                        }}>
                            <input
                                type="checkbox"
                                checked={emailConfirmed}
                                onChange={(e) => setEmailConfirmed(e.target.checked)}
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    cursor: 'pointer',
                                }}
                            />
                            <span style={{
                                color: '#fff',
                                fontSize: '0.95rem',
                            }}>
                                Potwierdzam prawidłowość podanego adresu email
                            </span>
                        </label>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => {
                                    setShowEmailMismatchModal(false);
                                    setEmailConfirmed(false);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '0.875rem',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '0.5rem',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                }}
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={() => {
                                    if (emailConfirmed) {
                                        setShowEmailMismatchModal(false);
                                        handleContinue();
                                    }
                                }}
                                disabled={!emailConfirmed}
                                style={{
                                    flex: 1,
                                    padding: '0.875rem',
                                    background: emailConfirmed
                                        ? 'linear-gradient(135deg, #dcb14a, #f0c96c)'
                                        : 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    color: emailConfirmed ? '#000' : 'rgba(255, 255, 255, 0.3)',
                                    fontWeight: 'bold',
                                    cursor: emailConfirmed ? 'pointer' : 'not-allowed',
                                    opacity: emailConfirmed ? 1 : 0.5,
                                }}
                            >
                                Kontynuuj
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
