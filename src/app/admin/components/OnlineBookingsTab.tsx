"use client";
import { useState, useEffect } from "react";

export default function OnlineBookingsTab() {
    const [onlineBookings, setOnlineBookings] = useState<any[]>([]);
    const [onlineBookingsLoading, setOnlineBookingsLoading] = useState(false);
    const [onlineBookingsFilter, setOnlineBookingsFilter] = useState<string>('pending');
    const [onlineBookingsPendingCount, setOnlineBookingsPendingCount] = useState(0);
    const [prodentisColors, setProdentisColors] = useState<any[]>([]);
    const [prodentisIcons, setProdentisIcons] = useState<any[]>([]);
    const [prodentisAvailable, setProdentisAvailable] = useState(true);
    const [patientCandidates, setPatientCandidates] = useState<any[]>([]);

// ── ONLINE BOOKINGS Functions ─────────────────────
const fetchOnlineBookings = async () => {
    setOnlineBookingsLoading(true);
    try {
        const statusParam = onlineBookingsFilter === 'all' ? '' : `?status=${onlineBookingsFilter}`;
        const res = await fetch(`/api/admin/online-bookings${statusParam}`);
        const data = await res.json();
        setOnlineBookings(data.bookings || []);
        if (onlineBookingsFilter !== 'pending') {
            const pendingRes = await fetch('/api/admin/online-bookings?status=pending');
            const pendingData = await pendingRes.json();
            setOnlineBookingsPendingCount((pendingData.bookings || []).length);
        } else {
            setOnlineBookingsPendingCount((data.bookings || []).length);
        }
    } catch (err) {
        console.error('Failed to fetch online bookings:', err);
    } finally {
        setOnlineBookingsLoading(false);
    }
};

const handleApproveBooking = async (id: string) => {
    try {
        const res = await fetch('/api/admin/online-bookings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action: 'approve', approvedBy: 'admin' }),
        });
        const data = await res.json();
        const booking = data.booking;
        if (booking?.schedule_status === 'scheduled') {
            alert(`✅ Wizyta wpisana do grafiku Prodentis!\nID: ${booking.prodentis_appointment_id}`);
        } else if (booking?.schedule_error) {
            alert(`⚠️ Wizyta zatwierdzona, ale nie udało się wpisać do grafiku:\n${booking.schedule_error}`);
        }
        fetchOnlineBookings();
    } catch (err) {
        console.error('Failed to approve booking:', err);
    }
};

const handleRejectBooking = async (id: string) => {
    if (!confirm('Czy na pewno chcesz odrzucić tę wizytę?')) return;
    try {
        await fetch('/api/admin/online-bookings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action: 'reject', approvedBy: 'admin' }),
        });
        fetchOnlineBookings();
    } catch (err) {
        console.error('Failed to reject booking:', err);
    }
};

const handleDeleteBooking = async (id: string) => {
    if (!confirm('Usunąć wpis?')) return;
    try {
        await fetch(`/api/admin/online-bookings?id=${id}`, { method: 'DELETE' });
        fetchOnlineBookings();
    } catch (err) {
        console.error('Failed to delete booking:', err);
    }
};

const handleRetrySchedule = async (id: string) => {
    try {
        const res = await fetch('/api/admin/online-bookings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action: 'schedule' }),
        });
        const data = await res.json();
        const booking = data.booking;
        if (booking?.schedule_status === 'scheduled') {
            alert(`✅ Wizyta wpisana do grafiku!\nID: ${booking.prodentis_appointment_id}`);
        } else if (booking?.schedule_error) {
            alert(`⚠️ Ponowna próba nie powiodła się:\n${booking.schedule_error}`);
        }
        fetchOnlineBookings();
    } catch (err) {
        console.error('Failed to retry schedule:', err);
    }
};

const handleApproveAllBookings = async () => {
    const pending = onlineBookings.filter((b: any) => b.schedule_status === 'pending');
    if (pending.length === 0) return;
    if (!confirm(`Zatwierdzić wszystkie ${pending.length} oczekujące wizyty?`)) return;
    for (const b of pending) {
        await fetch('/api/admin/online-bookings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: b.id, action: 'approve', approvedBy: 'admin' }),
        });
    }
    fetchOnlineBookings();
};

const fetchProdentisColors = async () => {
    try {
        const res = await fetch('/api/admin/prodentis-schedule/colors');
        const data = await res.json();
        setProdentisColors(data.colors || []);
    } catch (err) {
        console.error('Failed to fetch Prodentis colors:', err);
    }
};

