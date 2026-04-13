'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface Task {
    id: string;
    sortOrder: number;
    title: string;
    description: string;
    icon: string;
    scheduledAt: string;
    completedAt: string | null;
    skippedAt: string | null;
    medicationName: string | null;
    medicationDose: string | null;
    medicationDescription: string | null;
    requiresConfirmation: boolean;
}

interface EnrollmentData {
    patientName: string;
    templateName: string;
    appointmentDate: string;
    doctorName: string;
    status: string;
    prescriptionCode: string | null;
    customNotes: string | null;
    followUpAppointments: any[];
}

export default function CareFlowLandingPage() {
    const params = useParams();
    const token = params?.token as string;

    const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [medications, setMedications] = useState<any[]>([]);
    const [phase, setPhase] = useState<'pre' | 'post'>('pre');
    const [hoursUntil, setHoursUntil] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`/api/careflow/${token}`);
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Nie znaleziono');
                return;
            }
            setEnrollment(data.enrollment);
            setTasks(data.tasks || []);
            setMedications(data.medications || []);
            setPhase(data.phase);
            setHoursUntil(data.hoursUntilAppointment);
        } catch {
            setError('Błąd połączenia z serwerem');
        }
        setLoading(false);
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-refresh every 60s
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
            fetchData();
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Countdown timer
    useEffect(() => {
        if (!enrollment) return;
        const interval = setInterval(() => {
            const diff = new Date(enrollment.appointmentDate).getTime() - Date.now();
            setHoursUntil(Math.round(diff / (1000 * 60 * 60) * 10) / 10);
        }, 1000);
        return () => clearInterval(interval);
    }, [enrollment]);

    const handleComplete = async (taskId: string) => {
        setCompleting(taskId);
        try {
            const res = await fetch(`/api/careflow/${token}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId }),
            });
            const data = await res.json();
            if (data.success) {
                // Update local state
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completedAt: new Date().toISOString() } : t));

                if (data.allDone) {
                    setToast('🎉 Wszystkie kroki wykonane! Gratulacje!');
                } else if (data.nextTask) {
                    const nextTime = new Date(data.nextTask.scheduledAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
                    setToast(`✅ Świetnie! Kolejne przypomnienie: ${data.nextTask.title} o ${nextTime}`);
                } else {
                    setToast('✅ Zapisano!');
                }
                setTimeout(() => setToast(null), 5000);
            }
        } catch {
            setToast('❌ Błąd — spróbuj ponownie');
            setTimeout(() => setToast(null), 3000);
        }
        setCompleting(null);
    };

    const formatCountdown = () => {
        if (!enrollment) return '';
        const ms = new Date(enrollment.appointmentDate).getTime() - Date.now();
        if (ms <= 0) return 'Zabieg już się odbył';
        const h = Math.floor(ms / (1000 * 60 * 60));
        const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        if (h > 24) {
            const d = Math.floor(h / 24);
            const rh = h % 24;
            return `${d} dni ${rh}h ${m}min`;
        }
        return `${h}h ${m}min`;
    };

    if (loading) {
        return (
            <div style={pageStyle}>
                <div style={containerStyle}>
                    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                        <div style={spinnerStyle} />
                        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '1rem' }}>Ładowanie...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={pageStyle}>
                <div style={containerStyle}>
                    <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😔</div>
                        <h2 style={{ color: 'white', margin: '0 0 0.5rem' }}>Nie znaleziono</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)' }}>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!enrollment) return null;

    const now = new Date();
    const appointmentDate = new Date(enrollment.appointmentDate);
    const completedCount = tasks.filter(t => t.completedAt).length;
    const totalCount = tasks.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <div style={pageStyle}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes checkmark { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
                .task-card { transition: all 0.3s ease; }
                .task-card:active { transform: scale(0.98); }
            `}</style>

            <div style={containerStyle}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', animation: 'slideUp 0.5s ease-out' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.3rem' }}>🏥</div>
                    <h1 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.3rem', fontFamily: 'Inter, sans-serif' }}>
                        {enrollment.templateName}
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
                        Cześć, {enrollment.patientName.split(' ')[0]}! 👋
                    </p>
                </div>

                {/* Appointment info card */}
                <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', borderColor: 'rgba(99,102,241,0.3)', animation: 'slideUp 0.6s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {phase === 'pre' ? '⏳ Do zabiegu' : '✅ Po zabiegu'}
                            </div>
                            <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
                                {phase === 'pre' ? formatCountdown() : 'W trakcie rekonwalescencji'}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                                📅 {appointmentDate.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                            <div style={{ color: 'white', fontSize: '1rem', fontWeight: 600 }}>
                                🕐 {appointmentDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {enrollment.doctorName && (
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                                    👨‍⚕️ {enrollment.doctorName}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                            <span>Postęp: {completedCount}/{totalCount}</span>
                            <span>{progress}%</span>
                        </div>
                        <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', marginTop: '0.3rem', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                borderRadius: '4px',
                                width: `${progress}%`,
                                background: progress === 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                transition: 'width 0.5s ease',
                            }} />
                        </div>
                    </div>
                </div>

                {/* Prescription code */}
                {enrollment.prescriptionCode && (
                    <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))', borderColor: 'rgba(245,158,11,0.3)', animation: 'slideUp 0.7s ease-out' }}>
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                            💊 Kod recepty
                        </div>
                        <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                            {enrollment.prescriptionCode}
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '0.3rem', marginBottom: 0 }}>
                            Podaj ten kod w aptece, aby wykupić przepisane leki.
                        </p>
                    </div>
                )}

                {/* Custom notes from doctor */}
                {enrollment.customNotes && (
                    <div style={{ ...cardStyle, background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.2)', animation: 'slideUp 0.75s ease-out' }}>
                        <div style={{ fontSize: '0.75rem', color: '#818cf8', marginBottom: '0.3rem' }}>📝 Notatka od lekarza</div>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>{enrollment.customNotes}</p>
                    </div>
                )}

                {/* Task timeline */}
                <div style={{ marginTop: '1rem', animation: 'slideUp 0.8s ease-out' }}>
                    <h2 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', fontFamily: 'Inter, sans-serif' }}>
                        📋 Twoje zadania
                    </h2>

                    <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                        {/* Timeline line */}
                        <div style={{ position: 'absolute', left: '0.55rem', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.08)' }} />

                        {tasks.map((task, i) => {
                            const scheduled = new Date(task.scheduledAt);
                            const isDone = !!task.completedAt;
                            const isSkipped = !!task.skippedAt;
                            const isPast = scheduled <= now;
                            const isCurrent = isPast && !isDone && !isSkipped;
                            const isFuture = scheduled > now;

                            let dotColor = 'rgba(255,255,255,0.2)';
                            if (isDone) dotColor = '#10b981';
                            else if (isSkipped) dotColor = '#6b7280';
                            else if (isCurrent) dotColor = '#6366f1';
                            else if (isFuture) dotColor = 'rgba(255,255,255,0.15)';

                            return (
                                <div
                                    key={task.id}
                                    className="task-card"
                                    style={{
                                        position: 'relative',
                                        marginBottom: '0.8rem',
                                        opacity: isSkipped ? 0.5 : 1,
                                    }}
                                >
                                    {/* Timeline dot */}
                                    <div style={{
                                        position: 'absolute',
                                        left: '-1.23rem',
                                        top: '1.2rem',
                                        width: isCurrent ? '14px' : '10px',
                                        height: isCurrent ? '14px' : '10px',
                                        borderRadius: '50%',
                                        background: dotColor,
                                        border: isCurrent ? '2px solid #6366f1' : 'none',
                                        animation: isCurrent ? 'pulse 2s infinite' : 'none',
                                        marginLeft: isCurrent ? '-2px' : '0',
                                        zIndex: 1,
                                    }} />

                                    <div style={{
                                        ...cardStyle,
                                        marginBottom: 0,
                                        background: isCurrent ? 'rgba(99,102,241,0.12)' : isDone ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
                                        borderColor: isCurrent ? 'rgba(99,102,241,0.3)' : isDone ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                                        padding: '1rem',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontSize: '1.2rem' }}>{isDone ? '✅' : task.icon}</span>
                                                    <span style={{
                                                        color: isDone ? '#10b981' : isCurrent ? 'white' : 'rgba(255,255,255,0.5)',
                                                        fontWeight: isCurrent ? 600 : 400,
                                                        fontSize: '0.95rem',
                                                        textDecoration: isSkipped ? 'line-through' : 'none',
                                                    }}>
                                                        {task.title}
                                                    </span>
                                                </div>
                                                {task.description && (
                                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '0.3rem 0 0 2rem', lineHeight: 1.4 }}>
                                                        {task.description}
                                                    </p>
                                                )}
                                                {task.medicationName && (
                                                    <div style={{ margin: '0.3rem 0 0 2rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
                                                        💊 {task.medicationName} {task.medicationDose && `— ${task.medicationDose}`}
                                                    </div>
                                                )}
                                                <div style={{ marginTop: '0.3rem', marginLeft: '2rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                                                    🕐 {scheduled.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })} {scheduled.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                                    {isDone && task.completedAt && (
                                                        <span style={{ color: '#10b981', marginLeft: '0.5rem' }}>
                                                            ✓ {new Date(task.completedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Checkbox */}
                                            {task.requiresConfirmation && !isSkipped && (
                                                <button
                                                    onClick={() => !isDone && handleComplete(task.id)}
                                                    disabled={!!completing || isDone || isFuture}
                                                    style={{
                                                        width: '44px',
                                                        height: '44px',
                                                        borderRadius: '12px',
                                                        border: isDone ? '2px solid #10b981' : isCurrent ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.15)',
                                                        background: isDone ? 'rgba(16,185,129,0.2)' : 'transparent',
                                                        color: isDone ? '#10b981' : 'rgba(255,255,255,0.3)',
                                                        fontSize: isDone ? '1.2rem' : '0.9rem',
                                                        cursor: isDone || isFuture ? 'default' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        transition: 'all 0.3s ease',
                                                        animation: isDone ? 'checkmark 0.3s ease-out' : 'none',
                                                        opacity: isFuture ? 0.3 : 1,
                                                    }}
                                                >
                                                    {completing === task.id ? (
                                                        <div style={{ ...spinnerStyleSmall }} />
                                                    ) : isDone ? '✓' : ''}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Medications reference */}
                {medications.length > 0 && (
                    <div style={{ ...cardStyle, marginTop: '1.5rem', animation: 'slideUp 0.9s ease-out' }}>
                        <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: 600, margin: '0 0 0.8rem', fontFamily: 'Inter, sans-serif' }}>
                            💊 Przepisane leki
                        </h3>
                        {medications.map((med: any, i: number) => (
                            <div key={i} style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '0.5rem' }}>
                                <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>{med.name}</div>
                                {med.dose && <div style={{ color: '#818cf8', fontSize: '0.85rem' }}>Dawka: {med.dose}</div>}
                                {med.frequency && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{med.frequency}</div>}
                                {med.description && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', margin: '0.3rem 0 0', lineHeight: 1.4 }}>{med.description}</p>}
                            </div>
                        ))}
                    </div>
                )}

                {/* Follow-up appointments */}
                {enrollment.followUpAppointments && enrollment.followUpAppointments.length > 0 && (
                    <div style={{ ...cardStyle, marginTop: '1rem', animation: 'slideUp 1s ease-out' }}>
                        <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: 600, margin: '0 0 0.8rem', fontFamily: 'Inter, sans-serif' }}>
                            📅 Wizyty kontrolne
                        </h3>
                        {enrollment.followUpAppointments.map((apt: any, i: number) => (
                            <div key={i} style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: 500 }}>{apt.type || 'Wizyta kontrolna'}</div>
                                    {apt.description && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{apt.description}</div>}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: '#818cf8', fontSize: '0.9rem', fontWeight: 500 }}>
                                        {apt.date && new Date(apt.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                                    </div>
                                    {apt.time && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>🕐 {apt.time}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: '2rem', padding: '1rem 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>
                    CareFlow • Automatyczny system opieki peri-operacyjnej
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.9)',
                    backdropFilter: 'blur(20px)',
                    color: 'white',
                    padding: '0.8rem 1.5rem',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    zIndex: 1000,
                    animation: 'slideUp 0.3s ease-out',
                    maxWidth: '90vw',
                    textAlign: 'center',
                }}>
                    {toast}
                </div>
            )}
        </div>
    );
}

// ─── Styles ──────────────────────────────────────────

const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0a0a1a 0%, #111827 50%, #0f172a 100%)',
    fontFamily: 'Inter, -apple-system, sans-serif',
    paddingBottom: '2rem',
};

const containerStyle: React.CSSProperties = {
    maxWidth: '480px',
    margin: '0 auto',
    padding: '1.5rem 1rem',
};

const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '1.2rem',
    marginBottom: '0.8rem',
};

const spinnerStyle: React.CSSProperties = {
    width: '30px',
    height: '30px',
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
};

const spinnerStyleSmall: React.CSSProperties = {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255,255,255,0.1)',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
};
