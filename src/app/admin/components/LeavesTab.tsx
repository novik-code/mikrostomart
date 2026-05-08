'use client';

// Zakładka Urlopy w panelu admina.
// - Filtr statusu (oczekujące / zatwierdzone / wszystkie)
// - Lista wniosków z możliwością approve / reject
// - Modal decyzji z notatką (przy reject powód wymagany)

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Check, X, AlertCircle, Calendar, User } from 'lucide-react';

type LeaveType = 'vacation' | 'on_demand' | 'sick' | 'child_care' | 'training' | 'delegation' | 'unpaid' | 'other';
type LeaveStatus = 'requested' | 'approved' | 'rejected' | 'cancelled';

interface LeaveRow {
    id: string;
    employee_id: string;
    employee_name: string;
    employee_position: string | null;
    type: LeaveType;
    date_from: string;
    date_to: string;
    days_count: number;
    status: LeaveStatus;
    reason: string | null;
    rejected_reason: string | null;
    created_at: string;
    approved_at: string | null;
}

const TYPE_LABELS: Record<LeaveType, string> = {
    vacation: 'Urlop wypoczynkowy',
    on_demand: 'Urlop na żądanie',
    sick: 'Chorobowe',
    child_care: 'Opieka nad dzieckiem',
    training: 'Szkolenie',
    delegation: 'Delegacja',
    unpaid: 'Urlop bezpłatny',
    other: 'Inne',
};

const STATUS_LABELS: Record<LeaveStatus, { label: string; color: string }> = {
    requested: { label: 'Oczekuje',     color: '#fbbf24' },
    approved:  { label: 'Zatwierdzony', color: '#10b981' },
    rejected:  { label: 'Odrzucony',    color: '#ef4444' },
    cancelled: { label: 'Anulowany',    color: '#94a3b8' },
};

