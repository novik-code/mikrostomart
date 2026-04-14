'use client';

import { useState, useEffect, useCallback } from 'react';

interface Task {
    id: string;
    sort_order: number;
    title: string;
    description: string;
    icon: string;
    scheduled_at: string;
    completed_at: string | null;
    skipped_at: string | null;
    medication_name: string | null;
    medication_dose: string | null;
    sms_sent: boolean;
    push_sent_count: number;
}

interface EnrollmentDetail {
    id: string;
    patient_name: string;
    patient_id: string;
    patient_phone: string | null;
    template_name: string;
    appointment_date: string;
    doctor_name: string;
    status: string;
    enrolled_by: string;
    access_token: string;
    prescription_code: string | null;
    custom_notes: string | null;
}

interface AuditEntry {
    id: string;
    action: string;
    actor: string;
    details: any;
    created_at: string;
}

interface Props {
    enrollmentId: string;
    onClose: () => void;
    onSaved: () => void;
}

const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '1.2rem',
    marginBottom: '1rem',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.55rem 0.8rem',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.3)',
    color: 'white',
    fontSize: '0.85rem',
    outline: 'none',
};

const btnPrimary: React.CSSProperties = {
    padding: '0.6rem 1.2rem',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.85rem',
};

const btnSecondary: React.CSSProperties = {
    padding: '0.5rem 1rem',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.85rem',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '0.2rem',
    marginTop: '0.6rem',
};

/**
 * Convert a UTC ISO string to a local datetime-local input value (Europe/Warsaw)
 */
function toLocalDatetimeValue(isoStr: string): string {
    const d = new Date(isoStr);
    // Use manual offset to get Warsaw time for the input
    const warsawStr = d.toLocaleString('sv-SE', { timeZone: 'Europe/Warsaw' });
    // sv-SE gives "2026-04-14 15:30:00" format — perfect for datetime-local
    return warsawStr.replace(' ', 'T').slice(0, 16);
}

/**
 * Convert a datetime-local input value (assumed Warsaw) to ISO string
 */
function fromLocalDatetimeValue(localStr: string): string {
    // localStr is "2026-04-14T15:30" — user means Warsaw time
    // We need to compute the UTC equivalent
    const tempDate = new Date(localStr + ':00Z');
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Warsaw', hour12: false, hour: 'numeric' });
    let offset = parseInt(formatter.format(tempDate)) - tempDate.getUTCHours();
    if (offset < -12) offset += 24;
    if (offset > 12) offset -= 24;
    const offsetStr = `${offset >= 0 ? '+' : '-'}${String(Math.abs(offset)).padStart(2, '0')}:00`;
    return `${localStr}:00${offsetStr}`;
}

