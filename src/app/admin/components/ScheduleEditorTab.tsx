'use client';

// Edytor grafiku pracy (F3 z planu KCP)
// Tabela: wiersze = dni miesiąca, kolumny = pracownicy.
// Klik komórki → modal z pełną konfiguracją zmiany / nieobecności / przypisań.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Copy, X, Plus, Trash2, Loader2, Check, AlertCircle } from 'lucide-react';
import {
    ABSENCE_TYPES,
    SHIFT_ROLES,
    type AbsenceType,
    type ScheduleCell,
    type ScheduleEmployee,
    type ScheduleMonthResponse,
    type ShiftAssignmentInput,
    type UpsertCellPayload,
} from '@/lib/timeTracking/scheduleTypes';

const PL_DAYS = ['Niedz', 'Pn', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
const PL_DAYS_LONG = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
const PL_MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

interface CellEditorState {
    employeeId: string;
    employeeName: string;
    date: string;
    existingCellId: string | null;
    plannedStart: string;
    plannedEnd: string;
    absenceType: AbsenceType | '';
    rolesForShift: string[];
    notes: string;
    assignments: ShiftAssignmentInput[];
    mode: 'work' | 'absence';
}

const POSITION_DEFAULT_ROLE: Record<string, string> = {
    Lekarz: 'Lekarz',
    Higienistka: 'Higienistka',
    Asystentka: 'Asystentka',
    Recepcja: 'Recepcja',
};

// ── Helpers ─────────────────────────────────────────────────────────

function todayMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
    const [y, m] = month.split('-').map((s) => Number.parseInt(s, 10));
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function previousMonth(month: string): string {
    return shiftMonth(month, -1);
}

function buildDaysForMonth(month: string): { date: string; dayOfMonth: number; dayOfWeek: number; isWeekend: boolean }[] {
    const [y, m] = month.split('-').map((s) => Number.parseInt(s, 10));
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const out = [];
    for (let day = 1; day <= lastDay; day++) {
        const d = new Date(Date.UTC(y, m - 1, day));
        const dow = d.getUTCDay();
        out.push({
            date: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            dayOfMonth: day,
            dayOfWeek: dow,
            isWeekend: dow === 0 || dow === 6,
        });
    }
    return out;
}

function formatMinutes(minutes: number): string {
    if (!minutes) return '0:00';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
}

function timeShort(t: string | null): string {
    if (!t) return '';
    return t.slice(0, 5);
}

function emptyCellEditor(emp: ScheduleEmployee, date: string): CellEditorState {
    const defaultRole = emp.position ? POSITION_DEFAULT_ROLE[emp.position] : '';
    return {
        employeeId: emp.id,
        employeeName: emp.name,
        date,
        existingCellId: null,
        plannedStart: '',
        plannedEnd: '',
        absenceType: '',
        rolesForShift: defaultRole ? [defaultRole] : [],
        notes: '',
        assignments: [],
        mode: 'work',
    };
}

function loadCellEditor(emp: ScheduleEmployee, date: string, existing: ScheduleCell | undefined): CellEditorState {
    if (!existing) return emptyCellEditor(emp, date);
    const isAbsence = !!existing.absence_type;
    return {
        employeeId: emp.id,
        employeeName: emp.name,
        date,
        existingCellId: existing.id,
        plannedStart: timeShort(existing.planned_start),
        plannedEnd: timeShort(existing.planned_end),
        absenceType: (existing.absence_type as AbsenceType) ?? '',
        rolesForShift: existing.roles_for_shift,
        notes: existing.notes ?? '',
        assignments: existing.assignments.map((a) => ({
            doctorScheduleId: a.doctor_schedule_id,
            segmentStart: timeShort(a.segment_start),
            segmentEnd: timeShort(a.segment_end),
            locationId: a.location_id,
            notes: a.notes,
        })),
        mode: isAbsence ? 'absence' : 'work',
    };
}

// ── Component ───────────────────────────────────────────────────────

export default function ScheduleEditorTab() {
    const [month, setMonth] = useState<string>(() => todayMonth());
    const [data, setData] = useState<ScheduleMonthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editor, setEditor] = useState<CellEditorState | null>(null);
    const [saving, setSaving] = useState(false);
    const [editorError, setEditorError] = useState<string | null>(null);
    const [copyingFrom, setCopyingFrom] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [roleFilter, setRoleFilter] = useState<Set<string>>(new Set());

    const fetchMonth = useCallback(async (m: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/schedule?month=${m}`, { cache: 'no-store' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setError(err?.error ?? `Błąd ${res.status}`);
                return;
            }
            setData(await res.json());
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchMonth(month);
    }, [month, fetchMonth]);

    const days = useMemo(() => buildDaysForMonth(month), [month]);

    const cellMap = useMemo(() => {
        const m = new Map<string, ScheduleCell>();
        if (data) {
            for (const c of data.cells) m.set(`${c.employee_id}_${c.date}`, c);
        }
        return m;
    }, [data]);

    const visibleEmployees = useMemo(() => {
        if (!data) return [];
        if (roleFilter.size === 0) return data.employees;
        return data.employees.filter((e) => e.position && roleFilter.has(e.position));
    }, [data, roleFilter]);

    const toggleRoleFilter = (pos: string) => {
        setRoleFilter((prev) => {
            const next = new Set(prev);
            if (next.has(pos)) next.delete(pos);
            else next.add(pos);
            return next;
        });
    };

    const openCellEditor = (emp: ScheduleEmployee, date: string) => {
        const existing = cellMap.get(`${emp.id}_${date}`);
        setEditorError(null);
        setEditor(loadCellEditor(emp, date, existing));
    };

    const saveCell = useCallback(async () => {
        if (!editor) return;
        setSaving(true);
        setEditorError(null);

        const payload: UpsertCellPayload = {
            employeeId: editor.employeeId,
            date: editor.date,
            rolesForShift: editor.rolesForShift,
            notes: editor.notes.trim() || null,
        };
        if (editor.mode === 'absence') {
            if (!editor.absenceType) {
                setEditorError('Wybierz typ nieobecności');
                setSaving(false);
                return;
            }
            payload.absenceType = editor.absenceType;
            payload.plannedStart = null;
            payload.plannedEnd = null;
            payload.assignments = [];
        } else {
            if (!editor.plannedStart || !editor.plannedEnd) {
                setEditorError('Wpisz godziny pracy');
                setSaving(false);
                return;
            }
            payload.plannedStart = editor.plannedStart;
            payload.plannedEnd = editor.plannedEnd;
            payload.absenceType = null;
            payload.assignments = editor.assignments.filter(
                (a) => /^\d{2}:\d{2}$/.test(a.segmentStart) && /^\d{2}:\d{2}$/.test(a.segmentEnd) && a.segmentEnd > a.segmentStart
            );
        }

        try {
            const res = await fetch('/api/admin/schedule/cell', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                setEditorError(body?.error ?? `Błąd ${res.status}`);
                return;
            }
            setEditor(null);
            await fetchMonth(month);
            setToast('Zapisano grafik');
            setTimeout(() => setToast(null), 2500);
        } catch (e) {
            setEditorError((e as Error).message);
        } finally {
            setSaving(false);
        }
    }, [editor, fetchMonth, month]);

    const deleteCell = useCallback(async () => {
        if (!editor || !editor.existingCellId) return;
        if (!confirm('Na pewno usunąć ten wpis grafiku?')) return;
        setSaving(true);
        setEditorError(null);
        try {
            const res = await fetch(`/api/admin/schedule/cell?employeeId=${editor.employeeId}&date=${editor.date}`, {
                method: 'DELETE',
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                setEditorError(body?.error ?? `Błąd ${res.status}`);
                return;
            }
            setEditor(null);
            await fetchMonth(month);
            setToast('Usunięto');
            setTimeout(() => setToast(null), 2500);
        } catch (e) {
            setEditorError((e as Error).message);
        } finally {
            setSaving(false);
        }
    }, [editor, fetchMonth, month]);

    const copyFromPreviousMonth = useCallback(async () => {
        const src = previousMonth(month);
        if (!confirm(`Skopiować grafik z ${monthLabel(src)} jako szablon dla ${monthLabel(month)}? Istniejące wpisy nie zostaną nadpisane.`)) return;
        setCopyingFrom(true);
        try {
            const res = await fetch('/api/admin/schedule/copy-from-month', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source: src, target: month }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(body?.error ?? `Błąd ${res.status}`);
                return;
            }
            await fetchMonth(month);
            setToast(`Skopiowano ${body?.copied ?? 0} wpisów`);
            setTimeout(() => setToast(null), 4000);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setCopyingFrom(false);
        }
    }, [month, fetchMonth]);

    return (
        <div style={{ padding: '1.5rem 2rem', color: '#fff' }}>
            {/* HEADER */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <button onClick={() => setMonth(shiftMonth(month, -1))} style={iconBtnStyle}>
                        <ChevronLeft size={20} />
                    </button>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, minWidth: 200, textAlign: 'center', margin: 0 }}>
                        <Calendar size={20} style={{ display: 'inline', marginRight: 8, marginBottom: -3, color: '#fbbf24' }} />
                        {monthLabel(month)}
                    </h2>
                    <button onClick={() => setMonth(shiftMonth(month, 1))} style={iconBtnStyle}>
                        <ChevronRight size={20} />
                    </button>
                    <button onClick={() => setMonth(todayMonth())} style={btnSecondaryStyle}>
                        Dziś
                    </button>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => void copyFromPreviousMonth()} disabled={copyingFrom} style={btnSecondaryStyle}>
                        {copyingFrom ? <Loader2 size={16} className="spin" /> : <Copy size={16} />}
                        <span style={{ marginLeft: 6 }}>Kopiuj z {monthLabel(previousMonth(month))}</span>
                    </button>
                </div>
            </div>

            {/* ROLE FILTERS */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {['Lekarz', 'Higienistka', 'Asystentka', 'Recepcja'].map((pos) => {
                    const active = roleFilter.size === 0 || roleFilter.has(pos);
                    return (
                        <button
                            key={pos}
                            onClick={() => toggleRoleFilter(pos)}
                            style={{
                                padding: '0.45rem 0.9rem',
                                borderRadius: 999,
                                border: `1px solid ${active ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                background: active ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                                color: active ? '#fbbf24' : 'rgba(255,255,255,0.55)',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            {pos}
                        </button>
                    );
                })}
                {roleFilter.size > 0 && (
                    <button onClick={() => setRoleFilter(new Set())} style={{ ...btnSecondaryStyle, padding: '0.45rem 0.9rem' }}>
                        Pokaż wszystkich
                    </button>
                )}
            </div>

            {/* GRID */}
            {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.55)' }}>
                    <Loader2 size={28} className="spin" /> Ładowanie grafiku…
                </div>
            ) : error ? (
                <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10 }}>
                    <AlertCircle size={18} style={{ display: 'inline', marginRight: 8 }} /> {error}
                </div>
            ) : data ? (
                <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.4)' }}>
                                <th style={{ ...thStyle, position: 'sticky', left: 0, background: '#0f1115', minWidth: 120 }}>Dzień</th>
                                {visibleEmployees.map((emp) => (
                                    <th key={emp.id} style={thStyle}>
                                        <div style={{ fontWeight: 700 }}>{emp.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>
                                            {emp.position ?? '—'}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map((d) => {
                                const dateLabel = `${d.dayOfMonth}.${month.split('-')[1]}`;
                                return (
                                    <tr key={d.date} style={{ background: d.isWeekend ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
                                        <td style={{ ...tdStyle, position: 'sticky', left: 0, background: d.isWeekend ? '#0d1f15' : '#0f1115', fontWeight: 600, minWidth: 120 }}>
                                            <div>{dateLabel}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>
                                                {PL_DAYS[d.dayOfWeek]}
                                            </div>
                                        </td>
                                        {visibleEmployees.map((emp) => {
                                            const cell = cellMap.get(`${emp.id}_${d.date}`);
                                            return (
                                                <CellTd
                                                    key={emp.id}
                                                    cell={cell}
                                                    isWeekend={d.isWeekend}
                                                    onClick={() => openCellEditor(emp, d.date)}
                                                />
                                            );
                                        })}
                                    </tr>
                                );
                            })}

                            {/* SUMARY ROW */}
                            <tr style={{ background: 'rgba(251,191,36,0.06)', borderTop: '2px solid rgba(251,191,36,0.3)' }}>
                                <td style={{ ...tdStyle, position: 'sticky', left: 0, background: '#1a1408', fontWeight: 700 }}>
                                    Suma h
                                </td>
                                {visibleEmployees.map((emp) => {
                                    const sum = data.summaries.find((s) => s.employee_id === emp.id);
                                    if (!sum) return <td key={emp.id} style={tdStyle}>—</td>;
                                    const planned = formatMinutes(sum.plannedMinutes);
                                    const norma = formatMinutes(sum.normaMinutes);
                                    const ratio = sum.normaMinutes ? sum.plannedMinutes / sum.normaMinutes : 0;
                                    const color = ratio >= 1 ? '#10b981' : ratio >= 0.95 ? '#fbbf24' : '#ef4444';
                                    return (
                                        <td key={emp.id} style={{ ...tdStyle, textAlign: 'center' }}>
                                            <div style={{ color, fontWeight: 700 }}>{planned}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                                                norma {norma}
                                            </div>
                                            {sum.absenceDays > 0 && (
                                                <div style={{ fontSize: '0.7rem', color: '#3b82f6' }}>
                                                    nb {sum.absenceDays}d
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>
            ) : null}

            {data && (
                <div style={{ marginTop: '0.8rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                    Dni robocze (pn-pt) w miesiącu: <b>{data.workingDays}</b> · Pracowników: <b>{visibleEmployees.length}</b>
                </div>
            )}

            {/* CELL EDITOR MODAL */}
            {editor && (
                <CellEditorModal
                    state={editor}
                    setState={setEditor}
                    onSave={saveCell}
                    onDelete={editor.existingCellId ? deleteCell : null}
                    onClose={() => setEditor(null)}
                    saving={saving}
                    error={editorError}
                    employees={data?.employees ?? []}
                    cellMap={cellMap}
                />
            )}

            {/* TOAST */}
            {toast && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(15,23,42,0.95)',
                        color: '#fff',
                        padding: '0.8rem 1.4rem',
                        borderRadius: 10,
                        border: '1px solid rgba(16,185,129,0.4)',
                        zIndex: 100000,
                    }}
                >
                    <Check size={16} style={{ display: 'inline', marginRight: 8, color: '#10b981' }} />
                    {toast}
                </div>
            )}

            <style jsx global>{`
                .spin { animation: spinkeyf2 1s linear infinite; }
                @keyframes spinkeyf2 { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

function monthLabel(month: string): string {
    const [y, m] = month.split('-').map((s) => Number.parseInt(s, 10));
    return `${PL_MONTHS[m - 1]} ${y}`;
}

// ── Cell renderer ───────────────────────────────────────────────────

function CellTd({ cell, isWeekend, onClick }: { cell: ScheduleCell | undefined; isWeekend: boolean; onClick: () => void }) {
    const empty = !cell;
    const isAbsence = cell?.absence_type;
    const absenceDef = isAbsence ? ABSENCE_TYPES.find((a) => a.value === cell.absence_type) : null;

    return (
        <td
            onClick={onClick}
            style={{
                ...tdStyle,
                cursor: 'pointer',
                background: empty
                    ? 'transparent'
                    : isAbsence
                        ? `${absenceDef?.color}20`
                        : 'rgba(56,189,248,0.07)',
                opacity: empty ? 0.4 : 1,
                transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isWeekend ? 'rgba(255,255,255,0.05)' : 'rgba(251,191,36,0.08)')}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = empty
                    ? 'transparent'
                    : isAbsence
                        ? `${absenceDef?.color}20`
                        : 'rgba(56,189,248,0.07)';
            }}
        >
            {empty ? (
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
            ) : isAbsence ? (
                <div title={absenceDef?.label} style={{ color: absenceDef?.color, fontWeight: 700 }}>
                    {absenceDef?.short}
                </div>
            ) : (
                <div>
                    <div style={{ fontWeight: 600, color: '#fff' }}>
                        {timeShort(cell.planned_start)}–{timeShort(cell.planned_end)}
                    </div>
                    {cell.roles_for_shift.length > 0 && (
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
                            {cell.roles_for_shift.map((r) => SHIFT_ROLES.find((x) => x.value === r)?.icon ?? '·').join(' ')}
                        </div>
                    )}
                    {cell.assignments.length > 0 && (
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                            {cell.assignments.length}× przyp.
                        </div>
                    )}
                </div>
            )}
        </td>
    );
}

// ── Modal ───────────────────────────────────────────────────────────

function CellEditorModal({
    state,
    setState,
    onSave,
    onDelete,
    onClose,
    saving,
    error,
    employees,
    cellMap,
}: {
    state: CellEditorState;
    setState: (s: CellEditorState | null) => void;
    onSave: () => void;
    onDelete: (() => void) | null;
    onClose: () => void;
    saving: boolean;
    error: string | null;
    employees: ScheduleEmployee[];
    cellMap: Map<string, ScheduleCell>;
}) {
    const dateObj = new Date(state.date + 'T00:00:00Z');
    const dayLabel = `${PL_DAYS_LONG[dateObj.getUTCDay()]}, ${dateObj.getUTCDate()} ${PL_MONTHS[dateObj.getUTCMonth()]} ${dateObj.getUTCFullYear()}`;

    // Lekarze pracujący tego samego dnia (dla wyboru w segmentach)
    const doctorsThisDay = employees
        .filter((e) => e.position === 'Lekarz')
        .map((e) => {
            const cell = cellMap.get(`${e.id}_${state.date}`);
            return { emp: e, cell };
        })
        .filter((x) => x.cell && !x.cell.absence_type);

    const update = <K extends keyof CellEditorState>(key: K, value: CellEditorState[K]) => {
        setState({ ...state, [key]: value });
    };

    const toggleRole = (role: string) => {
        const has = state.rolesForShift.includes(role);
        update('rolesForShift', has ? state.rolesForShift.filter((r) => r !== role) : [...state.rolesForShift, role]);
    };

    const addAssignment = () => {
        update('assignments', [
            ...state.assignments,
            {
                doctorScheduleId: doctorsThisDay[0]?.cell?.id ?? null,
                segmentStart: state.plannedStart || '08:00',
                segmentEnd: state.plannedEnd || '16:00',
            },
        ]);
    };

    const updateAssignment = (i: number, patch: Partial<ShiftAssignmentInput>) => {
        update(
            'assignments',
            state.assignments.map((a, idx) => (idx === i ? { ...a, ...patch } : a))
        );
    };

    const removeAssignment = (i: number) => {
        update(
            'assignments',
            state.assignments.filter((_, idx) => idx !== i)
        );
    };

    return (
        <div onClick={onClose} style={modalOverlayStyle}>
            <div onClick={(e) => e.stopPropagation()} style={modalBoxStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {state.existingCellId ? 'Edytuj zmianę' : 'Nowa zmiana'}
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: 4 }}>{state.employeeName}</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)' }}>{dayLabel}</div>
                    </div>
                    <button onClick={onClose} style={iconBtnStyle}>
                        <X size={20} />
                    </button>
                </div>

                {/* MODE TOGGLE */}
                <div style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
                    <button
                        onClick={() => update('mode', 'work')}
                        style={state.mode === 'work' ? modeBtnActiveStyle : modeBtnStyle}
                    >
                        ⏱ Praca
                    </button>
                    <button
                        onClick={() => update('mode', 'absence')}
                        style={state.mode === 'absence' ? modeBtnActiveStyle : modeBtnStyle}
                    >
                        🏖 Nieobecność
                    </button>
                </div>

                {state.mode === 'work' ? (
                    <>
                        {/* HOURS */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Przyjście</label>
                                <input
                                    type="time"
                                    value={state.plannedStart}
                                    onChange={(e) => update('plannedStart', e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Wyjście</label>
                                <input
                                    type="time"
                                    value={state.plannedEnd}
                                    onChange={(e) => update('plannedEnd', e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* ROLES */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Role w tej zmianie</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                {SHIFT_ROLES.map((r) => {
                                    const checked = state.rolesForShift.includes(r.value);
                                    return (
                                        <button
                                            key={r.value}
                                            onClick={() => toggleRole(r.value)}
                                            style={{
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: 8,
                                                border: `1px solid ${checked ? r.color : 'rgba(255,255,255,0.1)'}`,
                                                background: checked ? `${r.color}25` : 'transparent',
                                                color: checked ? r.color : 'rgba(255,255,255,0.6)',
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {r.icon} {r.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ASSIGNMENTS */}
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label style={labelStyle}>Przypisania (asysta ↔ lekarz)</label>
                                <button onClick={addAssignment} style={{ ...btnSecondaryStyle, padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}>
                                    <Plus size={14} /> Dodaj
                                </button>
                            </div>
                            {state.assignments.length === 0 ? (
                                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>
                                    Brak przypisań. Dla asysty można podzielić zmianę na segmenty pracy z różnymi lekarzami.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {state.assignments.map((a, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                gap: 6,
                                                alignItems: 'center',
                                                padding: '0.5rem',
                                                background: 'rgba(255,255,255,0.04)',
                                                borderRadius: 8,
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <input
                                                type="time"
                                                value={a.segmentStart}
                                                onChange={(e) => updateAssignment(i, { segmentStart: e.target.value })}
                                                style={{ ...inputStyle, width: 90, padding: '0.35rem' }}
                                            />
                                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>–</span>
                                            <input
                                                type="time"
                                                value={a.segmentEnd}
                                                onChange={(e) => updateAssignment(i, { segmentEnd: e.target.value })}
                                                style={{ ...inputStyle, width: 90, padding: '0.35rem' }}
                                            />
                                            <select
                                                value={a.doctorScheduleId ?? ''}
                                                onChange={(e) => updateAssignment(i, { doctorScheduleId: e.target.value || null })}
                                                style={{ ...inputStyle, flex: 1, minWidth: 140, padding: '0.35rem' }}
                                            >
                                                <option value="">— bez lekarza —</option>
                                                {doctorsThisDay.map((d) => (
                                                    <option key={d.cell!.id} value={d.cell!.id}>
                                                        {d.emp.name} ({timeShort(d.cell!.planned_start)}–{timeShort(d.cell!.planned_end)})
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => removeAssignment(i)}
                                                style={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 8,
                                                    border: '1px solid rgba(239,68,68,0.3)',
                                                    background: 'rgba(239,68,68,0.08)',
                                                    color: '#fca5a5',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Typ nieobecności</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                            {ABSENCE_TYPES.map((a) => {
                                const checked = state.absenceType === a.value;
                                return (
                                    <button
                                        key={a.value}
                                        onClick={() => update('absenceType', a.value)}
                                        style={{
                                            padding: '0.5rem 0.9rem',
                                            borderRadius: 8,
                                            border: `1px solid ${checked ? a.color : 'rgba(255,255,255,0.1)'}`,
                                            background: checked ? `${a.color}25` : 'transparent',
                                            color: checked ? a.color : 'rgba(255,255,255,0.7)',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {a.short} · {a.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* NOTES */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Notatka (opcjonalne)</label>
                    <textarea
                        value={state.notes}
                        onChange={(e) => update('notes', e.target.value)}
                        placeholder="np. uwagi z grafiku Excela, BR, P, R/P, etc."
                        rows={2}
                        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                </div>

                {error && (
                    <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: '0.8rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: 6 }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: '1rem', flexWrap: 'wrap' }}>
                    {onDelete ? (
                        <button onClick={onDelete} disabled={saving} style={{ ...btnDangerStyle }}>
                            <Trash2 size={16} /> Usuń wpis
                        </button>
                    ) : <div />}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={onClose} disabled={saving} style={btnSecondaryStyle}>
                            Anuluj
                        </button>
                        <button onClick={onSave} disabled={saving} style={btnPrimaryStyle}>
                            {saving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                            <span style={{ marginLeft: 6 }}>Zapisz</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Style helpers ───────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
    padding: '0.6rem 0.5rem',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'center',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.85)',
};

const tdStyle: React.CSSProperties = {
    padding: '0.55rem 0.5rem',
    borderRight: '1px solid rgba(255,255,255,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    textAlign: 'center',
    fontSize: '0.85rem',
    minWidth: 110,
};

const iconBtnStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const btnSecondaryStyle: React.CSSProperties = {
    padding: '0.5rem 1rem',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.85)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '0.85rem',
    fontWeight: 600,
};

const btnPrimaryStyle: React.CSSProperties = {
    padding: '0.55rem 1.2rem',
    borderRadius: 10,
    border: 'none',
    background: '#fbbf24',
    color: '#0f172a',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    fontWeight: 700,
    fontSize: '0.9rem',
};

const btnDangerStyle: React.CSSProperties = {
    padding: '0.55rem 1.1rem',
    borderRadius: 10,
    border: '1px solid rgba(239,68,68,0.4)',
    background: 'rgba(239,68,68,0.08)',
    color: '#fca5a5',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '0.85rem',
    fontWeight: 600,
};

const modeBtnStyle: React.CSSProperties = {
    flex: 1,
    padding: '0.6rem',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.55)',
    cursor: 'pointer',
    fontWeight: 600,
};

const modeBtnActiveStyle: React.CSSProperties = {
    ...modeBtnStyle,
    background: 'rgba(251,191,36,0.15)',
    color: '#fbbf24',
    borderColor: '#fbbf24',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    color: 'rgba(255,255,255,0.65)',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.55rem 0.7rem',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(0,0,0,0.3)',
    color: '#fff',
    fontSize: '0.9rem',
};

const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    zIndex: 99000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    overflow: 'auto',
};

const modalBoxStyle: React.CSSProperties = {
    background: '#1e293b',
    borderRadius: 18,
    padding: '1.5rem',
    maxWidth: 640,
    width: '100%',
    border: '1px solid rgba(251,191,36,0.3)',
    color: '#fff',
    maxHeight: 'calc(100vh - 2rem)',
    overflowY: 'auto',
};
