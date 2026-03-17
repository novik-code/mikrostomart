'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSchedule } from '../hooks/useSchedule';
import { createBrowserClient } from '@supabase/ssr';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Clock, X, Plus, User, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { CONSENT_TYPES as HARDCODED_CONSENT_TYPES } from '@/lib/consentTypes';
import type { Badge, ScheduleAppointment, Visit, ScheduleDay, ScheduleData } from './ScheduleTypes';
import type { EmployeeTask } from './TaskTypes';
import { PRODENTIS_COLORS, DEFAULT_COLOR, BADGE_LETTERS, getBadgeLetter, getAppointmentColor, TIME_SLOTS, timeToSlotIndex, timeToMinutes, getMonday, formatDateShort } from './ScheduleTypes';

// ─── Props ────────────────────────────────────────────────────
interface ScheduleTabProps {
    scheduleData: ScheduleData | null;
    loading: boolean;
    currentWeekStart: Date;
    setCurrentWeekStart: React.Dispatch<React.SetStateAction<Date>>;
    selectedAppointment: ScheduleAppointment | null;
    setSelectedAppointment: React.Dispatch<React.SetStateAction<ScheduleAppointment | null>>;
    patientHistory: Visit[] | null;
    setPatientHistory: React.Dispatch<React.SetStateAction<Visit[] | null>>;
    patientDataModal: any;
    setPatientDataModal: React.Dispatch<React.SetStateAction<any>>;
    patientDataLoading: boolean;
    setPatientDataLoading: React.Dispatch<React.SetStateAction<boolean>>;
    historyLoading: boolean;
    historyError: string | null;
    isMobile: boolean;
    fetchSchedule: () => void;
    openPatientHistory: (apt: ScheduleAppointment) => void;
    openTaskModal: (prefill?: { patientId?: string; patientName?: string; appointmentType?: string }) => void;
    tasks: EmployeeTask[];
    userId: string;
    userEmail: string;
}

