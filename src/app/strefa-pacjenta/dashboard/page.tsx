'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MockAuth, getPatientVisits, getPatientStats, type MockPatient, type MockVisit } from '@/lib/mock-patient-data';

export default function PatientDashboard() {
    const [patient, setPatient] = useState<MockPatient | null>(null);
    const [visits, setVisits] = useState<MockVisit[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const currentPatient = MockAuth.getCurrentPatient();

        if (!currentPatient) {
            router.push('/strefa-pacjenta/login');
            return;
        }

        setPatient(currentPatient);
        const patientVisits = getPatientVisits(currentPatient.id);
        setVisits(patientVisits.slice(0, 5)); // Latest 5
        setStats(getPatientStats(currentPatient.id));
        setIsLoading(false);
    }, [router]);

    const handleLogout = () => {
        MockAuth.logout();
        router.push('/strefa-pacjenta/login');
    };

    const handleSyncHistory = async () => {
        alert('🔄 Synchronizacja historii wizyt z systemu Prodentis...\n\n(W wersji produkcyjnej pobierze rzeczywistą historię z API)');
    };

    if (isLoading || !patient) {
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
                    { href: '/strefa-pacjenta/dashboard', label: 'Panel główny', active: true },
                    { href: '/strefa-pacjenta/historia', label: 'Historia wizyt', active: false },
                    { href: '/strefa-pacjenta/profil', label: 'Mój profil', active: false },
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
                            transition: 'all 0.2s',
                        }}
                    >
                        {link.label}
                    </Link>
                ))}
            </div>

            {/* Main Content */}
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '2rem',
            }}>
                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2rem',
                }}>
                    {[
                        { icon: '📋', label: 'Wizyty w systemie', value: stats?.totalVisits || 0, color: '#dcb14a' },
                        { icon: '💰', label: 'Całkowity koszt', value: `${stats?.totalCost || 0} PLN`, color: '#60a5fa' },
                        { icon: '✅', label: 'Zapłacono', value: `${stats?.totalPaid || 0} PLN`, color: '#22c55e' },
                        { icon: '📊', label: 'Saldo', value: `${stats?.balance || 0} PLN`, color: stats?.balance > 0 ? '#f97316' : '#22c55e' },
                    ].map((card, idx) => (
                        <div key={idx} style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '1rem',
                            padding: '1.5rem',
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{card.icon}</div>
                            <div style={{
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontSize: '0.85rem',
                                marginBottom: '0.5rem',
                            }}>
                                {card.label}
                            </div>
                            <div style={{
                                color: card.color,
                                fontSize: '1.75rem',
                                fontWeight: 'bold',
                            }}>
                                {card.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div style={{
                    background: 'rgba(220, 177, 74, 0.1)',
                    border: '1px solid rgba(220, 177, 74, 0.3)',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h3 style={{ color: '#dcb14a', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                                💡 Aktualizuj swoją historię
                            </h3>
                            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                                Pobierz najnowsze informacje o wizytach z systemu Prodentis
                            </p>
                        </div>
                        <button
                            onClick={handleSyncHistory}
                            style={{
                                padding: '0.875rem 1.75rem',
                                background: 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: '#000',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            🔄 Synchronizuj
                        </button>
                    </div>
                </div>

                {/* Recent Visits */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '1rem',
                    padding: '2rem',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            Ostatnie wizyty
                        </h2>
                        <Link
                            href="/strefa-pacjenta/historia"
                            style={{
                                color: '#dcb14a',
                                textDecoration: 'none',
                                fontSize: '0.9rem',
                            }}
                        >
                            Zobacz wszystkie →
                        </Link>
                    </div>

                    {visits.length === 0 ? (
                        <p style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', padding: '2rem' }}>
                            Brak wizyt w historii
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {visits.map(visit => (
                                <div key={visit.id} style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '0.75rem',
                                    padding: '1.25rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: '1rem',
                                    flexWrap: 'wrap',
                                }}>
                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                        <div style={{
                                            color: '#dcb14a',
                                            fontSize: '0.85rem',
                                            marginBottom: '0.5rem',
                                        }}>
                                            {new Date(visit.date).toLocaleDateString('pl-PL', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })} • {visit.time}
                                        </div>
                                        <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                            {visit.doctorName}
                                        </div>
                                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                                            {visit.description}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            color: '#fff',
                                            fontSize: '1.25rem',
                                            fontWeight: 'bold',
                                            marginBottom: '0.25rem',
                                        }}>
                                            {visit.cost} PLN
                                        </div>
                                        <div style={{
                                            display: 'inline-block',
                                            padding: '0.25rem 0.75rem',
                                            background: visit.balance === 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                                            border: `1px solid ${visit.balance === 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(249, 115, 22, 0.3)'}`,
                                            borderRadius: '99px',
                                            color: visit.balance === 0 ? '#22c55e' : '#f97316',
                                            fontSize: '0.8rem',
                                        }}>
                                            {visit.balance === 0 ? '✓ Opłacono' : `Do zapłaty: ${visit.balance} PLN`}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
