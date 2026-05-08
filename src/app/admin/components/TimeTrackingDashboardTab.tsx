'use client';

// Dashboard naliczonych shifts (F4) — admin widzi:
// - listę pracowników × dni z kolorami statusu (✓/⚠/❌)
// - sumy worked/planned/late/overtime/anomalie
// - klik komórki → modal korekty z polami + powodem

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, X, Check, AlertCircle, Clock } from 'lucide-react';

interface CalculatedShift {
    id: string;
    employee_id: string;
    date: string;
    schedule_id: string | null;
    actual_start: string | null;
    actual_end: string | null;
    worked_minutes: number;
    sessions_count: number;
    planned_start_time: string | null;
    planned_end_time: string | null;
    planned_minutes: number;
    absence_type: string | null;
    late_minutes: number;
    early_leave_minutes: number;
    overtime_total_minutes: number;
    overtime_justified_minutes: number;
    overtime_unjustified_minutes: number;
    auto_closed: boolean;
    auto_close_reason: string | null;
    status: string;
    anomaly_flags: string[];
    notes: string | null;
}

interface EmployeeRef {
    id: string;
    name: string;
    position: string | null;
}

const ANOMALY_LABELS: Record<string, { label: string; color: string }> = {
    no_clock_in:           { label: 'Brak przyjścia', color: '#ef4444' },
    no_clock_out:          { label: 'Brak wyjścia',   color: '#f59e0b' },
    late_arrival:          { label: 'Spóźnienie',     color: '#fb923c' },
    early_leave:           { label: 'Wczesne wyjście', color: '#fbbf24' },
    overtime:              { label: 'Nadgodziny',     color: '#3b82f6' },
    no_schedule_but_worked:{ label: 'Wbity bez grafiku', color: '#a78bfa' },
    absence_but_clocked:   { label: 'Wbity podczas nieobecności', color: '#ef4444' },
    short_session:         { label: 'Bardzo krótka sesja', color: '#f59e0b' },
    orphan_clock_out:      { label: 'Wyjście bez przyjścia', color: '#ef4444' },
};

