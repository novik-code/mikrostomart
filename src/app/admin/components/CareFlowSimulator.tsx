'use client';

import { useState, useEffect, useCallback } from 'react';

interface SimTask {
    id: string;
    sort_order: number;
    title: string;
    description: string;
    icon: string;
    scheduled_at: string;
    completed_at: string | null;
    skipped_at: string | null;
    push_sent_count: number;
    push_max_count: number;
    push_last_sent_at: string | null;
    sms_sent: boolean;
    medication_name: string | null;
    medication_dose: string | null;
    original_offset_hours: number;
    _status: 'completed' | 'pending' | 'future' | 'skipped';
}

interface SimEnrollment {
    id: string;
    patient_name: string;
    patient_phone: string | null;
    template_name: string;
    appointment_date: string;
    doctor_name: string;
    status: string;
    access_token: string;
    landingPageUrl: string;
    report_pdf_url: string | null;
    report_exported_to_prodentis: boolean;
}

interface AuditEntry {
    id: string;
    action: string;
    actor: string;
    details: any;
    created_at: string;
    task_id: string | null;
}

const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '1.2rem',
    marginBottom: '1rem',
};

const btnStyle: React.CSSProperties = {
    padding: '0.6rem 1.2rem',
    borderRadius: '10px',
    border: 'none',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.85rem',
    transition: 'all 0.2s',
    width: '100%',
    textAlign: 'left' as const,
};

