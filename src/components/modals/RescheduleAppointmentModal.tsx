"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RescheduleAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason?: string) => Promise<{ redirectUrl?: string }>;
    appointmentDate: string;
    appointmentTime: string;
}

export default function RescheduleAppointmentModal({
    isOpen,
    onClose,
    onConfirm,
    appointmentDate,
    appointmentTime
}: RescheduleAppointmentModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const router = useRouter();

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await onConfirm(reason || undefined);
            setSuccess(true);

            // Redirect after short delay
            setTimeout(() => {
                if (result.redirectUrl) {
                    router.push(result.redirectUrl);
                }
                onClose();
                setSuccess(false);
                setReason('');
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Wystąpił błąd');
            setIsLoading(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1rem'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '12px',
                    maxWidth: '500px',
                    width: '100%',
                    padding: '2rem',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {success ? (
                    // Success State
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📅</div>
                        <h3 style={{ color: '#dcb14a', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
                            Prośba wysłana
                        </h3>
                        <p style={{ color: '#aaa', marginBottom: '0.5rem' }}>
                            Zostaniesz przekierowany do wyboru nowego terminu...
                        </p>
                        <p style={{ color: '#777', fontSize: '0.85rem' }}>
                            Wizyta zostanie przeniesiona w ciągu 24h
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📅</div>
                            <h3 style={{ color: '#dcb14a', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
                                Przełóż wizytę
                            </h3>
                            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
                                {appointmentDate} o {appointmentTime}
                            </p>
                        </div>

                        {/* Info */}
                        <div
                            style={{
                                background: '#2a2410',
                                border: '1px solid #3a3420',
                                borderRadius: '8px',
                                padding: '1rem',
                                marginBottom: '1.5rem',
                                fontSize: '0.9rem',
                                color: '#dcb14a'
                            }}
                        >
                            <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                                ℹ️ Jak to działa?
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: '1.6' }}>
                                <li>Prośba zostanie wysłana do gabinetu</li>
                                <li>Zostaniesz przekierowany do rezerwacji online</li>
                                <li>Wybierz nowy termin z dostępnych</li>
                                <li>Wizyta zostanie przeniesiona w ciągu 24h</li>
                            </ul>
                        </div>

                        {/* Reason Textarea */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label
                                htmlFor="reschedule-reason"
                                style={{
                                    display: 'block',
                                    color: '#aaa',
                                    fontSize: '0.9rem',
                                    marginBottom: '0.5rem'
                                }}
                            >
                                Powód przełożenia (opcjonalnie)
                            </label>
                            <textarea
                                id="reschedule-reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="np. Konflikt w kalendarzu, nowy termin będzie wygodniejszy..."
                                disabled={isLoading}
                                style={{
                                    width: '100%',
                                    minHeight: '80px',
                                    padding: '0.75rem',
                                    background: '#0a0a0a',
                                    border: '1px solid #333',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '0.9rem',
                                    fontFamily: 'inherit',
                                    resize: 'vertical',
                                    outline: 'none',
                                    transition: 'border-color 0.2s ease'
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#dcb14a'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#333'}
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div
                                style={{
                                    background: '#3a1e1e',
                                    border: '1px solid #5a2e2e',
                                    borderRadius: '8px',
                                    padding: '0.75rem',
                                    marginBottom: '1.5rem',
                                    fontSize: '0.85rem',
                                    color: '#f44336'
                                }}
                            >
                                ⚠️ {error}
                            </div>
                        )}

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                style={{
                                    flex: 1,
                                    padding: '0.875rem',
                                    background: 'transparent',
                                    border: '1px solid #333',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    opacity: isLoading ? 0.5 : 1,
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isLoading) e.currentTarget.style.background = '#2a2a2a';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isLoading}
                                style={{
                                    flex: 1,
                                    padding: '0.875rem',
                                    background: isLoading ? '#555' : '#dcb14a',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#000',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isLoading) e.currentTarget.style.background = '#c9a13d';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isLoading) e.currentTarget.style.background = '#dcb14a';
                                }}
                            >
                                {isLoading ? 'Wysyłam...' : 'Przełóż wizytę'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
