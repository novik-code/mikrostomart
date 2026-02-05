"use client";

import { useState } from 'react';

interface CancelAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason?: string) => Promise<void>;
    appointmentDate: string;
    appointmentTime: string;
}

export default function CancelAppointmentModal({
    isOpen,
    onClose,
    onConfirm,
    appointmentDate,
    appointmentTime
}: CancelAppointmentModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await onConfirm(reason || undefined);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setReason('');
            }, 2500);
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
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📧</div>
                        <h3 style={{ color: '#ff9800', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
                            Prośba wysłana
                        </h3>
                        <p style={{ color: '#aaa', marginBottom: '0.5rem' }}>
                            Gabinet skontaktuje się w ciągu 24h.
                        </p>
                        <p style={{ color: '#777', fontSize: '0.85rem' }}>
                            Możesz zamknąć to okno
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>❌</div>
                            <h3 style={{ color: '#f44336', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
                                Odwołaj wizytę
                            </h3>
                            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
                                {appointmentDate} o {appointmentTime}
                            </p>
                        </div>

                        {/* Warning */}
                        <div
                            style={{
                                background: '#3a1e1e',
                                border: '1px solid #5a2e2e',
                                borderRadius: '8px',
                                padding: '1rem',
                                marginBottom: '1.5rem',
                                fontSize: '0.9rem',
                                color: '#ff9800'
                            }}
                        >
                            <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                                ⚠️ Uwaga
                            </div>
                            <p style={{ margin: 0, lineHeight: '1.5' }}>
                                Prośba o odwołanie zostanie wysłana do gabinetu. Wizyta zostanie odwołana w ciągu 24h.
                            </p>
                        </div>

                        {/* Reason Textarea */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label
                                htmlFor="cancel-reason"
                                style={{
                                    display: 'block',
                                    color: '#aaa',
                                    fontSize: '0.9rem',
                                    marginBottom: '0.5rem'
                                }}
                            >
                                Powód odwołania (opcjonalnie)
                            </label>
                            <textarea
                                id="cancel-reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="np. Choroba, konflikt w kalendarzu..."
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
                                    background: isLoading ? '#555' : '#f44336',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isLoading) e.currentTarget.style.background = '#d32f2f';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isLoading) e.currentTarget.style.background = '#f44336';
                                }}
                            >
                                {isLoading ? 'Wysyłam...' : 'Odwołaj wizytę'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