function formatMinutes(m: number): string {
    if (!m) return '0:00';
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}:${String(mm).padStart(2, '0')}`;
}

function formatTimeISO(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' });
}

function ymd(d: Date): string {
    return d.toISOString().slice(0, 10);
}

export default function TimeTrackingDashboardTab() {
    const today = ymd(new Date());
    // Default: ostatnie 14 dni
    const [from, setFrom] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 13);
        return ymd(d);
    });
    const [to, setTo] = useState<string>(today);
    const [shifts, setShifts] = useState<CalculatedShift[]>([]);
    const [employees, setEmployees] = useState<EmployeeRef[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recalcDay, setRecalcDay] = useState<string>(today);
    const [recalcLoading, setRecalcLoading] = useState(false);
    const [editing, setEditing] = useState<{ shift: CalculatedShift; employeeName: string } | null>(null);
    const [onlyAnomalies, setOnlyAnomalies] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ from, to });
            if (onlyAnomalies) params.set('onlyAnomalies', 'true');
            const res = await fetch(`/api/admin/time-tracking?${params.toString()}`, { cache: 'no-store' });
            const data = await res.json();
            if (!res.ok) {
                setError(data?.error ?? `Błąd ${res.status}`);
                return;
            }
            setShifts(data.shifts ?? []);
            setEmployees(data.employees ?? []);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [from, to, onlyAnomalies]);

    useEffect(() => { void fetchData(); }, [fetchData]);

    const recalculate = useCallback(async () => {
        if (!recalcDay) return;
        setRecalcLoading(true);
        try {
            const res = await fetch('/api/admin/time-tracking/recalculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: recalcDay }),
            });
            const data = await res.json();
            if (!res.ok) {
                setToast(`Błąd: ${data?.error ?? res.status}`);
            } else {
                setToast(`Przeliczono ${recalcDay}: ${data.processed} pracowników, ${data.withAnomalies} anomalii`);
                void fetchData();
            }
            setTimeout(() => setToast(null), 4000);
        } catch (e) {
            setToast(`Błąd: ${(e as Error).message}`);
        } finally {
            setRecalcLoading(false);
        }
    }, [recalcDay, fetchData]);

    // Mapuj shifts do siatki (pracownik × dzień)
    const days = useMemo(() => {
        const out: string[] = [];
        const start = new Date(from);
        const end = new Date(to);
        const d = new Date(start);
        while (d <= end) {
            out.push(ymd(d));
            d.setDate(d.getDate() + 1);
        }
        return out.reverse(); // najnowsze na górze
    }, [from, to]);

    const shiftMap = useMemo(() => {
        const m = new Map<string, CalculatedShift>();
        for (const s of shifts) m.set(`${s.employee_id}_${s.date}`, s);
        return m;
    }, [shifts]);

    const totalsByEmployee = useMemo(() => {
        const totals: Record<string, { worked: number; planned: number; late: number; overtime: number; absent: number }> = {};
        for (const e of employees) totals[e.id] = { worked: 0, planned: 0, late: 0, overtime: 0, absent: 0 };
        for (const s of shifts) {
            const t = totals[s.employee_id];
            if (!t) continue;
            t.worked += s.worked_minutes;
            t.planned += s.planned_minutes;
            t.late += s.late_minutes;
            t.overtime += s.overtime_total_minutes;
            if (s.absence_type) t.absent += 1;
        }
        return totals;
    }, [shifts, employees]);

    return (
        <div style={{ padding: '1.25rem 1.5rem' }}>
            <header style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Clock size={24} style={{ color: '#fbbf24' }} /> Czas pracy — dashboard (F4)
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', marginTop: 4 }}>
                    Wyliczone shifty (planned vs actual). Nadgodziny zasadne/niezasadne — po wdrożeniu F5 (Prodentis API).
                </p>
            </header>

            {/* CONTROLS */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: '1rem' }}>
                <label style={lbl}>Od:</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputSm} />
                <label style={lbl}>Do:</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputSm} />
                <label style={{ ...lbl, display: 'inline-flex', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={onlyAnomalies} onChange={(e) => setOnlyAnomalies(e.target.checked)} />
                    tylko anomalie
                </label>
                <button onClick={() => void fetchData()} style={btnSec}>
                    <RefreshCw size={14} /> Odśwież
                </button>

                <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                    Przelicz pojedynczy dzień:
                </span>
                <input type="date" value={recalcDay} onChange={(e) => setRecalcDay(e.target.value)} style={inputSm} />
                <button onClick={() => void recalculate()} disabled={recalcLoading} style={btnPrim}>
                    {recalcLoading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                    <span style={{ marginLeft: 6 }}>Przelicz</span>
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                    <Loader2 size={28} className="spin" /> Ładowanie…
                </div>
            ) : error ? (
                <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, color: '#fca5a5' }}>
                    <AlertCircle size={16} style={{ display: 'inline', marginRight: 6 }} /> {error}
                </div>
            ) : employees.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>
                    Brak danych w wybranym przedziale. Kliknij „Przelicz" żeby wygenerować wyliczenia.
                </div>
            ) : (
                <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.4)' }}>
                                <th style={{ ...th, position: 'sticky', left: 0, background: '#0f1115', minWidth: 100 }}>Dzień</th>
                                {employees.map((e) => (
                                    <th key={e.id} style={{ ...th, minWidth: 130 }}>
                                        <div style={{ fontWeight: 700 }}>{e.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>{e.position ?? '—'}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map((d) => (
                                <tr key={d}>
                                    <td style={{ ...td, position: 'sticky', left: 0, background: '#0f1115', fontWeight: 600 }}>
                                        {new Date(d).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                                            {new Date(d).toLocaleDateString('pl-PL', { weekday: 'short' })}
                                        </div>
                                    </td>
                                    {employees.map((e) => {
                                        const s = shiftMap.get(`${e.id}_${d}`);
                                        return (
                                            <ShiftTd
                                                key={e.id}
                                                shift={s}
                                                onClick={() => s && setEditing({ shift: s, employeeName: e.name })}
                                            />
                                        );
                                    })}
                                </tr>
                            ))}

                            {/* Stopka — sumy */}
                            <tr style={{ background: 'rgba(251,191,36,0.06)', borderTop: '2px solid rgba(251,191,36,0.3)' }}>
                                <td style={{ ...td, position: 'sticky', left: 0, background: '#1a1408', fontWeight: 700 }}>Sumy</td>
                                {employees.map((e) => {
                                    const t = totalsByEmployee[e.id];
                                    return (
                                        <td key={e.id} style={{ ...td, textAlign: 'center' }}>
                                            <div style={{ color: '#fbbf24', fontWeight: 700 }}>{formatMinutes(t?.worked ?? 0)}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                                                plan {formatMinutes(t?.planned ?? 0)}
                                            </div>
                                            {t && t.overtime > 0 && (
                                                <div style={{ fontSize: '0.7rem', color: '#3b82f6' }}>
                                                    +{formatMinutes(t.overtime)} ndg
                                                </div>
                                            )}
                                            {t && t.late > 0 && (
                                                <div style={{ fontSize: '0.7rem', color: '#fb923c' }}>
                                                    spóź. {formatMinutes(t.late)}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {editing && (
                <CorrectionModal
                    shift={editing.shift}
                    employeeName={editing.employeeName}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        setToast('Zapisano korektę');
                        setTimeout(() => setToast(null), 3000);
                        void fetchData();
                    }}
                />
            )}

            {toast && (
                <div style={{
                    position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(15,23,42,0.95)', color: '#fff', padding: '0.8rem 1.4rem',
                    borderRadius: 10, border: '1px solid rgba(16,185,129,0.4)', zIndex: 100000
                }}>
                    <Check size={16} style={{ display: 'inline', marginRight: 8, color: '#10b981' }} />
                    {toast}
                </div>
            )}

            <style jsx global>{`
                .spin { animation: spinkeyfTT 1s linear infinite; }
                @keyframes spinkeyfTT { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

function ShiftTd({ shift, onClick }: { shift: CalculatedShift | undefined; onClick: () => void }) {
    if (!shift) return <td style={{ ...td, opacity: 0.3, textAlign: 'center' }}>—</td>;

    const isAbsent = !!shift.absence_type;
    const hasAnomalies = shift.anomaly_flags.length > 0;
    const isApproved = shift.status === 'admin_approved';

    let borderColor = 'rgba(255,255,255,0.08)';
    let bg = 'rgba(56,189,248,0.05)';
    if (isAbsent) { borderColor = 'rgba(59,130,246,0.4)'; bg = 'rgba(59,130,246,0.08)'; }
    else if (hasAnomalies) { borderColor = 'rgba(251,146,60,0.5)'; bg = 'rgba(251,146,60,0.08)'; }
    if (isApproved) { borderColor = 'rgba(16,185,129,0.5)'; bg = 'rgba(16,185,129,0.08)'; }

    return (
        <td
            onClick={onClick}
            style={{
                ...td,
                cursor: 'pointer',
                background: bg,
                outline: `1px solid ${borderColor}`,
                outlineOffset: -2,
            }}
        >
            {isAbsent ? (
                <div style={{ color: '#3b82f6', fontWeight: 700 }}>{shift.absence_type}</div>
            ) : (
                <>
                    <div style={{ color: '#fff', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {formatMinutes(shift.worked_minutes)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)' }}>
                        {formatTimeISO(shift.actual_start)}–{formatTimeISO(shift.actual_end)}
                    </div>
                    {shift.anomaly_flags.slice(0, 2).map((flag) => {
                        const def = ANOMALY_LABELS[flag];
                        if (!def) return null;
                        return (
                            <div key={flag} style={{ fontSize: '0.65rem', color: def.color, lineHeight: 1.2 }}>
                                ⚠ {def.label}
                            </div>
                        );
                    })}
                    {shift.auto_closed && (
                        <div style={{ fontSize: '0.65rem', color: '#fbbf24' }}>auto-domknięte</div>
                    )}
                    {isApproved && (
                        <div style={{ fontSize: '0.65rem', color: '#10b981' }}>✓ zatwierdzone</div>
                    )}
                </>
            )}
        </td>
    );
}

function CorrectionModal({
    shift,
    employeeName,
    onClose,
    onSaved,
}: {
    shift: CalculatedShift;
    employeeName: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [actualStart, setActualStart] = useState(shift.actual_start ? new Date(shift.actual_start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' }) : '');
    const [actualEnd, setActualEnd] = useState(shift.actual_end ? new Date(shift.actual_end).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' }) : '');
    const [overtime, setOvertime] = useState(shift.overtime_total_minutes);
    const [late, setLate] = useState(shift.late_minutes);
    const [notes, setNotes] = useState(shift.notes ?? '');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const save = async () => {
        if (reason.trim().length < 3) { setError('Powód korekty wymagany (min 3)'); return; }
        setSaving(true);
        setError(null);
        try {
            const dayStart = new Date(`${shift.date}T00:00:00+02:00`);
            const buildIso = (hhmm: string): string | null => {
                if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
                const [h, m] = hhmm.split(':').map((s) => Number.parseInt(s, 10));
                const d = new Date(dayStart);
                d.setHours(h, m, 0, 0);
                return d.toISOString();
            };
            const newStart = actualStart ? buildIso(actualStart) : null;
            const newEnd = actualEnd ? buildIso(actualEnd) : null;
            let newWorked = 0;
            if (newStart && newEnd) {
                newWorked = Math.max(0, Math.round((new Date(newEnd).getTime() - new Date(newStart).getTime()) / 60000));
            }

            const res = await fetch('/api/admin/time-tracking/correct', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shiftId: shift.id,
                    actual_start: newStart,
                    actual_end: newEnd,
                    worked_minutes: newWorked,
                    late_minutes: late,
                    overtime_total_minutes: overtime,
                    notes: notes.trim() || null,
                    status: 'admin_approved',
                    reason: reason.trim(),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data?.error ?? `Błąd ${res.status}`);
                return;
            }
            onSaved();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div onClick={(e) => e.stopPropagation()} style={{
                background: '#1e293b', borderRadius: 16, padding: '1.5rem', maxWidth: 520, width: '100%',
                color: '#fff', border: '1px solid rgba(251,191,36,0.3)', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 1 }}>Korekta wyliczonego shift</div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: 4 }}>{employeeName}</h3>
                        <div style={{ color: 'rgba(255,255,255,0.6)' }}>{new Date(shift.date).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    </div>
                    <button onClick={onClose} style={iconBtn}><X size={18} /></button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.75rem', borderRadius: 8, marginBottom: 12, fontSize: '0.85rem', lineHeight: 1.6 }}>
                    <div>Plan: <b>{shift.planned_start_time?.slice(0,5) ?? '—'} – {shift.planned_end_time?.slice(0,5) ?? '—'}</b> ({formatMinutes(shift.planned_minutes)})</div>
                    <div>Faktycznie: <b>{formatTimeISO(shift.actual_start)} – {formatTimeISO(shift.actual_end)}</b> ({formatMinutes(shift.worked_minutes)})</div>
                    {shift.anomaly_flags.length > 0 && (
                        <div style={{ color: '#fbbf24', marginTop: 6 }}>
                            Anomalie: {shift.anomaly_flags.map((f) => ANOMALY_LABELS[f]?.label ?? f).join(', ')}
                        </div>
                    )}
                    {shift.auto_close_reason && (
                        <div style={{ color: '#fbbf24', marginTop: 6 }}>{shift.auto_close_reason}</div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                        <label style={lbl}>Faktyczne przyjście (HH:MM)</label>
                        <input type="time" value={actualStart} onChange={(e) => setActualStart(e.target.value)} style={inputSm} />
                    </div>
                    <div>
                        <label style={lbl}>Faktyczne wyjście (HH:MM)</label>
                        <input type="time" value={actualEnd} onChange={(e) => setActualEnd(e.target.value)} style={inputSm} />
                    </div>
                    <div>
                        <label style={lbl}>Spóźnienie (min)</label>
                        <input type="number" value={late} onChange={(e) => setLate(Number.parseInt(e.target.value) || 0)} style={inputSm} min={0} />
                    </div>
                    <div>
                        <label style={lbl}>Nadgodziny (min)</label>
                        <input type="number" value={overtime} onChange={(e) => setOvertime(Number.parseInt(e.target.value) || 0)} style={inputSm} min={0} />
                    </div>
                </div>

                <label style={{ ...lbl, marginTop: 12, display: 'block' }}>Notatka (opcjonalna)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputSm, width: '100%', resize: 'vertical' }} />

                <label style={{ ...lbl, marginTop: 12, display: 'block', color: '#fca5a5' }}>Powód korekty * (audit log)</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="np. zapomniał wybić wyjścia, weryfikacja z kamery o 17:30" style={{ ...inputSm, width: '100%', resize: 'vertical', borderColor: 'rgba(239,68,68,0.4)' }} />

                {error && <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: 8 }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                    <button onClick={onClose} disabled={saving} style={btnSec}>Anuluj</button>
                    <button onClick={() => void save()} disabled={saving || reason.trim().length < 3} style={btnPrim}>
                        {saving && <Loader2 size={14} className="spin" />}
                        <span style={{ marginLeft: 6 }}>Zatwierdź korektę</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

const th: React.CSSProperties = {
    padding: '0.5rem 0.4rem',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'center',
    fontSize: '0.78rem',
    color: 'rgba(255,255,255,0.85)',
};

const td: React.CSSProperties = {
    padding: '0.4rem',
    borderRight: '1px solid rgba(255,255,255,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    textAlign: 'center',
    fontSize: '0.8rem',
    minWidth: 110,
};

const lbl: React.CSSProperties = {
    fontSize: '0.78rem',
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
};

const inputSm: React.CSSProperties = {
    padding: '0.4rem 0.6rem',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(0,0,0,0.3)',
    color: '#fff',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
};

const btnSec: React.CSSProperties = {
    padding: '0.45rem 0.9rem',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.85)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
};

const btnPrim: React.CSSProperties = {
    padding: '0.45rem 0.9rem',
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

const iconBtn: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};
