"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AppointmentStatus } from '@/types/appointmentActions';
import ConfirmAttendanceModal from './modals/ConfirmAttendanceModal';
import CancelAppointmentModal from './modals/CancelAppointmentModal';
import RescheduleAppointmentModal from './modals/RescheduleAppointmentModal';

interface AppointmentActionsDropdownProps {
    appointmentId: string;
    appointmentDate: string;
    appointmentEndDate: string;
    currentStatus: AppointmentStatus;
    depositPaid: boolean;
    attendanceConfirmed: boolean;
    hoursUntilAppointment: number;
    doctorName: string;
    authToken: string;
    onStatusChange: () => void;
}

export default function AppointmentActionsDropdown({
    appointmentId,
    appointmentDate,
    appointmentEndDate,
    currentStatus,
    depositPaid,
    attendanceConfirmed,
    hoursUntilAppointment,
    doctorName,
    authToken,
    onStatusChange
}: AppointmentActionsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmAttendanceModal, setShowConfirmAttendanceModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Determine if actions are available
    const canConfirmAttendance = hoursUntilAppointment > 0 && hoursUntilAppointment <= 24 && !attendanceConfirmed;
    const canPayDeposit = !depositPaid && hoursUntilAppointment > 0;
    const canCancel = hoursUntilAppointment > 0 && currentStatus !== 'cancellation_pending';
    const canReschedule = hoursUntilAppointment > 0 && currentStatus !== 'reschedule_pending';

    // Status badge config
    const getStatusConfig = () => {
        switch (currentStatus) {
            case 'unpaid_reservation':
                return {
                    icon: '⚠️',
                    text: 'Rezerwacja niepotwierdzona',
                    color: '#ff9800',
                    bgColor: '#fff3e0'
                };
            case 'deposit_paid':
                return {
                    icon: '✅',
                    text: 'Rezerwacja potwierdzona zadatkiem',
                    color: '#4caf50',
                    bgColor: '#e8f5e9'
                };
            case 'attendance_confirmed':
                return {
                    icon: '✅',
                    text: 'Obecność potwierdzona',
                    color: '#2e7d32',
                    bgColor: '#c8e6c9'
                };
            case 'cancellation_pending':
                return {
                    icon: '🕐',
                    text: 'Oczekuje na odwołanie (do 24h)',
                    color: '#ff9800',
                    bgColor: '#fff3e0'
                };
            case 'reschedule_pending':
                return {
                    icon: '🕐',
                    text: 'Oczekuje na przełożenie (do 24h)',
                    color: '#ff9800',
                    bgColor: '#fff3e0'
                };
        }
    };

    const statusConfig = getStatusConfig();

    const handlePayDeposit = () => {
        setIsOpen(false);
        router.push(`/zadatek?appointmentId=${appointmentId}`);
    };

    return (
        <>
            <div className="appointment-actions-container" ref={dropdownRef}>
                {/* Status Badge */}
                <div
                    className="status-badge"
                    style={{
                        background: `rgba(255, 152, 0, 0.12)`,
                        color: '#fb923c',
                        border: `1px solid rgba(255, 152, 0, 0.25)`,
                        padding: '0.5rem 0.875rem',
                        borderRadius: '4px',
                        marginBottom: '0.5rem',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <span>{statusConfig.icon}</span>
                    <span>{statusConfig.text}</span>
                </div>

                {/* Dropdown Toggle Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="dropdown-toggle"
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: 'rgba(59, 130, 246, 0.12)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <span>Zarządzaj wizytą</span>
                    <span style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                    }}>
                        ▼
                    </span>
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div
                        className="dropdown-menu"
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 0.5rem)',
                            left: 0,
                            right: 0,
                            background: '#1a1a1a',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                            zIndex: 1000,
                            maxHeight: '400px',
                            overflow: 'auto',
                            animation: 'slideDown 0.2s ease'
                        }}
                    >
                        {/* Confirm Attendance (if <24h) */}
                        {canConfirmAttendance && (
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    setShowConfirmAttendanceModal(true);
                                }}
                                className="dropdown-item"
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    color: '#60a5fa',
                                    border: 'none',
                                    borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
                                    fontSize: '0.875rem',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                            >
                                <span style={{ fontSize: '1.2rem' }}>✓</span>
                                <span>Potwierdź obecność</span>
                            </button>
                        )}

                        {/* Pay Deposit (if unpaid) */}
                        {canPayDeposit && (
                            <button
                                onClick={handlePayDeposit}
                                className="dropdown-item primary"
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    color: '#4ade80',
                                    border: 'none',
                                    borderBottom: '1px solid rgba(34, 197, 94, 0.2)',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.25)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)'}
                            >
                                <span style={{ fontSize: '1.2rem' }}>💳</span>
                                <span>Wpłać zadatek (500 zł)</span>
                            </button>
                        )}

                        {/* Status Display (if deposit paid) */}
                        {depositPaid && (
                            <div
                                className="dropdown-item status"
                                style={{
                                    padding: '1rem 1.25rem',
                                    background: '#1e3a1e',
                                    color: '#4caf50',
                                    borderBottom: '1px solid #2e5a2e',
                                    fontSize: '0.95rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                }}
                            >
                                <span style={{ fontSize: '1.2rem' }}>✅</span>
                                <span>Rezerwacja potwierdzona</span>
                            </div>
                        )}

                        {/* Cancel Appointment */}
                        {canCancel && (
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    setShowCancelModal(true);
                                }}
                                className="dropdown-item danger"
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: '#f87171',
                                    border: 'none',
                                    borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
                                    fontSize: '0.875rem',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                            >
                                <span style={{ fontSize: '1.2rem' }}>❌</span>
                                <span>Odwołaj wizytę</span>
                            </button>
                        )}

                        {/* Reschedule Appointment */}
                        {canReschedule && (
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    setShowRescheduleModal(true);
                                }}
                                className="dropdown-item"
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    background: 'rgba(168, 85, 247, 0.1)',
                                    color: '#c084fc',
                                    border: 'none',
                                    fontSize: '0.875rem',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)'}
                            >
                                <span style={{ fontSize: '1.2rem' }}>📅</span>
                                <span>Przełóż wizytę</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <ConfirmAttendanceModal
                isOpen={showConfirmAttendanceModal}
                onClose={() => setShowConfirmAttendanceModal(false)}
                onConfirm={async () => {
                    const token = authToken;
                    const response = await fetch(`/api/patients/appointments/${appointmentId}/confirm-attendance`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ appointmentDate })
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Nie udało się potwierdzić obecności');
                    }

                    onStatusChange();
                }}
                appointmentDate={new Date(appointmentDate).toLocaleDateString('pl-PL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}
                appointmentTime={new Date(appointmentDate).toLocaleTimeString('pl-PL', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}
                doctorName={doctorName}
            />

            <CancelAppointmentModal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={async (reason) => {
                    const token = authToken;
                    const response = await fetch(`/api/patients/appointments/${appointmentId}/cancel`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ reason })
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Nie udało się odwołać wizyty');
                    }

                    onStatusChange();
                }}
                appointmentDate={new Date(appointmentDate).toLocaleDateString('pl-PL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                })}
                appointmentTime={new Date(appointmentDate).toLocaleTimeString('pl-PL', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            />

            <RescheduleAppointmentModal
                isOpen={showRescheduleModal}
                onClose={() => setShowRescheduleModal(false)}
                onConfirm={async (reason) => {
                    const token = authToken;
                    const response = await fetch(`/api/patients/appointments/${appointmentId}/reschedule`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ reason })
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Nie udało się przełożyć wizyty');
                    }

                    const result = await response.json();
                    onStatusChange();
                    return result;
                }}
                appointmentDate={new Date(appointmentDate).toLocaleDateString('pl-PL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                })}
                appointmentTime={new Date(appointmentDate).toLocaleTimeString('pl-PL', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            />

            <style jsx>{`
        .appointment-actions-container {
          position: relative;
          width: 100%;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .dropdown-menu {
            max-height: 80vh;
            overflow-y: auto;
          }
        }
      `}</style>
        </>
    );
}
