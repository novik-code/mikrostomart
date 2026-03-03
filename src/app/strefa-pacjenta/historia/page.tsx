'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePatientAuth } from '@/hooks/usePatientAuth';

interface Visit {
    date: string;
    endDate: string;
    doctor: {
        id: string;
        name: string;
        title?: string;
    };
    cost: number;
    paid: number;
    balance: number;
    paymentStatus: string;
    medicalDetails?: {
        diagnosis?: string;
        visitDescription?: string;
        recommendations?: string;
        procedures?: Array<{
            tooth?: string;
            procedureName: string;
            diagnosis?: string;
            price: number;
        }>;
        medications?: Array<{
            name: string;
            dosage?: string;
            duration?: string;
        }>;
    };
}

export default function VisitHistory() {
    const { patient, isLoading: isAuthLoading, accountStatus, getAuthToken } = usePatientAuth();
    const [visits, setVisits] = useState<Visit[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
    const router = useRouter();

    useEffect(() => {
        if (isAuthLoading) return;
        const loadVisits = async () => {
            const token = getAuthToken();

            try {
                const res = await fetch('/api/patients/me/visits?limit=100', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!res.ok) {
                    throw new Error('Unauthorized');
                }

                const data = await res.json();
                setVisits(data.appointments || []);
                setTotal(data.total || 0);
            } catch (err) {
                console.error('Failed to load visits:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadVisits();
    }, [isAuthLoading, router, getAuthToken]);

    const filteredVisits = visits.filter(v => {
        if (filter === 'paid') return v.balance === 0;
        if (filter === 'unpaid') return v.balance > 0;
        return true;
    });

    if (isAuthLoading || isLoading) {
        return <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.9rem',
        }}>
            Ładowanie danych...
        </div>;
    }

    return (
        <>
            {/* Main Content */}
            {accountStatus === null || accountStatus === 'active' ? (
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '2rem',
                }}>
                    {/* Stats & Filters */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '2rem',
                        flexWrap: 'wrap',
                        gap: '1rem',
                    }}>
                        <div>
                            <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                                Wszystkie wizyty ({total})
                            </h2>
                            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                                Pełna historia wizyt w gabinecie
                            </p>
                        </div>

                        {/* Filters */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {[
                                { value: 'all', label: 'Wszystkie' },
                                { value: 'paid', label: 'Opłacone' },
                                { value: 'unpaid', label: 'Do zapłaty' },
                            ].map(f => (
                                <button
                                    key={f.value}
                                    onClick={() => setFilter(f.value as any)}
                                    style={{
                                        padding: '0.75rem 1.25rem',
                                        background: filter === f.value ? 'rgba(220, 177, 74, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                        border: filter === f.value ? '1px solid rgba(220, 177, 74, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '0.5rem',
                                        color: filter === f.value ? '#dcb14a' : 'rgba(255, 255, 255, 0.7)',
                                        fontWeight: filter === f.value ? 'bold' : 'normal',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Visits List */}
                    {filteredVisits.length === 0 ? (
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '1rem',
                            padding: '3rem',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '1.1rem' }}>
                                Brak wizyt do wyświetlenia
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {filteredVisits.map((visit, idx) => (
                                <div key={idx} style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '1rem',
                                    padding: '1.5rem',
                                }}>
                                    {/* Header */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: '1rem',
                                        flexWrap: 'wrap',
                                        gap: '1rem',
                                    }}>
                                        <div>
                                            <div style={{ color: '#dcb14a', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                                {new Date(visit.date).toLocaleDateString('pl-PL', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                            <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                                {visit.doctor.name}
                                            </div>
                                            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                                                {new Date(visit.date).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })} - {new Date(visit.endDate).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                                {visit.cost ? visit.cost.toFixed(2) : '0.00'} PLN
                                            </div>
                                            <div style={{
                                                display: 'inline-block',
                                                padding: '0.5rem 1rem',
                                                background: visit.balance === 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                                                border: `1px solid ${visit.balance === 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(249, 115, 22, 0.3)'}`,
                                                borderRadius: '99px',
                                                color: visit.balance === 0 ? '#22c55e' : '#f97316',
                                                fontSize: '0.85rem',
                                                fontWeight: 'bold',
                                            }}>
                                                {visit.balance === 0 ? '✓ Opłacono' : `Do zapłaty: ${(visit.balance || 0).toFixed(2)} PLN`}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Medical Details */}
                                    {visit.medicalDetails && (
                                        <div style={{
                                            background: 'rgba(0, 0, 0, 0.2)',
                                            borderRadius: '0.75rem',
                                            padding: '1.25rem',
                                            marginTop: '1rem',
                                        }}>
                                            {visit.medicalDetails.visitDescription && (
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <div style={{ color: '#dcb14a', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                                        📝 Opis wizyty
                                                    </div>
                                                    <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem' }}>
                                                        {visit.medicalDetails.visitDescription}
                                                    </div>
                                                </div>
                                            )}

                                            {visit.medicalDetails.diagnosis && (
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <div style={{ color: '#dcb14a', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                                        🔬 Rozpoznanie
                                                    </div>
                                                    <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem' }}>
                                                        {visit.medicalDetails.diagnosis}
                                                    </div>
                                                </div>
                                            )}

                                            {visit.medicalDetails.procedures && visit.medicalDetails.procedures.length > 0 && (
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <div style={{ color: '#dcb14a', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                                                        🦷 Procedury
                                                    </div>
                                                    {visit.medicalDetails.procedures.map((proc, pidx) => (
                                                        <div key={pidx} style={{
                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                            padding: '0.75rem',
                                                            borderRadius: '0.5rem',
                                                            marginBottom: '0.5rem',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                        }}>
                                                            <div>
                                                                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                                    {proc.procedureName} {proc.tooth && `(ząb ${proc.tooth})`}
                                                                </div>
                                                                {proc.diagnosis && (
                                                                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}>
                                                                        {proc.diagnosis}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ color: '#dcb14a', fontWeight: 'bold' }}>
                                                                {(proc.price || 0).toFixed(2)} PLN
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {visit.medicalDetails.recommendations && (
                                                <div>
                                                    <div style={{ color: '#dcb14a', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                                        💊 Zalecenia
                                                    </div>
                                                    <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem' }}>
                                                        {visit.medicalDetails.recommendations}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                // Pending or Rejected - Show restricted access
                <div style={{
                    maxWidth: '800px',
                    margin: '3rem auto',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                }}>
                    <div style={{
                        fontSize: '4rem',
                        marginBottom: '1.5rem',
                    }}>
                        🔒
                    </div>
                    <h2 style={{
                        color: '#dcb14a',
                        fontSize: '1.8rem',
                        marginBottom: '1rem',
                    }}>
                        Dostęp ograniczony
                    </h2>
                    <p style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '1.1rem',
                        lineHeight: 1.6,
                    }}>
                        Twoje konto wymaga zatwierdzenia przez administratora.<br />
                        Historia wizyt będzie dostępna po weryfikacji.
                    </p>
                </div>
            )}
        </>
    );
}
