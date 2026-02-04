'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MockAuth, getPatientVisits, type MockPatient, type MockVisit } from '@/lib/mock-patient-data';

export default function VisitHistory() {
    const [patient, setPatient] = useState<MockPatient | null>(null);
    const [visits, setVisits] = useState<MockVisit[]>([]);
    const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
    const router = useRouter();

    useEffect(() => {
        const currentPatient = MockAuth.getCurrentPatient();

        if (!currentPatient) {
            router.push('/strefa-pacjenta/login');
            return;
        }

        setPatient(currentPatient);
        setVisits(getPatientVisits(currentPatient.id));
    }, [router]);

    const handleLogout = () => {
        MockAuth.logout();
        router.push('/strefa-pacjenta/login');
    };

    const filteredVisits = visits.filter(v => {
        if (filter === 'paid') return v.balance === 0;
        if (filter === 'unpaid') return v.balance > 0;
        return true;
    });

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
                    { href: '/strefa-pacjenta/historia', label: 'Historia wizyt', active: true },
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
                {/* Filter Buttons */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '2rem',
                    flexWrap: 'wrap',
                }}>
                    {[
                        { value: 'all' as const, label: 'Wszystkie', count: visits.length },
                        { value: 'paid' as const, label: 'Opłacone', count: visits.filter(v => v.balance === 0).length },
                        { value: 'unpaid' as const, label: 'Do zapłaty', count: visits.filter(v => v.balance > 0).length },
                    ].map(btn => (
                        <button
                            key={btn.value}
                            onClick={() => setFilter(btn.value)}
                            style={{
                                padding: '0.875rem 1.5rem',
                                background: filter === btn.value ? 'rgba(220, 177, 74, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                border: filter === btn.value ? '1px solid rgba(220, 177, 74, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '0.5rem',
                                color: filter === btn.value ? '#dcb14a' : 'rgba(255, 255, 255, 0.7)',
                                fontWeight: filter === btn.value ? 'bold' : 'normal',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {btn.label} ({btn.count})
                        </button>
                    ))}
                </div>

                {/* Visits Table */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '1rem',
                    overflow: 'hidden',
                }}>
                    {filteredVisits.length === 0 ? (
                        <p style={{
                            color: 'rgba(255, 255, 255, 0.5)',
                            textAlign: 'center',
                            padding: '3rem',
                        }}>
                            Brak wizyt do wyświetlenia
                        </p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                            }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                        {['Data', 'Lekarz', 'Opis wizyty', 'Zabiegi', 'Koszt', 'Zapłacono', 'Saldo', 'Status'].map(header => (
                                            <th key={header} style={{
                                                padding: '1.25rem',
                                                textAlign: 'left',
                                                color: '#dcb14a',
                                                fontSize: '0.85rem',
                                                fontWeight: 'bold',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }}>
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVisits.map(visit => (
                                        <tr key={visit.id} style={{
                                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                            transition: 'background 0.2s',
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '1.25rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                                                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                                    {new Date(visit.date).toLocaleDateString('pl-PL')}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                    {visit.time}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                                                {visit.doctorName}
                                            </td>
                                            <td style={{ padding: '1.25rem', color: 'rgba(255, 255, 255, 0.7)', maxWidth: '250px' }}>
                                                {visit.description}
                                            </td>
                                            <td style={{ padding: '1.25rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    {visit.procedures.map((proc, idx) => (
                                                        <span key={idx} style={{
                                                            display: 'inline-block',
                                                            padding: '0.25rem 0.5rem',
                                                            background: 'rgba(220, 177, 74, 0.1)',
                                                            border: '1px solid rgba(220, 177, 74, 0.2)',
                                                            borderRadius: '0.25rem',
                                                            fontSize: '0.75rem',
                                                            color: '#dcb14a',
                                                        }}>
                                                            {proc}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem', color: '#fff', fontWeight: 'bold' }}>
                                                {visit.cost} PLN
                                            </td>
                                            <td style={{ padding: '1.25rem', color: '#22c55e' }}>
                                                {visit.paid} PLN
                                            </td>
                                            <td style={{
                                                padding: '1.25rem',
                                                color: visit.balance > 0 ? '#f97316' : '#22c55e',
                                                fontWeight: 'bold',
                                            }}>
                                                {visit.balance} PLN
                                            </td>
                                            <td style={{ padding: '1.25rem' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '0.375rem 0.875rem',
                                                    background: visit.balance === 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                                                    border: `1px solid ${visit.balance === 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(249, 115, 22, 0.3)'}`,
                                                    borderRadius: '99px',
                                                    color: visit.balance === 0 ? '#22c55e' : '#f97316',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                }}>
                                                    {visit.balance === 0 ? '✓ Opłacono' : '⏳ Do zapłaty'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
