'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MockAuth, type MockPatient } from '@/lib/mock-patient-data';

export default function PatientProfile() {
    const [patient, setPatient] = useState<MockPatient | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        phone: '',
        street: '',
        houseNumber: '',
        apartmentNumber: '',
        city: '',
        zipCode: '',
    });
    const [message, setMessage] = useState('');
    const router = useRouter();

    useEffect(() => {
        const currentPatient = MockAuth.getCurrentPatient();

        if (!currentPatient) {
            router.push('/strefa-pacjenta/login');
            return;
        }

        setPatient(currentPatient);
        setFormData({
            email: currentPatient.email || '',
            phone: currentPatient.phone || '',
            street: currentPatient.street || '',
            houseNumber: currentPatient.houseNumber || '',
            apartmentNumber: currentPatient.apartmentNumber || '',
            city: currentPatient.city || '',
            zipCode: currentPatient.zipCode || '',
        });
    }, [router]);

    const handleLogout = () => {
        MockAuth.logout();
        router.push('/strefa-pacjenta/login');
    };

    const handleSave = async () => {
        setMessage('✓ Dane zostały zaktualizowane');
        setIsEditing(false);

        // Mock update
        if (patient) {
            const updated = { ...patient, ...formData };
            localStorage.setItem('mock_patient', JSON.stringify(updated));
            setPatient(updated);
        }

        setTimeout(() => setMessage(''), 3000);
    };

    if (!patient) {
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
                        Witaj, {patient.firstName}! 👋
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
                {/* Success Message */}
                {message && (
                    <div style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '0.75rem',
                        padding: '1rem',
                        marginBottom: '2rem',
                        color: '#22c55e',
                        textAlign: 'center',
                    }}>
                        {message}
                    </div>
                )}

                {/* Profile Card */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '1rem',
                    padding: '2rem',
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '2rem',
                    }}>
                        <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            Mój Profil
                        </h2>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: isEditing ? 'rgba(239, 68, 68, 0.1)' : 'rgba(220, 177, 74, 0.1)',
                                border: isEditing ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(220, 177, 74, 0.3)',
                                borderRadius: '0.5rem',
                                color: isEditing ? '#ef4444' : '#dcb14a',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                            }}
                        >
                            {isEditing ? '✕ Anuluj' : '✏️ Edytuj'}
                        </button>
                    </div>

                    {/* Read-only Data */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '0.75rem',
                        padding: '1.5rem',
                        marginBottom: '2rem',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}>
                        <h3 style={{ color: '#dcb14a', marginBottom: '1rem', fontSize: '1rem' }}>
                            Dane podstawowe (tylko do odczytu)
                        </h3>
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            {[
                                { label: 'Imię', value: patient.firstName },
                                { label: 'Nazwisko', value: patient.lastName },
                                { label: 'PESEL', value: patient.pesel },
                                { label: 'ID Prodentis', value: patient.prodentisId },
                            ].map(field => (
                                <div key={field.label}>
                                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                        {field.label}
                                    </div>
                                    <div style={{ color: '#fff', fontWeight: 'bold' }}>
                                        {field.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Editable Data */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <h3 style={{ color: '#dcb14a', fontSize: '1rem' }}>
                            Dane kontaktowe
                        </h3>

                        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '0.9rem',
                                }}>
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    disabled={!isEditing}
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        background: isEditing ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '0.5rem',
                                        color: '#fff',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        cursor: isEditing ? 'text' : 'not-allowed',
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '0.9rem',
                                }}>
                                    Telefon
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    disabled={!isEditing}
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        background: isEditing ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '0.5rem',
                                        color: '#fff',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        cursor: isEditing ? 'text' : 'not-allowed',
                                    }}
                                />
                            </div>
                        </div>

                        <h3 style={{ color: '#dcb14a', fontSize: '1rem', marginTop: '0.5rem' }}>
                            Adres
                        </h3>

                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '2fr 1fr 1fr' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.9rem' }}>
                                    Ulica
                                </label>
                                <input
                                    type="text"
                                    value={formData.street}
                                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                    disabled={!isEditing}
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        background: isEditing ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '0.5rem',
                                        color: '#fff',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        cursor: isEditing ? 'text' : 'not-allowed',
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.9rem' }}>
                                    Nr domu
                                </label>
                                <input
                                    type="text"
                                    value={formData.houseNumber}
                                    onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
                                    disabled={!isEditing}
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        background: isEditing ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '0.5rem',
                                        color: '#fff',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        cursor: isEditing ? 'text' : 'not-allowed',
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.9rem' }}>
                                    Nr lok.
                                </label>
                                <input
                                    type="text"
                                    value={formData.apartmentNumber}
                                    onChange={(e) => setFormData({ ...formData, apartmentNumber: e.target.value })}
                                    disabled={!isEditing}
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        background: isEditing ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '0.5rem',
                                        color: '#fff',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        cursor: isEditing ? 'text' : 'not-allowed',
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '2fr 1fr' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.9rem' }}>
                                    Miasto
                                </label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    disabled={!isEditing}
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        background: isEditing ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '0.5rem',
                                        color: '#fff',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        cursor: isEditing ? 'text' : 'not-allowed',
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.9rem' }}>
                                    Kod pocztowy
                                </label>
                                <input
                                    type="text"
                                    value={formData.zipCode}
                                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                                    disabled={!isEditing}
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        background: isEditing ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '0.5rem',
                                        color: '#fff',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        cursor: isEditing ? 'text' : 'not-allowed',
                                    }}
                                />
                            </div>
                        </div>

                        {isEditing && (
                            <button
                                onClick={handleSave}
                                style={{
                                    padding: '1rem',
                                    background: 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    color: '#000',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    marginTop: '1rem',
                                }}
                            >
                                💾 Zapisz zmiany
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