// ─── Component ────────────────────────────────────────────────
export default function ScheduleTab({
    scheduleData,
    loading,
    currentWeekStart,
    setCurrentWeekStart,
    selectedAppointment,
    setSelectedAppointment,
    patientHistory,
    setPatientHistory,
    patientDataModal,
    setPatientDataModal,
    patientDataLoading,
    setPatientDataLoading,
    historyLoading,
    historyError,
    isMobile,
    fetchSchedule,
    openPatientHistory,
    openTaskModal,
    tasks,
    userId,
    userEmail,
}: ScheduleTabProps) {
    // ─── useSchedule hook (schedule interaction logic) ─────────
    const {
        scheduleContextMenu, setScheduleContextMenu,
        scheduleColors, scheduleIcons,
        hiddenDoctors, hiddenScheduleDays,
        isAppointmentPast,
        handleScheduleContextMenu,
        handleTouchStart, handleTouchEnd, handleTouchMove,
        handleChangeScheduleColor, handleAddScheduleIcon,
        navigateWeek, goToToday,
        getAppointmentsForCell, getAppointmentAtSlot, getAppointmentRowSpan,
        isToday, getVisibleDays,
        longPressFiredRef,
        toggleScheduleDay, toggleDoctor, showAllDoctors, hideAllDoctors,
        doctors, visibleDoctors, visibleDays, weekLabel,
    } = useSchedule({
        scheduleData, currentWeekStart, setCurrentWeekStart, fetchSchedule,
    });

    // ─── UI-only State (tooltips, modals, QR, consent, etc.) ─────
    const [hoveredAppointment, setHoveredAppointment] = useState<ScheduleAppointment | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [notesAppointment, setNotesAppointment] = useState<ScheduleAppointment | null>(null);
    const [notesTooltipPos, setNotesTooltipPos] = useState({ x: 0, y: 0 });
    const [badgeTooltip, setBadgeTooltip] = useState<{ badges: Badge[], x: number, y: number } | null>(null);
    const [qrModal, setQrModal] = useState<{ url: string; expiresAt: string } | null>(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [consentModalOpen, setConsentModalOpen] = useState(false);
    const [consentSelectedTypes, setConsentSelectedTypes] = useState<string[]>([]);
    const [consentGenerating, setConsentGenerating] = useState(false);
    const [consentUrl, setConsentUrl] = useState<string>("");
    const [patientConsents, setPatientConsents] = useState<any[]>([]);
    const [biometricPopoverId, setBiometricPopoverId] = useState<string | null>(null);
    const [bioExporting, setBioExporting] = useState<string | null>(null);
    const [patientSignature, setPatientSignature] = useState<string | null>(null);
    const [showSignature, setShowSignature] = useState(false);
    const [patientPdfUrl, setPatientPdfUrl] = useState<string | null>(null);
    const [intakeSubmissionId, setIntakeSubmissionId] = useState<string | null>(null);
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const [CONSENT_TYPES, setConsentTypes] = useState(HARDCODED_CONSENT_TYPES);

    // Load consent types from DB on mount (same pattern as zgody/[token]/page.tsx)
    useEffect(() => {
        fetch('/api/admin/consent-mappings')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    const mapped: Record<string, { label: string; file: string; fields: Record<string, any> }> = {};
                    for (const row of data) {
                        mapped[row.consent_key] = {
                            label: row.label,
                            file: row.pdf_file,
                            fields: row.fields,
                        };
                    }
                    setConsentTypes(mapped);
                }
            })
            .catch(() => { /* keep hardcoded fallback */ });
    }, []);

    return (<div>

        {/* Week Navigation */}
        <div style={{
            padding: '1.25rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Calendar size={20} style={{ color: '#38bdf8' }} />
                <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>
                    Grafik tygodniowy
                </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                    onClick={() => navigateWeek(-1)}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                    <ChevronLeft size={18} />
                </button>

                <button
                    onClick={goToToday}
                    style={{
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem 1rem',
                        color: '#38bdf8',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                >
                    Dziś
                </button>

                <span style={{
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    color: 'rgba(255,255,255,0.9)',
                    minWidth: '200px',
                    textAlign: 'center',
                }}>
                    {weekLabel}
                </span>

                <button
                    onClick={() => navigateWeek(1)}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                    <ChevronRight size={18} />
                </button>

                <button
                    onClick={fetchSchedule}
                    disabled={loading}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem',
                        color: loading ? 'rgba(255,255,255,0.3)' : '#fff',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.2s',
                    }}
                >
                    <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                </button>
            </div>
        </div>

        {/* Loading state */}
        {loading && (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '4rem 2rem',
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid rgba(56, 189, 248, 0.2)',
                        borderTop: '3px solid #38bdf8',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                        Ładowanie grafiku...
                    </p>
                </div>
            </div>
        )}

        {/* Schedule Grid */}
        {!loading && scheduleData && (
            <div style={{
                padding: '1rem',
            }}>
                {/* ═══ DAILY DASHBOARD ═══ */}
                {(() => {
                    const todayStr = new Date().toLocaleDateString('sv-SE');
                    const todayDay = scheduleData.days.find(d => d.date === todayStr);
                    const todayAppointments = todayDay?.appointments || [];
                    const totalWeek = scheduleData.days.reduce((sum, d) => sum + d.appointments.length, 0);

                    // Next appointment for today
                    const nowHHMM = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', hour12: false });
                    const upcoming = todayAppointments
                        .filter(a => a.startTime > nowHHMM && !a.isWorkingHour)
                        .sort((a, b) => a.startTime.localeCompare(b.startTime));
                    const nextApt = upcoming[0] || null;

                    // Urgent tasks
                    const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done' && t.status !== 'archived');
                    const pendingTasks = tasks.filter(t => t.status === 'todo');
                    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done' && t.status !== 'archived');

                    return (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '0.75rem',
                            marginBottom: '1rem',
                        }}>
                            {/* Today's appointments */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(56,189,248,0.02))',
                                border: '1px solid rgba(56,189,248,0.15)',
                                borderRadius: '0.75rem',
                                padding: '0.85rem 1rem',
                            }}>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>📋 Wizyty dziś</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#38bdf8' }}>
                                    {todayAppointments.filter(a => !a.isWorkingHour).length}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.15rem' }}>
                                    z {totalWeek} w całym tygodniu
                                </div>
                            </div>

                            {/* Next patient */}
                            <div style={{
                                background: nextApt
                                    ? 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))'
                                    : 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                                border: `1px solid ${nextApt ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: '0.75rem',
                                padding: '0.85rem 1rem',
                            }}>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>⏰ Następny pacjent</div>
                                {nextApt ? (
                                    <>
                                        <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#22c55e', marginBottom: '0.15rem' }}>
                                            {nextApt.startTime} — {nextApt.patientName}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                                            {nextApt.appointmentType} • {nextApt.doctorName?.split(' ').slice(0, 2).join(' ')}
                                            {nextApt.patientPhone && (
                                                <a href={`tel:${nextApt.patientPhone}`} onClick={e => e.stopPropagation()} style={{ color: '#38bdf8', textDecoration: 'none', marginLeft: '0.5rem' }}>
                                                    📞
                                                </a>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)' }}>
                                        {todayAppointments.length > 0 ? 'Brak więcej wizyt na dziś' : 'Brak wizyt na dziś'}
                                    </div>
                                )}
                            </div>

                            {/* Operators today */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(168,85,247,0.02))',
                                border: '1px solid rgba(168,85,247,0.15)',
                                borderRadius: '0.75rem',
                                padding: '0.85rem 1rem',
                            }}>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>👨‍⚕️ Operatorzy</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#c084fc' }}>
                                    {doctors.length}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.15rem' }}>
                                    aktywnych w tym tygodniu
                                </div>
                            </div>

                            {/* Tasks overview */}
                            <div style={{
                                background: urgentTasks.length > 0 || overdueTasks.length > 0
                                    ? 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))'
                                    : 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                                border: `1px solid ${urgentTasks.length > 0 || overdueTasks.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: '0.75rem',
                                padding: '0.85rem 1rem',
                            }}>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>✅ Zadania</div>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}>
                                    <span style={{ fontSize: '1.6rem', fontWeight: 'bold', color: urgentTasks.length > 0 ? '#ef4444' : pendingTasks.length > 0 ? '#f59e0b' : '#22c55e' }}>
                                        {pendingTasks.length}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>do zrobienia</span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.15rem', display: 'flex', gap: '0.75rem' }}>
                                    {urgentTasks.length > 0 && <span style={{ color: '#ef4444' }}>⚡ {urgentTasks.length} pilnych</span>}
                                    {overdueTasks.length > 0 && <span style={{ color: '#f59e0b' }}>⏰ {overdueTasks.length} po terminie</span>}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Day-of-week toggle bar */}
                <div style={{
                    marginBottom: '0.6rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '0.75rem',
                    padding: '0.55rem 0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginRight: '0.25rem', whiteSpace: 'nowrap' }}>Dni:</span>
                    {(['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'] as const).map((label, i) => {
                        // Map UI label index to JS day-of-week: Pn=1, Wt=2, ..., Sb=6, Nd=0
                        const jsDay = i < 6 ? i + 1 : 0; // Nd is last in UI (i=6) but JS day 0
                        const isVisible = !hiddenScheduleDays.has(jsDay);
                        return (
                            <button
                                key={label}
                                onClick={() => toggleScheduleDay(jsDay)}
                                title={isVisible ? `Ukryj ${label}` : `Pokaż ${label}`}
                                style={{
                                    padding: '0.2rem 0.5rem',
                                    background: isVisible ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${isVisible ? 'rgba(56,189,248,0.28)' : 'rgba(255,255,255,0.08)'}`,
                                    borderRadius: '5px',
                                    color: isVisible ? '#38bdf8' : 'rgba(255,255,255,0.25)',
                                    cursor: 'pointer',
                                    fontSize: '0.72rem',
                                    fontWeight: isVisible ? '600' : '400',
                                    transition: 'all 0.12s',
                                    minWidth: '28px',
                                    textAlign: 'center',
                                    textDecoration: isVisible ? 'none' : 'line-through',
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* Operator Toggle Bar */}
                <div style={{
                    marginBottom: '1rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '0.75rem',
                    padding: '0.75rem 1rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginRight: '0.25rem' }}>Operatorzy:</span>
                        <button
                            onClick={showAllDoctors}
                            style={{
                                padding: '0.25rem 0.6rem',
                                background: 'rgba(56, 189, 248, 0.1)',
                                border: '1px solid rgba(56, 189, 248, 0.2)',
                                borderRadius: '4px',
                                color: '#38bdf8',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                            }}
                        >Wszyscy</button>
                        <button
                            onClick={hideAllDoctors}
                            style={{
                                padding: '0.25rem 0.6rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '4px',
                                color: 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                            }}
                        >Żaden</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {doctors.map(doctor => {
                            const isVisible = !hiddenDoctors.has(doctor);
                            return (
                                <button
                                    key={doctor}
                                    onClick={() => toggleDoctor(doctor)}
                                    style={{
                                        padding: '0.3rem 0.7rem',
                                        background: isVisible ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${isVisible ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                                        borderRadius: '6px',
                                        color: isVisible ? '#38bdf8' : 'rgba(255,255,255,0.3)',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: isVisible ? '600' : '400',
                                        transition: 'all 0.15s',
                                        textDecoration: isVisible ? 'none' : 'line-through',
                                    }}
                                >
                                    {isVisible ? '✓ ' : ''}{doctor.split(' ').slice(0, 2).join(' ')}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* The grid table — scrollable container */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '1rem',
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        minWidth: `${(visibleDays.length * visibleDoctors.length * 120) + 80}px`,
                        tableLayout: 'fixed',
                    }}>
                        {/* Header Row 1: Day names */}
                        <thead>
                            <tr>
                                <th style={{
                                    width: '70px',
                                    minWidth: '70px',
                                    background: 'rgba(0,0,0,0.4)',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                    borderRight: '2px solid rgba(56, 189, 248, 0.2)',
                                    padding: '0.5rem',
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 10,
                                }}>
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Godzina</span>
                                </th>
                                {visibleDays.map((day) => (
                                    <th
                                        key={day.date}
                                        colSpan={visibleDoctors.length}
                                        style={{
                                            background: isToday(day.date) ? 'rgba(56, 189, 248, 0.12)' : 'rgba(0,0,0,0.4)',
                                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                                            borderRight: '2px solid rgba(255,255,255,0.1)',
                                            padding: '0.6rem 0.5rem 0.3rem',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <div style={{
                                            fontSize: '0.85rem',
                                            fontWeight: 'bold',
                                            color: isToday(day.date) ? '#38bdf8' : 'rgba(255,255,255,0.9)',
                                        }}>
                                            {day.dayName}
                                        </div>
                                        <div style={{
                                            fontSize: '0.7rem',
                                            color: isToday(day.date) ? '#38bdf8' : 'rgba(255,255,255,0.5)',
                                            fontWeight: isToday(day.date) ? '600' : '400',
                                        }}>
                                            {formatDateShort(day.date)}
                                            {isToday(day.date) && ' (dziś)'}
                                        </div>
                                    </th>
                                ))}
                            </tr>

                            {/* Header Row 2: Doctor names */}
                            <tr>
                                <th style={{
                                    background: 'rgba(0,0,0,0.4)',
                                    borderBottom: '2px solid rgba(56, 189, 248, 0.3)',
                                    borderRight: '2px solid rgba(56, 189, 248, 0.2)',
                                    padding: '0.4rem',
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 10,
                                }} />
                                {visibleDays.map((day) =>
                                    visibleDoctors.map((doctor, dIdx) => {
                                        // Count appointments for this doctor on this day
                                        const count = day.appointments.filter(a => a.doctorName === doctor).length;
                                        return (
                                            <th
                                                key={`${day.date}-${doctor}`}
                                                style={{
                                                    background: isToday(day.date) ? 'rgba(56, 189, 248, 0.06)' : 'rgba(0,0,0,0.3)',
                                                    borderBottom: '2px solid rgba(56, 189, 248, 0.3)',
                                                    borderRight: dIdx === visibleDoctors.length - 1
                                                        ? '2px solid rgba(255,255,255,0.1)'
                                                        : '1px solid rgba(255,255,255,0.05)',
                                                    padding: '0.35rem 0.25rem',
                                                    textAlign: 'center',
                                                    width: '120px',
                                                    minWidth: '120px',
                                                }}
                                            >
                                                <div style={{
                                                    fontSize: '0.65rem',
                                                    fontWeight: '600',
                                                    color: 'rgba(255,255,255,0.8)',
                                                    lineHeight: '1.2',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}>
                                                    {doctor.split(' ').slice(0, 2).join(' ')}
                                                </div>
                                                {count > 0 && (
                                                    <div style={{
                                                        fontSize: '0.6rem',
                                                        color: '#38bdf8',
                                                        marginTop: '2px',
                                                    }}>
                                                        {count} wiz.
                                                    </div>
                                                )}
                                            </th>
                                        );
                                    })
                                )}
                            </tr>
                        </thead>

                        {/* Body: Time slots */}
                        <tbody>
                            {TIME_SLOTS.map((slotTime, slotIdx) => {
                                const isHourStart = slotTime.endsWith(':00');
                                const isHalfHour = slotTime.endsWith(':30');
                                return (
                                    <tr key={slotTime}>
                                        {/* Time label */}
                                        <td style={{
                                            background: 'rgba(0,0,0,0.3)',
                                            borderRight: '2px solid rgba(56, 189, 248, 0.2)',
                                            borderBottom: isHourStart ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.03)',
                                            padding: '0 0.4rem',
                                            fontSize: '0.65rem',
                                            color: isHourStart ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                                            fontWeight: isHourStart ? '600' : '400',
                                            textAlign: 'right',
                                            height: '24px',
                                            position: 'sticky',
                                            left: 0,
                                            zIndex: 5,
                                            fontFamily: 'monospace',
                                        }}>
                                            {(isHourStart || isHalfHour) ? slotTime : ''}
                                        </td>

                                        {/* Cells for each doctor × day */}
                                        {visibleDays.map((day) =>
                                            visibleDoctors.map((doctor, dIdx) => {
                                                const dayAppointments = getAppointmentsForCell(doctor, day);
                                                const apt = getAppointmentAtSlot(dayAppointments, slotTime);

                                                // Check if this is the START of an appointment
                                                const isStart = apt && apt.startTime === slotTime;
                                                // If appointment continues from above, skip rendering
                                                if (apt && !isStart) {
                                                    // Firefox fix: hidden td instead of null for proper rowSpan rendering
                                                    return <td key={`${day.date}-${doctor}-${slotTime}`} style={{ display: 'none', padding: 0, border: 'none', height: 0, overflow: 'hidden' }} />;
                                                }

                                                const rowSpan = isStart ? getAppointmentRowSpan(apt) : 1;
                                                const color = isStart ? getAppointmentColor(apt.appointmentTypeId) : null;

                                                return (
                                                    <td
                                                        key={`${day.date}-${doctor}-${slotTime}`}
                                                        rowSpan={rowSpan}
                                                        style={{
                                                            borderBottom: isHourStart ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.02)',
                                                            borderRight: dIdx === visibleDoctors.length - 1
                                                                ? '2px solid rgba(255,255,255,0.08)'
                                                                : '1px solid rgba(255,255,255,0.03)',
                                                            padding: isStart ? '2px 3px' : '0',
                                                            verticalAlign: 'top',
                                                            height: '24px',
                                                            background: isToday(day.date)
                                                                ? 'rgba(56, 189, 248, 0.02)'
                                                                : 'transparent',
                                                            position: 'relative',
                                                        }}
                                                    >
                                                        {isStart && apt && color && (
                                                            <div
                                                                style={{
                                                                    background: color.bg,
                                                                    borderLeft: `3px solid ${color.border}`,
                                                                    borderRadius: '4px',
                                                                    padding: '3px 5px',
                                                                    height: '100%',
                                                                    overflow: 'hidden',
                                                                    cursor: 'pointer',
                                                                    transition: 'opacity 0.15s',
                                                                    position: 'relative',
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.opacity = '0.85';
                                                                    setHoveredAppointment(apt);
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setTooltipPos({
                                                                        x: rect.left + rect.width / 2,
                                                                        y: rect.bottom + 5,
                                                                    });
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.opacity = '1';
                                                                    setHoveredAppointment(null);
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (longPressFiredRef.current) return; // Don't open history after long-press
                                                                    if (apt.patientId) {
                                                                        openPatientHistory(apt);
                                                                    }
                                                                }}
                                                                onContextMenu={(e) => handleScheduleContextMenu(e, apt, day.date)}
                                                                onTouchStart={(e) => handleTouchStart(e, apt, day.date)}
                                                                onTouchEnd={handleTouchEnd}
                                                                onTouchMove={handleTouchMove}
                                                            >
                                                                {/* Notes icon — top-right corner */}
                                                                {apt.notes && (
                                                                    <div
                                                                        style={{
                                                                            position: 'absolute',
                                                                            top: '1px',
                                                                            right: '2px',
                                                                            width: '14px',
                                                                            height: '14px',
                                                                            borderRadius: '50%',
                                                                            background: 'rgba(0,0,0,0.35)',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontSize: '0.5rem',
                                                                            fontWeight: 'bold',
                                                                            color: '#fff',
                                                                            cursor: 'help',
                                                                            zIndex: 2,
                                                                            lineHeight: 1,
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.stopPropagation();
                                                                            setNotesAppointment(apt);
                                                                            setHoveredAppointment(null);
                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                            setNotesTooltipPos({
                                                                                x: rect.left + rect.width / 2,
                                                                                y: rect.bottom + 5,
                                                                            });
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.stopPropagation();
                                                                            setNotesAppointment(null);
                                                                        }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            e.preventDefault();
                                                                            if (notesAppointment?.id === apt.id) {
                                                                                setNotesAppointment(null);
                                                                            } else {
                                                                                setNotesAppointment(apt);
                                                                                setHoveredAppointment(null);
                                                                                setBadgeTooltip(null);
                                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                                setNotesTooltipPos({
                                                                                    x: rect.left + rect.width / 2,
                                                                                    y: rect.bottom + 5,
                                                                                });
                                                                            }
                                                                        }}
                                                                    >
                                                                        i
                                                                    </div>
                                                                )}
                                                                <div style={{
                                                                    fontSize: '0.6rem',
                                                                    fontWeight: 'bold',
                                                                    color: color.text,
                                                                    lineHeight: '1.2',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    paddingRight: apt.notes ? '14px' : '0',
                                                                }}>
                                                                    {apt.patientName}
                                                                </div>
                                                                {rowSpan > 1 && (
                                                                    <div style={{
                                                                        fontSize: '0.55rem',
                                                                        color: color.text,
                                                                        opacity: 0.8,
                                                                        marginTop: '1px',
                                                                        whiteSpace: 'nowrap',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                    }}>
                                                                        {apt.appointmentType}
                                                                    </div>
                                                                )}
                                                                {/* Badge icons — bottom-left corner */}
                                                                {apt.badges && apt.badges.length > 0 && (
                                                                    <div
                                                                        style={{
                                                                            position: 'absolute',
                                                                            bottom: '1px',
                                                                            left: '2px',
                                                                            display: 'flex',
                                                                            gap: '1px',
                                                                            zIndex: 2,
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.stopPropagation();
                                                                            setHoveredAppointment(null);
                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                            setBadgeTooltip({
                                                                                badges: apt.badges,
                                                                                x: rect.left + rect.width / 2,
                                                                                y: rect.top - 5,
                                                                            });
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.stopPropagation();
                                                                            setBadgeTooltip(null);
                                                                        }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            e.preventDefault();
                                                                            if (badgeTooltip) {
                                                                                setBadgeTooltip(null);
                                                                            } else {
                                                                                setHoveredAppointment(null);
                                                                                setNotesAppointment(null);
                                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                                setBadgeTooltip({
                                                                                    badges: apt.badges,
                                                                                    x: rect.left + rect.width / 2,
                                                                                    y: rect.top - 5,
                                                                                });
                                                                            }
                                                                        }}
                                                                    >
                                                                        {apt.badges.map((badge) => (
                                                                            <div
                                                                                key={badge.id}
                                                                                style={{
                                                                                    minWidth: '13px',
                                                                                    height: '13px',
                                                                                    borderRadius: '3px',
                                                                                    background: badge.color || '#888',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    fontSize: '0.4rem',
                                                                                    fontWeight: 'bold',
                                                                                    color: '#fff',
                                                                                    cursor: 'help',
                                                                                    lineHeight: 1,
                                                                                    padding: '0 1px',
                                                                                    textShadow: '0 0 2px rgba(0,0,0,0.5)',
                                                                                }}
                                                                            >
                                                                                {getBadgeLetter(badge.id)}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div style={{
                    marginTop: '1.5rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem' }}>Legenda:</span>
                    {Object.values(PRODENTIS_COLORS).map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '3px',
                                background: item.bg,
                                border: `1px solid ${item.border}`,
                            }} />
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Schedule Context Menu (right-click on appointment) */}
        {scheduleContextMenu && (
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'fixed',
                    left: `${Math.min(scheduleContextMenu.x, window.innerWidth - 300)}px`,
                    top: `${Math.min(scheduleContextMenu.y, window.innerHeight - 350)}px`,
                    background: 'rgba(15, 15, 20, 0.97)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    borderRadius: '0.75rem',
                    padding: '0.75rem',
                    zIndex: 2000,
                    minWidth: '260px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    boxShadow: '0 15px 50px rgba(0,0,0,0.6)',
                }}
            >
                {/* Header */}
                <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.5rem', paddingBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {scheduleContextMenu.apt.patientName}
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'normal', marginTop: '2px' }}>
                        {scheduleContextMenu.apt.startTime} — {scheduleContextMenu.apt.appointmentType}
                    </div>
                </div>

                {/* Color section */}
                <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', fontWeight: 'bold' }}>
                        🎨 Zmień typ wizyty
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {scheduleColors.map((c: any) => (
                            <button
                                key={c.id}
                                onClick={() => handleChangeScheduleColor(scheduleContextMenu.apt.id, c.id, c.name)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.2rem 0.4rem',
                                    background: scheduleContextMenu.apt.appointmentTypeId === c.id
                                        ? 'rgba(255,255,255,0.1)'
                                        : 'rgba(255,255,255,0.02)',
                                    border: scheduleContextMenu.apt.appointmentTypeId === c.id
                                        ? '1px solid rgba(255,255,255,0.3)'
                                        : '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '0.3rem',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <span style={{
                                    width: '16px', height: '16px', borderRadius: '3px', flexShrink: 0,
                                    background: c.rgb ? `rgb(${c.rgb.r},${c.rgb.g},${c.rgb.b})` : '#666',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                }} />
                                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.85)' }}>
                                    {c.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Icons section */}
                <div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', fontWeight: 'bold' }}>
                        🏷️ Dodaj ikonę
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {scheduleIcons.map((icon: any) => (
                            <button
                                key={icon.id}
                                onClick={() => handleAddScheduleIcon(scheduleContextMenu.apt.id, icon.id, icon.name)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.25rem 0.5rem',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '0.3rem',
                                    color: 'rgba(255,255,255,0.8)',
                                    cursor: 'pointer',
                                    fontSize: '0.68rem',
                                    textAlign: 'left',
                                }}
                            >
                                {icon.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Tooltip */}
        {hoveredAppointment && (
            <div style={{
                position: 'fixed',
                left: `${Math.min(tooltipPos.x, window.innerWidth - 280)}px`,
                top: `${Math.min(tooltipPos.y, window.innerHeight - 200)}px`,
                background: 'rgba(10, 10, 10, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '0.75rem',
                padding: '0.875rem 1rem',
                zIndex: 1000,
                minWidth: '240px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                pointerEvents: 'none',
                transform: 'translateX(-50%)',
            }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.5rem' }}>
                    {hoveredAppointment.patientName}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.75rem' }}>
                    <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                        ⏰ {hoveredAppointment.startTime} - {hoveredAppointment.endTime} ({hoveredAppointment.duration} min)
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                        🩺 {hoveredAppointment.doctorName}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                        📋 {hoveredAppointment.appointmentType}
                    </div>
                    {hoveredAppointment.patientPhone && (
                        <a href={`tel:${hoveredAppointment.patientPhone}`} onClick={e => e.stopPropagation()} style={{ color: '#38bdf8', textDecoration: 'none', display: 'block' }}>
                            📞 {hoveredAppointment.patientPhone}
                        </a>
                    )}
                </div>
            </div>
        )}

        {/* Notes Tooltip */}
        {notesAppointment && notesAppointment.notes && (
            <div style={{
                position: 'fixed',
                left: `${Math.min(notesTooltipPos.x, typeof window !== 'undefined' ? window.innerWidth - 320 : 600)}px`,
                top: `${Math.min(notesTooltipPos.y, typeof window !== 'undefined' ? window.innerHeight - 250 : 400)}px`,
                background: 'rgba(10, 10, 10, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
                zIndex: 1001,
                minWidth: '200px',
                maxWidth: '320px',
                maxHeight: '250px',
                overflowY: 'auto',
                boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                pointerEvents: 'auto',
                transform: 'translateX(-50%)',
            }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    marginBottom: '0.5rem',
                    borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
                    paddingBottom: '0.4rem',
                }}>
                    <span style={{ fontSize: '0.8rem' }}>ℹ️</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#38bdf8' }}>
                        Notatka — {notesAppointment.patientName}
                    </span>
                </div>
                <div style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.85)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.5',
                    wordBreak: 'break-word',
                }}>
                    {notesAppointment.notes}
                </div>
            </div>
        )}

        {/* Badge Tooltip */}
        {badgeTooltip && (
            <div style={{
                position: 'fixed',
                left: `${Math.min(badgeTooltip.x, typeof window !== 'undefined' ? window.innerWidth - 250 : 500)}px`,
                top: `${Math.max(badgeTooltip.y - 10, 10)}px`,
                background: 'rgba(10, 10, 10, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '0.6rem',
                padding: '0.5rem 0.75rem',
                zIndex: 1001,
                minWidth: '140px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                pointerEvents: 'auto',
                transform: 'translateX(-50%) translateY(-100%)',
            }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem' }}>
                    Odznaczenia
                </div>
                {badgeTooltip.badges.map((badge) => (
                    <div key={badge.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.15rem 0',
                        fontSize: '0.75rem',
                    }}>
                        <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '3px',
                            background: badge.color || '#888',
                            flexShrink: 0,
                        }} />
                        <span style={{ color: 'rgba(255,255,255,0.9)' }}>
                            {badge.name}
                        </span>
                    </div>
                ))}
            </div>
        )}

        {/* Patient History Modal */}
        {selectedAppointment && (
            <div
                onClick={() => setSelectedAppointment(null)}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                }}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: 'linear-gradient(135deg, #0d1b2a 0%, #1b2838 100%)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        borderRadius: '1rem',
                        width: '100%',
                        maxWidth: '700px',
                        maxHeight: '85vh',
                        overflowY: 'auto',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                    }}
                >
                    {/* Modal Header */}
                    <div style={{
                        position: 'sticky',
                        top: 0,
                        background: 'linear-gradient(135deg, #0d1b2a, #1b2838)',
                        borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        zIndex: 1,
                        borderRadius: '1rem 1rem 0 0',
                    }}>
                        <div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.3rem' }}>
                                {selectedAppointment.patientName}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                {selectedAppointment.appointmentType} • {selectedAppointment.doctorName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.15rem' }}>
                                {selectedAppointment.startTime} – {selectedAppointment.endTime} ({selectedAppointment.duration} min)
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '260px' }}>
                            {/* E-Karta QR button */}
                            <button
                                onClick={async () => {
                                    setQrLoading(true);
                                    try {
                                        const supabase = createBrowserClient(
                                            process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                                        );
                                        const { data: { user } } = await supabase.auth.getUser();
                                        const employee = user?.email || 'pracownik';
                                        const res = await fetch('/api/intake/generate-token', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                prodentisPatientId: selectedAppointment.patientId || undefined,
                                                // Fetch real firstName/lastName from Prodentis details API
                                                // (patientName from grafik is a single string — splitting is unreliable)
                                                ...(await (async () => {
                                                    if (!selectedAppointment.patientId) return {};
                                                    try {
                                                        const detRes = await fetch(`/api/employee/patient-details?patientId=${selectedAppointment.patientId}`);
                                                        if (detRes.ok) {
                                                            const det = await detRes.json();
                                                            return {
                                                                prefillFirstName: det.firstName || '',
                                                                prefillLastName: det.lastName || '',
                                                            };
                                                        }
                                                    } catch { /* fall through */ }
                                                    return {};
                                                })()),
                                                appointmentId: selectedAppointment.id,
                                                appointmentDate: selectedAppointment.startTime,
                                                appointmentType: selectedAppointment.appointmentType,
                                                createdByEmployee: employee,
                                                expiresInHours: 2,
                                            }),
                                        });
                                        const data = await res.json();
                                        if (data.url) setQrModal({ url: data.url, expiresAt: data.expiresAt });
                                    } catch { alert('Błąd generowania kodu QR'); }
                                    finally { setQrLoading(false); }
                                }}
                                style={{
                                    background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    padding: '0.4rem 0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    color: '#fff',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                                title="Generuj kod QR do e-karty pacjenta"
                                disabled={qrLoading}
                            >
                                {qrLoading ? '⏳' : '📋'} E-Karta
                            </button>
                            {/* Patient Data button */}
                            <button
                                onClick={async () => {
                                    if (!selectedAppointment?.patientId) return;
                                    setPatientDataLoading(true);
                                    try {
                                        const res = await fetch(`/api/employee/patient-details?patientId=${selectedAppointment.patientId}`);
                                        if (res.ok) {
                                            const data = await res.json();
                                            setPatientDataModal(data);
                                        } else {
                                            alert('Nie udało się pobrać danych pacjenta');
                                        }
                                    } catch { alert('Błąd połączenia z Prodentis'); }
                                    finally { setPatientDataLoading(false); }
                                }}
                                style={{
                                    background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    padding: '0.4rem 0.65rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    color: '#fff',
                                    fontSize: '0.72rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                                title="Pokaż dane pacjenta z Prodentis"
                                disabled={patientDataLoading || !selectedAppointment?.patientId}
                            >
                                {patientDataLoading ? '⏳' : '👤'} Dane
                            </button>
                            <button
                                onClick={() => {
                                    openTaskModal({
                                        patientId: selectedAppointment.patientId,
                                        patientName: selectedAppointment.patientName,
                                        appointmentType: selectedAppointment.appointmentType,
                                    });
                                }}
                                style={{
                                    background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    padding: '0.4rem 0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    color: '#fff',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <Plus size={14} /> Zadanie
                            </button>
                            {/* Consent signing button */}
                            <button
                                onClick={async () => {
                                    setConsentModalOpen(true);
                                    setConsentSelectedTypes([]);
                                    setConsentUrl('');
                                    setShowSignature(false);
                                    setPatientPdfUrl(null);
                                    setIntakeSubmissionId(null);
                                    if (selectedAppointment.patientId) {
                                        try {
                                            const [consentsRes, intakeRes] = await Promise.all([
                                                fetch(`/api/employee/patient-consents?prodentisId=${selectedAppointment.patientId}`),
                                                fetch(`/api/employee/patient-intake?prodentisId=${selectedAppointment.patientId}`),
                                            ]);
                                            if (consentsRes.ok) {
                                                const d = await consentsRes.json();
                                                setPatientConsents(d.consents || []);
                                            }
                                            if (intakeRes.ok) {
                                                const d = await intakeRes.json();
                                                setPatientSignature(d.intake?.signatureData || null);
                                                setPatientPdfUrl(d.intake?.pdfUrl || null);
                                                setIntakeSubmissionId(d.intake?.id || null);
                                            }
                                        } catch { /* ignore */ }
                                    }
                                }}
                                style={{
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    padding: '0.4rem 0.65rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    color: '#fff',
                                    fontSize: '0.72rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                                title="Generuj link do podpisania zgód"
                            >
                                📝 Zgody
                            </button>
                            <button
                                onClick={() => setSelectedAppointment(null)}
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '0.5rem',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontSize: '1.1rem',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Modal Body */}
                    <div style={{ padding: '1.25rem 1.5rem' }}>
                        {historyLoading && (
                            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    border: '3px solid rgba(56, 189, 248, 0.2)',
                                    borderTop: '3px solid #38bdf8',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite',
                                    margin: '0 auto 1rem',
                                }} />
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                                    Ładowanie historii wizyt...
                                </p>
                            </div>
                        )}

                        {historyError && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '0.75rem',
                                padding: '1rem',
                                color: '#ef4444',
                                fontSize: '0.85rem',
                                textAlign: 'center',
                            }}>
                                ❌ {historyError}
                            </div>
                        )}

                        {patientHistory && patientHistory.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                                    Brak historii wizyt dla tego pacjenta
                                </p>
                            </div>
                        )}

                        {patientHistory && patientHistory.length > 0 && (
                            <div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'rgba(255,255,255,0.5)',
                                    marginBottom: '1rem',
                                }}>
                                    Historia wizyt ({patientHistory.length})
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {patientHistory.map((visit, idx) => (
                                        <div key={idx} style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '0.75rem',
                                            padding: '1rem',
                                        }}>
                                            {/* Visit header */}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                marginBottom: visit.medicalDetails ? '0.75rem' : '0',
                                                flexWrap: 'wrap',
                                                gap: '0.5rem',
                                            }}>
                                                <div>
                                                    <div style={{ color: '#38bdf8', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                                                        {new Date(visit.date).toLocaleDateString('pl-PL', {
                                                            weekday: 'short',
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </div>
                                                    <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                        {visit.doctor?.name || 'Nieznany lekarz'}
                                                    </div>
                                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                                                        {new Date(visit.date).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                                        {visit.endDate && ` – ${new Date(visit.endDate).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}>
                                                        {visit.cost ? visit.cost.toFixed(2) : '0.00'} PLN
                                                    </div>
                                                    <div style={{
                                                        display: 'inline-block',
                                                        padding: '0.2rem 0.6rem',
                                                        background: visit.balance === 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                                                        border: `1px solid ${visit.balance === 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(249, 115, 22, 0.3)'}`,
                                                        borderRadius: '99px',
                                                        color: visit.balance === 0 ? '#22c55e' : '#f97316',
                                                        fontSize: '0.65rem',
                                                        fontWeight: 'bold',
                                                        marginTop: '0.25rem',
                                                    }}>
                                                        {visit.balance === 0 ? '✓ Opłacono' : `Do zapłaty: ${(visit.balance || 0).toFixed(2)} PLN`}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Medical Details */}
                                            {visit.medicalDetails && (
                                                <div style={{
                                                    background: 'rgba(0, 0, 0, 0.2)',
                                                    borderRadius: '0.5rem',
                                                    padding: '0.85rem',
                                                }}>
                                                    {visit.medicalDetails.visitDescription && (
                                                        <div style={{ marginBottom: '0.75rem' }}>
                                                            <div style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                                                                📝 Opis wizyty
                                                            </div>
                                                            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                                                                {visit.medicalDetails.visitDescription}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {visit.medicalDetails.diagnosis && (
                                                        <div style={{ marginBottom: '0.75rem' }}>
                                                            <div style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                                                                🔬 Rozpoznanie
                                                            </div>
                                                            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
                                                                {visit.medicalDetails.diagnosis}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {visit.medicalDetails.procedures && visit.medicalDetails.procedures.length > 0 && (
                                                        <div style={{ marginBottom: '0.75rem' }}>
                                                            <div style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                                                                🦷 Procedury
                                                            </div>
                                                            {visit.medicalDetails.procedures.map((proc, pidx) => (
                                                                <div key={pidx} style={{
                                                                    background: 'rgba(255,255,255,0.03)',
                                                                    padding: '0.5rem 0.6rem',
                                                                    borderRadius: '0.35rem',
                                                                    marginBottom: '0.35rem',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'flex-start',
                                                                    gap: '0.5rem',
                                                                }}>
                                                                    <div>
                                                                        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                                            {proc.procedureName} {proc.tooth && `(ząb ${proc.tooth})`}
                                                                        </div>
                                                                        {proc.diagnosis && (
                                                                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginTop: '0.15rem' }}>
                                                                                {proc.diagnosis}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                                        {(proc.price || 0).toFixed(2)} PLN
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {visit.medicalDetails.recommendations && (
                                                        <div style={{ marginBottom: '0.75rem' }}>
                                                            <div style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                                                                💊 Zalecenia
                                                            </div>
                                                            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                                                                {visit.medicalDetails.recommendations}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {visit.medicalDetails.medications && visit.medicalDetails.medications.length > 0 && (
                                                        <div>
                                                            <div style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                                                                💉 Leki
                                                            </div>
                                                            {visit.medicalDetails.medications.map((med, midx) => (
                                                                <div key={midx} style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                                                                    • {med.name}{med.dosage ? ` — ${med.dosage}` : ''}{med.duration ? ` (${med.duration})` : ''}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
        }



        {/* ═══ CONSENT MODAL ═══ */}
        {
            consentModalOpen && selectedAppointment && (
                <div
                    onClick={() => setConsentModalOpen(false)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 3000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '1rem',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(135deg, #0d1b2a, #1b2838)',
                            border: '1px solid rgba(56,189,248,0.2)',
                            borderRadius: '1rem',
                            width: '100%', maxWidth: '550px',
                            maxHeight: '85vh', overflowY: 'auto',
                            padding: '1.5rem',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>📝 Zgody pacjenta</h3>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.15rem' }}>
                                    {selectedAppointment.patientName}
                                </div>
                            </div>
                            <button
                                onClick={() => setConsentModalOpen(false)}
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', width: '28px', height: '28px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >✕</button>
                        </div>

                        {/* Token generation */}
                        {!consentUrl ? (
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                    Wybierz zgody do podpisania:
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.75rem' }}>
                                    <button
                                        onClick={() => {
                                            const allKeys = Object.keys(CONSENT_TYPES);
                                            setConsentSelectedTypes(prev => prev.length === allKeys.length ? [] : allKeys);
                                        }}
                                        style={{
                                            padding: '0.35rem 0.6rem',
                                            background: consentSelectedTypes.length === Object.keys(CONSENT_TYPES).length ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '0.4rem',
                                            color: '#fff', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold',
                                        }}
                                    >
                                        {consentSelectedTypes.length === Object.keys(CONSENT_TYPES).length ? '✅ Odznacz wszystkie' : '☐ Zaznacz wszystkie'}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
                                    {Object.entries(CONSENT_TYPES).map(([key, val]) => (
                                        <label
                                            key={key}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                padding: '0.4rem 0.6rem',
                                                background: consentSelectedTypes.includes(key) ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.02)',
                                                border: consentSelectedTypes.includes(key) ? '1px solid rgba(56,189,248,0.2)' : '1px solid rgba(255,255,255,0.06)',
                                                borderRadius: '0.4rem',
                                                cursor: 'pointer',
                                                fontSize: '0.78rem', color: '#fff',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={consentSelectedTypes.includes(key)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setConsentSelectedTypes(p => [...p, key]);
                                                    else setConsentSelectedTypes(p => p.filter(t => t !== key));
                                                }}
                                                style={{ accentColor: '#38bdf8' }}
                                            />
                                            {val.label}
                                        </label>
                                    ))}
                                </div>
                                <button
                                    disabled={!consentSelectedTypes.length || consentGenerating}
                                    onClick={async () => {
                                        setConsentGenerating(true);
                                        try {
                                            const res = await fetch('/api/employee/consent-tokens', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    patientName: selectedAppointment.patientName,
                                                    prodentisPatientId: selectedAppointment.patientId || undefined,
                                                    consentTypes: consentSelectedTypes,
                                                }),
                                            });
                                            const data = await res.json();
                                            if (data.url) setConsentUrl(data.url);
                                            else alert(`Błąd: ${data.error}`);
                                        } catch { alert('Błąd połączenia'); }
                                        finally { setConsentGenerating(false); }
                                    }}
                                    style={{
                                        width: '100%', padding: '0.7rem',
                                        background: consentSelectedTypes.length ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.06)',
                                        border: 'none', borderRadius: '0.5rem',
                                        color: '#fff', fontWeight: 'bold', fontSize: '0.85rem',
                                        cursor: consentSelectedTypes.length ? 'pointer' : 'default',
                                        opacity: (!consentSelectedTypes.length || consentGenerating) ? 0.5 : 1,
                                    }}
                                >
                                    {consentGenerating ? '⏳ Generuję...' : `📝 Generuj link (${consentSelectedTypes.length} zgód)`}
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
                                    Link do podpisania zgód:
                                </div>
                                <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '1rem', display: 'inline-block', marginBottom: '0.75rem' }}>
                                    <QRCodeSVG value={consentUrl} size={180} />
                                </div>
                                <div style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '0.5rem',
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.7rem',
                                    color: '#38bdf8',
                                    wordBreak: 'break-all',
                                    marginBottom: '0.5rem',
                                }}>
                                    {consentUrl}
                                </div>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(consentUrl); alert('Link skopiowany!'); }}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(56,189,248,0.15)',
                                        border: '1px solid rgba(56,189,248,0.3)',
                                        borderRadius: '0.4rem',
                                        color: '#38bdf8', fontSize: '0.78rem', cursor: 'pointer',
                                    }}
                                >
                                    📋 Kopiuj link
                                </button>
                            </div>
                        )}

                        {/* Signed consents */}
                        {patientConsents.length > 0 && (
                            <div style={{ marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                    ✅ Podpisane zgody ({patientConsents.length})
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {patientConsents.map((c: any) => {
                                        const bio = c.biometric_data;
                                        const hasBio = bio && (bio.pointCount > 0 || bio.strokes?.length > 0);
                                        const pType = bio?.deviceInfo?.pointerType || bio?.pointerType || 'unknown';
                                        const pts = bio?.pointCount || bio?.strokes?.reduce((s: number, st: any) => s + st.points.length, 0) || 0;
                                        const isPopoverOpen = biometricPopoverId === c.id;
                                        return (
                                            <div key={c.id} style={{ position: 'relative' }}>
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '0.5rem 0.6rem',
                                                    background: 'rgba(34,197,94,0.06)',
                                                    border: '1px solid rgba(34,197,94,0.15)',
                                                    borderRadius: '0.4rem',
                                                    gap: '0.5rem',
                                                }}>
                                                    <a href={c.file_url} target="_blank" rel="noopener noreferrer"
                                                        style={{ fontSize: '0.75rem', color: '#fff', textDecoration: 'none', flex: 1, minWidth: 0 }}
                                                    >
                                                        📄 {c.consent_label}
                                                    </a>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                                                        {hasBio && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setBiometricPopoverId(isPopoverOpen ? null : c.id); }}
                                                                style={{
                                                                    padding: '0.15rem 0.4rem',
                                                                    fontSize: '0.6rem',
                                                                    background: pType === 'pen' ? 'rgba(56,189,248,0.12)' : pType === 'touch' ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.06)',
                                                                    border: `1px solid ${pType === 'pen' ? 'rgba(56,189,248,0.25)' : pType === 'touch' ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.12)'}`,
                                                                    borderRadius: '0.3rem',
                                                                    color: pType === 'pen' ? '#38bdf8' : pType === 'touch' ? '#c084fc' : 'rgba(255,255,255,0.5)',
                                                                    cursor: 'pointer',
                                                                    whiteSpace: 'nowrap',
                                                                }}
                                                                title="Dane biometryczne podpisu"
                                                            >
                                                                {pType === 'pen' ? '🖊️' : pType === 'touch' ? '👆' : '🖱️'}
                                                                {' '}{pts} pts
                                                            </button>
                                                        )}
                                                        {(() => {
                                                            const meta = c.metadata || {};
                                                            const autoExported = meta.biometric_auto_exported;
                                                            const manualExported = meta.biometric_exported_at && !autoExported;
                                                            const exportFailed = meta.biometric_export_results?.errors?.length > 0 && !meta.biometric_export_results?.signatureExported && !meta.biometric_export_results?.biometricExported;
                                                            if (exportFailed) return <span title="Eksport nieudany" style={{ fontSize: '0.55rem', color: '#ef4444' }}>❌</span>;
                                                            if (autoExported) return <span title={`Auto-eksport: ${meta.biometric_exported_at}`} style={{ fontSize: '0.55rem', color: '#22c55e' }}>✅</span>;
                                                            if (manualExported) return <span title={`Eksportowano: ${meta.biometric_exported_at}`} style={{ fontSize: '0.55rem', color: '#38bdf8' }}>📤</span>;
                                                            return null;
                                                        })()}
                                                        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' }}>
                                                            {new Date(c.signed_at).toLocaleDateString('pl-PL')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Biometric Popover */}
                                                {isPopoverOpen && hasBio && (
                                                    <div style={{
                                                        position: 'absolute', top: '100%', right: 0, zIndex: 100,
                                                        marginTop: '0.3rem',
                                                        width: '280px',
                                                        background: 'rgba(15,15,25,0.97)',
                                                        border: '1px solid rgba(56,189,248,0.2)',
                                                        borderRadius: '0.6rem',
                                                        padding: '0.75rem',
                                                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                                    }}>
                                                        <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#38bdf8', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span>🖊️ Dane biometryczne</span>
                                                            <button onClick={() => setBiometricPopoverId(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', fontSize: '0.65rem' }}>
                                                            <div style={{ padding: '0.3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.3rem' }}>
                                                                <div style={{ color: 'rgba(255,255,255,0.4)' }}>Urządzenie</div>
                                                                <div style={{ color: '#fff', fontWeight: '600' }}>
                                                                    {pType === 'pen' ? '🖊️ Rysik' : pType === 'touch' ? '👆 Palec' : '🖱️ Mysz'}
                                                                </div>
                                                            </div>
                                                            <div style={{ padding: '0.3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.3rem' }}>
                                                                <div style={{ color: 'rgba(255,255,255,0.4)' }}>Punkty</div>
                                                                <div style={{ color: '#fff', fontWeight: '600' }}>{pts}</div>
                                                            </div>
                                                            <div style={{ padding: '0.3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.3rem' }}>
                                                                <div style={{ color: 'rgba(255,255,255,0.4)' }}>Śr. nacisk</div>
                                                                <div style={{ color: '#fff', fontWeight: '600' }}>
                                                                    {bio.avgPressure != null ? bio.avgPressure.toFixed(3) : '—'}
                                                                </div>
                                                            </div>
                                                            <div style={{ padding: '0.3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.3rem' }}>
                                                                <div style={{ color: 'rgba(255,255,255,0.4)' }}>Max nacisk</div>
                                                                <div style={{ color: '#fff', fontWeight: '600' }}>
                                                                    {bio.maxPressure != null ? bio.maxPressure.toFixed(3) : '—'}
                                                                </div>
                                                            </div>
                                                            <div style={{ padding: '0.3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.3rem' }}>
                                                                <div style={{ color: 'rgba(255,255,255,0.4)' }}>Kreski</div>
                                                                <div style={{ color: '#fff', fontWeight: '600' }}>
                                                                    {bio.strokeCount || bio.strokes?.length || '—'}
                                                                </div>
                                                            </div>
                                                            <div style={{ padding: '0.3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.3rem' }}>
                                                                <div style={{ color: 'rgba(255,255,255,0.4)' }}>Czas</div>
                                                                <div style={{ color: '#fff', fontWeight: '600' }}>
                                                                    {bio.totalDuration != null ? `${(bio.totalDuration / 1000).toFixed(1)}s` : '—'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* Signature preview */}
                                                        {c.signature_data && (
                                                            <div style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.3rem', padding: '0.3rem', textAlign: 'center' }}>
                                                                <img src={c.signature_data} alt="Podpis" style={{ maxWidth: '100%', maxHeight: '60px' }} />
                                                            </div>
                                                        )}
                                                        {/* Export button */}
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                setBioExporting(c.id);
                                                                try {
                                                                    const res = await fetch('/api/employee/export-biometric', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ consentId: c.id }),
                                                                    });
                                                                    const data = await res.json();
                                                                    if (data.success) {
                                                                        alert(`✅ Eksport zakończony!\n${data.signatureExported ? '✅ Podpis PNG' : '❌ Podpis'}\n${data.biometricExported ? '✅ Biometria JSON' : '❌ Biometria'}`);
                                                                    } else {
                                                                        alert(`❌ Błąd eksportu: ${data.error || data.errors?.join(', ')}`);
                                                                    }
                                                                } catch (err: any) {
                                                                    alert(`❌ Błąd: ${err.message}`);
                                                                } finally {
                                                                    setBioExporting(null);
                                                                }
                                                            }}
                                                            disabled={bioExporting === c.id}
                                                            style={{
                                                                width: '100%', marginTop: '0.5rem',
                                                                padding: '0.4rem',
                                                                background: bioExporting === c.id ? 'rgba(255,255,255,0.05)' : 'rgba(56,189,248,0.1)',
                                                                border: '1px solid rgba(56,189,248,0.2)',
                                                                borderRadius: '0.3rem',
                                                                color: '#38bdf8',
                                                                fontSize: '0.68rem',
                                                                fontWeight: '600',
                                                                cursor: bioExporting === c.id ? 'wait' : 'pointer',
                                                            }}
                                                        >
                                                            {bioExporting === c.id ? '⏳ Eksportowanie...' : '📤 Eksportuj na serwer Prodentis'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* E-karta PDF + signature — always visible */}
                        <div style={{ marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                📋 E-Karta pacjenta
                            </div>

                            {!(patientPdfUrl || patientSignature || intakeSubmissionId) && (
                                <div style={{
                                    padding: '0.6rem 0.75rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '0.4rem',
                                    fontSize: '0.75rem',
                                    color: 'rgba(255,255,255,0.4)',
                                    textAlign: 'center',
                                }}>
                                    Pacjent nie wypełnił jeszcze e-karty
                                </div>
                            )}

                            {(patientPdfUrl || patientSignature || intakeSubmissionId) && (
                                <>

                                    {/* PDF link */}
                                    {patientPdfUrl && (
                                        <a
                                            href={patientPdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '0.5rem 0.7rem',
                                                background: 'rgba(56,189,248,0.06)',
                                                border: '1px solid rgba(56,189,248,0.15)',
                                                borderRadius: '0.4rem',
                                                textDecoration: 'none',
                                                marginBottom: '0.4rem',
                                            }}
                                        >
                                            <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>📄 Otwórz PDF e-karty</span>
                                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>↗</span>
                                        </a>
                                    )}

                                    {/* Generate / Regenerate PDF button */}
                                    {intakeSubmissionId && (
                                        <button
                                            onClick={async () => {
                                                setPdfGenerating(true);
                                                try {
                                                    const res = await fetch('/api/intake/generate-pdf', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ submissionId: intakeSubmissionId }),
                                                    });
                                                    const data = await res.json();
                                                    if (data.pdfUrl) {
                                                        // Add cache buster to force reload
                                                        setPatientPdfUrl(data.pdfUrl + '?t=' + Date.now());
                                                    } else {
                                                        alert(`Błąd: ${data.error || 'Nie udało się wygenerować PDF'}`);
                                                    }
                                                } catch { alert('Błąd połączenia'); }
                                                finally { setPdfGenerating(false); }
                                            }}
                                            disabled={pdfGenerating}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                padding: '0.45rem 0.7rem',
                                                background: pdfGenerating ? 'rgba(255,255,255,0.04)' : patientPdfUrl ? 'rgba(255,255,255,0.04)' : 'rgba(56,189,248,0.1)',
                                                border: `1px solid ${patientPdfUrl ? 'rgba(255,255,255,0.1)' : 'rgba(56,189,248,0.2)'}`,
                                                borderRadius: '0.4rem',
                                                color: patientPdfUrl ? 'rgba(255,255,255,0.5)' : '#38bdf8',
                                                fontSize: '0.75rem', fontWeight: '600',
                                                cursor: pdfGenerating ? 'wait' : 'pointer',
                                                marginBottom: '0.4rem',
                                                width: '100%',
                                            }}
                                        >
                                            {pdfGenerating ? '⏳ Generuję PDF...' : patientPdfUrl ? '🔄 Regeneruj PDF' : '📄 Generuj PDF e-karty'}
                                        </button>
                                    )}

                                    {/* Signature toggle */}
                                    {patientSignature && (
                                        <div style={{ marginTop: '0.4rem' }}>
                                            <button
                                                onClick={() => setShowSignature(!showSignature)}
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem',
                                                }}
                                            >
                                                ✍️ {showSignature ? 'Ukryj' : 'Pokaż'} podpis e-karty
                                            </button>
                                            {showSignature && (
                                                <div style={{
                                                    background: '#fff',
                                                    borderRadius: '0.5rem',
                                                    padding: '0.75rem',
                                                    marginTop: '0.5rem',
                                                    textAlign: 'center',
                                                }}>
                                                    <img
                                                        src={patientSignature}
                                                        alt="Podpis pacjenta"
                                                        style={{ maxWidth: '100%', maxHeight: '150px' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        {/* ═══ E-KARTA QR CODE MODAL ═══ */}
        {qrModal && (
            <div
                onClick={() => setQrModal(null)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            >
                <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, #0d1b2a, #1b2838)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '1rem', padding: '2rem', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>E-Karta Pacjenta</div>
                    <h3 style={{ margin: '0 0 1.25rem', color: '#4ade80', fontSize: '1.1rem' }}>
                        {selectedAppointment?.patientName}
                    </h3>
                    {/* QR Code */}
                    <div style={{ background: '#fff', display: 'inline-block', padding: '12px', borderRadius: '0.75rem', marginBottom: '1rem' }}>
                        <QRCodeSVG
                            value={qrModal.url}
                            size={200}
                            level="M"
                            includeMargin={false}
                        />
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        Pacjent skanuje kod swoim telefonem i wypełnia dane
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginBottom: '1.25rem' }}>
                        Ważny do: {new Date(qrModal.expiresAt).toLocaleString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={() => navigator.clipboard?.writeText(qrModal.url)}
                            style={{ flex: 1, padding: '0.6rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', color: '#e2e8f0', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                            📋 Kopiuj link
                        </button>
                        <button
                            onClick={() => setQrModal(null)}
                            style={{ flex: 1, padding: '0.6rem', background: 'linear-gradient(135deg, #4ade80, #22c55e)', border: 'none', borderRadius: '0.5rem', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                            ✓ Gotowe
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>);
}
