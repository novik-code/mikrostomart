'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import AppointmentActionsDropdown from '@/components/AppointmentActionsDropdown';
import type { AppointmentStatusResponse } from '@/types/appointmentActions';

const AppointmentScheduler = dynamic(() => import('@/components/scheduler/AppointmentScheduler'), { ssr: false });

// ── Specialist & service data (mirrored from ReservationForm) ──
const SPECIALISTS = [
    { id: 'marcin', name: 'lek. dent. Marcin Nowosielski', role: 'doctor' },
    { id: 'ilona', name: 'lek. dent. Ilona Piechaczek', role: 'doctor' },
    { id: 'katarzyna', name: 'lek. dent. Katarzyna Halupczok', role: 'doctor' },
    { id: 'dominika', name: 'lek. dent. Dominika Milicz', role: 'doctor' },
    { id: 'malgorzata', name: 'hig. stom. Małgorzata Maćków-Huras', role: 'hygienist' },
] as const;

const SERVICE_IDS: Record<string, { id: string; label: string }[]> = {
    doctor: [
        { id: 'konsultacja', label: 'Konsultacja' },
        { id: 'bol', label: 'Ból zęba' },
        { id: 'implanty', label: 'Implanty' },
        { id: 'licowki', label: 'Licówki' },
        { id: 'ortodoncja', label: 'Ortodoncja' },
    ],
    hygienist: [
        { id: 'higienizacja', label: 'Higienizacja' },
        { id: 'wybielanie', label: 'Wybielanie' },
    ],
};

interface OnlineBooking {
    id: string;
    specialist_name: string;
    appointment_date: string;
    appointment_time: string;
    service_type: string | null;
    schedule_status: string;
    created_at: string;
}

interface PatientData {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    address?: {
        street?: string;
        houseNumber?: string;
        apartmentNumber?: string;
        postalCode?: string;
        city?: string;
    };
}

interface Visit {
    date: string;
    endDate: string;
    doctor: {
        id: string;
        name: string;
    };
    cost: number;
    paid: number;
    balance: number;
    paymentStatus: string;
    medicalDetails?: {
        visitDescription?: string;
    };
}

interface UpcomingAppointment {
    scheduleId: string | null;
    date: string;
    endDate: string;
    doctor: {
        id: string;
        name: string;
        title?: string;
    };
}

interface AppointmentActionInfo {
    actionId: string;
    status: AppointmentStatusResponse;
}

