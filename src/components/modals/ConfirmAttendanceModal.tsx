"use client";

import { useState } from 'react';

interface ConfirmAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    appointmentDate: string;
    appointmentTime: string;
    doctorName: string;
}

export default function ConfirmAttendanceModal({
    isOpen,
    onClose,
    onConfirm,
    appointmentDate,
    appointmentTime,
    doctorName
}: ConfirmAttendanceModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await onConfirm();
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
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
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                        <h3 style={{ color: '#4caf50', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
                            Potwierdzono!
                        </h3>
                        <p style={{ color: '#aaa' }}>
                            Gabinet został powiadomiony o Twojej obecności.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✓</div>
                            <h3 style={{ color: '#fff', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
                                Potwierdź obecność
                            </h3>
                            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
                                Powiadom gabinet, że będziesz na wizycie
                            </p>
                        </div>

                        {/* Appointment Details */}
                        <div
                            style={{
                                background: '#0a0a0a',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                padding: '1rem',
                                marginBottom: '1.5rem'
                            }}
                        >
                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                    📅 Data
                                </div>
                                <div style={{ color: '#fff', fontWeight: '600' }}>
                                    {appointmentDate}
                                </div>
                            </div>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                    🕐 Godzina
                                </div>
                                <div style={{ color: '#fff', fontWeight: '600' }}>
                                    {appointmentTime}
                                </div>
                            </div>
                            <div>
                                <div style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                    👨‍⚕️ Lekarz
                                </div>
                                <div style={{ color: '#fff', fontWeight: '600' }}>
                                    {doctorName}
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div
                            style={{
                                background: '#1e3a1e',
                                border: '1px solid #2e5a2e',
                                borderRadius: '8px',
                                padding: '0.75rem',
                                marginBottom: '1.5rem',
                                fontSize: '0.85rem',
                                color: '#4caf50'
                            }}
                        >
                            ℹ️ Gabinet otrzyma automatyczne powiadomienie email o potwierdzeniu Twojej obecności.
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
                                    background: isLoading ? '#555' : '#4caf50',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isLoading) e.currentTarget.style.background = '#45a049';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isLoading) e.currentTarget.style.background = '#4caf50';
                                }}
                            >
                                {isLoading ? 'Potwierdzam...' : 'Potwierdzam obecność'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
