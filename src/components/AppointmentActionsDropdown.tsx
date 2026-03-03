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
    patientName?: string;
    patientEmail?: string;
    patientPhone?: string;
    patientCity?: string;
    patientZipCode?: string;
    patientStreet?: string;
    patientHouseNumber?: string;
    patientApartmentNumber?: string;
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
    onStatusChange,
    patientName,
    patientEmail,
    patientPhone,
    patientCity,
    patientZipCode,
    patientStreet,
    patientHouseNumber,
    patientApartmentNumber
}: AppointmentActionsDropdownProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmAttendanceModal, setShowConfirmAttendanceModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);

    const router = useRouter();

    // Action availability
    const canConfirmAttendance = hoursUntilAppointment > 0 && hoursUntilAppointment <= 24 && !attendanceConfirmed;
    const canPayDeposit = !depositPaid && hoursUntilAppointment > 0;
    const canCancel = hoursUntilAppointment > 0 && !attendanceConfirmed && currentStatus !== 'cancellation_pending' && currentStatus !== 'cancelled';
    const canReschedule = hoursUntilAppointment > 0 && !attendanceConfirmed && currentStatus !== 'reschedule_pending' && currentStatus !== 'rescheduled' && currentStatus !== 'cancelled';

    // Status display
    const getStatusInfo = () => {
        switch (currentStatus) {
            case 'unpaid_reservation':
                return { icon: '⚠️', text: 'Rezerwacja niepotwierdzona', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)' };
            case 'deposit_paid':
                return { icon: '✅', text: 'Potwierdzona zadatkiem', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.25)' };
            case 'attendance_confirmed':
                return { icon: '✅', text: 'Obecność potwierdzona', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)', border: 'rgba(22, 163, 74, 0.25)' };
            case 'cancellation_pending':
                return { icon: '🕐', text: 'Odwołanie w toku', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)' };
            case 'reschedule_pending':
                return { icon: '🕐', text: 'Przełożenie w toku', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)' };
            case 'cancelled':
                return { icon: '❌', text: 'Wizyta odwołana', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)' };
            case 'rescheduled':
                return { icon: '📅', text: 'Wizyta przełożona', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.25)' };
            default:
                return { icon: '📋', text: currentStatus || 'Status nieznany', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.12)', border: 'rgba(156, 163, 175, 0.25)' };
        }
    };

    const status = getStatusInfo();

    const handlePayDeposit = () => {
        const params = new URLSearchParams({ appointmentId });
        if (patientName?.trim()) params.append('name', patientName);
        if (patientEmail?.trim()) params.append('email', patientEmail);
        if (patientPhone?.trim()) params.append('phone', patientPhone);
        if (patientCity?.trim()) params.append('city', patientCity);
        if (patientZipCode?.trim()) params.append('zipCode', patientZipCode);
        if (patientStreet?.trim()) params.append('street', patientStreet);
        if (patientHouseNumber?.trim()) params.append('houseNumber', patientHouseNumber);
        if (patientApartmentNumber?.trim()) params.append('apartmentNumber', patientApartmentNumber);
        router.push(`/zadatek?${params.toString()}`);
    };

    const hasAnyAction = canConfirmAttendance || canPayDeposit || canCancel || canReschedule;
    const isFinalState = currentStatus === 'cancelled' || currentStatus === 'rescheduled' || currentStatus === 'attendance_confirmed';

    return (
        <>
            <div style={{ marginTop: '1rem' }}>
                {/* ── Status Badge ── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1rem',
                    background: status.bg,
                    border: `1px solid ${status.border}`,
                    borderRadius: '0.5rem',
                    marginBottom: hasAnyAction ? '0.75rem' : '0',
                }}>
                    <span style={{ fontSize: '1rem' }}>{status.icon}</span>
                    <span style={{ color: status.color, fontSize: '0.85rem', fontWeight: '600' }}>{status.text}</span>
                </div>

                {/* ── Action Buttons ── */}
                {hasAnyAction && (
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                    }}>
                        {/* Pay Deposit */}
                        {canPayDeposit && (
                            <button
                                onClick={handlePayDeposit}
                                style={{
                                    flex: '1 1 auto',
                                    minWidth: '140px',
                                    padding: '0.65rem 1rem',
                                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.08))',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    borderRadius: '0.5rem',
                                    color: '#4ade80',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(34, 197, 94, 0.15))';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.08))';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                💳 Wpłać zadatek
                            </button>
                        )}

                        {/* Confirm Attendance */}
                        {canConfirmAttendance && (
                            <button
                                onClick={() => setShowConfirmAttendanceModal(true)}
                                style={{
                                    flex: '1 1 auto',
                                    minWidth: '140px',
                                    padding: '0.65rem 1rem',
                                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.08))',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    borderRadius: '0.5rem',
                                    color: '#60a5fa',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(59, 130, 246, 0.15))';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.08))';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                ✓ Potwierdź obecność
                            </button>
                        )}

                        {/* Reschedule */}
                        {canReschedule && (
                            <button
                                onClick={() => setShowRescheduleModal(true)}
                                style={{
                                    flex: '1 1 auto',
                                    minWidth: '120px',
                                    padding: '0.65rem 1rem',
                                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(168, 85, 247, 0.06))',
                                    border: '1px solid rgba(168, 85, 247, 0.25)',
                                    borderRadius: '0.5rem',
                                    color: '#c084fc',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168, 85, 247, 0.22), rgba(168, 85, 247, 0.12))';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(168, 85, 247, 0.06))';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                📅 Przełóż
                            </button>
                        )}

                        {/* Cancel */}
                        {canCancel && (
                            <button
                                onClick={() => setShowCancelModal(true)}
                                style={{
                                    flex: '1 1 auto',
                                    minWidth: '120px',
                                    padding: '0.65rem 1rem',
                                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(239, 68, 68, 0.06))',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    borderRadius: '0.5rem',
                                    color: '#f87171',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(239, 68, 68, 0.12))';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(239, 68, 68, 0.06))';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                ❌ Odwołaj
                            </button>
                        )}
                    </div>
                )}

                {/* Info for final states */}
                {isFinalState && !hasAnyAction && (
                    <div style={{
                        marginTop: '0.5rem',
                        fontSize: '0.78rem',
                        color: 'rgba(255, 255, 255, 0.4)',
                        fontStyle: 'italic',
                    }}>
                        {currentStatus === 'cancelled' && 'Wizyta została odwołana. Umów nową wizytę poniżej.'}
                        {currentStatus === 'rescheduled' && 'Przełożenie zostało zgłoszone. Gabinet potwierdzi nowy termin.'}
                        {currentStatus === 'attendance_confirmed' && 'Do zobaczenia na wizycie! 🦷'}
                    </div>
                )}

                {/* Attendance hint when >24h */}
                {!canConfirmAttendance && !attendanceConfirmed && hoursUntilAppointment > 24 && !isFinalState && (
                    <div style={{
                        marginTop: '0.5rem',
                        fontSize: '0.78rem',
                        color: 'rgba(255, 255, 255, 0.35)',
                    }}>
                        ℹ️ Potwierdzenie obecności będzie dostępne 24h przed wizytą
                    </div>
                )}
            </div>

            {/* Modals */}
            <ConfirmAttendanceModal
                isOpen={showConfirmAttendanceModal}
                onClose={() => setShowConfirmAttendanceModal(false)}
                onConfirm={async () => {
                    const response = await fetch(`/api/patients/appointments/${appointmentId}/confirm-attendance`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
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
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
                appointmentTime={new Date(appointmentDate).toLocaleTimeString('pl-PL', {
                    hour: '2-digit', minute: '2-digit'
                })}
                doctorName={doctorName}
            />

            <CancelAppointmentModal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={async (reason) => {
                    const response = await fetch(`/api/patients/appointments/${appointmentId}/cancel`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
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
                    weekday: 'long', day: 'numeric', month: 'long'
                })}
                appointmentTime={new Date(appointmentDate).toLocaleTimeString('pl-PL', {
                    hour: '2-digit', minute: '2-digit'
                })}
            />

            <RescheduleAppointmentModal
                isOpen={showRescheduleModal}
                onClose={() => setShowRescheduleModal(false)}
                onConfirm={async (reason, newDate, newStartTime) => {
                    const response = await fetch(`/api/patients/appointments/${appointmentId}/reschedule`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ reason, newDate, newStartTime })
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
                    weekday: 'long', day: 'numeric', month: 'long'
                })}
                appointmentTime={new Date(appointmentDate).toLocaleTimeString('pl-PL', {
                    hour: '2-digit', minute: '2-digit'
                })}
                authToken={authToken}
            />
        </>
    );
}
