"use client";
import { useState, useEffect } from "react";

export default function CancelledAppointmentsTab() {
    const [cancelledAppointments, setCancelledAppointments] = useState<any[]>([]);
    const [cancelledLoading, setCancelledLoading] = useState(false);

    useEffect(() => {
        setCancelledLoading(true);
        fetch('/api/admin/cancelled-appointments?limit=100')
            .then(r => r.json())
            .then(d => setCancelledAppointments(d.appointments || []))
            .catch(() => { })
            .finally(() => setCancelledLoading(false));
    }, []);

    const refresh = () => {
        setCancelledLoading(true);
        fetch('/api/admin/cancelled-appointments?limit=100')
            .then(r => r.json())
            .then(d => setCancelledAppointments(d.appointments || []))
            .catch(() => { })
            .finally(() => setCancelledLoading(false));
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Wizyty odwołane przez pacjentów ze Strefy Pacjenta ({cancelledAppointments.length})
                </p>
                <button
                    onClick={refresh}
                    style={{ padding: '0.5rem 1rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                    🔄 Odśwież
                </button>
            </div>
            {cancelledLoading ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Ładowanie...</p>
            ) : cancelledAppointments.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Brak odwołanych wizyt</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Pacjent</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Telefon</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Data wizyty</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Lekarz</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Powód</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Odwołano</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cancelledAppointments.map((ca: any) => (
                                <tr key={ca.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{ca.patient_name || '—'}</td>
                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                                        {ca.patient_phone ? <a href={`tel:${ca.patient_phone}`} style={{ color: 'var(--color-primary)' }}>{ca.patient_phone}</a> : '—'}
                                    </td>
                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                                        {ca.appointment_date ? new Date(ca.appointment_date).toLocaleString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </td>
                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{ca.doctor_name || '—'}</td>
                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ca.reason || '—'}</td>
                                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                        {ca.cancelled_at ? new Date(ca.cancelled_at).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
