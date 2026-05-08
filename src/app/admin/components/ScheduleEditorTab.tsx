'use client';

// Edytor grafiku pracy (F3 z planu KCP)
// Tabela: wiersze = dni miesiąca, kolumny = pracownicy.
// Klik komórki → modal z pełną konfiguracją zmiany / nieobecności / przypisań.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Copy, X, Plus, Trash2, Loader2, Check, AlertCircle, Users, LayoutGrid } from 'lucide-react';
import {
    ABSENCE_TYPES,
    SHIFT_ROLES,
    type AbsenceType,
    type ScheduleCell,
    type ScheduleEmployee,
    type ScheduleMonthResponse,
    type ShiftAssignmentInput,
    type UpsertCellPayload,
    type Workstation,
} from '@/lib/timeTracking/scheduleTypes';

const SHIFT_PRESETS: Array<{ label: string; icon: string; start: string; end: string }> = [
    { label: 'Poranna', icon: '🌅', start: '09:00', end: '16:00' },
    { label: 'Popołudniowa', icon: '🌇', start: '14:00', end: '20:00' },
    { label: 'Pełna', icon: '⏰', start: '08:00', end: '16:00' },
];

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
            doctorEmployeeId: a.doctor_employee_id,
            workstationId: a.workstation_id,
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
    const [viewMode, setViewMode] = useState<'employees' | 'workstations'>('employees');
    const [dragSource, setDragSource] = useState<{ cell: ScheduleCell; isMove: boolean } | null>(null);
    const [dragTarget, setDragTarget] = useState<{ employeeId: string; date: string } | null>(null);
    const [dropping, setDropping] = useState(false);

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

    const workstationsById = useMemo(() => {
        const m = new Map<string, Workstation>();
        if (data) for (const w of data.workstations) m.set(w.id, w);
        return m;
    }, [data]);

    const doctorsById = useMemo(() => {
        const m = new Map<string, ScheduleEmployee>();
        if (data) for (const e of data.employees) if (e.position === 'Lekarz') m.set(e.id, e);
        return m;
    }, [data]);

    const employeesById = useMemo(() => {
        const m = new Map<string, ScheduleEmployee>();
        if (data) for (const e of data.employees) m.set(e.id, e);
        return m;
    }, [data]);

    // Mapa: workstation_id → date → lista segmentów (z employee + doctor + czas)
    const workstationGrid = useMemo(() => {
        type Entry = {
            employee: ScheduleEmployee;
            cellId: string;
            segmentStart: string;
            segmentEnd: string;
            doctor: ScheduleEmployee | null;
            notes: string | null;
        };
        const grid = new Map<string, Map<string, Entry[]>>();
        if (!data) return grid;
        for (const cell of data.cells) {
            const emp = employeesById.get(cell.employee_id);
            if (!emp) continue;
            for (const a of cell.assignments) {
                if (!a.workstation_id) continue;
                const wsMap = grid.get(a.workstation_id) ?? new Map<string, Entry[]>();
                if (!grid.has(a.workstation_id)) grid.set(a.workstation_id, wsMap);
                const list = wsMap.get(cell.date) ?? [];
                if (!wsMap.has(cell.date)) wsMap.set(cell.date, list);
                list.push({
                    employee: emp,
                    cellId: cell.id,
                    segmentStart: a.segment_start.slice(0, 5),
                    segmentEnd: a.segment_end.slice(0, 5),
                    doctor: a.doctor_employee_id ? doctorsById.get(a.doctor_employee_id) ?? null : null,
                    notes: a.notes,
                });
                list.sort((x, y) => (x.segmentStart < y.segmentStart ? -1 : 1));
            }
        }
        return grid;
    }, [data, employeesById, doctorsById]);

    // Lista stanowisk do wyświetlenia (sortowane wg sort_order)
    const visibleWorkstations = useMemo(() => {
        return data?.workstations ?? [];
    }, [data]);

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

    // ── Drag & Drop komórek ─────────────────────────────────────
    const startDrag = useCallback((cell: ScheduleCell, isMove: boolean) => {
        setDragSource({ cell, isMove });
    }, []);

    const handleDragOver = useCallback((employeeId: string, date: string, e: React.DragEvent) => {
        if (!dragSource) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = dragSource.isMove ? 'move' : 'copy';
        if (!dragTarget || dragTarget.employeeId !== employeeId || dragTarget.date !== date) {
            setDragTarget({ employeeId, date });
        }
    }, [dragSource, dragTarget]);

    const clearDrag = useCallback(() => {
        setDragSource(null);
        setDragTarget(null);
    }, []);

    const handleDrop = useCallback(async (employeeId: string, date: string, e: React.DragEvent) => {
        e.preventDefault();
        if (!dragSource) return;

        const { cell: src, isMove } = dragSource;
        const sameCell = src.employee_id === employeeId && src.date === date;
        if (sameCell) {
            clearDrag();
            return;
        }

        const existingTarget = cellMap.get(`${employeeId}_${date}`);
        const targetEmp = data?.employees.find((emp) => emp.id === employeeId);
        const verb = isMove ? 'Przenieść' : 'Skopiować';
        const overwrite = existingTarget ? ' (nadpisze istniejący wpis)' : '';
        if (!confirm(`${verb} zmianę z ${src.date} na ${date} (${targetEmp?.name ?? '—'})${overwrite}?`)) {
            clearDrag();
            return;
        }

        setDropping(true);
        try {
            const payload: UpsertCellPayload = {
                employeeId,
                date,
                plannedStart: src.planned_start ? src.planned_start.slice(0, 5) : null,
                plannedEnd: src.planned_end ? src.planned_end.slice(0, 5) : null,
                absenceType: src.absence_type as any,
                rolesForShift: src.roles_for_shift,
                locationId: src.location_id,
                notes: src.notes,
                assignments: src.assignments.map((a) => ({
                    doctorEmployeeId: a.doctor_employee_id,
                    doctorScheduleId: null,                    // zostanie zresolve'owane na podstawie doctor_employee_id
                    workstationId: a.workstation_id,
                    segmentStart: a.segment_start.slice(0, 5),
                    segmentEnd: a.segment_end.slice(0, 5),
                    locationId: a.location_id,
                    notes: a.notes,
                })),
            };

            const res = await fetch('/api/admin/schedule/cell', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(body?.error ?? `Błąd ${res.status}`);
                return;
            }

            if (isMove) {
                await fetch(`/api/admin/schedule/cell?employeeId=${src.employee_id}&date=${src.date}`, {
                    method: 'DELETE',
                });
            }

            await fetchMonth(month);
            setToast(isMove ? 'Przeniesiono zmianę' : 'Skopiowano zmianę');
            setTimeout(() => setToast(null), 2500);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setDropping(false);
            clearDrag();
        }
    }, [dragSource, cellMap, data, month, fetchMonth, clearDrag]);

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

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* VIEW MODE TOGGLE */}
                    <div style={{ display: 'inline-flex', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                        <button
                            onClick={() => setViewMode('employees')}
                            style={viewMode === 'employees' ? viewToggleActiveStyle : viewToggleStyle}
                            title="Widok pracownicy × dni"
                        >
                            <Users size={16} /> Pracownicy
                        </button>
                        <button
                            onClick={() => setViewMode('workstations')}
                            style={viewMode === 'workstations' ? viewToggleActiveStyle : viewToggleStyle}
                            title="Widok stanowiska × dni (dispatch)"
                        >
                            <LayoutGrid size={16} /> Stanowiska
                        </button>
                    </div>
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
            ) : data && viewMode === 'workstations' ? (
                <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.4)' }}>
                                <th style={{ ...thStyle, position: 'sticky', left: 0, background: '#0f1115', minWidth: 120 }}>Dzień</th>
                                {visibleWorkstations.map((ws) => (
                                    <th
                                        key={ws.id}
                                        style={{
                                            ...thStyle,
                                            minWidth: 160,
                                            borderTop: `3px solid ${ws.color ?? '#fbbf24'}`,
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, color: ws.color ?? '#fff' }}>
                                            {ws.short_label ? `${ws.short_label} · ` : ''}{ws.name}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>
                                            {workstationTypeLabel(ws.workstation_type)}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map((d) => (
                                <tr key={d.date} style={{ background: d.isWeekend ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
                                    <td style={{ ...tdStyle, position: 'sticky', left: 0, background: d.isWeekend ? '#0d1f15' : '#0f1115', fontWeight: 600, minWidth: 120 }}>
                                        <div>{d.dayOfMonth}.{month.split('-')[1]}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>
                                            {PL_DAYS[d.dayOfWeek]}
                                        </div>
                                    </td>
                                    {visibleWorkstations.map((ws) => {
                                        const entries = workstationGrid.get(ws.id)?.get(d.date) ?? [];
                                        return (
                                            <WorkstationCell
                                                key={ws.id}
                                                entries={entries}
                                                isWeekend={d.isWeekend}
                                                color={ws.color ?? '#fbbf24'}
                                                onEntryClick={(employeeId) => {
                                                    const emp = data.employees.find((e) => e.id === employeeId);
                                                    if (emp) openCellEditor(emp, d.date);
                                                }}
                                            />
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                                            const isDragSource = !!cell && !!dragSource && dragSource.cell.id === cell.id;
                                            const isDragTarget = !!dragTarget && dragTarget.employeeId === emp.id && dragTarget.date === d.date;
                                            return (
                                                <CellTd
                                                    key={emp.id}
                                                    cell={cell}
                                                    isWeekend={d.isWeekend}
                                                    onClick={() => openCellEditor(emp, d.date)}
                                                    workstationsById={workstationsById}
                                                    doctorsById={doctorsById}
                                                    isDragSource={isDragSource}
                                                    isDragTarget={isDragTarget}
                                                    onDragStartCell={(c, e) => {
                                                        startDrag(c, e.shiftKey);
                                                        e.dataTransfer.effectAllowed = e.shiftKey ? 'move' : 'copy';
                                                        e.dataTransfer.setData('text/plain', `${c.employee_id}_${c.date}`);
                                                    }}
                                                    onDragOverCell={(e) => handleDragOver(emp.id, d.date, e)}
                                                    onDragLeaveCell={() => {
                                                        if (dragTarget && dragTarget.employeeId === emp.id && dragTarget.date === d.date) {
                                                            setDragTarget(null);
                                                        }
                                                    }}
                                                    onDropCell={(e) => void handleDrop(emp.id, d.date, e)}
                                                    onDragEndCell={clearDrag}
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
                <div style={{ marginTop: '0.8rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div>Dni robocze (pn-pt): <b>{data.workingDays}</b></div>
                    <div>Pracowników: <b>{visibleEmployees.length}</b></div>
                    <div style={{ color: 'rgba(255,255,255,0.4)' }}>
                        💡 Przeciągnij komórkę na inną żeby skopiować zmianę. Trzymaj <b>Shift</b> żeby przenieść.
                    </div>
                </div>
            )}

            {dropping && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#1e293b', padding: '1.5rem 2.5rem', borderRadius: 12, color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Loader2 size={20} className="spin" /> Aktualizuję grafik…
                    </div>
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
                    workstations={data?.workstations ?? []}
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

function workstationTypeLabel(t: string): string {
    switch (t) {
        case 'cabinet': return 'Gabinet';
        case 'reception': return 'Recepcja';
        case 'consultation': return 'Konsultacja';
        case 'lab': return 'Pracownia';
        case 'office': return 'Biuro';
        default: return 'Inne';
    }
}

function WorkstationCell({
    entries,
    isWeekend,
    color,
    onEntryClick,
}: {
    entries: Array<{
        employee: ScheduleEmployee;
        cellId: string;
        segmentStart: string;
        segmentEnd: string;
        doctor: ScheduleEmployee | null;
        notes: string | null;
    }>;
    isWeekend: boolean;
    color: string;
    onEntryClick: (employeeId: string) => void;
}) {
    if (entries.length === 0) {
        return (
            <td style={{ ...tdStyle, minWidth: 160, opacity: 0.3, textAlign: 'center' }}>
                —
            </td>
        );
    }
    return (
        <td style={{ ...tdStyle, minWidth: 160, padding: '0.4rem', verticalAlign: 'top' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {entries.map((entry, idx) => {
                    const positionIcon = SHIFT_ROLES.find((r) => r.value === entry.employee.position)?.icon ?? '·';
                    const lastName = entry.employee.name.split(' ').slice(-1)[0];
                    const firstInitial = entry.employee.name.charAt(0);
                    return (
                        <div
                            key={`${entry.cellId}_${idx}`}
                            onClick={() => onEntryClick(entry.employee.id)}
                            style={{
                                padding: '0.35rem 0.45rem',
                                background: `${color}15`,
                                border: `1px solid ${color}40`,
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                lineHeight: 1.35,
                            }}
                            title={`${entry.employee.name} (${entry.employee.position ?? '—'})${entry.doctor ? ' z dr ' + entry.doctor.name : ''}${entry.notes ? '\n' + entry.notes : ''}`}
                        >
                            <div style={{ color: '#fff', fontWeight: 600 }}>
                                {positionIcon} {firstInitial}. {lastName}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>
                                {entry.segmentStart}–{entry.segmentEnd}
                            </div>
                            {entry.doctor && (
                                <div style={{ color: '#a78bfa', fontSize: '0.7rem' }}>
                                    + dr {entry.doctor.name.split(' ').slice(-1)[0]}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </td>
    );
}

// ── Cell renderer ───────────────────────────────────────────────────

function CellTd({
    cell,
    isWeekend,
    onClick,
    workstationsById,
    doctorsById,
    isDragSource,
    isDragTarget,
    onDragStartCell,
    onDragOverCell,
    onDragLeaveCell,
    onDropCell,
    onDragEndCell,
}: {
    cell: ScheduleCell | undefined;
    isWeekend: boolean;
    onClick: () => void;
    workstationsById: Map<string, Workstation>;
    doctorsById: Map<string, ScheduleEmployee>;
    isDragSource: boolean;
    isDragTarget: boolean;
    onDragStartCell: (cell: ScheduleCell, e: React.DragEvent) => void;
    onDragOverCell: (e: React.DragEvent) => void;
    onDragLeaveCell: () => void;
    onDropCell: (e: React.DragEvent) => void;
    onDragEndCell: () => void;
}) {
    const empty = !cell;
    const isAbsence = cell?.absence_type;
    const absenceDef = isAbsence ? ABSENCE_TYPES.find((a) => a.value === cell.absence_type) : null;

    const baseBg = empty
        ? 'transparent'
        : isAbsence
            ? `${absenceDef?.color}20`
            : 'rgba(56,189,248,0.07)';

    return (
        <td
            onClick={onClick}
            draggable={!empty}
            onDragStart={(e) => cell && onDragStartCell(cell, e)}
            onDragOver={onDragOverCell}
            onDragLeave={onDragLeaveCell}
            onDrop={onDropCell}
            onDragEnd={onDragEndCell}
            style={{
                ...tdStyle,
                cursor: empty ? 'pointer' : 'grab',
                background: isDragTarget
                    ? 'rgba(251,191,36,0.25)'
                    : baseBg,
                opacity: isDragSource ? 0.4 : empty ? 0.4 : 1,
                transition: 'background 0.15s, opacity 0.15s',
                outline: isDragTarget ? '2px dashed #fbbf24' : 'none',
                outlineOffset: -2,
            }}
            onMouseEnter={(e) => {
                if (!isDragTarget) e.currentTarget.style.background = isWeekend ? 'rgba(255,255,255,0.05)' : 'rgba(251,191,36,0.08)';
            }}
            onMouseLeave={(e) => {
                if (!isDragTarget) e.currentTarget.style.background = baseBg;
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
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', marginTop: 2, lineHeight: 1.3 }}>
                            {cell.assignments.map((a, idx) => {
                                const ws = a.workstation_id ? workstationsById.get(a.workstation_id) : undefined;
                                const doc = a.doctor_employee_id ? doctorsById.get(a.doctor_employee_id) : undefined;
                                const docFirstName = doc?.name.split(' ')[0]?.charAt(0) ?? '';
                                const wsLabel = ws?.short_label ?? '';
                                const docLabel = doc ? `+${docFirstName}` : '';
                                const time = `${timeShort(a.segment_start)}-${timeShort(a.segment_end)}`;
                                return (
                                    <div key={idx} title={`${time} ${ws?.name ?? ''}${doc ? ' · ' + doc.name : ''}`}>
                                        <span style={{ color: ws?.color ?? '#fbbf24' }}>{wsLabel}</span>
                                        {docLabel && <span style={{ color: '#a78bfa' }}> {docLabel}</span>}
                                    </div>
                                );
                            })}
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
    workstations,
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
    workstations: Workstation[];
    cellMap: Map<string, ScheduleCell>;
}) {
    const dateObj = new Date(state.date + 'T00:00:00Z');
    const dayLabel = `${PL_DAYS_LONG[dateObj.getUTCDay()]}, ${dateObj.getUTCDate()} ${PL_MONTHS[dateObj.getUTCMonth()]} ${dateObj.getUTCFullYear()}`;

    // Wszyscy lekarze (z grafikiem dnia lub bez — pokazujemy wszystkich, hint w label)
    const allDoctors = employees
        .filter((e) => e.position === 'Lekarz')
        .map((e) => ({ emp: e, cell: cellMap.get(`${e.id}_${state.date}`) }));

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
                doctorEmployeeId: null,
                doctorScheduleId: null,
                workstationId: null,
                segmentStart: state.plannedStart || '08:00',
                segmentEnd: state.plannedEnd || '16:00',
            },
        ]);
    };

    const applyShiftPreset = (start: string, end: string) => {
        setState({ ...state, plannedStart: start, plannedEnd: end });
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
                        {/* QUICK PRESETS */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                            <span style={{ ...labelStyle, marginBottom: 0, alignSelf: 'center' }}>Szablon:</span>
                            {SHIFT_PRESETS.map((p) => {
                                const active = state.plannedStart === p.start && state.plannedEnd === p.end;
                                return (
                                    <button
                                        key={p.label}
                                        onClick={() => applyShiftPreset(p.start, p.end)}
                                        style={{
                                            padding: '0.35rem 0.75rem',
                                            borderRadius: 999,
                                            border: `1px solid ${active ? '#fbbf24' : 'rgba(255,255,255,0.15)'}`,
                                            background: active ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                                            color: active ? '#fbbf24' : 'rgba(255,255,255,0.75)',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {p.icon} {p.label} {p.start}–{p.end}
                                    </button>
                                );
                            })}
                        </div>

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
                                <label style={labelStyle}>Przypisania w trakcie zmiany</label>
                                <button onClick={addAssignment} style={{ ...btnSecondaryStyle, padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}>
                                    <Plus size={14} /> Dodaj segment
                                </button>
                            </div>
                            {state.assignments.length === 0 ? (
                                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>
                                    Brak przypisań. Można podzielić zmianę na segmenty: stanowisko (gabinet/recepcja/pracownia)
                                    i/lub lekarz (gdy pracownik asystuje przy zabiegach).
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {state.assignments.map((a, i) => {
                                        const docMeta = a.doctorEmployeeId
                                            ? allDoctors.find((d) => d.emp.id === a.doctorEmployeeId)
                                            : undefined;
                                        const docHasSchedule = !!docMeta?.cell && !docMeta.cell.absence_type;
                                        return (
                                            <div
                                                key={i}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 6,
                                                    padding: '0.65rem',
                                                    background: 'rgba(255,255,255,0.04)',
                                                    borderRadius: 8,
                                                }}
                                            >
                                                {/* Pierwszy wiersz: czas + delete */}
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <input
                                                        type="time"
                                                        value={a.segmentStart}
                                                        onChange={(e) => updateAssignment(i, { segmentStart: e.target.value })}
                                                        style={{ ...inputStyle, width: 100, padding: '0.35rem' }}
                                                    />
                                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>–</span>
                                                    <input
                                                        type="time"
                                                        value={a.segmentEnd}
                                                        onChange={(e) => updateAssignment(i, { segmentEnd: e.target.value })}
                                                        style={{ ...inputStyle, width: 100, padding: '0.35rem' }}
                                                    />
                                                    <span style={{ flex: 1 }} />
                                                    <button
                                                        onClick={() => removeAssignment(i)}
                                                        title="Usuń segment"
                                                        style={{
                                                            width: 30,
                                                            height: 30,
                                                            borderRadius: 8,
                                                            border: '1px solid rgba(239,68,68,0.3)',
                                                            background: 'rgba(239,68,68,0.08)',
                                                            color: '#fca5a5',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>

                                                {/* Drugi wiersz: stanowisko + lekarz */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                                    <select
                                                        value={a.workstationId ?? ''}
                                                        onChange={(e) => updateAssignment(i, { workstationId: e.target.value || null })}
                                                        style={{ ...inputStyle, padding: '0.35rem', fontSize: '0.85rem' }}
                                                    >
                                                        <option value="">— stanowisko —</option>
                                                        {workstations.map((w) => (
                                                            <option key={w.id} value={w.id}>
                                                                {w.short_label ? `${w.short_label} · ` : ''}{w.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={a.doctorEmployeeId ?? ''}
                                                        onChange={(e) =>
                                                            updateAssignment(i, {
                                                                doctorEmployeeId: e.target.value || null,
                                                                doctorScheduleId: null,
                                                            })
                                                        }
                                                        style={{ ...inputStyle, padding: '0.35rem', fontSize: '0.85rem' }}
                                                    >
                                                        <option value="">— bez lekarza —</option>
                                                        {allDoctors.map((d) => {
                                                            const hint = d.cell?.absence_type
                                                                ? ` · ${ABSENCE_TYPES.find((x) => x.value === d.cell?.absence_type)?.short ?? 'nb'}`
                                                                : d.cell
                                                                    ? ` · ${timeShort(d.cell.planned_start)}–${timeShort(d.cell.planned_end)}`
                                                                    : ' · brak grafiku';
                                                            return (
                                                                <option key={d.emp.id} value={d.emp.id}>
                                                                    {d.emp.name}{hint}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>

                                                {/* Ostrzeżenia / hinty */}
                                                {a.doctorEmployeeId && !docHasSchedule && (
                                                    <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>
                                                        ⚠ Wybrany lekarz nie ma grafiku w tym dniu — segment się zapisze, ale algorytm nadgodzin
                                                        zacznie liczyć go dopiero po wpisaniu zmiany lekarza.
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
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

const viewToggleStyle: React.CSSProperties = {
    padding: '0.5rem 0.95rem',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.55)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
};

const viewToggleActiveStyle: React.CSSProperties = {
    ...viewToggleStyle,
    background: 'rgba(251,191,36,0.18)',
    color: '#fbbf24',
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