const fetchProdentisIcons = async () => {
    try {
        const res = await fetch('/api/admin/prodentis-schedule/icons');
        const data = await res.json();
        setProdentisIcons(data.icons || []);
    } catch (err) {
        console.error('Failed to fetch Prodentis icons:', err);
    }
};

const handleChangeColor = async (appointmentId: string, colorId: string, colorName: string) => {
    try {
        const res = await fetch('/api/admin/prodentis-schedule/color', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appointmentId, colorId }),
        });
        if (res.ok) {
            alert(`🎨 Kolor zmieniony na: ${colorName}`);
        } else {
            const data = await res.json();
            alert(`❌ Błąd: ${data.error || data.message}`);
        }
    } catch (err) {
        console.error('Failed to change color:', err);
    }
};

const handleAddIcon = async (appointmentId: string, iconId: string, iconName: string) => {
    try {
        const res = await fetch('/api/admin/prodentis-schedule/icon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appointmentId, iconId }),
        });
        if (res.ok) {
            alert(`✅ Ikona "${iconName}" dodana do wizyty`);
        } else {
            const data = await res.json();
            alert(`❌ Błąd: ${data.error || data.message}`);
        }
    } catch (err) {
        console.error('Failed to add icon:', err);
    }
};

const handlePickPatient = async (bookingId: string, patientId: string, patientName: string) => {
    try {
        const res = await fetch('/api/admin/online-bookings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: bookingId, action: 'pick_patient', patientId, patientName }),
        });
        if (res.ok) {
            alert(`✅ Pacjent wybrany: ${patientName}\nMożesz teraz zatwierdzić wizytę.`);
            fetchOnlineBookings();
        } else {
            const data = await res.json();
            alert(`❌ Błąd: ${data.error}`);
        }
    } catch (err) {
        console.error('Failed to pick patient:', err);
    }
};

    useEffect(() => {
        fetchOnlineBookings();
        fetchProdentisColors();
        fetchProdentisIcons();
    }, []);

    useEffect(() => {
        fetchOnlineBookings();
    }, [onlineBookingsFilter]);