export default function LeavesTab() {
    const [filter, setFilter] = useState<LeaveStatus | 'all'>('requested');
    const [rows, setRows] = useState<LeaveRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [decision, setDecision] = useState<{ row: LeaveRow; type: 'approve' | 'reject' } | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.set('status', filter);
            const res = await fetch(`/api/admin/leave-requests?${params.toString()}`, { cache: 'no-store' });
            const data = await res.json();
            if (!res.ok) { setError(data?.error ?? `Błąd ${res.status}`); return; }
            setRows(data.requests ?? []);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { void fetchData(); }, [fetchData]);

    const counts = {
        requested: rows.filter((r) => r.status === 'requested').length,
        approved: rows.filter((r) => r.status === 'approved').length,
        rejected: rows.filter((r) => r.status === 'rejected').length,
    };

    return (
        <div style={{ padding: '1.25rem 1.5rem' }}>
            <header style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                    🏖 Urlopy
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', marginTop: 4 }}>
                    Wnioski urlopowe pracowników. Zatwierdzenie automatycznie wpisuje nieobecność do grafiku.
                </p>
            </header>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
                {(['requested', 'approved', 'rejected', 'all'] as const).map((s) => {
                    const isActive = filter === s;
                    const label = s === 'all' ? 'Wszystkie' : STATUS_LABELS[s as LeaveStatus]?.label ?? s;
                    return (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 999,
                                border: `1px solid ${isActive ? '#fbbf24' : 'rgba(255,255,255,0.15)'}`,
                                background: isActive ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.04)',
                                color: isActive ? '#fbbf24' : 'rgba(255,255,255,0.7)',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                    <Loader2 size={24} className="spin" /> Ładowanie…
                </div>
            ) : error ? (
                <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, color: '#fca5a5' }}>
                    <AlertCircle size={16} style={{ display: 'inline', marginRight: 8 }} /> {error}
                </div>
            ) : rows.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                    Brak wniosków w tym filtrze.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {rows.map((r) => {
                        const status = STATUS_LABELS[r.status];
                        return (
                            <div
                                key={r.id}
                                style={{
                                    padding: '0.9rem 1rem',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${status.color}40`,
                                    borderRadius: 10,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 6,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <User size={16} style={{ color: '#fbbf24', flexShrink: 0 }} />
                                    <span style={{ color: '#fff', fontWeight: 700 }}>{r.employee_name}</span>
                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>
                                        {r.employee_position ?? '—'}
                                    </span>
                                    <span style={{ marginLeft: 8, color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                                        {TYPE_LABELS[r.type]}
                                    </span>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: 999,
                                        background: `${status.color}25`,
                                        color: status.color,
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                    }}>
                                        {status.label}
                                    </span>
                                    {r.status === 'requested' && (
                                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                                            <button
                                                onClick={() => setDecision({ row: r, type: 'approve' })}
                                                style={{ padding: '5px 10px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 6, color: '#10b981', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                            >
                                                <Check size={14} /> Akceptuj
                                            </button>
                                            <button
                                                onClick={() => setDecision({ row: r, type: 'reject' })}
                                                style={{ padding: '5px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#fca5a5', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                            >
                                                <X size={14} /> Odrzuć
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Calendar size={14} />
                                    {r.date_from === r.date_to
                                        ? new Date(r.date_from).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                                        : `${new Date(r.date_from).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} – ${new Date(r.date_to).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                    }
                                    {' · '}
                                    <b>{r.days_count}</b> dni roboczych
                                </div>
                                {r.reason && (
                                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                        „{r.reason}"
                                    </div>
                                )}
                                {r.rejected_reason && (
                                    <div style={{ color: '#fca5a5', fontSize: '0.8rem' }}>
                                        Powód odrzucenia: {r.rejected_reason}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {decision && (
                <DecisionModal
                    row={decision.row}
                    type={decision.type}
                    onClose={() => setDecision(null)}
                    onDone={() => {
                        setDecision(null);
                        setToast(decision.type === 'approve' ? 'Zatwierdzono wniosek' : 'Odrzucono wniosek');
                        setTimeout(() => setToast(null), 4000);
                        void fetchData();
                    }}
                />
            )}

            {toast && (
                <div style={{
                    position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(15,23,42,0.95)', color: '#fff', padding: '0.8rem 1.4rem',
                    borderRadius: 10, border: '1px solid rgba(16,185,129,0.4)', zIndex: 100000,
                }}>
                    <Check size={16} style={{ display: 'inline', marginRight: 8, color: '#10b981' }} />
                    {toast}
                </div>
            )}

            <style jsx global>{`
                .spin { animation: spinkeyfL 1s linear infinite; }
                @keyframes spinkeyfL { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

function DecisionModal({ row, type, onClose, onDone }: { row: LeaveRow; type: 'approve' | 'reject'; onClose: () => void; onDone: () => void }) {
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        setError(null);
        if (type === 'reject' && reason.trim().length < 3) {
            setError('Powód odrzucenia wymagany (min 3 znaki)');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/leave-requests/${row.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    decision: type === 'approve' ? 'approved' : 'rejected',
                    rejectedReason: type === 'reject' ? reason.trim() : undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data?.error ?? `Błąd ${res.status}`); return; }
            onDone();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const isApprove = type === 'approve';

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
            <div onClick={(e) => e.stopPropagation()} style={{
                background: '#1e293b', borderRadius: 16, padding: '1.5rem', maxWidth: 460, width: '100%',
                color: '#fff', border: `1px solid ${isApprove ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
            }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8 }}>
                    {isApprove ? '✅ Zatwierdzić wniosek?' : '❌ Odrzucić wniosek?'}
                </h3>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.75rem', borderRadius: 8, fontSize: '0.85rem', marginBottom: 12 }}>
                    <div><b>{row.employee_name}</b> — {TYPE_LABELS[row.type]}</div>
                    <div>{new Date(row.date_from).toLocaleDateString('pl-PL')} – {new Date(row.date_to).toLocaleDateString('pl-PL')} · {row.days_count} dni</div>
                    {row.reason && <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: 4, fontStyle: 'italic' }}>„{row.reason}"</div>}
                </div>

                {isApprove ? (
                    <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', marginBottom: 12 }}>
                        Po zatwierdzeniu nieobecność zostanie automatycznie wpisana do grafiku pracownika
                        i odjęta od bilansu urlopu (jeśli typ liczony).
                    </div>
                ) : (
                    <>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                            Powód odrzucenia *
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="np. brak zastępstwa, kolizja z planowanymi wizytami…"
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '0.5rem 0.7rem',
                                borderRadius: 8,
                                border: '1px solid rgba(239,68,68,0.4)',
                                background: 'rgba(0,0,0,0.3)',
                                color: '#fff',
                                fontSize: '0.9rem',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                            }}
                        />
                    </>
                )}

                {error && <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: 8 }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                    <button onClick={onClose} disabled={saving}
                        style={{ padding: '0.55rem 1.1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', fontSize: '0.85rem' }}>
                        Anuluj
                    </button>
                    <button onClick={() => void submit()} disabled={saving}
                        style={{
                            padding: '0.55rem 1.1rem',
                            borderRadius: 8,
                            border: 'none',
                            background: isApprove ? '#10b981' : '#ef4444',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                        }}>
                        {saving && <Loader2 size={14} className="spin" />}
                        {isApprove ? 'Zatwierdź i wpisz do grafiku' : 'Odrzuć'}
                    </button>
                </div>
            </div>
        </div>
    );
}
