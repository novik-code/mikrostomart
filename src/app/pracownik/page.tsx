"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { LogOut, ChevronLeft, ChevronRight, Calendar, RefreshCw } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────
interface Badge {
    id: string;
    name: string;
    color: string | null;
}

interface ScheduleAppointment {
    id: string;
    patientName: string;
    patientId: string;
    doctorName: string;
    doctorId: string;
    startTime: string;
    endTime: string;
    duration: number;
    appointmentType: string;
    appointmentTypeId: string;
    isWorkingHour: boolean;
    patientPhone: string;
    notes: string | null;
    badges: Badge[];
}

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

interface ScheduleDay {
    date: string;
    dayName: string;
    appointments: ScheduleAppointment[];
}

interface ScheduleData {
    weekStart: string;
    days: ScheduleDay[];
    doctors: string[];
}

// ─── Prodentis appointment type color map (by ID, matching desktop app) ────
const PRODENTIS_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
    '0000000001': { bg: '#FFD700', border: '#DAA520', text: '#000', label: 'Zachowawcza' },       // zachowawcza — yellow
    '0000000003': { bg: '#FF00FF', border: '#CC00CC', text: '#fff', label: 'Chirurgia' },          // chirurgia — magenta
    '0000000006': { bg: '#FFA500', border: '#E08900', text: '#000', label: 'Pierwsza wizyta' },    // pierwsza wizyta — orange
    '0000000010': { bg: '#00CC00', border: '#009900', text: '#000', label: 'Protetyka' },          // protetyka — green
    '0000000012': { bg: '#FFFF00', border: '#CCCC00', text: '#000', label: 'Konsultacja' },        // konsultacja — bright yellow
    '0000000014': { bg: '#00CCCC', border: '#009999', text: '#000', label: 'Higienizacja' },       // higienizacja — cyan/teal
    '0000000016': { bg: '#00FF00', border: '#00CC00', text: '#000', label: 'KONTROLA' },           // KONTROLA — bright green
    '0000000027': { bg: '#6699FF', border: '#3366CC', text: '#fff', label: 'Gabinet nr 1' },       // Gabinet nr 1 — blue
    '0000000029': { bg: '#FF0000', border: '#CC0000', text: '#fff', label: 'LASER' },              // LASER — red
    '0000000030': { bg: '#FF66CC', border: '#CC3399', text: '#000', label: 'Odbudowa do ENDO' },   // odbudowa do ENDO — pink
    '0000000033': { bg: '#FF3333', border: '#CC0000', text: '#fff', label: 'ORTODONCJA' },         // ORTODONCJA — red
    '0000000034': { bg: '#CC99FF', border: '#9966CC', text: '#000', label: 'Endodoncja' },         // endodoncja — purple
    '0000000035': { bg: '#FFFFFF', border: '#CCCCCC', text: '#000', label: 'Wolny termin' },       // wolny termin — white
    '0000000036': { bg: '#999999', border: '#666666', text: '#fff', label: 'Obiąd' },              // Obiąd — gray
    '0000000037': { bg: '#66CCFF', border: '#3399CC', text: '#000', label: 'Siłownia' },           // Siłownia — light blue
    '0000000038': { bg: '#FF9966', border: '#CC6633', text: '#000', label: 'Badanie + leczenie' }, // Badanie + leczenie — orange-ish
};

const DEFAULT_COLOR = { bg: '#14b8a6', border: '#0d9488', text: '#fff', label: 'Inne' };

// ─── Badge letter map (from Prodentis API /api/badge-types) ──────
const BADGE_LETTERS: Record<string, string> = {
    '0000000001': 'V',     // VIP
    '0000000002': '!',     // WAŻNE
    '0000000003': '?',     // Pacjent NIE potwierdzony
    '0000000004': 'B',     // Pacjent z bólem
    '0000000005': 'A',     // AWARIA
    '0000000006': 'MGR',   // Dane do magisterki MN
    '0000000007': 'PL',    // Plan leczenia do oddania
    '0000000008': 'TK',    // CBCT kontr.do wykonania
    '0000000009': 'P',     // Pierwszorazowy
    '0000000010': ';)',    // Pacjent potwierdzony
    '0000000011': 'KASA',  // spr.czy przyszedł przelew
};