const renderOnlineBookingsTab = () => {
    const statusColors: Record<string, string> = {
        pending: '#f59e0b',
        approved: '#3b82f6',
        scheduled: '#22c55e',
        rejected: '#ef4444',
        failed: '#ef4444',
    };
    const statusLabels: Record<string, string> = {
        pending: '⏳ Oczekuje',
        approved: '✅ Zatwierdzona',
        scheduled: '📅 W grafiku',
        rejected: '❌ Odrzucona',
        failed: '⚠️ Błąd',
    };
    const filterOptions = ['pending', 'approved', 'scheduled', 'rejected', 'all'];
    const filterLabels: Record<string, string> = {
        pending: 'Oczekujące',
        approved: 'Zatwierdzone',
        scheduled: 'W grafiku',
        rejected: 'Odrzucone',
        all: 'Wszystkie',
    };

    const pendingBookings = onlineBookings.filter(b => b.schedule_status === 'pending');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Filter pills */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {filterOptions.map(f => (
                    <button
                        key={f}
                        onClick={() => setOnlineBookingsFilter(f)}
                        style={{
                            padding: '0.4rem 1rem',
                            borderRadius: '2rem',
                            border: `1px solid ${onlineBookingsFilter === f ? 'var(--color-primary)' : 'rgba(255,255,255,0.12)'}`,
                            background: onlineBookingsFilter === f ? 'rgba(220,177,74,0.15)' : 'transparent',
                            color: onlineBookingsFilter === f ? 'var(--color-primary)' : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            fontWeight: onlineBookingsFilter === f ? 'bold' : 'normal',
                        }}
                    >
                        {filterLabels[f]}
                    </button>
                ))}
                <button
                    onClick={fetchOnlineBookings}
                    style={{ marginLeft: 'auto', padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.78rem' }}
                >
                    🔄 Odśwież
                </button>
            </div>

            {/* Bulk approve */}
            {pendingBookings.length > 0 && onlineBookingsFilter === 'pending' && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem', background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.75rem',
                }}>
                    <span style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {pendingBookings.length} {pendingBookings.length === 1 ? 'wizyta oczekuje' : 'wizyt oczekuje'} na zatwierdzenie
                    </span>
                    <button
                        onClick={handleApproveAllBookings}
                        style={{
                            padding: '0.5rem 1.2rem', background: 'var(--color-primary)',
                            border: 'none', borderRadius: '0.5rem', color: 'black',
                            fontWeight: 'bold', cursor: 'pointer', fontSize: '0.82rem',
                        }}
                    >
                        ✅ Zatwierdź wszystkie
                    </button>
                </div>
            )}

            {/* Loading */}
            {onlineBookingsLoading && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>⏳ Ładowanie...</div>
            )}

            {/* Empty state */}
            {!onlineBookingsLoading && onlineBookings.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                    Brak wizyt w tej kategorii.
                </div>
            )}

            {/* Booking cards */}
            {!onlineBookingsLoading && onlineBookings.map(b => (
                <div key={b.id} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '0.75rem', padding: '1rem 1.25rem',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                        {/* Left: Date + Patient */}
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>
                                    {new Date(b.appointment_date).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                    {b.appointment_time?.slice(0, 5)}
                                </span>
                                {b.is_new_patient && (
                                    <span style={{
                                        padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem',
                                        background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 'bold',
                                    }}>
                                        🆕 NOWY
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: '0.95rem', color: 'white', fontWeight: 500 }}>
                                {b.patient_name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>
                                📞 {b.patient_phone}
                                {b.patient_email && <> &middot; ✉️ {b.patient_email}</>}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                                🩺 {b.specialist_name}
                                {b.service_type && <> &middot; {b.service_type}</>}
                            </div>
                            {b.description && (
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.3rem', fontStyle: 'italic' }}>
                                    💬 &quot;{b.description}&quot;
                                </div>
                            )}
                            {b.intake_url && (
                                <div style={{ fontSize: '0.72rem', marginTop: '0.3rem' }}>
                                    <a href={b.intake_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                                        📋 Link do e-karty
                                    </a>
                                </div>
                            )}
                            {b.prodentis_appointment_id && (
                                <div style={{ fontSize: '0.72rem', marginTop: '0.3rem', color: '#22c55e' }}>
                                    📅 Prodentis ID: {b.prodentis_appointment_id}
                                </div>
                            )}
                            {b.schedule_error && (
                                <div style={{ fontSize: '0.72rem', marginTop: '0.3rem', color: '#f59e0b', background: 'rgba(245,158,11,0.08)', padding: '0.25rem 0.5rem', borderRadius: '0.3rem' }}>
                                    ⚠️ {b.schedule_error}
                                </div>
                            )}
                            {/* Match confidence badge */}
                            {b.match_confidence != null && b.patient_match_method !== 'needs_review' && (
                                <div style={{ fontSize: '0.65rem', marginTop: '0.2rem', color: b.match_confidence >= 85 ? 'rgba(34,197,94,0.6)' : 'rgba(245,158,11,0.6)' }}>
                                    🎯 Match: {b.match_confidence}% ({b.patient_match_method})
                                </div>
                            )}
                            {/* NEEDS REVIEW — candidate picker */}
                            {b.patient_match_method === 'needs_review' && b.match_candidates && (
                                <div style={{
                                    marginTop: '0.4rem', padding: '0.5rem', borderRadius: '0.4rem',
                                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                                }}>
                                    <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                                        ⚠️ Wymaga weryfikacji — znaleziono {b.match_candidates.length} kandydat(ów) o takim samym numerze telefonu:
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem' }}>
                                        Pacjent wpisał: <strong style={{ color: 'white' }}>{b.patient_name}</strong> (tel. {b.patient_phone})
                                    </div>
                                    {(b.match_candidates as any[]).map((c: any, i: number) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '0.3rem 0.4rem', marginTop: '0.2rem',
                                            background: 'rgba(255,255,255,0.03)', borderRadius: '0.3rem',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                        }}>
                                            <div>
                                                <span style={{ color: 'white', fontSize: '0.72rem' }}>
                                                    {c.firstName} {c.lastName}
                                                </span>
                                                <span style={{
                                                    marginLeft: '0.4rem', fontSize: '0.65rem',
                                                    color: c.score >= 85 ? '#22c55e' : c.score >= 60 ? '#f59e0b' : '#ef4444',
                                                }}>
                                                    ({c.score}%)
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handlePickPatient(b.id, c.id, `${c.firstName} ${c.lastName}`)}
                                                style={{
                                                    padding: '0.15rem 0.5rem', fontSize: '0.65rem',
                                                    background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                                                    borderRadius: '0.3rem', color: '#3b82f6', cursor: 'pointer',
                                                }}
                                            >
                                                Wybierz
                                            </button>
                                        </div>
                                    ))}
                                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.3rem', fontStyle: 'italic' }}>
                                        Wybierz pacjenta lub zatwierdź jako nowego
                                    </div>
                                </div>
                            )}
                            {/* Phone conflict — no candidates to pick */}
                            {b.patient_match_method === 'phone_conflict' && (
                                <div style={{ fontSize: '0.68rem', marginTop: '0.3rem', color: '#f59e0b', fontStyle: 'italic' }}>
                                    📞 Konflikt telefonu — inny pacjent ma ten numer. Utworzono nowe konto.
                                </div>
                            )}
                        </div>

                        {/* Right: Status + Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                            <span style={{
                                padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem',
                                fontWeight: 'bold', color: statusColors[b.schedule_status] || 'white',
                                border: `1px solid ${statusColors[b.schedule_status] || 'rgba(255,255,255,0.2)'}`,
                                background: `${statusColors[b.schedule_status]}15`,
                            }}>
                                {statusLabels[b.schedule_status] || b.schedule_status}
                            </span>
                            {b.patient_match_method === 'needs_review' && (
                                <span style={{
                                    padding: '0.15rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem',
                                    fontWeight: 'bold', color: '#f59e0b',
                                    border: '1px solid rgba(245,158,11,0.3)',
                                    background: 'rgba(245,158,11,0.1)',
                                }}>
                                    ⚠️ Weryfikacja
                                </span>
                            )}
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                {b.schedule_status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => handleApproveBooking(b.id)}
                                            style={{
                                                padding: '0.3rem 0.8rem', background: 'rgba(34,197,94,0.1)',
                                                border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.4rem',
                                                color: '#22c55e', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold',
                                            }}
                                        >
                                            ✅ Zatwierdź
                                        </button>
                                        <button
                                            onClick={() => handleRejectBooking(b.id)}
                                            style={{
                                                padding: '0.3rem 0.8rem', background: 'rgba(239,68,68,0.08)',
                                                border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.4rem',
                                                color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem',
                                            }}
                                        >
                                            ❌ Odrzuć
                                        </button>
                                    </>
                                )}
                                {b.schedule_status === 'approved' && b.schedule_error && (
                                    <button
                                        onClick={() => handleRetrySchedule(b.id)}
                                        style={{
                                            padding: '0.3rem 0.8rem', background: 'rgba(245,158,11,0.1)',
                                            border: '1px solid rgba(245,158,11,0.3)', borderRadius: '0.4rem',
                                            color: '#f59e0b', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold',
                                        }}
                                    >
                                        🔄 Ponów
                                    </button>
                                )}
                                {b.schedule_status === 'scheduled' && b.prodentis_appointment_id && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end' }}>
                                        {/* Color selector */}
                                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                            <select
                                                onChange={(e) => {
                                                    const colorId = e.target.value;
                                                    const color = prodentisColors.find((c: any) => c.id === colorId);
                                                    if (color) handleChangeColor(b.prodentis_appointment_id, colorId, color.name);
                                                    e.target.value = '';
                                                }}
                                                defaultValue=""
                                                style={{
                                                    padding: '0.2rem 0.4rem', fontSize: '0.7rem',
                                                    background: 'rgba(255,255,255,0.05)', color: 'white',
                                                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.3rem',
                                                    cursor: 'pointer', maxWidth: '140px',
                                                }}
                                            >
                                                <option value="" disabled>🎨 Zmień kolor</option>
                                                {prodentisColors.map((c: any) => (
                                                    <option key={c.id} value={c.id} style={{ background: '#1a1a2e' }}>
                                                        {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* Icon buttons */}
                                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            {prodentisIcons.map((icon: any) => (
                                                <button
                                                    key={icon.id}
                                                    onClick={() => handleAddIcon(b.prodentis_appointment_id, icon.id, icon.name)}
                                                    title={icon.name}
                                                    style={{
                                                        padding: '0.2rem 0.5rem', fontSize: '0.65rem',
                                                        background: icon.name === 'Pacjent potwierdzony' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                                                        border: `1px solid ${icon.name === 'Pacjent potwierdzony' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                                        borderRadius: '0.3rem',
                                                        color: icon.name === 'Pacjent potwierdzony' ? '#22c55e' : 'rgba(255,255,255,0.5)',
                                                        cursor: 'pointer', whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {icon.name === 'Pacjent potwierdzony' ? '✅' : icon.name === 'VIP' ? '⭐' : icon.name === 'Pierwszorazowy' ? '🆕' : '🏷️'} {icon.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => handleDeleteBooking(b.id)}
                                    style={{
                                        padding: '0.3rem 0.8rem', background: 'transparent',
                                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem',
                                        color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.72rem',
                                    }}
                                >
                                    🗑 Usuń
                                </button>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>
                                {new Date(b.created_at).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
    return renderOnlineBookingsTab();
}