export default function CareFlowSimulator() {
    const [enrollment, setEnrollment] = useState<SimEnrollment | null>(null);
    const [tasks, setTasks] = useState<SimTask[]>([]);
    const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [dryRun, setDryRun] = useState(true);
    const [lastResult, setLastResult] = useState<any>(null);
    const [showAuditLog, setShowAuditLog] = useState(false);

    // Setup form
    const [patientName, setPatientName] = useState('Nowosielski Marcin');
    const [patientPhone, setPatientPhone] = useState('');
    const [doctorName, setDoctorName] = useState('Marcin Nowosielski');
    const [appointmentDate, setAppointmentDate] = useState(() => {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        return tomorrow.toISOString().slice(0, 10) + 'T15:30';
    });

    const fetchStatus = useCallback(async (eid?: string) => {
        try {
            const body: any = { action: 'status' };
            if (eid) body.enrollmentId = eid;
            const res = await fetch('/api/admin/careflow/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.exists) {
                setEnrollment(data.enrollment);
                setTasks(data.tasks || []);
                setAuditLog(data.auditLog || []);
                setStats(data.stats);
            } else {
                setEnrollment(null);
                setTasks([]);
                setAuditLog([]);
                setStats(null);
            }
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    const doAction = async (action: string, extra?: any) => {
        setActionLoading(action);
        setLastResult(null);
        try {
            const body: any = { action, dryRun, ...extra };
            if (enrollment) body.enrollmentId = enrollment.id;

            const res = await fetch('/api/admin/careflow/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            setLastResult({ action, ...data });

            if (data.enrollmentId) {
                await fetchStatus(data.enrollmentId);
            } else {
                await fetchStatus(enrollment?.id);
            }
        } catch (err: any) {
            setLastResult({ action, error: err.message });
        }
        setActionLoading(null);
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const formatOffset = (h: number) => {
        if (h === 0) return '⏰ Zabieg';
        const abs = Math.abs(h);
        const days = Math.floor(abs / 24);
        const hours = abs % 24;
        const prefix = h < 0 ? '-' : '+';
        let label = '';
        if (days > 0) label += `${days}d`;
        if (hours > 0) label += `${hours}h`;
        return `${prefix}${label}`;
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)' }}>Ładowanie symulatora...</div>;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.08))', borderColor: 'rgba(245,158,11,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>🧪 CareFlow Simulator</h3>
                        <p style={{ margin: '0.3rem 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                            Przetestuj cały pipeline krok po kroku, bez wpływu na produkcyjne dane.
                        </p>
                    </div>
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem',
                        color: dryRun ? '#f59e0b' : '#ef4444', fontWeight: 600, cursor: 'pointer',
                        padding: '0.4rem 0.8rem', borderRadius: '8px',
                        background: dryRun ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                        border: `1px solid ${dryRun ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    }}>
                        <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
                        {dryRun ? '🔒 Dry Run (bezpieczny)' : '🔴 Prawdziwe SMS/Push!'}
                    </label>
                </div>
            </div>

            {/* Setup or Status */}
            {!enrollment ? (
                <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 1rem', color: 'white', fontSize: '0.95rem' }}>⚙️ Skonfiguruj symulację</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                        <div>
                            <label style={labelSt}>Pacjent</label>
                            <input style={inputSt} value={patientName} onChange={e => setPatientName(e.target.value)} />
                        </div>
                        <div>
                            <label style={labelSt}>Telefon (do SMS)</label>
                            <input style={inputSt} value={patientPhone} onChange={e => setPatientPhone(e.target.value)} placeholder="+48..." />
                        </div>
                        <div>
                            <label style={labelSt}>Lekarz</label>
                            <input style={inputSt} value={doctorName} onChange={e => setDoctorName(e.target.value)} />
                        </div>
                        <div>
                            <label style={labelSt}>Data wizyty</label>
                            <input type="datetime-local" style={inputSt} value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} />
                        </div>
                    </div>
                    <button
                        style={{ ...btnStyle, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', marginTop: '1rem', textAlign: 'center' }}
                        disabled={actionLoading === 'setup'}
                        onClick={() => {
                            const d = new Date(appointmentDate);
                            doAction('setup', { patientName, patientPhone, doctorName, appointmentDate: d.toISOString(), templateName: '' });
                        }}
                    >
                        {actionLoading === 'setup' ? '⏳ Tworzę...' : '🚀 Utwórz symulację'}
                    </button>
                </div>
            ) : (
                <>
                    {/* Enrollment info */}
                    <div style={{ ...cardStyle, background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>
                                    👤 {enrollment.patient_name}
                                    <span style={{
                                        fontSize: '0.7rem', marginLeft: '0.5rem', padding: '0.1rem 0.4rem',
                                        borderRadius: '6px',
                                        background: enrollment.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)',
                                        color: enrollment.status === 'active' ? '#10b981' : '#6366f1',
                                    }}>
                                        {enrollment.status === 'active' ? '🟢 Aktywny' : '✅ Zakończony'}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>
                                    🏥 {enrollment.template_name} • 📅 {formatDate(enrollment.appointment_date)} • 👨‍⚕️ {enrollment.doctor_name}
                                    {enrollment.patient_phone && ` • 📱 ${enrollment.patient_phone}`}
                                </div>
                            </div>
                            <a
                                href={enrollment.landingPageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    fontSize: '0.8rem', color: '#818cf8', textDecoration: 'none',
                                    padding: '0.3rem 0.6rem', borderRadius: '8px',
                                    background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                                }}
                            >
                                🔗 Strona pacjenta
                            </a>
                        </div>

                        {/* Progress */}
                        {stats && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                    <span>✅ {stats.completed} / {stats.total} | ⏳ {stats.pending} pending | ⬜ {stats.future} future</span>
                                    <span>{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</span>
                                </div>
                                <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', marginTop: '0.2rem' }}>
                                    <div style={{
                                        height: '100%', borderRadius: '3px', transition: 'width 0.3s',
                                        width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`,
                                        background: stats.completed === stats.total ? '#10b981' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                    }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                        <button
                            style={{ ...btnStyle, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                            disabled={!!actionLoading || enrollment.status !== 'active'}
                            onClick={() => doAction('push')}
                        >
                            {actionLoading === 'push' ? '⏳...' : `📡 Wyślij push/SMS ${dryRun ? '(dry)' : ''}`}
                        </button>
                        <button
                            style={{ ...btnStyle, background: 'linear-gradient(135deg, #10b981, #059669)' }}
                            disabled={!!actionLoading || enrollment.status !== 'active'}
                            onClick={() => doAction('complete_all')}
                        >
                            {actionLoading === 'complete_all' ? '⏳...' : '✅✅ Oznacz wszystkie'}
                        </button>
                        <button
                            style={{ ...btnStyle, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
                            disabled={!!actionLoading || enrollment.status === 'active'}
                            onClick={() => doAction('report')}
                        >
                            {actionLoading === 'report' ? '⏳...' : '📄 Generuj raport PDF'}
                        </button>
                        <button
                            style={{ ...btnStyle, background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                            disabled={!!actionLoading}
                            onClick={() => { if (confirm('Usunąć wszystkie dane symulacji?')) doAction('cleanup'); }}
                        >
                            {actionLoading === 'cleanup' ? '⏳...' : '🗑️ Cleanup'}
                        </button>
                    </div>

                    {/* PDF link */}
                    {enrollment.report_pdf_url && (
                        <div style={{ ...cardStyle, background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' }}>
                            <a href={enrollment.report_pdf_url} target="_blank" rel="noopener noreferrer"
                               style={{ color: '#10b981', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                                📄 Pobierz wygenerowany PDF
                            </a>
                        </div>
                    )}

                    {/* Task Timeline */}
                    <div style={cardStyle}>
                        <h4 style={{ margin: '0 0 0.8rem', color: 'white', fontSize: '0.95rem' }}>📋 Timeline zadań</h4>
                        <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                            <div style={{ position: 'absolute', left: '0.55rem', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.08)' }} />
                            {tasks.map((task) => {
                                const dotColor = task._status === 'completed' ? '#10b981'
                                    : task._status === 'pending' ? '#f59e0b'
                                    : task._status === 'skipped' ? '#6b7280' : 'rgba(255,255,255,0.15)';
                                const isPending = task._status === 'pending';

                                return (
                                    <div key={task.id} style={{ position: 'relative', marginBottom: '0.6rem' }}>
                                        {/* Dot */}
                                        <div style={{
                                            position: 'absolute', left: '-1.2rem', top: '0.6rem',
                                            width: isPending ? '12px' : '8px', height: isPending ? '12px' : '8px',
                                            borderRadius: '50%', background: dotColor,
                                            marginLeft: isPending ? '-2px' : '0',
                                            boxShadow: isPending ? `0 0 8px ${dotColor}` : 'none',
                                        }} />

                                        <div style={{
                                            padding: '0.6rem 0.8rem', borderRadius: '10px',
                                            background: isPending ? 'rgba(245,158,11,0.08)' : task._status === 'completed' ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${isPending ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <span style={{ fontSize: '1rem' }}>{task._status === 'completed' ? '✅' : task.icon}</span>
                                                        <span style={{
                                                            color: task._status === 'completed' ? '#10b981' : isPending ? 'white' : 'rgba(255,255,255,0.4)',
                                                            fontWeight: isPending ? 600 : 400, fontSize: '0.85rem',
                                                        }}>
                                                            {task.title}
                                                        </span>
                                                        <span style={{ fontSize: '0.7rem', color: task.original_offset_hours < 0 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                                                            {formatOffset(task.original_offset_hours)}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.2rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                                                        <span>🕐 {formatDate(task.scheduled_at)}</span>
                                                        <span>📡 push: {task.push_sent_count}/{task.push_max_count}</span>
                                                        <span>📱 sms: {task.sms_sent ? '✅' : '❌'}</span>
                                                        {task.medication_name && <span>💊 {task.medication_name} {task.medication_dose}</span>}
                                                    </div>
                                                </div>
                                                {isPending && enrollment.status === 'active' && (
                                                    <button
                                                        onClick={() => doAction('complete', { taskId: task.id })}
                                                        disabled={!!actionLoading}
                                                        style={{
                                                            width: '36px', height: '36px', borderRadius: '10px',
                                                            border: '2px solid #10b981', background: 'transparent',
                                                            color: '#10b981', cursor: 'pointer', fontSize: '0.9rem',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            flexShrink: 0,
                                                        }}
                                                        title="Oznacz jako wykonane"
                                                    >
                                                        ✓
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Audit Log */}
                    <div style={cardStyle}>
                        <div
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => setShowAuditLog(!showAuditLog)}
                        >
                            <h4 style={{ margin: 0, color: 'white', fontSize: '0.95rem' }}>📜 Audit Log ({auditLog.length})</h4>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>{showAuditLog ? '▲ Zwiń' : '▼ Rozwiń'}</span>
                        </div>
                        {showAuditLog && (
                            <div style={{ marginTop: '0.8rem', maxHeight: '300px', overflowY: 'auto' }}>
                                {auditLog.map(entry => (
                                    <div key={entry.id} style={{
                                        padding: '0.4rem 0.6rem', borderRadius: '8px', marginBottom: '0.3rem',
                                        background: 'rgba(0,0,0,0.2)', fontSize: '0.75rem',
                                    }}>
                                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                                            {new Date(entry.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                        {' '}
                                        <span style={{ color: '#818cf8', fontWeight: 600 }}>{entry.action}</span>
                                        {' '}
                                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>by {entry.actor}</span>
                                        {entry.details && Object.keys(entry.details).length > 0 && (
                                            <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: '0.3rem' }}>
                                                {JSON.stringify(entry.details).slice(0, 80)}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Last result */}
            {lastResult && (
                <div style={{
                    ...cardStyle,
                    background: lastResult.error ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                    borderColor: lastResult.error ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.3rem' }}>
                        Ostatni wynik: <strong style={{ color: lastResult.error ? '#ef4444' : '#10b981' }}>{lastResult.action}</strong>
                    </div>
                    <pre style={{
                        color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: 0,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '200px', overflowY: 'auto',
                    }}>
                        {JSON.stringify(lastResult, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

// ─── Styles ──────
const inputSt: React.CSSProperties = {
    width: '100%', padding: '0.55rem 0.8rem', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)',
    color: 'white', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
};

const labelSt: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)',
    marginBottom: '0.2rem',
};
