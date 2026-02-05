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
                        background: statusConfig.bgColor,
                        color: statusConfig.color,
                        border: `1px solid ${statusConfig.color}`,
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        marginBottom: '0.75rem',
                        fontSize: '0.9rem',
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
                        padding: '0.875rem 1.25rem',
                        background: 'linear-gradient(135deg, #dcb14a 0%, #c9a13d 100%)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(220, 177, 74, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 177, 74, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 177, 74, 0.3)';
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
                            overflow: 'hidden',
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
                                    padding: '1rem 1.25rem',
                                    background: 'transparent',
                                    color: '#fff',
                                    border: 'none',
                                    borderBottom: '1px solid #333',
                                    fontSize: '0.95rem',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
                                    padding: '1rem 1.25rem',
                                    background: '#dcb14a',
                                    color: '#000',
                                    border: 'none',
                                    borderBottom: '1px solid #c9a13d',
                                    fontSize: '0.95rem',
                                    fontWeight: '600',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#c9a13d'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#dcb14a'}
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
                                    padding: '1rem 1.25rem',
                                    background: 'transparent',
                                    color: '#f44336',
                                    border: 'none',
                                    borderBottom: '1px solid #333',
                                    fontSize: '0.95rem',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#2a1a1a'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
                                    padding: '1rem 1.25rem',
                                    background: 'transparent',
                                    color: '#fff',
                                    border: 'none',
                                    fontSize: '0.95rem',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
                    const token = localStorage.getItem('patientToken');
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
                    const token = localStorage.getItem('patientToken');
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
                    const token = localStorage.getItem('patientToken');
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