function getBadgeLetter(badgeId: string): string {
    return BADGE_LETTERS[badgeId] || '•';
}

function getAppointmentColor(typeId: string): { bg: string; border: string; text: string } {
    return PRODENTIS_COLORS[typeId] || DEFAULT_COLOR;
}

// ─── Time helpers ────────────────────────────────────────────────
const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 20; h++) {
    for (let m = 0; m < 60; m += 15) {
        if (h === 20 && m > 0) break;
        TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
}

function timeToSlotIndex(time: string): number {
    return TIME_SLOTS.indexOf(time);
}

function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDateShort(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

// ─── Main Component ─────────────────────────────────────────────
export default function EmployeePage() {
    const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));
    const [hoveredAppointment, setHoveredAppointment] = useState<ScheduleAppointment | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [notesAppointment, setNotesAppointment] = useState<ScheduleAppointment | null>(null);
    const [notesTooltipPos, setNotesTooltipPos] = useState({ x: 0, y: 0 });
    const [badgeTooltip, setBadgeTooltip] = useState<{ badges: Badge[], x: number, y: number } | null>(null);
    const [userEmail, setUserEmail] = useState<string>('');
    const [hiddenDoctors, setHiddenDoctors] = useState<Set<string>>(new Set());
    const [selectedAppointment, setSelectedAppointment] = useState<ScheduleAppointment | null>(null);
    const [patientHistory, setPatientHistory] = useState<Visit[] | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const router = useRouter();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Check auth
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/pracownik/login");
            } else {
                setUserEmail(user.email || '');
            }
        };
        checkAuth();
    }, []);

    // Fetch schedule
    const fetchSchedule = useCallback(async () => {
        setLoading(true);
        try {
            const weekStr = currentWeekStart.toISOString().split('T')[0];
            const response = await fetch(`/api/employee/schedule?weekStart=${weekStr}`);
            if (!response.ok) {
                if (response.status === 403) {
                    router.push("/pracownik/login");
                    return;
                }
                throw new Error('Failed to fetch schedule');
            }
            const data = await response.json();
            setScheduleData(data);
        } catch (err) {
            console.error('Failed to fetch schedule:', err);
        } finally {
            setLoading(false);
        }
    }, [currentWeekStart]);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    const navigateWeek = (direction: number) => {
        setCurrentWeekStart(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + direction * 7);
            return d;
        });
    };

    const goToToday = () => {
        setCurrentWeekStart(getMonday(new Date()));
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/pracownik/login");
    };

    // Get appointments for a specific doctor and day
    const getAppointmentsForCell = (doctor: string, day: ScheduleDay): ScheduleAppointment[] => {
        return day.appointments.filter(apt => apt.doctorName === doctor);
    };

    // Check if a time slot is occupied by an appointment
    const getAppointmentAtSlot = (appointments: ScheduleAppointment[], slotTime: string): ScheduleAppointment | null => {
        const slotMinutes = timeToMinutes(slotTime);
        for (const apt of appointments) {
            const startMin = timeToMinutes(apt.startTime);
            const endMin = startMin + apt.duration;
            if (slotMinutes >= startMin && slotMinutes < endMin) {
                return apt;
            }
        }
        return null;
    };

    // Calculate row span for an appointment
    const getAppointmentRowSpan = (apt: ScheduleAppointment): number => {
        return Math.max(1, Math.ceil(apt.duration / 15));
    };

    const isToday = (dateStr: string): boolean => {
        const today = new Date().toISOString().split('T')[0];
        return dateStr === today;
    };

    // Determine which days to show (skip Sat/Sun if empty)
    const getVisibleDays = (): ScheduleDay[] => {
        if (!scheduleData) return [];
        return scheduleData.days.filter((day, i) => {
            // Always show Mon-Fri
            if (i < 5) return true;
            // Show Sat/Sun only if they have appointments
            return day.appointments.length > 0;
        });
    };

    const weekEndDate = new Date(currentWeekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekLabel = `${currentWeekStart.getDate().toString().padStart(2, '0')}.${(currentWeekStart.getMonth() + 1).toString().padStart(2, '0')} - ${weekEndDate.getDate().toString().padStart(2, '0')}.${(weekEndDate.getMonth() + 1).toString().padStart(2, '0')}.${weekEndDate.getFullYear()}`;

    const visibleDays = getVisibleDays();
    const doctors = scheduleData?.doctors || [];
    const visibleDoctors = doctors.filter(d => !hiddenDoctors.has(d));

    const toggleDoctor = (doctor: string) => {
        setHiddenDoctors(prev => {
            const next = new Set(prev);
            if (next.has(doctor)) {
                next.delete(doctor);
            } else {
                next.add(doctor);
            }
            return next;
        });
    };

    const showAllDoctors = () => setHiddenDoctors(new Set());
    const hideAllDoctors = () => setHiddenDoctors(new Set(doctors));

    // Open patient history modal
    const openPatientHistory = useCallback(async (apt: ScheduleAppointment) => {
        if (!apt.patientId) return;
        setSelectedAppointment(apt);
        setPatientHistory(null);
        setHistoryError(null);
        setHistoryLoading(true);
        // Dismiss tooltips
        setHoveredAppointment(null);
        setNotesAppointment(null);
        setBadgeTooltip(null);
        try {
            const res = await fetch(`/api/employee/patient-history?patientId=${apt.patientId}&limit=50`);
            if (!res.ok) throw new Error('Nie udało się pobrać historii wizyt');
            const data = await res.json();
            setPatientHistory(data.appointments || []);
        } catch (err: any) {
            console.error('[PatientHistory] Error:', err);
            setHistoryError(err.message || 'Błąd serwera');
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    // Close modal on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && selectedAppointment) {
                setSelectedAppointment(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedAppointment]);

    return (
        <div
            onClick={() => {
                // Dismiss tooltips when tapping outside (mobile support)
                setNotesAppointment(null);
                setBadgeTooltip(null);
            }}
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #0d1b2a 50%, #1b2838 100%)',
                color: '#fff',
            }}>
            {/* Header */}
            <header style={{
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
                padding: '1rem 2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.3rem',
                    }}>
                        👷
                    </div>
                    <div>
                        <h1 style={{
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            background: 'linear-gradient(135deg, #fff, #38bdf8)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            margin: 0,
                        }}>
                            Strefa Pracownika
                        </h1>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                            {userEmail}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem 1rem',
                        color: 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                        e.currentTarget.style.color = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                    }}
                >
                    <LogOut size={16} />
                    Wyloguj
                </button>
            </header>

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
                    {/* Statistics bar */}
                    <div style={{
                        display: 'flex',
                        gap: '1.5rem',
                        marginBottom: '1rem',
                        flexWrap: 'wrap',
                    }}>
                        <div style={{
                            background: 'rgba(56, 189, 248, 0.08)',
                            border: '1px solid rgba(56, 189, 248, 0.15)',
                            borderRadius: '0.75rem',
                            padding: '0.75rem 1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}>
                            <span style={{ fontSize: '1.2rem' }}>👨‍⚕️</span>
                            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                                Operatorzy: <strong style={{ color: '#38bdf8' }}>{doctors.length}</strong>
                            </span>
                        </div>
                        <div style={{
                            background: 'rgba(34, 197, 94, 0.08)',
                            border: '1px solid rgba(34, 197, 94, 0.15)',
                            borderRadius: '0.75rem',
                            padding: '0.75rem 1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}>
                            <span style={{ fontSize: '1.2rem' }}>📋</span>
                            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                                Wizyt w tygodniu: <strong style={{ color: '#22c55e' }}>
                                    {scheduleData.days.reduce((sum, d) => sum + d.appointments.length, 0)}
                                </strong>
                            </span>
                        </div>
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
                                                        return null; // will be covered by rowSpan
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
                                                                        if (apt.patientId) {
                                                                            openPatientHistory(apt);
                                                                        }
                                                                    }}
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
                            <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                                📞 {hoveredAppointment.patientPhone}
                            </div>
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
            )}

            {/* CSS animations */}
            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
