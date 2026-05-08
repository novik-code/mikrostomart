'use client';

// Read-only widok grafiku dla pracownika.
// Trzy tryby: Pracownicy / Stanowiska / Dzień — bez edycji.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Loader2, Users, LayoutGrid, CalendarClock, Eye } from 'lucide-react';
import {
    ABSENCE_TYPES,
    SHIFT_ROLES,
    type ScheduleCell,
    type ScheduleEmployee,
    type ScheduleMonthResponse,
    type Workstation,
} from '@/lib/timeTracking/scheduleTypes';

const PL_DAYS = ['Niedz', 'Pn', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
const PL_DAYS_LONG = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
const PL_MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

const DAY_HOUR_START = 7;
const DAY_HOUR_END = 22;

function todayMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
    const [y, m] = month.split('-').map((s) => Number.parseInt(s, 10));
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function buildDaysForMonth(month: string) {
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

function timeShort(t: string | null): string {
    return t ? t.slice(0, 5) : '';
}

function timeMin(t: string | null): number {
    if (!t) return 0;
    const [h, m] = t.split(':').map((s) => Number.parseInt(s, 10));
    return h * 60 + (m || 0);
}

function monthLabel(month: string): string {
    const [y, m] = month.split('-').map((s) => Number.parseInt(s, 10));
    return `${PL_MONTHS[m - 1]} ${y}`;
}

export default function GrafikViewerTab() {
    const [month, setMonth] = useState(() => todayMonth());
    const [data, setData] = useState<ScheduleMonthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'employees' | 'workstations' | 'day'>('employees');
    const [selectedDay, setSelectedDay] = useState<string>(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [previewCell, setPreviewCell] = useState<{ employeeName: string; date: string; cell: ScheduleCell | null } | null>(null);

    const fetchMonth = useCallback(async (m: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/employee/schedule-view?month=${m}`, { cache: 'no-store' });
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
        if (data) for (const c of data.cells) m.set(`${c.employee_id}_${c.date}`, c);
        return m;
    }, [data]);
    const employeesById = useMemo(() => {
        const m = new Map<string, ScheduleEmployee>();
        if (data) for (const e of data.employees) m.set(e.id, e);
        return m;
    }, [data]);
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

    const workstationGrid = useMemo(() => {
        const grid = new Map<string, Map<string, Array<{ employee: ScheduleEmployee; cellId: string; segmentStart: string; segmentEnd: string; doctor: ScheduleEmployee | null }>>>();
        if (!data) return grid;
        for (const cell of data.cells) {
            const emp = employeesById.get(cell.employee_id);
            if (!emp) continue;
            for (const a of cell.assignments) {
                if (!a.workstation_id) continue;
                const wsMap = grid.get(a.workstation_id) ?? new Map<string, any[]>();
                if (!grid.has(a.workstation_id)) grid.set(a.workstation_id, wsMap);
                const list = wsMap.get(cell.date) ?? [];
                if (!wsMap.has(cell.date)) wsMap.set(cell.date, list);
                list.push({
                    employee: emp,
                    cellId: cell.id,
                    segmentStart: timeShort(a.segment_start),
                    segmentEnd: timeShort(a.segment_end),
                    doctor: a.doctor_employee_id ? doctorsById.get(a.doctor_employee_id) ?? null : null,
                });
                list.sort((x, y) => (x.segmentStart < y.segmentStart ? -1 : 1));
            }
        }
        return grid;
    }, [data, employeesById, doctorsById]);

    const showCellPreview = (employeeId: string, date: string) => {
        const cell = cellMap.get(`${employeeId}_${date}`) ?? null;
        const emp = employeesById.get(employeeId);
        if (!emp) return;
        setPreviewCell({ employeeName: emp.name, date, cell });
    };

    return (
        <div style={{ padding: '1rem 1.25rem' }}>
            <header style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Calendar size={24} style={{ color: '#fbbf24' }} /> Grafik pracy
                    <span style={{ fontSize: '0.75rem', color: '#fbbf24', background: 'rgba(251,191,36,0.15)', padding: '2px 8px', borderRadius: 999, marginLeft: 8 }}>
                        <Eye size={12} style={{ display: 'inline', marginRight: 4 }} /> tylko do odczytu
                    </span>
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', marginTop: 4 }}>
                    Podgląd grafiku zespołu — edycja jest możliwa wyłącznie z poziomu panelu administratora.
                </p>
            </header>

            {/* CONTROLS */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => setMonth(shiftMonth(month, -1))} style={iconBtnStyle}><ChevronLeft size={18} /></button>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, minWidth: 160, textAlign: 'center', margin: 0 }}>
                        {monthLabel(month)}
                    </h2>
                    <button onClick={() => setMonth(shiftMonth(month, 1))} style={iconBtnStyle}><ChevronRight size={18} /></button>
                    <button onClick={() => setMonth(todayMonth())} style={btnSecondary}>Dziś</button>
                </div>

                <div style={{ display: 'inline-flex', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', marginLeft: 'auto' }}>
                    <button onClick={() => setViewMode('employees')} style={viewMode === 'employees' ? viewToggleActive : viewToggle}>
                        <Users size={14} /> Pracownicy
                    </button>
                    <button onClick={() => setViewMode('workstations')} style={viewMode === 'workstations' ? viewToggleActive : viewToggle}>
                        <LayoutGrid size={14} /> Stanowiska
                    </button>
                    <button onClick={() => setViewMode('day')} style={viewMode === 'day' ? viewToggleActive : viewToggle}>
                        <CalendarClock size={14} /> Dzień
                    </button>
                </div>
            </div>

            {/* GRID */}
            {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.55)' }}>
                    <Loader2 size={28} className="spin" /> Ładowanie…
                </div>
            ) : error ? (
                <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, color: '#fca5a5' }}>
                    {error}
                </div>
            ) : !data || data.employees.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>
                    Brak pracowników w grafiku.
                </div>
            ) : viewMode === 'day' ? (
                <DayView
                    selectedDay={selectedDay}
                    setSelectedDay={setSelectedDay}
                    cells={data.cells}
                    workstations={data.workstations}
                    employeesById={employeesById}
                    workstationsById={workstationsById}
                    doctorsById={doctorsById}
                />
            ) : viewMode === 'workstations' ? (
                <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.4)' }}>
                                <th style={{ ...thStyle, position: 'sticky', left: 0, background: '#0f1115', minWidth: 110 }}>Dzień</th>
                                {data.workstations.map((ws) => (
                                    <th key={ws.id} style={{ ...thStyle, minWidth: 150, borderTop: `3px solid ${ws.color ?? '#fbbf24'}` }}>
                                        <div style={{ fontWeight: 700, color: ws.color ?? '#fff' }}>
                                            {ws.short_label ? `${ws.short_label} · ` : ''}{ws.name}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map((d) => (
                                <tr key={d.date} style={{ background: d.isWeekend ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
                                    <td style={{ ...tdStyle, position: 'sticky', left: 0, background: d.isWeekend ? '#0d1f15' : '#0f1115', fontWeight: 600 }}>
                                        <div>{d.dayOfMonth}.{month.split('-')[1]}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{PL_DAYS[d.dayOfWeek]}</div>
                                    </td>
                                    {data.workstations.map((ws) => {
                                        const entries = workstationGrid.get(ws.id)?.get(d.date) ?? [];
                                        return (
                                            <td key={ws.id} style={{ ...tdStyle, padding: '0.4rem', verticalAlign: 'top' }}>
                                                {entries.length === 0 ? (
                                                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        {entries.map((e, i) => {
                                                            const lastName = e.employee.name.split(' ').slice(-1)[0];
                                                            const initial = e.employee.name.charAt(0);
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    onClick={() => showCellPreview(e.employee.id, d.date)}
                                                                    style={{
                                                                        padding: '0.3rem 0.4rem',
                                                                        background: `${ws.color ?? '#fbbf24'}15`,
                                                                        border: `1px solid ${ws.color ?? '#fbbf24'}40`,
                                                                        borderRadius: 6,
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.75rem',
                                                                        lineHeight: 1.3,
                                                                    }}
                                                                >
                                                                    <div style={{ color: '#fff', fontWeight: 600 }}>
                                                                        {initial}. {lastName}
                                                                    </div>
                                                                    <div style={{ color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>
                                                                        {e.segmentStart}–{e.segmentEnd}
                                                                    </div>
                                                                    {e.doctor && (
                                                                        <div style={{ color: '#a78bfa', fontSize: '0.68rem' }}>
                                                                            + dr {e.doctor.name.split(' ').slice(-1)[0]}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* TRYB PRACOWNICY */
                <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.4)' }}>
                                <th style={{ ...thStyle, position: 'sticky', left: 0, background: '#0f1115', minWidth: 110 }}>Dzień</th>
                                {data.employees.map((emp) => (
                                    <th key={emp.id} style={thStyle}>
                                        <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{emp.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>
                                            {emp.position ?? '—'}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map((d) => (
                                <tr key={d.date} style={{ background: d.isWeekend ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
                                    <td style={{ ...tdStyle, position: 'sticky', left: 0, background: d.isWeekend ? '#0d1f15' : '#0f1115', fontWeight: 600 }}>
                                        <div>{d.dayOfMonth}.{month.split('-')[1]}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{PL_DAYS[d.dayOfWeek]}</div>
                                    </td>
                                    {data.employees.map((emp) => {
                                        const cell = cellMap.get(`${emp.id}_${d.date}`);
                                        return (
                                            <ReadCellTd
                                                key={emp.id}
                                                cell={cell}
                                                isWeekend={d.isWeekend}
                                                onClick={() => showCellPreview(emp.id, d.date)}
                                                workstationsById={workstationsById}
                                                doctorsById={doctorsById}
                                            />
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {previewCell && (
                <CellPreviewModal
                    employeeName={previewCell.employeeName}
                    date={previewCell.date}
                    cell={previewCell.cell}
                    workstationsById={workstationsById}
                    doctorsById={doctorsById}
                    onClose={() => setPreviewCell(null)}
                />
            )}

            <style jsx global>{`
                .spin { animation: spinkeyfV 1s linear infinite; }
                @keyframes spinkeyfV { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

function ReadCellTd({
    cell,
    isWeekend,
    onClick,
    workstationsById,
    doctorsById,
}: {
    cell: ScheduleCell | undefined;
    isWeekend: boolean;
    onClick: () => void;
    workstationsById: Map<string, Workstation>;
    doctorsById: Map<string, ScheduleEmployee>;
}) {
    if (!cell) {
        return <td style={{ ...tdStyle, opacity: 0.3, textAlign: 'center' }}>—</td>;
    }
    const isAbsence = !!cell.absence_type;
    const absenceDef = isAbsence ? ABSENCE_TYPES.find((a) => a.value === cell.absence_type) : null;
    return (
        <td
            onClick={onClick}
            style={{
                ...tdStyle,
                cursor: 'pointer',
                background: isAbsence ? `${absenceDef?.color}20` : 'rgba(56,189,248,0.07)',
            }}
        >
            {isAbsence ? (
                <div style={{ color: absenceDef?.color, fontWeight: 700 }} title={absenceDef?.label}>
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
                                return (
                                    <div key={idx}>
                                        <span style={{ color: ws?.color ?? '#fbbf24' }}>{ws?.short_label ?? ''}</span>
                                        {doc && <span style={{ color: '#a78bfa' }}> +{doc.name.charAt(0)}</span>}
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

function DayView({
    selectedDay,
    setSelectedDay,
    cells,
    workstations,
    employeesById,
    workstationsById,
    doctorsById,
}: {
    selectedDay: string;
    setSelectedDay: (s: string) => void;
    cells: ScheduleCell[];
    workstations: Workstation[];
    employeesById: Map<string, ScheduleEmployee>;
    workstationsById: Map<string, Workstation>;
    doctorsById: Map<string, ScheduleEmployee>;
}) {
    const dayCells = cells.filter((c) => c.date === selectedDay);
    const positionOrder: Record<string, number> = { Lekarz: 1, Higienistka: 2, Asystentka: 3, Recepcja: 4 };
    const sorted = [...dayCells].sort((a, b) => {
        const ea = employeesById.get(a.employee_id);
        const eb = employeesById.get(b.employee_id);
        const oa = (ea?.position && positionOrder[ea.position]) || 99;
        const ob = (eb?.position && positionOrder[eb.position]) || 99;
        if (oa !== ob) return oa - ob;
        return (ea?.name ?? '').localeCompare(eb?.name ?? '');
    });

    const dateObj = new Date(selectedDay + 'T00:00:00Z');
    const dateLabel = `${PL_DAYS_LONG[dateObj.getUTCDay()]}, ${dateObj.getUTCDate()} ${PL_MONTHS[dateObj.getUTCMonth()]} ${dateObj.getUTCFullYear()}`;

    const shiftDay = (delta: number) => {
        const d = new Date(selectedDay + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() + delta);
        setSelectedDay(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`);
    };

    const totalMinutes = (DAY_HOUR_END - DAY_HOUR_START) * 60;

    return (
        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button onClick={() => shiftDay(-1)} style={iconBtnStyle}><ChevronLeft size={18} /></button>
                <input type="date" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} style={{ ...inputStyle, width: 170 }} />
                <button onClick={() => shiftDay(1)} style={iconBtnStyle}><ChevronRight size={18} /></button>
                <div style={{ marginLeft: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600, textTransform: 'capitalize' }}>{dateLabel}</div>
            </div>

            {sorted.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>Brak wpisów dla wybranego dnia.</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <div style={{ minWidth: 900 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4, marginLeft: 200 }}>
                            {Array.from({ length: DAY_HOUR_END - DAY_HOUR_START + 1 }, (_, i) => DAY_HOUR_START + i).map((h) => (
                                <div key={h} style={{ flex: 1, fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: 4 }}>
                                    {String(h).padStart(2, '0')}:00
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                            {sorted.map((cell) => {
                                const emp = employeesById.get(cell.employee_id);
                                if (!emp) return null;
                                const isAbsence = !!cell.absence_type;
                                const absenceDef = isAbsence ? ABSENCE_TYPES.find((a) => a.value === cell.absence_type) : null;
                                const startMin = isAbsence ? null : timeMin(cell.planned_start);
                                const endMin = isAbsence ? null : timeMin(cell.planned_end);
                                const baseFrom = startMin != null ? Math.max(0, startMin - DAY_HOUR_START * 60) : 0;
                                const baseTo = endMin != null ? Math.min(totalMinutes, endMin - DAY_HOUR_START * 60) : 0;

                                return (
                                    <div key={cell.id} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '4px 0' }}>
                                        <div style={{ width: 200, padding: '0.3rem 0.6rem', flexShrink: 0 }}>
                                            <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>{emp.name}</div>
                                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>{emp.position ?? '—'}</div>
                                        </div>
                                        <div style={{ position: 'relative', flex: 1, height: 44, background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                                            {isAbsence ? (
                                                <div style={{ position: 'absolute', inset: 0, background: `${absenceDef?.color}25`, border: `1px dashed ${absenceDef?.color}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: absenceDef?.color, fontWeight: 700, fontSize: '0.85rem' }}>
                                                    {absenceDef?.label}
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ position: 'absolute', left: `${(baseFrom / totalMinutes) * 100}%`, width: `${((baseTo - baseFrom) / totalMinutes) * 100}%`, top: 0, bottom: 0, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.35)', borderRadius: 6 }} />
                                                    {cell.assignments.map((a) => {
                                                        const segFromMin = timeMin(a.segment_start) - DAY_HOUR_START * 60;
                                                        const segToMin = timeMin(a.segment_end) - DAY_HOUR_START * 60;
                                                        if (segToMin <= 0 || segFromMin >= totalMinutes) return null;
                                                        const left = Math.max(0, segFromMin);
                                                        const width = Math.max(0, Math.min(totalMinutes, segToMin) - left);
                                                        if (width <= 0) return null;
                                                        const ws = a.workstation_id ? workstationsById.get(a.workstation_id) : undefined;
                                                        const doc = a.doctor_employee_id ? doctorsById.get(a.doctor_employee_id) : undefined;
                                                        const widthPct = (width / totalMinutes) * 100;
                                                        const color = ws?.color ?? '#fbbf24';
                                                        return (
                                                            <div key={a.id} title={`${a.segment_start.slice(0,5)}–${a.segment_end.slice(0,5)} · ${ws?.name ?? 'bez stanowiska'}${doc ? ' · z dr ' + doc.name : ''}`} style={{ position: 'absolute', left: `${(left / totalMinutes) * 100}%`, width: `${widthPct}%`, top: 4, bottom: 4, background: `${color}40`, border: `1px solid ${color}`, borderRadius: 5, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2px 4px', overflow: 'hidden' }}>
                                                                {widthPct > 6 && (
                                                                    <div style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                                                        {ws?.short_label ?? '?'}
                                                                    </div>
                                                                )}
                                                                {doc && widthPct > 10 && (
                                                                    <div style={{ color: '#a78bfa', fontSize: '0.65rem', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                                                        +{doc.name.split(' ')[0]}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ marginTop: '1rem', display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Stanowiska:</span>
                {workstations.map((w) => (
                    <span key={w.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 3, background: w.color ?? '#fbbf24' }} />
                        {w.short_label} {w.name}
                    </span>
                ))}
            </div>
        </div>
    );
}

function CellPreviewModal({
    employeeName,
    date,
    cell,
    workstationsById,
    doctorsById,
    onClose,
}: {
    employeeName: string;
    date: string;
    cell: ScheduleCell | null;
    workstationsById: Map<string, Workstation>;
    doctorsById: Map<string, ScheduleEmployee>;
    onClose: () => void;
}) {
    const dateObj = new Date(date + 'T00:00:00Z');
    const dayLabel = `${PL_DAYS_LONG[dateObj.getUTCDay()]}, ${dateObj.getUTCDate()} ${PL_MONTHS[dateObj.getUTCMonth()]} ${dateObj.getUTCFullYear()}`;
    const isAbsence = cell?.absence_type;
    const absenceDef = isAbsence ? ABSENCE_TYPES.find((a) => a.value === cell.absence_type) : null;

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#1e293b', borderRadius: 16, padding: '1.5rem', maxWidth: 460, width: '100%', color: '#fff', border: '1px solid rgba(251,191,36,0.3)' }}>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1 }}>Podgląd zmiany</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: 4 }}>{employeeName}</h3>
                <div style={{ color: 'rgba(255,255,255,0.6)' }}>{dayLabel}</div>

                {!cell ? (
                    <div style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.45)' }}>Brak wpisu na ten dzień.</div>
                ) : isAbsence ? (
                    <div style={{ marginTop: '1rem', padding: '0.8rem', background: `${absenceDef?.color}20`, border: `1px solid ${absenceDef?.color}`, borderRadius: 10, color: absenceDef?.color, fontWeight: 700 }}>
                        {absenceDef?.short} · {absenceDef?.label}
                    </div>
                ) : (
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                            {timeShort(cell.planned_start)} – {timeShort(cell.planned_end)}
                        </div>
                        {cell.roles_for_shift.length > 0 && (
                            <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.7)' }}>
                                Role: {cell.roles_for_shift.join(', ')}
                            </div>
                        )}
                        {cell.assignments.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Przypisania w trakcie zmiany</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {cell.assignments.map((a) => {
                                        const ws = a.workstation_id ? workstationsById.get(a.workstation_id) : undefined;
                                        const doc = a.doctor_employee_id ? doctorsById.get(a.doctor_employee_id) : undefined;
                                        return (
                                            <div key={a.id} style={{ padding: '0.5rem 0.7rem', background: `${ws?.color ?? '#fbbf24'}15`, border: `1px solid ${ws?.color ?? '#fbbf24'}40`, borderRadius: 8 }}>
                                                <div style={{ fontWeight: 600 }}>
                                                    {timeShort(a.segment_start)}–{timeShort(a.segment_end)}
                                                    {ws && <> · {ws.name}</>}
                                                </div>
                                                {doc && <div style={{ color: '#a78bfa', fontSize: '0.85rem' }}>+ dr {doc.name}</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {cell.notes && (
                            <div style={{ marginTop: 12, padding: '0.5rem 0.7rem', background: 'rgba(255,255,255,0.04)', borderRadius: 8, color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem' }}>
                                Notatka: {cell.notes}
                            </div>
                        )}
                    </div>
                )}

                <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
                    <button onClick={onClose} style={{ padding: '0.5rem 1.2rem', background: '#fbbf24', color: '#0f172a', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                        Zamknij
                    </button>
                </div>
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: '0.5rem',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'center',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.85)',
};

const tdStyle: React.CSSProperties = {
    padding: '0.4rem 0.4rem',
    borderRight: '1px solid rgba(255,255,255,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    textAlign: 'center',
    fontSize: '0.8rem',
    minWidth: 100,
};

const iconBtnStyle: React.CSSProperties = {
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

const btnSecondary: React.CSSProperties = {
    padding: '0.4rem 0.8rem',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.85)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
};

const viewToggle: React.CSSProperties = {
    padding: '0.4rem 0.7rem',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.55)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
};

const viewToggleActive: React.CSSProperties = {
    ...viewToggle,
    background: 'rgba(251,191,36,0.18)',
    color: '#fbbf24',
};

const inputStyle: React.CSSProperties = {
    padding: '0.4rem 0.6rem',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(0,0,0,0.3)',
    color: '#fff',
    fontSize: '0.85rem',
};