export default function PatientDashboard() {
    const [patient, setPatient] = useState<PatientData | null>(null);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [accountStatus, setAccountStatus] = useState<string | null>(null);
    const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
    const [isLoadingAppointment, setIsLoadingAppointment] = useState(true);
    // Map: appointment date string → { actionId, status }
    const [appointmentActionsMap, setAppointmentActionsMap] = useState<Record<string, AppointmentActionInfo>>({});
    // ── Online booking state ──
    const [showBookingForm, setShowBookingForm] = useState(false);
    const [bookingSpecialist, setBookingSpecialist] = useState('');
    const [bookingService, setBookingService] = useState('');
    const [bookingDate, setBookingDate] = useState('');
    const [bookingTime, setBookingTime] = useState('');
    const [bookingDescription, setBookingDescription] = useState('');
    const [isBooking, setIsBooking] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingError, setBookingError] = useState<string | null>(null);
    const [pendingBookings, setPendingBookings] = useState<OnlineBooking[]>([]);
    const router = useRouter();

    const selectedSpec = SPECIALISTS.find(s => s.id === bookingSpecialist);
    const availableServices = selectedSpec ? (SERVICE_IDS[selectedSpec.role] || []) : [];

    const getAuthToken = () => {
        const cookies = document.cookie.split('; ');
        const tokenCookie = cookies.find(c => c.startsWith('patient_token='));
        return tokenCookie ? tokenCookie.split('=')[1] : null;
    };

    useEffect(() => {
        const loadData = async () => {
            const token = getAuthToken();

            if (!token) {
                router.push('/strefa-pacjenta/login');
                return;
            }

            try {
                // Fetch patient details
                const patientRes = await fetch('/api/patients/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!patientRes.ok) {
                    throw new Error('Unauthorized');
                }

                const patientData = await patientRes.json();
                setPatient(patientData);
                setAccountStatus(patientData.account_status || null);

                // Fetch visit history
                const visitsRes = await fetch('/api/patients/me/visits?limit=5', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (visitsRes.ok) {
                    const visitsData = await visitsRes.json();
                    setVisits(visitsData.appointments || []);

                    // Calculate stats from visits
                    const total = visitsData.total || 0;
                    const allVisits = visitsData.appointments || [];
                    const totalCost = allVisits.reduce((sum: number, v: Visit) => sum + (v.cost || 0), 0);
                    const totalPaid = allVisits.reduce((sum: number, v: Visit) => sum + (v.paid || 0), 0);
                    const balance = totalCost - totalPaid;

                    setStats({
                        totalVisits: total,
                        totalCost: totalCost.toFixed(2),
                        totalPaid: totalPaid.toFixed(2),
                        balance: balance.toFixed(2),
                    });
                }
            } catch (err) {
                console.error('Failed to load data:', err);
                router.push('/strefa-pacjenta/login');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [router]);

    // Fetch ALL upcoming appointments from Prodentis + create/fetch action records for each
    const loadUpcomingAppointments = async () => {
        if (!patient) return;

        try {
            setIsLoadingAppointment(true);
            const token = getAuthToken();

            const response = await fetch('/api/patients/upcoming-appointments', {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                console.error('Failed to fetch upcoming appointments');
                setUpcomingAppointments([]);
                return;
            }

            const data = await response.json();
            const appointments: UpcomingAppointment[] = data.appointments || [];
            setUpcomingAppointments(appointments);

            // Create/fetch action records for each appointment
            const actionsMap: Record<string, AppointmentActionInfo> = {};
            for (const apt of appointments) {
                try {
                    const createRes = await fetch('/api/patients/appointments/create', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            prodentis_id: patient.id,
                            appointment_date: apt.date,
                            appointment_end_date: apt.endDate,
                            doctor_id: apt.doctor.id,
                            doctor_name: apt.doctor.name?.replace(/\s*\(I\)\s*/g, ' ').trim(),
                            schedule_appointment_id: apt.scheduleId,
                        })
                    });

                    let actionId: string | null = null;

                    if (createRes.ok) {
                        const createData = await createRes.json();
                        actionId = createData.id;
                    } else {
                        const fetchRes = await fetch(
                            `/api/patients/appointments/by-date?date=${encodeURIComponent(apt.date)}`,
                            { headers: { 'Authorization': `Bearer ${token}` } }
                        );
                        if (fetchRes.ok) {
                            const fetchData = await fetchRes.json();
                            actionId = fetchData.id;
                        }
                    }

                    if (!actionId) continue;

                    const statusRes = await fetch(`/api/patients/appointments/${actionId}/status`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (statusRes.ok) {
                        const statusData = await statusRes.json();
                        actionsMap[apt.date] = { actionId, status: statusData };
                    }
                } catch (e) {
                    console.error('[Dashboard] Error processing appointment:', apt.date, e);
                }
            }
            setAppointmentActionsMap(actionsMap);
        } catch (error) {
            console.error('Error loading upcoming appointments:', error);
            setUpcomingAppointments([]);
        } finally {
            setIsLoadingAppointment(false);
        }
    };

    useEffect(() => {
        loadUpcomingAppointments();
    }, [patient]);

    // After cancel/reschedule: wait a moment for Prodentis to process, then re-fetch everything
    const refreshAfterAction = async () => {
        // Short delay to let Prodentis process the cancellation/reschedule
        await new Promise(resolve => setTimeout(resolve, 1500));
        await loadUpcomingAppointments();
    };


    // ── Load pending bookings ──
    useEffect(() => {
        const loadBookings = async () => {
            const token = getAuthToken();
            if (!token || !patient) return;
            try {
                const res = await fetch('/api/patients/appointments/bookings', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setPendingBookings(
                        (data.bookings || []).filter((b: OnlineBooking) =>
                            ['pending', 'approved'].includes(b.schedule_status)
                        )
                    );
                }
            } catch (e) {
                console.error('[Dashboard] Failed to load bookings:', e);
            }
        };
        loadBookings();
    }, [patient, bookingSuccess]);

    // ── Submit booking ──
    const handleBookingSubmit = async () => {
        if (!bookingSpecialist || !bookingDate || !bookingTime) return;
        setIsBooking(true);
        setBookingError(null);
        try {
            const token = getAuthToken();
            const spec = SPECIALISTS.find(s => s.id === bookingSpecialist);
            const res = await fetch('/api/patients/appointments/book', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    specialist: bookingSpecialist,
                    specialistName: spec?.name || bookingSpecialist,
                    service: bookingService,
                    date: bookingDate,
                    time: bookingTime,
                    description: bookingDescription || undefined,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Booking failed');
            }
            setBookingSuccess(true);
            setShowBookingForm(false);
            // Reset form
            setBookingSpecialist('');
            setBookingService('');
            setBookingDate('');
            setBookingTime('');
            setBookingDescription('');
        } catch (e: any) {
            setBookingError(e.message || 'Wystąpił błąd');
        } finally {
            setIsBooking(false);
        }
    };

    const handleLogout = () => {
        document.cookie = 'patient_token=; path=/; max-age=0';
        localStorage.removeItem('patient_data');
        router.push('/strefa-pacjenta/login');
    };

    const handleSyncHistory = async () => {
        setIsSyncing(true);
        const token = getAuthToken();

        try {
            // Refresh visit history
            const visitsRes = await fetch('/api/patients/me/visits?limit=50', {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (visitsRes.ok) {
                const visitsData = await visitsRes.json();
                setVisits(visitsData.appointments?.slice(0, 5) || []);

                const allVisits = visitsData.appointments || [];
                const totalCost = allVisits.reduce((sum: number, v: Visit) => sum + (v.cost || 0), 0);
                const totalPaid = allVisits.reduce((sum: number, v: Visit) => sum + (v.paid || 0), 0);
                const balance = totalCost - totalPaid;

                setStats({
                    totalVisits: visitsData.total || 0,
                    totalCost: totalCost.toFixed(2),
                    totalPaid: totalPaid.toFixed(2),
                    balance: balance.toFixed(2),
                });
            }

            // Also refresh upcoming appointments from Prodentis
            await loadUpcomingAppointments();

            alert('✅ Dane zostały zaktualizowane!');
        } catch (err) {
            console.error('Sync failed:', err);
            alert('❌ Nie udało się zsynchronizować danych');
        } finally {
            setIsSyncing(false);
        }
    };

    if (isLoading || !patient) {
        return <div style={{
            minHeight: '100vh',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
        }}>
            Ładowanie...
        </div>;
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'transparent',
        }}>
            {/* Header */}
            <div style={{
                background: 'rgba(0, 0, 0, 0.5)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '1.5rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#fff',
                        marginBottom: '0.25rem',
                    }}>
                        Strefa Pacjenta
                    </h1>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                        Witaj, {patient.firstName}! 👋
                    </p>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '0.5rem',
                        color: '#ef4444',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                    }}
                >
                    Wyloguj
                </button>
            </div>

            {/* Pending Approval Banner */}
            {accountStatus === 'pending_admin_approval' && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(220, 177, 74, 0.15), rgba(220, 177, 74, 0.05))',
                    border: '2px solid rgba(220, 177, 74, 0.4)',
                    borderLeft: '6px solid #dcb14a',
                    padding: '1.5rem 2rem',
                    margin: '0',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'start',
                        gap: '1rem',
                    }}>
                        <div style={{
                            fontSize: '2rem',
                            lineHeight: 1,
                        }}>
                            ⏳
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{
                                color: '#dcb14a',
                                fontSize: '1.2rem',
                                marginBottom: '0.5rem',
                                fontWeight: 'bold',
                            }}>
                                Konto w trakcie weryfikacji
                            </h3>
                            <p style={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '1rem',
                                lineHeight: '1.6',
                                marginBottom: '0.75rem',
                            }}>
                                Twoje konto oczekuje na zatwierdzenie przez administratora.<br />
                                Weryfikacja potrwa do <strong>48 godzin</strong>.
                            </p>
                            <p style={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontSize: '0.9rem',
                                lineHeight: '1.6',
                            }}>
                                Otrzymasz powiadomienie email po zatwierdzeniu konta.<br />
                                W razie pytań: 📞 <strong>570 270 470</strong> lub 📧 <strong>gabinet@mikrostomart.pl</strong>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejected Account Banner */}
            {accountStatus === 'rejected' && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
                    border: '2px solid rgba(239, 68, 68, 0.4)',
                    borderLeft: '6px solid #ef4444',
                    padding: '1.5rem 2rem',
                    margin: '0',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'start',
                        gap: '1rem',
                    }}>
                        <div style={{
                            fontSize: '2rem',
                            lineHeight: 1,
                        }}>
                            ❌
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{
                                color: '#ef4444',
                                fontSize: '1.2rem',
                                marginBottom: '0.5rem',
                                fontWeight: 'bold',
                            }}>
                                Rejestracja odrzucona
                            </h3>
                            <p style={{
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontSize: '1rem',
                                lineHeight: '1.6',
                                marginBottom: '0.75rem',
                            }}>
                                Niestety nie mogliśmy zatwierdzić Twojej rejestracji.
                            </p>
                            <p style={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontSize: '0.9rem',
                                lineHeight: '1.6',
                            }}>
                                Skontaktuj się z recepcją: 📞 <strong>570 270 470</strong>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '1rem 2rem',
                display: 'flex',
                gap: '1rem',
                overflowX: 'auto',
            }}>
                {[
                    { href: '/strefa-pacjenta/dashboard', label: 'Panel główny', active: true },
                    { href: '/strefa-pacjenta/historia', label: 'Historia wizyt', active: false },
                    { href: '/strefa-pacjenta/profil', label: 'Mój profil', active: false },
                    { href: '/strefa-pacjenta/wiadomosci', label: '💬 Wiadomości', active: false },
                    { href: '/strefa-pacjenta/ocen-nas', label: '⭐ Oceń nas', active: false },
                ].map(link => (
                    <Link
                        key={link.href}
                        href={link.href}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: link.active ? 'rgba(220, 177, 74, 0.15)' : 'transparent',
                            border: link.active ? '1px solid rgba(220, 177, 74, 0.3)' : '1px solid transparent',
                            borderRadius: '0.5rem',
                            color: link.active ? '#dcb14a' : 'rgba(255, 255, 255, 0.7)',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                            fontWeight: link.active ? 'bold' : 'normal',
                            transition: 'all 0.2s',
                        }}
                    >
                        {link.label}
                    </Link>
                ))}
            </div>

            {/* Main Content */}
            {accountStatus === null || accountStatus === 'active' ? (
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '2rem',
                }}>
                    {/* Stats Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1.5rem',
                        marginBottom: '2rem',
                    }}>
                        {[
                            { icon: '📋', label: 'Wizyty w systemie', value: stats?.totalVisits || 0, color: '#dcb14a' },
                            { icon: '💰', label: 'Całkowity koszt', value: `${stats?.totalCost || 0} PLN`, color: '#60a5fa' },
                            { icon: '✅', label: 'Zapłacono', value: `${stats?.totalPaid || 0} PLN`, color: '#22c55e' },
                            { icon: '📊', label: 'Saldo', value: `${stats?.balance || 0} PLN`, color: parseFloat(stats?.balance || 0) > 0 ? '#f97316' : '#22c55e' },
                        ].map((card, idx) => (
                            <div key={idx} style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '1rem',
                                padding: '1.5rem',
                            }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{card.icon}</div>
                                <div style={{
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    fontSize: '0.85rem',
                                    marginBottom: '0.5rem',
                                }}>
                                    {card.label}
                                </div>
                                <div style={{
                                    color: card.color,
                                    fontSize: '1.75rem',
                                    fontWeight: 'bold',
                                }}>
                                    {card.value}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div style={{
                        background: 'rgba(220, 177, 74, 0.1)',
                        border: '1px solid rgba(220, 177, 74, 0.3)',
                        borderRadius: '1rem',
                        padding: '1.5rem',
                        marginBottom: '2rem',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 style={{ color: '#dcb14a', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                                    💡 Aktualizuj swoją historię
                                </h3>
                                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                                    Pobierz najnowsze informacje o wizytach z systemu Mikrostomart
                                </p>
                            </div>
                            <button
                                onClick={handleSyncHistory}
                                disabled={isSyncing}
                                style={{
                                    padding: '0.875rem 1.75rem',
                                    background: isSyncing ? 'rgba(220, 177, 74, 0.5)' : 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    color: '#000',
                                    fontWeight: 'bold',
                                    cursor: isSyncing ? 'not-allowed' : 'pointer',
                                    transition: 'transform 0.2s',
                                    opacity: isSyncing ? 0.7 : 1,
                                }}
                                onMouseEnter={(e) => !isSyncing && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {isSyncing ? '⏳ Synchronizacja...' : '🔄 Synchronizuj'}
                            </button>
                        </div>
                    </div>

                    {/* Upcoming Appointments */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '1rem',
                        padding: '2rem',
                    }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                📅 Twoje wizyty
                            </h2>
                            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
                                Nadchodzące wizyty w naszym gabinecie
                            </p>
                        </div>

                        {/* Appointment list + booking */}
                        {isLoadingAppointment ? (
                            <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                                Ładowanie informacji o wizytach...
                            </div>
                        ) : (
                            <div>
                                {/* Upcoming appointments list */}
                                {upcomingAppointments.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                                        {upcomingAppointments.map((apt, idx) => {
                                            const aptDate = new Date(apt.date);
                                            const aptEnd = new Date(apt.endDate);
                                            const durMin = Math.round((aptEnd.getTime() - aptDate.getTime()) / (1000 * 60));
                                            const dUntil = Math.ceil((aptDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                            const actionInfo = appointmentActionsMap[apt.date];
                                            return (
                                                <div key={apt.date + idx} style={{
                                                    background: 'linear-gradient(135deg, rgba(220, 177, 74, 0.1), rgba(220, 177, 74, 0.05))',
                                                    border: '2px solid rgba(220, 177, 74, 0.3)',
                                                    borderRadius: '1rem', padding: '2rem', position: 'relative', overflow: 'hidden',
                                                }}>
                                                    <div style={{
                                                        position: 'absolute', top: '1rem', right: '1rem',
                                                        background: 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                                                        color: '#000', padding: '0.5rem 1rem', borderRadius: '99px',
                                                        fontWeight: 'bold', fontSize: '0.85rem',
                                                    }}>
                                                        {dUntil === 0 ? '🔥 Dziś!' : dUntil === 1 ? '⏰ Jutro' : `Za ${dUntil} dni`}
                                                    </div>
                                                    <div style={{ marginBottom: '1.5rem', paddingRight: '7rem' }}>
                                                        <div style={{ color: '#dcb14a', fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.5rem' }}>📅 Data wizyty</div>
                                                        <div style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                                            {aptDate.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                        </div>
                                                        <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '1.25rem', fontWeight: '600' }}>
                                                            🕐 Godzina: {apt.date.split('T')[1]?.substring(0, 5) || '--:--'}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                                        <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '1.25rem', borderRadius: '0.75rem' }}>
                                                            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>👨‍⚕️ Lekarz</div>
                                                            <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                                                {apt.doctor.name?.replace(/\s*\(I\)\s*/g, ' ').trim() || 'Brak danych'}
                                                            </div>
                                                        </div>
                                                        <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '1.25rem', borderRadius: '0.75rem' }}>
                                                            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>⏱️ Czas trwania</div>
                                                            <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold' }}>{durMin} min</div>
                                                        </div>
                                                    </div>
                                                    {actionInfo && (
                                                        <AppointmentActionsDropdown
                                                            appointmentId={actionInfo.actionId}
                                                            appointmentDate={apt.date}
                                                            appointmentEndDate={apt.endDate}
                                                            currentStatus={actionInfo.status.status}
                                                            depositPaid={actionInfo.status.depositPaid}
                                                            attendanceConfirmed={actionInfo.status.attendanceConfirmed}
                                                            hoursUntilAppointment={actionInfo.status.hoursUntilAppointment}
                                                            doctorName={apt.doctor.name?.replace(/\s*\(I\)\s*/g, ' ').trim() || ''}
                                                            authToken={getAuthToken() || ''}
                                                            patientName={patient ? `${patient.firstName} ${patient.lastName}` : ''}
                                                            patientEmail={patient?.email || ''}
                                                            patientPhone={patient?.phone || ''}
                                                            patientCity={patient?.address?.city || ''}
                                                            patientZipCode={patient?.address?.postalCode || ''}
                                                            patientStreet={patient?.address?.street || ''}
                                                            patientHouseNumber={patient?.address?.houseNumber || ''}
                                                            patientApartmentNumber={patient?.address?.apartmentNumber || ''}
                                                            onStatusChange={refreshAfterAction}
                                                        />
                                                    )}
                                                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '0.5rem', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                                                        💡 <strong>Przypomnienie:</strong> Prosimy o przybycie 10 minut przed umówioną godziną.
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Pending online bookings */}
                                {pendingBookings.length > 0 && (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h3 style={{ color: '#dcb14a', fontSize: '1rem', marginBottom: '0.75rem' }}>⏳ Rezerwacje online</h3>
                                        {pendingBookings.map(b => {
                                            const bDate = new Date(`${b.appointment_date}T${b.appointment_time}`);
                                            return (
                                                <div key={b.id} style={{
                                                    padding: '1rem 1.25rem', background: 'rgba(220, 177, 74, 0.08)',
                                                    border: '1px solid rgba(220, 177, 74, 0.2)', borderRadius: '0.75rem',
                                                    marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between',
                                                    alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
                                                }}>
                                                    <div>
                                                        <div style={{ color: '#dcb14a', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                                                            ⏳ {b.schedule_status === 'pending' ? 'Oczekuje na potwierdzenie' : 'Zatwierdzona'}
                                                        </div>
                                                        <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 'bold' }}>{b.specialist_name}</div>
                                                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                                                            {bDate.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}, godz. {b.appointment_time?.slice(0, 5)}
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        padding: '0.3rem 0.75rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: '600',
                                                        background: b.schedule_status === 'pending' ? 'rgba(220, 177, 74, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                                                        color: b.schedule_status === 'pending' ? '#dcb14a' : '#22c55e',
                                                    }}>
                                                        {b.schedule_status === 'pending' ? '⏳ Pending' : '✅ Approved'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {bookingSuccess && (
                                    <div style={{ padding: '1.5rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '0.75rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                                        <p style={{ color: '#22c55e', fontWeight: 'bold', marginBottom: '0.25rem' }}>Rezerwacja wysłana!</p>
                                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Gabinet potwierdzi Twoją wizytę w ciągu 24h.</p>
                                    </div>
                                )}

                                {/* ALWAYS show booking CTA / form */}
                                {!showBookingForm ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '0.75rem', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                                        <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.5rem' }}>
                                            {upcomingAppointments.length > 0 ? 'Chcesz umówić kolejną wizytę?' : 'Umów swoją pierwszą wizytę!'}
                                        </p>
                                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => { setShowBookingForm(true); setBookingSuccess(false); }}
                                                style={{ padding: '0.75rem 2rem', background: 'linear-gradient(135deg, #dcb14a, #f0c96c)', border: 'none', borderRadius: '0.5rem', color: '#000', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                            >
                                                🗓️ Umów wizytę online
                                            </button>
                                            <a href="tel:570270470" style={{ padding: '0.75rem 2rem', background: 'transparent', border: '1px solid rgba(220, 177, 74, 0.3)', borderRadius: '0.5rem', color: '#dcb14a', fontSize: '1rem', fontWeight: 'bold', textDecoration: 'none', transition: 'transform 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                            >📞 570 270 470</a>
                                        </div>
                                    </div>
                                ) : (
                                    /* ── Inline booking form ── */
                                    <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '0.75rem', border: '1px solid rgba(220, 177, 74, 0.2)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                            <h3 style={{ color: '#dcb14a', fontSize: '1.1rem', fontWeight: 'bold' }}>🗓️ Umów wizytę online</h3>
                                            <button onClick={() => setShowBookingForm(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                                        </div>

                                        {/* Specialist */}
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Specjalista *</label>
                                            <select
                                                value={bookingSpecialist}
                                                onChange={(e) => { setBookingSpecialist(e.target.value); setBookingService(''); setBookingDate(''); setBookingTime(''); }}
                                                style={{ width: '100%', padding: '0.7rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                                            >
                                                <option value="">Wybierz specjalistę</option>
                                                {SPECIALISTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>

                                        {/* Service */}
                                        {selectedSpec && (
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Usługa *</label>
                                                <select
                                                    value={bookingService}
                                                    onChange={(e) => setBookingService(e.target.value)}
                                                    style={{ width: '100%', padding: '0.7rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                                                >
                                                    <option value="">Wybierz usługę</option>
                                                    {availableServices.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
                                                </select>
                                            </div>
                                        )}

                                        {/* Scheduler */}
                                        {selectedSpec && (
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Dostępne terminy *</label>
                                                <AppointmentScheduler
                                                    specialistId={selectedSpec.id}
                                                    specialistName={selectedSpec.name}
                                                    onSlotSelect={(slot) => {
                                                        if (slot) { setBookingDate(slot.date); setBookingTime(slot.time); }
                                                        else { setBookingDate(''); setBookingTime(''); }
                                                    }}
                                                />
                                                {bookingDate && bookingTime && (
                                                    <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#dcb14a' }}>
                                                        ✓ Wybrany termin: {bookingDate}, godz. {bookingTime}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Description */}
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Opis (opcjonalnie)</label>
                                            <textarea
                                                value={bookingDescription}
                                                onChange={(e) => setBookingDescription(e.target.value)}
                                                placeholder="Opisz powód wizyty..."
                                                rows={2}
                                                style={{ width: '100%', padding: '0.7rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                                            />
                                        </div>

                                        {bookingError && (
                                            <div style={{ padding: '0.6rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                                {bookingError}
                                            </div>
                                        )}

                                        {/* Submit */}
                                        <button
                                            onClick={handleBookingSubmit}
                                            disabled={isBooking || !bookingSpecialist || !bookingDate || !bookingTime}
                                            style={{
                                                width: '100%', padding: '0.85rem',
                                                background: (isBooking || !bookingSpecialist || !bookingDate || !bookingTime) ? 'rgba(220, 177, 74, 0.3)' : 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                                                border: 'none', borderRadius: '0.5rem', color: '#000', fontSize: '1rem',
                                                fontWeight: 'bold', cursor: (isBooking || !bookingSpecialist || !bookingDate || !bookingTime) ? 'not-allowed' : 'pointer',
                                                opacity: (isBooking || !bookingSpecialist || !bookingDate || !bookingTime) ? 0.5 : 1,
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {isBooking ? '⏳ Rezerwuję...' : '📅 Zarezerwuj wizytę'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // Pending or Rejected - Show restricted access message
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
                        Dane medyczne będą dostępne po weryfikacji.
                    </p>
                </div>
            )}
        </div>
    );
}
