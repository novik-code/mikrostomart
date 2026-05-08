'use client';

// Zakładka Urlopy w strefie pracownika.
// - Bilans urlopu (rocznie / wykorzystane / oczekujące / pozostałe)
// - Lista własnych wniosków z statusami
// - Przycisk "+ Złóż nowy wniosek" → modal z formularzem

import { useCallback, useEffect, useState } from 'react';
import { Calendar, Plus, X, Loader2, AlertCircle, Check, Trash2 } from 'lucide-react';

type LeaveType = 'vacation' | 'on_demand' | 'sick' | 'child_care' | 'training' | 'delegation' | 'unpaid' | 'other';
type LeaveStatus = 'requested' | 'approved' | 'rejected' | 'cancelled';

interface LeaveRequest {
    id: string;
    type: LeaveType;
    date_from: string;
    date_to: string;
    days_count: number;
    hours_per_day: number | null;
    status: LeaveStatus;
    reason: string | null;
    rejected_reason: string | null;
    approved_at: string | null;
    cancelled_at: string | null;
    created_at: string;
}

interface Balance {
    annualEntitlement: number;
    daysUsed: number;
    daysPending: number;
    daysRemaining: number;
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
    requested: { label: 'Oczekuje',    color: '#fbbf24' },
    approved:  { label: 'Zatwierdzony', color: '#10b981' },
    rejected:  { label: 'Odrzucony',    color: '#ef4444' },
    cancelled: { label: 'Anulowany',    color: '#94a3b8' },
};

export default function UrlopyTab() {
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [balance, setBalance] = useState<Balance | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [composeOpen, setComposeOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/employee/leave-requests', { cache: 'no-store' });
            const data = await res.json();
            if (!res.ok) {
                setError(data?.error ?? `Błąd ${res.status}`);
                return;
            }
            setRequests(data.requests ?? []);
            setBalance(data.balance ?? null);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void fetchData(); }, [fetchData]);

    const cancelRequest = async (id: string) => {
        if (!confirm('Anulować wniosek?')) return;
        const res = await fetch(`/api/employee/leave-requests/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) {
            setToast(`Błąd: ${data?.error ?? res.status}`);
        } else {
            setToast('Anulowano wniosek');
            void fetchData();
        }
        setTimeout(() => setToast(null), 4000);
    };

    return (
        <div style={{ padding: '1.25rem', maxWidth: 800, margin: '0 auto' }}>
            <header style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                    🏖 Urlopy
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', marginTop: 4 }}>
                    Składaj wnioski urlopowe i sprawdzaj bilans dni.
                </p>
            </header>

            {/* BALANCE */}
            {balance && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 12,
                    marginBottom: '1rem',
                }}>
                    <BalanceCard label={`Roczny limit (${new Date().getFullYear()})`} value={`${balance.annualEntitlement} dni`} />
                    <BalanceCard label="Wykorzystane" value={`${balance.daysUsed} dni`} color="#10b981" />
                    <BalanceCard label="Oczekujące" value={`${balance.daysPending} dni`} color="#fbbf24" />
                    <BalanceCard label="Pozostałe" value={`${balance.daysRemaining} dni`} color="#a78bfa" highlight />
                </div>
            )}

            {/* CTA */}
            <div style={{ marginBottom: '1rem' }}>
                <button
                    onClick={() => setComposeOpen(true)}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                        color: '#0f172a',
                        border: 'none',
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <Plus size={18} /> Złóż nowy wniosek
                </button>
            </div>

            {/* LIST */}
            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                    <Loader2 size={24} className="spin" /> Ładowanie…
                </div>
            ) : error ? (
                <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, color: '#fca5a5' }}>
                    <AlertCircle size={16} style={{ display: 'inline', marginRight: 8 }} /> {error}
                </div>
            ) : requests.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                    Brak wniosków. Złóż pierwszy używając przycisku powyżej.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {requests.map((r) => {
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
                                    gap: 4,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <Calendar size={16} style={{ color: '#fbbf24', flexShrink: 0 }} />
                                    <span style={{ color: '#fff', fontWeight: 600 }}>
                                        {TYPE_LABELS[r.type]}
                                    </span>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: 999,
                                        background: `${status.color}25`,
                                        color: status.color,
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                    }}>
                                        {status.label}
                                    </span>
                                    {r.status === 'requested' && (
                                        <button
                                            onClick={() => void cancelRequest(r.id)}
                                            title="Anuluj wniosek"
                                            style={{
                                                marginLeft: 'auto',
                                                padding: '4px 8px',
                                                background: 'rgba(239,68,68,0.1)',
                                                border: '1px solid rgba(239,68,68,0.3)',
                                                borderRadius: 6,
                                                color: '#fca5a5',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                            }}
                                        >
                                            <Trash2 size={12} /> Anuluj
                                        </button>
                                    )}
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                                    {r.date_from === r.date_to
                                        ? new Date(r.date_from).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                                        : `${new Date(r.date_from).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} – ${new Date(r.date_to).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                    }
                                    {' · '}
                                    <b>{r.days_count}</b> dni roboczych
                                </div>
                                {r.reason && (
                                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginTop: 4 }}>
                                        Powód: {r.reason}
                                    </div>
                                )}
                                {r.rejected_reason && (
                                    <div style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: 4 }}>
                                        Odrzucenie: {r.rejected_reason}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {composeOpen && (
                <ComposeModal
                    onClose={() => setComposeOpen(false)}
                    onCreated={() => {
                        setComposeOpen(false);
                        setToast('Złożono wniosek');
                        setTimeout(() => setToast(null), 3000);
                        void fetchData();
                    }}
                />
            )}

            {toast && (
                <div style={{
                    position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(15,23,42,0.95)', color: '#fff', padding: '0.8rem 1.4rem',
                    borderRadius: 10, border: '1px solid rgba(16,185,129,0.4)', zIndex: 100000,
                    maxWidth: '90vw',
                }}>
                    <Check size={16} style={{ display: 'inline', marginRight: 8, color: '#10b981' }} />
                    {toast}
                </div>
            )}

            <style jsx global>{`
                .spin { animation: spinkeyfU 1s linear infinite; }
                @keyframes spinkeyfU { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

function BalanceCard({ label, value, color, highlight }: { label: string; value: string; color?: string; highlight?: boolean }) {
    return (
        <div style={{
            padding: '0.85rem 1rem',
            background: highlight ? 'rgba(167,139,250,0.1)' : 'rgba(0,0,0,0.25)',
            border: `1px solid ${highlight ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 10,
        }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
                {label}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: color ?? '#fff' }}>{value}</div>
        </div>
    );
}

function ComposeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [type, setType] = useState<LeaveType>('vacation');
    const [dateFrom, setDateFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        setError(null);
        if (dateTo < dateFrom) { setError('Data końcowa musi być >= początkowa'); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/employee/leave-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, dateFrom, dateTo, reason: reason.trim() || null }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data?.error ?? `Błąd ${res.status}`); return; }
            onCreated();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
            <div onClick={(e) => e.stopPropagation()} style={{
                background: '#1e293b', borderRadius: 16, padding: '1.5rem', maxWidth: 460, width: '100%',
                color: '#fff', border: '1px solid rgba(251,191,36,0.3)', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 1 }}>Nowy wniosek</div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 4 }}>🏖 Wniosek urlopowy</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 6, color: '#fff', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                </div>

                <label style={lbl}>Typ wniosku</label>
                <select value={type} onChange={(e) => setType(e.target.value as LeaveType)} style={input}>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </select>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                    <div>
                        <label style={lbl}>Od</label>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={input} />
                    </div>
                    <div>
                        <label style={lbl}>Do</label>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={input} />
                    </div>
                </div>

                <label style={{ ...lbl, marginTop: 12 }}>Powód (opcjonalny)</label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="np. wakacje rodzinne, wizyta lekarska, opieka..."
                    style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }}
                />

                {error && <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: 8 }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                    <button onClick={onClose} disabled={saving} style={btnSec}>Anuluj</button>
                    <button onClick={() => void submit()} disabled={saving} style={btnPrim}>
                        {saving && <Loader2 size={14} className="spin" />}
                        <span style={{ marginLeft: 6 }}>Złóż wniosek</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

const lbl: React.CSSProperties = {
    display: 'block',
    fontSize: '0.78rem',
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
};

const input: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.7rem',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(0,0,0,0.3)',
    color: '#fff',
    fontSize: '0.9rem',
};

const btnSec: React.CSSProperties = {
    padding: '0.55rem 1.1rem',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.85)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
};

const btnPrim: React.CSSProperties = {
    padding: '0.55rem 1.1rem',
    borderRadius: 8,
    border: 'none',
    background: '#fbbf24',
    color: '#0f172a',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
};