export default function CareFlowEnrollmentEditor({ enrollmentId, onClose, onSaved }: Props) {
    const [enrollment, setEnrollment] = useState<EnrollmentDetail | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingTask, setSavingTask] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    // Editable fields
    const [appointmentDate, setAppointmentDate] = useState('');
    const [doctorName, setDoctorName] = useState('');
    const [patientPhone, setPatientPhone] = useState('');
    const [prescriptionCode, setPrescriptionCode] = useState('');
    const [customNotes, setCustomNotes] = useState('');

    // Task edits (id -> new scheduled_at ISO)
    const [taskEdits, setTaskEdits] = useState<Record<string, string>>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/employee/careflow/enrollments/${enrollmentId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setEnrollment(data.enrollment);
            setTasks(data.tasks || []);
            setAuditLog(data.auditLog || []);

            // Initialize form fields
            setAppointmentDate(toLocalDatetimeValue(data.enrollment.appointment_date));
            setDoctorName(data.enrollment.doctor_name || '');
            setPatientPhone(data.enrollment.patient_phone || '');
            setPrescriptionCode(data.enrollment.prescription_code || '');
            setCustomNotes(data.enrollment.custom_notes || '');
        } catch (err: any) {
            setToast(`❌ ${err.message}`);
        }
        setLoading(false);
    }, [enrollmentId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 4000);
    };

    // Save enrollment fields
    const handleSaveEnrollment = async () => {
        if (!enrollment) return;
        setSaving(true);
        try {
            const newAppointmentIso = fromLocalDatetimeValue(appointmentDate);
            const body: Record<string, any> = {};

            // Only send changed fields
            if (newAppointmentIso !== enrollment.appointment_date) body.appointmentDate = newAppointmentIso;
            if (doctorName !== (enrollment.doctor_name || '')) body.doctorName = doctorName;
            if (patientPhone !== (enrollment.patient_phone || '')) body.patientPhone = patientPhone;
            if (prescriptionCode !== (enrollment.prescription_code || '')) body.prescriptionCode = prescriptionCode;
            if (customNotes !== (enrollment.custom_notes || '')) body.customNotes = customNotes;

            if (Object.keys(body).length === 0) {
                showToast('ℹ️ Brak zmian do zapisania');
                setSaving(false);
                return;
            }

            const res = await fetch(`/api/employee/careflow/enrollments/${enrollmentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast(`✅ Zapisano!${data.tasksRecalculated ? ` Przeliczono ${data.tasksRecalculated} zadań.` : ''}`);
            fetchData(); // Reload to see updated tasks
            onSaved();
        } catch (err: any) {
            showToast(`❌ ${err.message}`);
        }
        setSaving(false);
    };

    // Save individual task scheduled_at
    const handleSaveTask = async (taskId: string) => {
        const newScheduledLocal = taskEdits[taskId];
        if (!newScheduledLocal) return;

        setSavingTask(taskId);
        try {
            const newScheduledIso = fromLocalDatetimeValue(newScheduledLocal);
            const res = await fetch(`/api/employee/careflow/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scheduledAt: newScheduledIso }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast('✅ Godzina zadania zapisana');
            setTaskEdits(prev => { const n = { ...prev }; delete n[taskId]; return n; });
            fetchData();
        } catch (err: any) {
            showToast(`❌ ${err.message}`);
        }
        setSavingTask(null);
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>
                Ładowanie...
            </div>
        );
    }

    if (!enrollment) {
        return (
            <div style={cardStyle}>
                <p style={{ color: '#ef4444' }}>Nie znaleziono enrollment</p>
                <button style={btnSecondary} onClick={onClose}>← Powrót</button>
            </div>
        );
    }

    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>
                    ✏️ Edycja: {enrollment.patient_name}
                </h3>
                <button style={btnSecondary} onClick={onClose}>← Powrót do listy</button>
            </div>

            {/* Status badge + link */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{
                    padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
                    background: enrollment.status === 'active' ? 'rgba(16,185,129,0.2)' : enrollment.status === 'completed' ? 'rgba(99,102,241,0.2)' : 'rgba(239,68,68,0.2)',
                    color: enrollment.status === 'active' ? '#10b981' : enrollment.status === 'completed' ? '#6366f1' : '#ef4444',
                }}>
                    {enrollment.status === 'active' ? '🟢 Aktywny' : enrollment.status === 'completed' ? '✅ Zakończony' : '❌ Anulowany'}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                    Szablon: {enrollment.template_name} • Enrollment: {enrollment.enrolled_by}
                </span>
                <button
                    style={{ ...btnSecondary, fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
                    onClick={() => {
                        navigator.clipboard.writeText(`${siteUrl}/opieka/${enrollment.access_token}`);
                        showToast('🔗 Link skopiowany!');
                    }}
                >
                    🔗 Kopiuj link pacjenta
                </button>
            </div>

            {/* Enrollment fields */}
            <div style={cardStyle}>
                <h4 style={{ margin: '0 0 0.6rem', color: 'white', fontSize: '0.95rem' }}>📋 Dane procesu</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                    <div>
                        <label style={labelStyle}>📅 Data i godzina zabiegu</label>
                        <input
                            type="datetime-local"
                            style={inputStyle}
                            value={appointmentDate}
                            onChange={e => setAppointmentDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>👨‍⚕️ Lekarz</label>
                        <input
                            style={inputStyle}
                            value={doctorName}
                            onChange={e => setDoctorName(e.target.value)}
                            placeholder="Nazwisko lekarza"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>📱 Telefon pacjenta</label>
                        <input
                            style={inputStyle}
                            value={patientPhone}
                            onChange={e => setPatientPhone(e.target.value)}
                            placeholder="+48..."
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>💊 Kod recepty</label>
                        <input
                            style={inputStyle}
                            value={prescriptionCode}
                            onChange={e => setPrescriptionCode(e.target.value)}
                            placeholder="np. 4567"
                        />
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>📝 Notatki</label>
                    <textarea
                        style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }}
                        value={customNotes}
                        onChange={e => setCustomNotes(e.target.value)}
                        placeholder="Dodatkowe wskazówki dla pacjenta..."
                    />
                </div>
                <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button style={btnPrimary} onClick={handleSaveEnrollment} disabled={saving}>
                        {saving ? '⏳ Zapisuję...' : '💾 Zapisz zmiany'}
                    </button>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', marginTop: '0.5rem', marginBottom: 0 }}>
                    ⚠️ Zmiana daty zabiegu automatycznie przelicza godziny wszystkich zadań (przesunięcie o tę samą różnicę).
                </p>
            </div>

            {/* Tasks timeline with editable scheduled_at */}
            <div style={cardStyle}>
                <h4 style={{ margin: '0 0 0.8rem', color: 'white', fontSize: '0.95rem' }}>
                    📋 Zadania ({tasks.length})
                </h4>
                {tasks.sort((a, b) => a.sort_order - b.sort_order).map(task => {
                    const scheduled = new Date(task.scheduled_at);
                    const isDone = !!task.completed_at;
                    const isSkipped = !!task.skipped_at;
                    const hasEdit = taskEdits[task.id] !== undefined;

                    return (
                        <div
                            key={task.id}
                            style={{
                                padding: '0.8rem',
                                background: isDone ? 'rgba(16,185,129,0.06)' : isSkipped ? 'rgba(107,114,128,0.1)' : 'rgba(0,0,0,0.2)',
                                borderRadius: '12px',
                                marginBottom: '0.5rem',
                                borderLeft: `3px solid ${isDone ? '#10b981' : isSkipped ? '#6b7280' : '#6366f1'}`,
                                opacity: isSkipped ? 0.6 : 1,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ fontSize: '1rem' }}>{isDone ? '✅' : task.icon}</span>
                                        <span style={{
                                            color: isDone ? '#10b981' : 'white',
                                            fontWeight: 600,
                                            fontSize: '0.85rem',
                                            textDecoration: isSkipped ? 'line-through' : 'none',
                                        }}>
                                            #{task.sort_order} {task.title}
                                        </span>
                                    </div>
                                    {task.medication_name && (
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.2rem', marginLeft: '1.4rem' }}>
                                            💊 {task.medication_name} {task.medication_dose && `— ${task.medication_dose}`}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.2rem', marginLeft: '1.4rem' }}>
                                        {task.sms_sent && '📱 SMS wysłany • '}
                                        {task.push_sent_count > 0 && `🔔 Push ×${task.push_sent_count} • `}
                                        {isDone && task.completed_at && `✓ ${new Date(task.completed_at).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })}`}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: '220px' }}>
                                    <input
                                        type="datetime-local"
                                        style={{ ...inputStyle, width: '180px', fontSize: '0.75rem', padding: '0.3rem 0.4rem' }}
                                        value={taskEdits[task.id] ?? toLocalDatetimeValue(task.scheduled_at)}
                                        onChange={e => setTaskEdits(prev => ({ ...prev, [task.id]: e.target.value }))}
                                    />
                                    {hasEdit && (
                                        <button
                                            style={{ ...btnPrimary, padding: '0.3rem 0.5rem', fontSize: '0.7rem' }}
                                            onClick={() => handleSaveTask(task.id)}
                                            disabled={savingTask === task.id}
                                        >
                                            {savingTask === task.id ? '⏳' : '💾'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Audit log */}
            {auditLog.length > 0 && (
                <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 0.6rem', color: 'white', fontSize: '0.95rem' }}>📜 Historia zmian</h4>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {auditLog.slice(0, 20).map(entry => (
                            <div key={entry.id} style={{ padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem' }}>
                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                                    {new Date(entry.created_at).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })}
                                </span>
                                <span style={{ color: '#818cf8', marginLeft: '0.5rem' }}>{entry.action}</span>
                                <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: '0.5rem' }}>by {entry.actor}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)', color: 'white',
                    padding: '0.8rem 1.5rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)',
                    fontSize: '0.9rem', fontWeight: 500, zIndex: 1000, maxWidth: '90vw', textAlign: 'center',
                }}>
                    {toast}
                </div>
            )}
        </div>
    );
}
