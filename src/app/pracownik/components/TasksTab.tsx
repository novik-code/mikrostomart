'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { CheckSquare, Plus, User, AlertTriangle, Trash2, Clock, X, Search, ChevronLeft, ChevronRight, Calendar, Bell } from 'lucide-react';
import type { ChecklistItem, EmployeeTask, FutureAppointment, StaffMember, TaskTypeTemplate } from './TaskTypes';
import { useTasks } from '../hooks/useTasks';
import { TASK_TYPE_COLORS, getTaskTypeColor, FALLBACK_TASK_TYPE_CHECKLISTS } from './TaskTypes';

// ─── Props ────────────────────────────────────────────────────
interface TasksTabProps {
    tasks: EmployeeTask[];
    setTasks: React.Dispatch<React.SetStateAction<EmployeeTask[]>>;
    showTaskModal: boolean;
    setShowTaskModal: (v: boolean) => void;
    taskModalPrefill: { patientId?: string; patientName?: string; appointmentType?: string } | null;
    setTaskModalPrefill: (v: { patientId?: string; patientName?: string; appointmentType?: string } | null) => void;
    staffList: StaffMember[];
    currentUserId: string | null;
    currentUserEmail: string | null;
    isAdmin: boolean;
    userId: string;
    userEmail: string;
    isMobile: boolean;
}

export default function TasksTab({
    tasks,
    setTasks,
    showTaskModal,
    setShowTaskModal,
    taskModalPrefill,
    setTaskModalPrefill,
    staffList,
    currentUserId,
    currentUserEmail,
    isAdmin,
    userId,
    userEmail,
    isMobile,
}: TasksTabProps) {
    // ─── useTasks hook (core state + handlers) ─────────────────
    const {
        tasksLoading, taskSaving, imageUploading, editSaving, commentLoading,
        taskForm, setTaskForm, resetTaskForm,
        futureAppointments, futureAptsLoading,
        patientSearchQuery, setPatientSearchQuery, patientSearchResults, setPatientSearchResults, patientSearchLoading,
        editPatientSearchQuery, setEditPatientSearchQuery, editPatientSearchResults, setEditPatientSearchResults, editPatientSearchLoading,
        searchPatients,
        editingTask, setEditingTask, editForm, setEditForm, openEditModal, handleSaveEdit,
        taskComments, commentInput, setCommentInput, fetchComments, handlePostComment,
        allLabels, taskLabelMap, setTaskLabelMap,
        taskTypeTemplates, setTaskTypeTemplates,
        showTypeManager, setShowTypeManager,
        typeManagerForm, setTypeManagerForm, typeManagerSaving, setTypeManagerSaving,
        editingTypeId, setEditingTypeId,
        TASK_TYPE_CHECKLISTS, fetchTaskTypes,
        showLoginPopup, setShowLoginPopup, loginPopupTasks,
        deepLinkTaskId, setDeepLinkTaskId,
        fetchTasks, openTaskModal, handleCreateTask, handleUpdateStatus, handleDeleteTask,
        handleToggleChecklist, handleImageUpload, selectFutureAppointment,
        isMyTask, compressImage,
        getStatusLabel, getStatusColor, getPriorityLabel, getPriorityColor, getNextStatus,
    } = useTasks({
        tasks, setTasks, staffList, currentUserId, currentUserEmail,
        showTaskModal, setShowTaskModal, taskModalPrefill, setTaskModalPrefill,
    });

    // ─── UI-only State (view mode, filters, drag, calendar, push) ─────
    const [taskFilter, setTaskFilter] = useState<'all' | 'todo' | 'in_progress' | 'done' | 'archived'>('all');
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [selectedViewTask, setSelectedViewTask] = useState<EmployeeTask | null>(null);
    const [taskHistory, setTaskHistory] = useState<any[]>([]);
    const [taskHistoryLoading, setTaskHistoryLoading] = useState(false);
    const [taskHistoryExpanded, setTaskHistoryExpanded] = useState(false);
    const [taskViewMode, setTaskViewMode] = useState<'list' | 'kanban' | 'calendar'>('kanban');
    const [taskSearchQuery, setTaskSearchQuery] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');
    const [filterAssigneeOpen, setFilterAssigneeOpen] = useState(false);
    const [filterTypes, setFilterTypes] = useState<string[]>([]);
    const [filterTypesOpen, setFilterTypesOpen] = useState(false);
    const [filterPriority, setFilterPriority] = useState('');
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [calendarDayPopup, setCalendarDayPopup] = useState<{ day: number; tasks: EmployeeTask[] } | null>(null);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
    // ─── Push Send Widget State ───────────────────────────────────
    const [showPushModal, setShowPushModal] = useState(false);
    const [pushSendTitle, setPushSendTitle] = useState('');
    const [pushSendBody, setPushSendBody] = useState('');
    const [pushSendUrl, setPushSendUrl] = useState('');
    const [pushSendIndividuals, setPushSendIndividuals] = useState<string[]>([]);
    const [pushSendGroups, setPushSendGroups] = useState<string[]>([]);
    const [pushSending, setPushSending] = useState(false);
    const [pushSendResult, setPushSendResult] = useState<{ sent?: number; failed?: number; error?: string } | null>(null);
    const [pushEmpSearch, setPushEmpSearch] = useState('');

    // ─── Deep link: open task once loaded ─────────────────────────
    useEffect(() => {
        if (!deepLinkTaskId || tasks.length === 0) return;
        const task = tasks.find(t => t.id === deepLinkTaskId);
        if (task) {
            setSelectedViewTask(task);
            setDeepLinkTaskId(null);
        }
    }, [deepLinkTaskId, tasks]);

    // ─── Browser notifications ───────────────────────────────────
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setNotifPermission(Notification.permission);
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(p => setNotifPermission(p));
            }
        }
    }, []);

    // ─── Close filter dropdowns on outside click ─────────────────
    useEffect(() => {
        const handleGlobalClick = () => {
            setFilterAssigneeOpen(false);
            setFilterTypesOpen(false);
        };
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    // ─── Kanban Drag & Drop ──────────────────────────────────────
    const handleDragStart = (taskId: string) => setDraggedTaskId(taskId);
    const handleDragEnd = () => { setDraggedTaskId(null); setDragOverColumn(null); };
    const handleDragOver = (e: React.DragEvent, col: string) => {
        e.preventDefault();
        setDragOverColumn(col);
    };
    const handleDrop = async (col: string) => {
        if (!draggedTaskId) return;
        const newStatus = col as 'todo' | 'in_progress' | 'done';
        handleUpdateStatus(draggedTaskId, newStatus);
        setDraggedTaskId(null);
        setDragOverColumn(null);
    };

    // ─── Enhanced: Calendar helpers ────────────────────────
    const getCalendarDays = useMemo(() => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon=0
        const days: (number | null)[] = [];
        for (let i = 0; i < startOffset; i++) days.push(null);
        for (let d = 1; d <= daysInMonth; d++) days.push(d);
        return days;
    }, [calendarMonth]);

    const tasksForDate = useCallback((day: number) => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return tasks.filter(t => t.due_date?.slice(0, 10) === dateStr && t.status !== 'archived');
    }, [tasks, calendarMonth]);

    // ─── Enhanced: Filtered Tasks with search/filters ──────
    const filteredTasks = useMemo(() => {
        let base = taskFilter === 'all'
            ? tasks.filter(t => t.status !== 'archived')
            : taskFilter === 'archived'
                ? tasks.filter(t => t.status === 'archived')
                : tasks.filter(t => t.status === taskFilter);

        // Text search
        if (taskSearchQuery.trim()) {
            const q = taskSearchQuery.toLowerCase();
            base = base.filter(t =>
                t.title.toLowerCase().includes(q) ||
                (t.patient_name || '').toLowerCase().includes(q) ||
                (t.description || '').toLowerCase().includes(q) ||
                (t.assigned_to || []).some(a => a.name.toLowerCase().includes(q))
            );
        }
        // Assignee filter
        if (filterAssignee) {
            base = base.filter(t =>
                (t.assigned_to || []).some(a => a.id === filterAssignee) ||
                t.assigned_to_doctor_id === filterAssignee
            );
        }
        // Type filter (multi-select)
        if (filterTypes.length > 0) {
            base = base.filter(t => {
                for (const ft of filterTypes) {
                    if (ft === '__private__') {
                        if (t.is_private && t.owner_user_id === currentUserId) return true;
                    } else {
                        if (t.task_type === ft) return true;
                    }
                }
                return false;
            });
        }
        // Priority filter
        if (filterPriority) {
            base = base.filter(t => t.priority === filterPriority);
        }

        const priorityOrder: Record<string, number> = { urgent: 0, normal: 1, low: 2 };
        return [...base].sort((a, b) => {
            const aMine = isMyTask(a) ? 0 : 1;
            const bMine = isMyTask(b) ? 0 : 1;
            if (aMine !== bMine) return aMine - bMine;
            const aPri = priorityOrder[a.priority] ?? 1;
            const bPri = priorityOrder[b.priority] ?? 1;
            if (aPri !== bPri) return aPri - bPri;
            if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            if (a.due_date) return -1;
            if (b.due_date) return 1;
            return 0;
        });
    }, [tasks, taskFilter, taskSearchQuery, filterAssignee, filterTypes, filterPriority, isMyTask, currentUserId]);

    return (
        <>
            <div style={{
                padding: '2rem',
                maxWidth: taskViewMode === 'kanban' ? '1200px' : '900px',
                margin: '0 auto',
                transition: 'max-width 0.3s',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <CheckSquare size={20} style={{ color: '#38bdf8', flexShrink: 0 }} />
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, whiteSpace: 'nowrap' }}>
                            Zadania
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>({tasks.length})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {/* View toggle */}
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                            {([
                                { id: 'list' as const, icon: '☰', label: 'Lista' },
                                { id: 'kanban' as const, icon: '▦', label: 'Kanban' },
                                { id: 'calendar' as const, icon: '📅', label: 'Kalendarz' },
                            ]).map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => setTaskViewMode(v.id)}
                                    title={v.label}
                                    style={{
                                        padding: '0.35rem 0.55rem',
                                        background: taskViewMode === v.id ? 'rgba(56,189,248,0.15)' : 'transparent',
                                        border: 'none',
                                        color: taskViewMode === v.id ? '#38bdf8' : 'rgba(255,255,255,0.4)',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        fontWeight: taskViewMode === v.id ? '600' : '400',
                                    }}
                                >
                                    {v.icon}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => openTaskModal()}
                            style={{
                                background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                padding: '0.45rem 0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                color: '#fff',
                                fontSize: '0.82rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                            }}
                        >
                            <Plus size={15} /> Dodaj
                        </button>
                        {/* Gear — icon-only, opens task type manager */}
                        <button
                            onClick={() => setShowTypeManager(true)}
                            title="Zarządzaj typami zadań"
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '0.5rem',
                                padding: '0.45rem 0.6rem',
                                color: 'rgba(255,255,255,0.6)',
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#a855f7'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                        >
                            ⚙️
                        </button>
                        {/* Push send button */}
                        <button
                            onClick={() => { setShowPushModal(true); setPushSendResult(null); }}
                            title="Wyślij powiadomienie push"
                            style={{
                                background: 'rgba(251,146,60,0.1)',
                                border: '1px solid rgba(251,146,60,0.2)',
                                borderRadius: '0.5rem',
                                padding: '0.45rem 0.6rem',
                                color: '#fb923c',
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,146,60,0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,146,60,0.1)'; }}
                        >
                            📤
                        </button>
                    </div>
                </div>

                {/* ── Push Send Modal ─────────────────────────────────── */}
                {showPushModal && (
                    <div onClick={e => { if (e.target === e.currentTarget) setShowPushModal(false); }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <div style={{ background: 'linear-gradient(145deg,#0f172a,#1e293b)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: '1rem', padding: '1.5rem', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                                <h3 style={{ margin: 0, color: '#fb923c' }}>📤 Wyślij powiadomienie</h3>
                                <button onClick={() => setShowPushModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                            </div>
                            <div style={{ marginBottom: '0.7rem' }}>
                                <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', display: 'block', marginBottom: '0.3rem' }}>Tytuł *</label>
                                <input value={pushSendTitle} onChange={e => setPushSendTitle(e.target.value)} placeholder="np. Ważna informacja" maxLength={100}
                                    style={{ width: '100%', padding: '0.5rem 0.7rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.4rem', color: '#fff', fontSize: '0.88rem', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ marginBottom: '0.7rem' }}>
                                <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', display: 'block', marginBottom: '0.3rem' }}>Treść *</label>
                                <textarea value={pushSendBody} onChange={e => setPushSendBody(e.target.value)} placeholder="Treść powiadomienia..." maxLength={300} rows={3}
                                    style={{ width: '100%', padding: '0.5rem 0.7rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.4rem', color: '#fff', fontSize: '0.88rem', resize: 'vertical', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ marginBottom: '0.7rem' }}>
                                <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>Grupy</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                    {(['doctors', 'hygienists', 'reception', 'assistant'] as const).map(g => {
                                        const labels: Record<string, string> = { doctors: '🦷 Lekarze', hygienists: '🪥 Higienistki', reception: '📋 Recepcja', assistant: '🩺 Asystentki' };
                                        const active = pushSendGroups.includes(g);
                                        return (
                                            <button key={g}
                                                onClick={() => setPushSendGroups(prev => active ? prev.filter(x => x !== g) : [...prev, g])}
                                                style={{ padding: '0.3rem 0.65rem', borderRadius: '2rem', cursor: 'pointer', fontSize: '0.75rem', border: `1px solid ${active ? '#fb923c' : 'rgba(255,255,255,0.14)'}`, background: active ? 'rgba(251,146,60,0.15)' : 'transparent', color: active ? '#fb923c' : 'rgba(255,255,255,0.5)', fontWeight: active ? '600' : '400', transition: 'all 0.1s' }}>
                                                {labels[g]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {staffList.length > 0 && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>
                                        Konkretni pracownicy
                                        {pushSendIndividuals.length > 0 && <span style={{ marginLeft: '0.4rem', color: '#fb923c', fontWeight: '600' }}>({pushSendIndividuals.length})</span>}
                                    </label>
                                    <input value={pushEmpSearch} onChange={e => setPushEmpSearch(e.target.value)} placeholder="Szukaj..."
                                        style={{ width: '100%', padding: '0.35rem 0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', color: '#fff', fontSize: '0.75rem', marginBottom: '0.4rem', boxSizing: 'border-box' }} />
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: '90px', overflowY: 'auto' }}>
                                        {staffList.filter(s => {
                                            const q = pushEmpSearch.toLowerCase();
                                            return !q || (s.name || '').toLowerCase().includes(q);
                                        }).map(s => {
                                            const active = pushSendIndividuals.includes(s.id);
                                            return (
                                                <button key={s.id}
                                                    onClick={() => setPushSendIndividuals(prev => active ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                                                    style={{ padding: '0.28rem 0.6rem', borderRadius: '2rem', cursor: 'pointer', fontSize: '0.75rem', border: `1px solid ${active ? '#38bdf8' : 'rgba(255,255,255,0.12)'}`, background: active ? 'rgba(56,189,248,0.12)' : 'transparent', color: active ? '#38bdf8' : 'rgba(255,255,255,0.55)', fontWeight: active ? '600' : '400', transition: 'all 0.1s' }}>
                                                    {s.name || s.email}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {pushSendResult && (
                                <div style={{ marginBottom: '0.8rem', padding: '0.6rem 0.8rem', borderRadius: '0.4rem', fontSize: '0.78rem', background: pushSendResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${pushSendResult.error ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, color: pushSendResult.error ? '#ef4444' : '#22c55e' }}>
                                    {pushSendResult.error ? `❌ ${pushSendResult.error}` : `✅ Wysłano: ${pushSendResult.sent} powiadomień`}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '0.6rem' }}>
                                <button
                                    disabled={pushSending || !pushSendTitle || !pushSendBody || (pushSendGroups.length === 0 && pushSendIndividuals.length === 0)}
                                    onClick={async () => {
                                        if (!pushSendTitle || !pushSendBody || (pushSendGroups.length === 0 && pushSendIndividuals.length === 0)) return;
                                        setPushSending(true);
                                        setPushSendResult(null);
                                        try {
                                            const res = await fetch('/api/employee/push/send', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ title: pushSendTitle, body: pushSendBody, url: pushSendUrl, groups: pushSendGroups, userIds: pushSendIndividuals }),
                                            });
                                            const data = await res.json();
                                            setPushSendResult(data);
                                            if (res.ok && !data.error) {
                                                setPushSendTitle('');
                                                setPushSendBody('');
                                                setPushSendGroups([]);
                                                setPushSendIndividuals([]);
                                            }
                                        } catch (e: any) { setPushSendResult({ error: e.message }); }
                                        finally { setPushSending(false); }
                                    }}
                                    style={{ flex: 1, padding: '0.6rem', background: 'linear-gradient(135deg,#fb923c,#f97316)', border: 'none', borderRadius: '0.4rem', color: '#fff', fontWeight: '600', cursor: 'pointer', opacity: pushSending || !pushSendTitle || !pushSendBody || (pushSendGroups.length === 0 && pushSendIndividuals.length === 0) ? 0.5 : 1 }}
                                >
                                    {pushSending ? 'Wysyłanie...' : '📤 Wyślij'}
                                </button>
                                <button onClick={() => setShowPushModal(false)} style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                                    Anuluj
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search + Filters */}
                {/* Search + Filters */}

                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="🔍 Szukaj zadania..."
                        value={taskSearchQuery}
                        onChange={e => setTaskSearchQuery(e.target.value)}
                        style={{
                            flex: '1 1 200px',
                            minWidth: '150px',
                            padding: '0.4rem 0.75rem',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.5rem',
                            color: '#fff',
                            fontSize: '0.8rem',
                            outline: 'none',
                        }}
                    />
                    {/* Assignee filter — custom dropdown (Firefox-compatible) */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setFilterAssigneeOpen(p => !p); setFilterTypesOpen(false); }}
                            style={{
                                padding: '0.4rem 0.5rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: `1px solid ${filterAssignee ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: '0.5rem',
                                color: filterAssignee ? '#38bdf8' : 'rgba(255,255,255,0.5)',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                            }}
                        >
                            {filterAssignee ? (staffList.find(s => s.id === filterAssignee)?.name || 'Wybrany') : 'Wszyscy'}
                            <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>▾</span>
                        </button>
                        {filterAssigneeOpen && (
                            <div
                                style={{
                                    position: 'absolute', top: '100%', left: 0, zIndex: 50,
                                    marginTop: '0.25rem', minWidth: '180px', maxHeight: '200px', overflowY: 'auto',
                                    background: '#1a1a2e', border: '1px solid rgba(56,189,248,0.2)',
                                    borderRadius: '0.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                    overflow: 'hidden',
                                }}
                                onClick={e => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => { setFilterAssignee(''); setFilterAssigneeOpen(false); }}
                                    style={{
                                        width: '100%', padding: '0.5rem 0.75rem',
                                        background: !filterAssignee ? 'rgba(56,189,248,0.1)' : 'transparent',
                                        border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        color: !filterAssignee ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                                        fontSize: '0.78rem', cursor: 'pointer', textAlign: 'left',
                                    }}
                                >
                                    Wszyscy
                                </button>
                                {staffList.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => { setFilterAssignee(s.id); setFilterAssigneeOpen(false); }}
                                        style={{
                                            width: '100%', padding: '0.5rem 0.75rem',
                                            background: filterAssignee === s.id ? 'rgba(56,189,248,0.1)' : 'transparent',
                                            border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            color: filterAssignee === s.id ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                                            fontSize: '0.78rem', cursor: 'pointer', textAlign: 'left',
                                        }}
                                        onMouseEnter={e => { if (filterAssignee !== s.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = filterAssignee === s.id ? 'rgba(56,189,248,0.1)' : 'transparent'; }}
                                    >
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Type filter dropdown (multi-select with checkmarks) — state-based for auto-close */}
                    {(() => {
                        const allTypeOptions = [{ key: '__private__', icon: '🔒', label: 'Prywatne' }, ...Object.entries(TASK_TYPE_CHECKLISTS).map(([k, v]) => ({ key: k, icon: v.icon, label: v.label }))];
                        const selectedLabels = allTypeOptions.filter(o => filterTypes.includes(o.key));
                        return (
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFilterTypesOpen(p => !p);
                                        setFilterAssigneeOpen(false);
                                    }}
                                    style={{
                                        padding: '0.4rem 0.5rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${filterTypes.length > 0 ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                        borderRadius: '0.5rem',
                                        color: filterTypes.length > 0 ? '#c084fc' : 'rgba(255,255,255,0.5)',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                                    }}
                                >
                                    {filterTypes.length > 0
                                        ? `Typ: ${selectedLabels.map(l => l.label).join(', ')}`
                                        : 'Typ: Wszystkie'}
                                    <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>▾</span>
                                </button>
                                {filterTypesOpen && (
                                    <div
                                        style={{
                                            position: 'absolute', top: '100%', left: 0, zIndex: 50,
                                            marginTop: '0.25rem', minWidth: '180px',
                                            background: '#1a1a2e', border: '1px solid rgba(168,85,247,0.2)',
                                            borderRadius: '0.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                            overflow: 'hidden',
                                        }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {allTypeOptions.map(item => {
                                            const checked = filterTypes.includes(item.key);
                                            return (
                                                <button
                                                    key={item.key}
                                                    onClick={() => setFilterTypes(prev => checked ? prev.filter(x => x !== item.key) : [...prev, item.key])}
                                                    style={{
                                                        width: '100%', padding: '0.5rem 0.75rem',
                                                        background: checked ? 'rgba(168,85,247,0.1)' : 'transparent',
                                                        border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                        color: checked ? '#c084fc' : 'rgba(255,255,255,0.6)',
                                                        fontSize: '0.78rem', cursor: 'pointer', textAlign: 'left',
                                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                    }}
                                                    onMouseEnter={e => { if (!checked) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = checked ? 'rgba(168,85,247,0.1)' : 'transparent'; }}
                                                >
                                                    <span style={{ width: '1.1rem', textAlign: 'center', fontSize: '0.7rem' }}>{checked ? '✓' : ''}</span>
                                                    <span>{item.icon} {item.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    {/* Priority filter — custom dropdown (Firefox-compatible) */}
                    <button
                        onClick={() => {
                            const priorities = ['', 'urgent', 'normal', 'low'];
                            const currentIdx = priorities.indexOf(filterPriority);
                            setFilterPriority(priorities[(currentIdx + 1) % priorities.length]);
                        }}
                        style={{
                            padding: '0.4rem 0.5rem',
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${filterPriority ? `${getPriorityColor(filterPriority)}44` : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '0.5rem',
                            color: filterPriority ? getPriorityColor(filterPriority) : 'rgba(255,255,255,0.5)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {filterPriority === 'urgent' ? '⚡ Pilne' : filterPriority === 'normal' ? 'Normalny' : filterPriority === 'low' ? 'Niski' : 'Priorytet: Wszystkie'}
                    </button>
                    {(taskSearchQuery || filterAssignee || filterTypes.length > 0 || filterPriority) && (
                        <button
                            onClick={() => { setTaskSearchQuery(''); setFilterAssignee(''); setFilterTypes([]); setFilterPriority(''); }}
                            style={{ padding: '0.35rem 0.6rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer' }}
                        >
                            ✕ Wyczyść
                        </button>
                    )}
                </div>

                {/* Status filter bar */}
                <div style={{
                    display: 'flex',
                    gap: '0.4rem',
                    marginBottom: '1.25rem',
                    flexWrap: 'wrap',
                }}>
                    {(['all', 'todo', 'in_progress', 'done'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setTaskFilter(f)}
                            style={{
                                background: taskFilter === f ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${taskFilter === f ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: '0.5rem',
                                padding: '0.4rem 0.85rem',
                                color: taskFilter === f ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: taskFilter === f ? '600' : '400',
                            }}
                        >
                            {f === 'all' ? `Wszystkie (${tasks.filter(t => t.status !== 'archived').length})` : `${getStatusLabel(f)} (${tasks.filter(t => t.status === f).length})`}
                        </button>
                    ))}
                    <button
                        onClick={() => setTaskFilter('archived')}
                        style={{
                            background: taskFilter === 'archived' ? 'rgba(107,114,128,0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${taskFilter === 'archived' ? 'rgba(107,114,128,0.4)' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '0.5rem',
                            padding: '0.4rem 0.85rem',
                            color: taskFilter === 'archived' ? '#9ca3af' : 'rgba(255,255,255,0.4)',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            fontWeight: taskFilter === 'archived' ? '600' : '400',
                            marginLeft: 'auto',
                        }}
                    >
                        📁 Archiwum ({tasks.filter(t => t.status === 'archived').length})
                    </button>
                </div>

                {/* ═══ LIST VIEW ═══ */}
                {taskViewMode === 'list' && (<>
                    {tasksLoading ? (
                        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                border: '3px solid rgba(56, 189, 248, 0.2)',
                                borderTop: '3px solid #38bdf8',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                                margin: '0 auto 1rem',
                            }} />
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Ładowanie zadań...</p>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(56, 189, 248, 0.12)',
                            borderRadius: '1rem',
                            padding: '3rem 2rem',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📋</div>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                {taskFilter === 'all' ? 'Brak zadań. Dodaj pierwsze zadanie!' : `Brak zadań w kategorii "${getStatusLabel(taskFilter)}"`}
                            </p>
                            {taskFilter === 'all' && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>Możesz też utworzyć zadanie z poziomu grafiku — kliknij w wizytę pacjenta</p>}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {filteredTasks.map(task => {
                                const mine = isMyTask(task);
                                return (
                                    <div key={task.id} style={{
                                        background: mine ? 'rgba(56, 189, 248, 0.04)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${task.status === 'done' ? 'rgba(34, 197, 94, 0.15)' : mine ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.08)'}`,
                                        borderLeft: `3px solid ${mine ? '#38bdf8' : getTaskTypeColor(task.task_type)}`,
                                        borderRadius: '0.75rem',
                                        overflow: 'hidden',
                                        opacity: task.status === 'done' ? 0.7 : 1,
                                    }}>
                                        {/* Task card main row */}
                                        <div
                                            style={{
                                                padding: '0.85rem 1rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => {
                                                setSelectedViewTask(task);
                                                setTaskHistoryExpanded(false);
                                                setTaskHistory([]);
                                                setTaskHistoryLoading(true);
                                                fetch(`/api/employee/tasks/${task.id}?history=true`)
                                                    .then(r => r.json())
                                                    .then(d => setTaskHistory(d.history || []))
                                                    .catch(() => setTaskHistory([]))
                                                    .finally(() => setTaskHistoryLoading(false));
                                                fetchComments(task.id);
                                            }}
                                        >
                                            {/* Status button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUpdateStatus(task.id, getNextStatus(task.status));
                                                }}
                                                title={`Zmień na: ${getStatusLabel(getNextStatus(task.status))}`}
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    border: `2px solid ${getStatusColor(task.status)}`,
                                                    background: task.status === 'done' ? getStatusColor(task.status) : 'transparent',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    color: '#fff',
                                                    fontSize: '0.7rem',
                                                }}
                                            >
                                                {task.status === 'done' && '✓'}
                                                {task.status === 'in_progress' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: getStatusColor(task.status) }} />}
                                            </button>

                                            {/* Title + meta */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    color: '#fff',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '500',
                                                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}>
                                                    {task.title}
                                                    {mine && <span style={{ marginLeft: '0.4rem', fontSize: '0.6rem', background: 'rgba(56,189,248,0.2)', color: '#38bdf8', padding: '0.1rem 0.35rem', borderRadius: '0.25rem', fontWeight: '600', verticalAlign: 'middle' }}>Twoje</span>}
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                                                    {task.patient_name && (
                                                        <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>👤 {task.patient_name}</span>
                                                    )}
                                                    {(task.assigned_to || []).length > 0 && (
                                                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                                                            {task.assigned_to.map((a, i) => (
                                                                <span key={i} style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>→ {a.name}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {!(task.assigned_to || []).length && task.assigned_to_doctor_name && (
                                                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>→ {task.assigned_to_doctor_name}</span>
                                                    )}
                                                    {task.checklist_items && task.checklist_items.length > 0 && (
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            color: task.checklist_items.every(ci => ci.done) ? '#22c55e' : 'rgba(255,255,255,0.4)',
                                                            background: task.checklist_items.every(ci => ci.done) ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                                                            padding: '0.1rem 0.35rem',
                                                            borderRadius: '0.25rem',
                                                        }}>
                                                            ☑ {task.checklist_items.filter(ci => ci.done).length}/{task.checklist_items.length}
                                                        </span>
                                                    )}
                                                    {task.due_date && (
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            color: new Date(task.due_date) < new Date() && task.status !== 'done' ? '#ef4444' : 'rgba(255,255,255,0.4)',
                                                        }}>
                                                            📅 {new Date(task.due_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Priority badge */}
                                            {task.priority !== 'normal' && (
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    fontWeight: '600',
                                                    padding: '0.15rem 0.45rem',
                                                    borderRadius: '0.3rem',
                                                    background: `${getPriorityColor(task.priority)}22`,
                                                    color: getPriorityColor(task.priority),
                                                    border: `1px solid ${getPriorityColor(task.priority)}44`,
                                                    flexShrink: 0,
                                                }}>
                                                    {task.priority === 'urgent' && '⚡ '}{getPriorityLabel(task.priority)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Expanded details */}
                                        {expandedTaskId === task.id && (
                                            <div style={{
                                                padding: '0 1rem 0.85rem',
                                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                                paddingTop: '0.75rem',
                                            }}>
                                                {task.description && (
                                                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                                                        {task.description}
                                                    </p>
                                                )}

                                                {/* Checklist */}
                                                {task.checklist_items && task.checklist_items.length > 0 && (
                                                    <div style={{
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '0.5rem',
                                                        padding: '0.6rem 0.75rem',
                                                        marginBottom: '0.5rem',
                                                    }}>
                                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                                                            <span>Checklist {task.task_type && TASK_TYPE_CHECKLISTS[task.task_type] ? `— ${TASK_TYPE_CHECKLISTS[task.task_type].icon} ${TASK_TYPE_CHECKLISTS[task.task_type].label}` : ''}</span>
                                                            <span>{task.checklist_items.filter(ci => ci.done).length}/{task.checklist_items.length} ✓</span>
                                                        </div>
                                                        {/* Progress bar */}
                                                        <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', marginBottom: '0.4rem', overflow: 'hidden' }}>
                                                            <div style={{
                                                                width: `${(task.checklist_items.filter(ci => ci.done).length / task.checklist_items.length) * 100}%`,
                                                                height: '100%',
                                                                background: task.checklist_items.every(ci => ci.done) ? '#22c55e' : '#38bdf8',
                                                                borderRadius: '2px',
                                                                transition: 'width 0.3s',
                                                            }} />
                                                        </div>
                                                        {task.checklist_items.map((ci, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={(e) => { e.stopPropagation(); handleToggleChecklist(task.id, idx); }}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.5rem',
                                                                    width: '100%',
                                                                    padding: '0.3rem 0.15rem',
                                                                    border: 'none',
                                                                    background: 'transparent',
                                                                    cursor: 'pointer',
                                                                    textAlign: 'left',
                                                                    transition: 'all 0.15s',
                                                                }}
                                                            >
                                                                <span style={{
                                                                    width: '18px',
                                                                    height: '18px',
                                                                    borderRadius: '4px',
                                                                    border: ci.done ? '2px solid #22c55e' : '2px solid rgba(255,255,255,0.2)',
                                                                    background: ci.done ? 'rgba(34,197,94,0.15)' : 'transparent',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    flexShrink: 0,
                                                                    fontSize: '0.65rem',
                                                                    color: '#22c55e',
                                                                }}>
                                                                    {ci.done && '✓'}
                                                                </span>
                                                                <span style={{
                                                                    fontSize: '0.8rem',
                                                                    color: ci.done ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.7)',
                                                                    textDecoration: ci.done ? 'line-through' : 'none',
                                                                }}>
                                                                    {ci.label}
                                                                </span>
                                                                {ci.done && ci.checked_by_name && (
                                                                    <span style={{
                                                                        fontSize: '0.6rem',
                                                                        color: 'rgba(34,197,94,0.6)',
                                                                        marginLeft: '0.3rem',
                                                                        fontStyle: 'italic',
                                                                    }}>
                                                                        ({ci.checked_by_name})
                                                                    </span>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Task image */}
                                                {task.image_url && (
                                                    <div style={{ marginBottom: '0.5rem' }}>
                                                        <img
                                                            src={task.image_url}
                                                            alt="Zdjęcie zadania"
                                                            onClick={(e) => { e.stopPropagation(); setZoomedImage(task.image_url); }}
                                                            style={{
                                                                maxWidth: '100%',
                                                                maxHeight: '200px',
                                                                borderRadius: '0.5rem',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                cursor: 'zoom-in',
                                                                objectFit: 'cover',
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                {task.linked_appointment_info && (
                                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
                                                        🔗 Powiązana wizyta: {task.linked_appointment_info}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                    {/* Status change buttons */}
                                                    {(['todo', 'in_progress', 'done'] as const).map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => handleUpdateStatus(task.id, s)}
                                                            style={{
                                                                padding: '0.25rem 0.6rem',
                                                                fontSize: '0.7rem',
                                                                borderRadius: '0.35rem',
                                                                border: `1px solid ${getStatusColor(s)}44`,
                                                                background: task.status === s ? `${getStatusColor(s)}22` : 'transparent',
                                                                color: task.status === s ? getStatusColor(s) : 'rgba(255,255,255,0.4)',
                                                                cursor: 'pointer',
                                                                fontWeight: task.status === s ? '600' : '400',
                                                            }}
                                                        >
                                                            {getStatusLabel(s)}
                                                        </button>
                                                    ))}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                                                        style={{
                                                            padding: '0.25rem 0.6rem',
                                                            fontSize: '0.7rem',
                                                            borderRadius: '0.35rem',
                                                            border: '1px solid rgba(56,189,248,0.3)',
                                                            background: 'transparent',
                                                            color: '#38bdf8',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem',
                                                        }}
                                                    >
                                                        ✏️ Edytuj
                                                    </button>
                                                    {/* Manual push trigger */}
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const btn = e.currentTarget;
                                                            btn.disabled = true;
                                                            btn.textContent = '🔔 …';
                                                            try {
                                                                const res = await fetch(`/api/employee/tasks/${task.id}/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
                                                                const data = await res.json();
                                                                btn.textContent = data.sent > 0 ? `✓ ${data.sent} push` : '○ 0 (brak sub.)';
                                                                btn.style.color = data.sent > 0 ? '#22c55e' : '#9ca3af';
                                                                btn.style.borderColor = data.sent > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(107,114,128,0.3)';
                                                            } catch {
                                                                btn.textContent = '✗ błąd';
                                                                btn.style.color = '#ef4444';
                                                            } finally {
                                                                setTimeout(() => {
                                                                    btn.disabled = false;
                                                                    btn.textContent = '🔔 Push';
                                                                    btn.style.color = '#fb923c';
                                                                    btn.style.borderColor = 'rgba(251,146,60,0.3)';
                                                                }, 3000);
                                                            }
                                                        }}
                                                        title="Wyślij powiadomienie push o tym zadaniu"
                                                        style={{
                                                            padding: '0.25rem 0.6rem',
                                                            fontSize: '0.7rem',
                                                            borderRadius: '0.35rem',
                                                            border: '1px solid rgba(251,146,60,0.3)',
                                                            background: 'transparent',
                                                            color: '#fb923c',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem',
                                                        }}
                                                    >
                                                        🔔 Push
                                                    </button>

                                                    {task.status !== 'archived' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, 'archived'); }}
                                                            style={{
                                                                padding: '0.25rem 0.6rem',
                                                                fontSize: '0.7rem',
                                                                borderRadius: '0.35rem',
                                                                border: '1px solid rgba(107,114,128,0.3)',
                                                                background: 'transparent',
                                                                color: '#9ca3af',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.25rem',
                                                            }}
                                                        >
                                                            📁 Archiwizuj
                                                        </button>
                                                    )}
                                                    {task.status === 'archived' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, 'done'); }}
                                                            style={{
                                                                padding: '0.25rem 0.6rem',
                                                                fontSize: '0.7rem',
                                                                borderRadius: '0.35rem',
                                                                border: '1px solid rgba(34,197,94,0.3)',
                                                                background: 'transparent',
                                                                color: '#22c55e',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.25rem',
                                                            }}
                                                        >
                                                            ↩️ Przywróć
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => handleDeleteTask(task.id)}
                                                            style={{
                                                                padding: '0.25rem 0.6rem',
                                                                fontSize: '0.7rem',
                                                                borderRadius: '0.35rem',
                                                                border: '1px solid rgba(239,68,68,0.3)',
                                                                background: 'transparent',
                                                                color: '#ef4444',
                                                                cursor: 'pointer',
                                                                marginLeft: 'auto',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.25rem',
                                                            }}
                                                        >
                                                            <Trash2 size={12} /> Usuń
                                                        </button>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.5rem' }}>
                                                    Utworzone przez {(() => {
                                                        const match = staffList.find(s => s.email === task.created_by_email);
                                                        return match ? match.name : task.created_by_email;
                                                    })()} • {new Date(task.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </div>

                                                {/* 💬 Comments */}
                                                <div style={{ marginTop: '0.5rem' }}>
                                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.3rem' }}>💬 Komentarze ({(taskComments[task.id] || []).length})</div>
                                                    {(taskComments[task.id] || []).map((c: any, ci: number) => (
                                                        <div key={ci} style={{ padding: '0.3rem 0', borderBottom: ci < (taskComments[task.id] || []).length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                                            <span style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: '600' }}>{c.author_name || c.author_email}</span>
                                                            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', marginLeft: '0.4rem' }}>{new Date(c.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.1rem' }}>{c.content}</div>
                                                        </div>
                                                    ))}
                                                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem' }}>
                                                        <input
                                                            type="text"
                                                            placeholder="Napisz komentarz..."
                                                            value={commentInput}
                                                            onChange={e => setCommentInput(e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Enter') handlePostComment(task.id); }}
                                                            onClick={e => e.stopPropagation()}
                                                            style={{ flex: 1, padding: '0.3rem 0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.35rem', color: '#fff', fontSize: '0.75rem', outline: 'none' }}
                                                        />
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handlePostComment(task.id); }}
                                                            disabled={commentLoading || !commentInput.trim()}
                                                            style={{ padding: '0.3rem 0.6rem', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '0.35rem', color: '#38bdf8', fontSize: '0.7rem', cursor: 'pointer' }}
                                                        >
                                                            {commentLoading ? '...' : '→'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* 📜 Edit history */}
                                                <div style={{ marginTop: '0.5rem' }}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setTaskHistoryExpanded(!taskHistoryExpanded); }}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'rgba(255,255,255,0.35)',
                                                            fontSize: '0.7rem',
                                                            cursor: 'pointer',
                                                            padding: '0.2rem 0',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.3rem',
                                                        }}
                                                    >
                                                        📜 Historia zmian {taskHistory.length > 0 ? `(${taskHistory.length})` : ''}
                                                        <span style={{ fontSize: '0.6rem' }}>{taskHistoryExpanded ? '▲' : '▼'}</span>
                                                    </button>
                                                    {taskHistoryExpanded && (
                                                        <div style={{
                                                            marginTop: '0.35rem',
                                                            background: 'rgba(255,255,255,0.02)',
                                                            border: '1px solid rgba(255,255,255,0.06)',
                                                            borderRadius: '0.5rem',
                                                            padding: '0.5rem',
                                                            maxHeight: '250px',
                                                            overflowY: 'auto',
                                                        }}>
                                                            {taskHistoryLoading ? (
                                                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '0.5rem' }}>Ładowanie...</div>
                                                            ) : taskHistory.length === 0 ? (
                                                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '0.5rem' }}>Brak historii zmian</div>
                                                            ) : (
                                                                taskHistory.map((h: any, idx: number) => {
                                                                    const changedByName = staffList.find(s => s.email === h.changed_by)?.name || h.changed_by;
                                                                    const dateStr = new Date(h.changed_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                                                                    const fieldLabels: Record<string, string> = {
                                                                        title: 'Tytuł', description: 'Opis', status: 'Status', priority: 'Priorytet',
                                                                        task_type: 'Typ', due_date: 'Termin', assigned_to_doctor_name: 'Przypisano do',
                                                                        image_url: 'Zdjęcie', assigned_to_doctor_id: 'Przypisano do (ID)',
                                                                    };
                                                                    const statusLabels: Record<string, string> = { todo: 'Do zrobienia', in_progress: 'W trakcie', done: 'Wykonane' };
                                                                    const priorityLabels: Record<string, string> = { low: 'Niski', normal: 'Normalny', urgent: 'Pilny' };

                                                                    return (
                                                                        <div key={idx} style={{
                                                                            padding: '0.35rem 0',
                                                                            borderBottom: idx < taskHistory.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                                                        }}>
                                                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.15rem' }}>
                                                                                {h.change_type === 'status' ? '🔄' : h.change_type === 'checklist' ? '☑️' : '✏️'}{' '}
                                                                                <strong>{changedByName}</strong> • {dateStr}
                                                                            </div>
                                                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)' }}>
                                                                                {Object.entries(h.changes || {}).map(([key, val]: [string, any]) => {
                                                                                    if (h.change_type === 'checklist') {
                                                                                        return (
                                                                                            <div key={key}>
                                                                                                {val.done ? '✅' : '⬜'} {val.item}
                                                                                            </div>
                                                                                        );
                                                                                    }
                                                                                    const label = fieldLabels[key] || key;
                                                                                    // Safely convert any value to a displayable string
                                                                                    const toStr = (v: any): string => {
                                                                                        if (v === null || v === undefined) return '—';
                                                                                        if (Array.isArray(v)) {
                                                                                            if (key === 'image_urls' || key === 'image_url') return v.length > 0 ? `📷 ×${v.length}` : '—';
                                                                                            return v.length > 0 ? `[${v.length} elem.]` : '—';
                                                                                        }
                                                                                        if (typeof v === 'object') return JSON.stringify(v).substring(0, 60);
                                                                                        return String(v) || '—';
                                                                                    };
                                                                                    let oldDisplay: string = toStr(val.old);
                                                                                    let newDisplay: string = toStr(val.new);
                                                                                    if (key === 'status') {
                                                                                        oldDisplay = statusLabels[val.old] || val.old || '—';
                                                                                        newDisplay = statusLabels[val.new] || val.new || '—';
                                                                                    } else if (key === 'priority') {
                                                                                        oldDisplay = priorityLabels[val.old] || val.old || '—';
                                                                                        newDisplay = priorityLabels[val.new] || val.new || '—';
                                                                                    } else if (key === 'image_url' || key === 'image_urls') {
                                                                                        oldDisplay = Array.isArray(val.old) ? (val.old.length > 0 ? `📷 ×${val.old.length}` : '—') : (val.old ? '📷' : '—');
                                                                                        newDisplay = Array.isArray(val.new) ? (val.new.length > 0 ? `📷 ×${val.new.length}` : '—') : (val.new ? '📷' : '—');
                                                                                    } else if (key === 'due_date') {
                                                                                        oldDisplay = val.old ? new Date(val.old).toLocaleDateString('pl-PL') : '—';
                                                                                        newDisplay = val.new ? new Date(val.new).toLocaleDateString('pl-PL') : '—';
                                                                                    }
                                                                                    // Skip internal IDs
                                                                                    if (key === 'assigned_to_doctor_id' || key === 'patient_id' || key === 'linked_appointment_info') return null;
                                                                                    return (
                                                                                        <div key={key}>
                                                                                            {label}: {oldDisplay} → {newDisplay}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>)}

                {/* ═══ KANBAN VIEW ═══ */}
                {taskViewMode === 'kanban' && (
                    <div style={{
                        /* Horizontal scroll container — columns scroll inside, NOT the whole page */
                        overflowX: 'auto',
                        overflowY: 'visible',
                        WebkitOverflowScrolling: 'touch' as any,
                        overscrollBehaviorX: 'contain' as any,
                        marginLeft: '-0.5rem',
                        marginRight: '-0.5rem',
                        paddingLeft: '0.5rem',
                        paddingRight: '0.5rem',
                        paddingBottom: '0.5rem',
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, minmax(240px, 1fr))',
                            gap: '0.75rem',
                            minHeight: '400px',
                            /* Keep inner grid as wide as needed to fit all columns */
                            minWidth: 'calc(3 * 240px + 2 * 0.75rem)',
                        }}>
                            {(['todo', 'in_progress', 'done'] as const).map((col, colIdx) => {
                                const colTasks = filteredTasks.filter(t => t.status === col);
                                const prevCol = colIdx > 0 ? (['todo', 'in_progress', 'done'] as const)[colIdx - 1] : null;
                                const nextCol = colIdx < 2 ? (['todo', 'in_progress', 'done'] as const)[colIdx + 1] : null;
                                return (
                                    <div
                                        key={col}
                                        onDragOver={(e) => handleDragOver(e, col)}
                                        onDragLeave={() => setDragOverColumn(null)}
                                        onDrop={() => handleDrop(col)}
                                        style={{
                                            background: dragOverColumn === col ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${dragOverColumn === col ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                            borderRadius: '0.75rem',
                                            padding: '0.75rem',
                                            transition: 'all 0.2s',
                                            minWidth: '240px',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: getStatusColor(col) }} />
                                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: getStatusColor(col) }}>{getStatusLabel(col)}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>({colTasks.length})</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minHeight: '60px' }}>
                                            {colTasks.map(task => (
                                                <div
                                                    key={task.id}
                                                    draggable
                                                    onDragStart={() => handleDragStart(task.id)}
                                                    onDragEnd={handleDragEnd}
                                                    onClick={(e) => {
                                                        // Only open if not dragging
                                                        if (draggedTaskId) return;
                                                        setSelectedViewTask(task);
                                                        setTaskHistoryExpanded(false);
                                                        setTaskHistory([]);
                                                        setTaskHistoryLoading(true);
                                                        fetch(`/api/employee/tasks/${task.id}?history=true`)
                                                            .then(r => r.json())
                                                            .then(d => setTaskHistory(d.history || []))
                                                            .catch(() => setTaskHistory([]))
                                                            .finally(() => setTaskHistoryLoading(false));
                                                        fetchComments(task.id);
                                                    }}
                                                    style={{
                                                        background: draggedTaskId === task.id ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.04)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderLeft: `3px solid ${getTaskTypeColor(task.task_type)}`,
                                                        borderRadius: '0.5rem',
                                                        padding: '0.6rem 0.75rem',
                                                        cursor: draggedTaskId ? 'grabbing' : 'pointer',
                                                        opacity: draggedTaskId === task.id ? 0.5 : 1,
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    <div style={{ fontSize: '0.8rem', fontWeight: '500', color: '#fff', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {task.priority === 'urgent' && <span style={{ color: '#ef4444', marginRight: '0.3rem' }}>⚡</span>}
                                                        {task.task_type && TASK_TYPE_CHECKLISTS[task.task_type] && <span style={{ marginRight: '0.3rem' }}>{TASK_TYPE_CHECKLISTS[task.task_type].icon}</span>}
                                                        {task.title}
                                                    </div>
                                                    {task.patient_name && <div style={{ fontSize: '0.6rem', color: '#38bdf8', marginBottom: '0.15rem' }}>👤 {task.patient_name}</div>}
                                                    {task.due_date && (
                                                        <div style={{ fontSize: '0.6rem', color: new Date(task.due_date) < new Date() ? '#ef4444' : 'rgba(255,255,255,0.4)' }}>
                                                            📅 {new Date(task.due_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                                                        </div>
                                                    )}
                                                    {task.checklist_items && task.checklist_items.length > 0 && (
                                                        <div style={{ marginTop: '0.3rem' }}>
                                                            <div style={{ height: '2px', background: 'rgba(255,255,255,0.08)', borderRadius: '1px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${(task.checklist_items.filter(ci => ci.done).length / task.checklist_items.length) * 100}%`, height: '100%', background: task.checklist_items.every(ci => ci.done) ? '#22c55e' : '#38bdf8' }} />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* ← → arrows + edit button */}
                                                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.4rem' }}>
                                                        {prevCol && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, prevCol); }}
                                                                title={`Przenieś do: ${getStatusLabel(prevCol)}`}
                                                                style={{ flex: 1, padding: '0.2rem', fontSize: '0.6rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.3rem', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                                                            >
                                                                ← {getStatusLabel(prevCol)}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                                                            title="Edytuj zadanie"
                                                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.6rem', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '0.3rem', color: '#38bdf8', cursor: 'pointer' }}
                                                        >
                                                            ✏️
                                                        </button>
                                                        {nextCol && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, nextCol); }}
                                                                title={`Przenieś do: ${getStatusLabel(nextCol)}`}
                                                                style={{ flex: 1, padding: '0.2rem', fontSize: '0.6rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.3rem', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                                                            >
                                                                {getStatusLabel(nextCol)} →
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {colTasks.length === 0 && (
                                                <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', fontStyle: 'italic' }}>
                                                    Brak zadań
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}


                {/* ═══ CALENDAR VIEW ═══ */}
                {taskViewMode === 'calendar' && (
                    <div>
                        {/* Month navigation */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <button
                                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.4rem 0.6rem', color: '#fff', cursor: 'pointer' }}
                            >
                                ←
                            </button>
                            <span style={{ fontSize: '1rem', fontWeight: '600', minWidth: '180px', textAlign: 'center' }}>
                                {calendarMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.4rem 0.6rem', color: '#fff', cursor: 'pointer' }}
                            >
                                →
                            </button>
                        </div>
                        {/* Day headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                            {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map(d => (
                                <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', padding: '0.3rem' }}>{d}</div>
                            ))}
                        </div>
                        {/* Calendar grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                            {getCalendarDays.map((day, idx) => {
                                if (day === null) return <div key={`empty-${idx}`} />;
                                const dayTasks = tasksForDate(day);
                                const isToday = new Date().getDate() === day && new Date().getMonth() === calendarMonth.getMonth() && new Date().getFullYear() === calendarMonth.getFullYear();
                                return (
                                    <div key={day} style={{
                                        minHeight: '70px',
                                        background: isToday ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${isToday ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.05)'}`,
                                        borderRadius: '0.35rem',
                                        padding: '0.25rem',
                                    }}>
                                        <div style={{ fontSize: '0.7rem', color: isToday ? '#38bdf8' : 'rgba(255,255,255,0.5)', fontWeight: isToday ? '700' : '400', marginBottom: '0.15rem' }}>{day}</div>
                                        {/* Pulsing task count badge */}
                                        {dayTasks.length > 0 && (
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCalendarDayPopup({ day, tasks: dayTasks });
                                                }}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    minWidth: '22px',
                                                    height: '22px',
                                                    borderRadius: '50%',
                                                    background: dayTasks.some(t => t.priority === 'urgent') ? 'rgba(239,68,68,0.8)' : 'rgba(56,189,248,0.8)',
                                                    color: '#fff',
                                                    fontSize: '0.65rem',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    animation: 'calPulse 2s ease-in-out infinite',
                                                    boxShadow: dayTasks.some(t => t.priority === 'urgent')
                                                        ? '0 0 0 0 rgba(239,68,68,0.4)'
                                                        : '0 0 0 0 rgba(56,189,248,0.4)',
                                                    padding: '0 4px',
                                                }}
                                            >
                                                {dayTasks.length}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ NEW TASK MODAL ═══ */}
            {
                showTaskModal && (
                    <div
                        onClick={() => { setShowTaskModal(false); resetTaskForm(); }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.7)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 3000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem',
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(135deg, #0d1b2a 0%, #1b2838 100%)',
                                border: '1px solid rgba(56, 189, 248, 0.2)',
                                borderRadius: '1rem',
                                width: '100%',
                                maxWidth: '550px',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{
                                padding: '1.25rem 1.5rem',
                                borderBottom: '1px solid rgba(56,189,248,0.15)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#fff' }}>
                                    ✅ Nowe zadanie
                                </h3>
                                <button
                                    onClick={() => { setShowTaskModal(false); resetTaskForm(); }}
                                    style={{
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: '0.5rem',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontSize: '1.1rem',
                                        cursor: 'pointer',
                                    }}
                                >✕</button>
                            </div>

                            {/* Modal Body */}
                            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Patient info banner */}
                                {taskModalPrefill?.patientName && (
                                    <div style={{
                                        background: 'rgba(56, 189, 248, 0.08)',
                                        border: '1px solid rgba(56, 189, 248, 0.2)',
                                        borderRadius: '0.5rem',
                                        padding: '0.6rem 0.85rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.8rem',
                                        color: '#38bdf8',
                                    }}>
                                        <User size={14} />
                                        <span style={{ fontWeight: '600' }}>{taskModalPrefill.patientName}</span>
                                        {taskModalPrefill.appointmentType && (
                                            <span style={{ color: 'rgba(255,255,255,0.4)' }}>• {taskModalPrefill.appointmentType}</span>
                                        )}
                                    </div>
                                )}
                                {/* Task Type Selector */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', display: 'block' }}>Typ zadania</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                        {Object.entries(TASK_TYPE_CHECKLISTS).map(([key, val]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => {
                                                    const items = val.items.map(label => ({ label, done: false }));
                                                    setTaskForm(p => ({ ...p, task_type: key, checklist_items: items }));
                                                }}
                                                style={{
                                                    padding: '0.4rem 0.75rem',
                                                    fontSize: '0.78rem',
                                                    borderRadius: '0.5rem',
                                                    border: taskForm.task_type === key
                                                        ? '1px solid rgba(56,189,248,0.5)'
                                                        : '1px solid rgba(255,255,255,0.1)',
                                                    background: taskForm.task_type === key
                                                        ? 'rgba(56,189,248,0.15)'
                                                        : 'rgba(255,255,255,0.04)',
                                                    color: taskForm.task_type === key ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                                                    cursor: 'pointer',
                                                    fontWeight: taskForm.task_type === key ? '600' : '400',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                {val.icon} {val.label}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Checklist preview */}
                                    {taskForm.checklist_items.length > 0 && (
                                        <div style={{
                                            marginTop: '0.6rem',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '0.5rem',
                                            padding: '0.6rem 0.85rem',
                                        }}>
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>Checklist ({taskForm.checklist_items.length} kroków)</div>
                                            {taskForm.checklist_items.map((item, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.15rem 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.25)' }}>☐</span> {item.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Patient search (only when no prefill from schedule) */}
                                {!taskModalPrefill?.patientId && (
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', display: 'block' }}>👤 Pacjent (wyszukaj z bazy)</label>
                                        {taskForm.patient_id ? (
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
                                                borderRadius: '0.5rem', padding: '0.5rem 0.85rem',
                                            }}>
                                                <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: '600', flex: 1 }}>👤 {taskForm.patient_name}</span>
                                                <button type="button" onClick={() => { setTaskForm(p => ({ ...p, patient_id: '', patient_name: '' })); setPatientSearchQuery(''); setPatientSearchResults([]); }}
                                                    style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                                            </div>
                                        ) : (
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    value={patientSearchQuery}
                                                    onChange={e => { setPatientSearchQuery(e.target.value); searchPatients(e.target.value, 'create'); }}
                                                    placeholder="Wpisz imię lub nazwisko pacjenta..."
                                                    style={{
                                                        width: '100%', background: 'rgba(255,255,255,0.06)',
                                                        border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.5rem',
                                                        padding: '0.6rem 0.85rem', color: '#fff', fontSize: '0.85rem',
                                                        outline: 'none', boxSizing: 'border-box',
                                                    }}
                                                />
                                                {patientSearchLoading && <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Szukam...</div>}
                                                {patientSearchResults.length > 0 && (
                                                    <div style={{
                                                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                                                        background: '#1b2838', border: '1px solid rgba(56,189,248,0.2)',
                                                        borderRadius: '0 0 0.5rem 0.5rem', maxHeight: '180px', overflowY: 'auto',
                                                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                                    }}>
                                                        {patientSearchResults.map(p => (
                                                            <button key={p.id} type="button"
                                                                onClick={() => {
                                                                    setTaskForm(prev => ({ ...prev, patient_id: p.id, patient_name: p.fullName }));
                                                                    setPatientSearchQuery('');
                                                                    setPatientSearchResults([]);
                                                                }}
                                                                style={{
                                                                    width: '100%', padding: '0.5rem 0.85rem', background: 'transparent',
                                                                    border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                                    color: '#fff', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left',
                                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                }}
                                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.1)')}
                                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                            >
                                                                <span style={{ fontWeight: '600' }}>{p.fullName}</span>
                                                                {p.phone && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>📱 {p.phone}</span>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Privacy toggle */}
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setTaskForm(p => ({ ...p, is_private: !p.is_private }))}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.5rem 0.85rem',
                                            borderRadius: '0.5rem',
                                            border: taskForm.is_private
                                                ? '1px solid rgba(168,85,247,0.5)'
                                                : '1px solid rgba(255,255,255,0.1)',
                                            background: taskForm.is_private
                                                ? 'rgba(168,85,247,0.15)'
                                                : 'rgba(255,255,255,0.04)',
                                            color: taskForm.is_private ? '#c084fc' : 'rgba(255,255,255,0.45)',
                                            fontSize: '0.82rem',
                                            cursor: 'pointer',
                                            fontWeight: taskForm.is_private ? '600' : '400',
                                            transition: 'all 0.15s',
                                            width: '100%',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {taskForm.is_private ? '🔒 Zadanie prywatne (tylko dla Ciebie)' : '🌐 Zadanie widoczne dla wszystkich'}
                                    </button>
                                </div>

                                {/* Title */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', display: 'block' }}>Tytuł *</label>
                                    <input
                                        value={taskForm.title}
                                        onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
                                        placeholder="np. Korona porcelanowa — Jan Kowalski"
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            borderRadius: '0.5rem',
                                            padding: '0.6rem 0.85rem',
                                            color: '#fff',
                                            fontSize: '0.85rem',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', display: 'block' }}>Opis</label>
                                    <textarea
                                        value={taskForm.description}
                                        onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Szczegóły zadania..."
                                        rows={3}
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            borderRadius: '0.5rem',
                                            padding: '0.6rem 0.85rem',
                                            color: '#fff',
                                            fontSize: '0.85rem',
                                            outline: 'none',
                                            resize: 'vertical',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>

                                {/* Priority + Assignee row */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', display: 'block' }}>Priorytet</label>
                                        <select
                                            value={taskForm.priority}
                                            onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value as any }))}
                                            style={{
                                                width: '100%',
                                                background: 'rgba(255,255,255,0.06)',
                                                border: '1px solid rgba(255,255,255,0.12)',
                                                borderRadius: '0.5rem',
                                                padding: '0.6rem 0.85rem',
                                                color: '#fff',
                                                fontSize: '0.85rem',
                                                outline: 'none',
                                            }}
                                        >
                                            <option value="low" style={{ background: '#1b2838' }}>🔵 Niski</option>
                                            <option value="normal" style={{ background: '#1b2838' }}>⚪ Normalny</option>
                                            <option value="urgent" style={{ background: '#1b2838' }}>🔴 Pilne</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', display: 'block' }}>Przypisz do (wielu)</label>
                                        {/* Selected chips */}
                                        {taskForm.assigned_to.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.4rem' }}>
                                                {taskForm.assigned_to.map((a, i) => (
                                                    <span key={i} style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                        background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)',
                                                        borderRadius: '1rem', padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#38bdf8',
                                                    }}>
                                                        {a.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => setTaskForm(p => ({ ...p, assigned_to: p.assigned_to.filter((_, idx) => idx !== i) }))}
                                                            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.7rem', padding: 0, lineHeight: 1 }}
                                                        >✕</button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {/* Dropdown to add */}
                                        <select
                                            value=""
                                            onChange={e => {
                                                const s = staffList.find(s => s.id === e.target.value);
                                                if (s && !taskForm.assigned_to.some(a => a.id === s.id)) {
                                                    setTaskForm(p => ({ ...p, assigned_to: [...p.assigned_to, { id: s.id, name: s.name }] }));
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                background: 'rgba(255,255,255,0.06)',
                                                border: '1px solid rgba(255,255,255,0.12)',
                                                borderRadius: '0.5rem',
                                                padding: '0.6rem 0.85rem',
                                                color: '#fff',
                                                fontSize: '0.85rem',
                                                outline: 'none',
                                            }}
                                        >
                                            <option value="" style={{ background: '#1b2838' }}>+ Dodaj pracownika...</option>
                                            {staffList.filter(s => !taskForm.assigned_to.some(a => a.id === s.id)).map(s => (
                                                <option key={s.id} value={s.id} style={{ background: '#1b2838' }}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Future appointments for due date */}
                            {taskModalPrefill?.patientId && (
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', display: 'block' }}>
                                        📅 Przyszłe wizyty pacjenta — termin realizacji
                                    </label>
                                    {futureAptsLoading ? (
                                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', padding: '0.5rem 0' }}>Szukam wizyt...</div>
                                    ) : futureAppointments.length === 0 ? (
                                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', padding: '0.5rem 0' }}>Brak zaplanowanych wizyt</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            {futureAppointments.map(apt => {
                                                const d = new Date(apt.date);
                                                const isSelected = taskForm.linked_appointment_date === d.toISOString();
                                                return (
                                                    <button
                                                        key={apt.id}
                                                        onClick={() => selectFutureAppointment(apt)}
                                                        style={{
                                                            background: isSelected ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
                                                            border: `1px solid ${isSelected ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                                            borderRadius: '0.5rem',
                                                            padding: '0.5rem 0.75rem',
                                                            textAlign: 'left',
                                                            cursor: 'pointer',
                                                            color: isSelected ? '#38bdf8' : 'rgba(255,255,255,0.7)',
                                                            fontSize: '0.8rem',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                        }}
                                                    >
                                                        <span>
                                                            {d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}{' '}
                                                            {d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                                            <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: '0.5rem' }}>
                                                                {apt.appointmentType}{apt.doctor?.name ? ` • ${apt.doctor.name}` : ''}
                                                            </span>
                                                        </span>
                                                        {isSelected && <span style={{ fontWeight: '600' }}>✓</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Manual due date */}
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', display: 'block' }}>
                                    {taskModalPrefill?.patientId ? 'Lub wybierz datę ręcznie' : 'Termin realizacji'}
                                </label>
                                <input
                                    type="date"
                                    value={taskForm.due_date}
                                    onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value, linked_appointment_date: '', linked_appointment_info: '' }))}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '0.5rem',
                                        padding: '0.6rem 0.85rem',
                                        color: '#fff',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            {/* Multi-photo upload */}
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', display: 'block' }}>📸 Zdjęcia (opcjonalnie, maks. 5 — kompresja auto)</label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {(taskForm.image_urls || []).map((url, idx) => (
                                        <div key={idx} style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                                            <img src={url} alt="" onClick={() => setZoomedImage(url)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.12)', cursor: 'zoom-in' }} />
                                            <button onClick={() => setTaskForm(p => { const urls = (p.image_urls || []).filter((_, i) => i !== idx); return { ...p, image_urls: urls, image_url: urls[0] || '' }; })} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.8)', border: 'none', color: '#fff', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: '0.6rem', lineHeight: '18px', textAlign: 'center', padding: 0 }}>✕</button>
                                        </div>
                                    ))}
                                    {(taskForm.image_urls || []).length < 5 && (
                                        <label style={{ width: 72, height: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '0.4rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', textAlign: 'center', gap: '0.2rem', cursor: imageUploading ? 'wait' : 'pointer', opacity: imageUploading ? 0.5 : 1, flexShrink: 0 }}>
                                            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{imageUploading ? '⏳' : '📷'}</span>
                                            {imageUploading ? 'Przesyłanie...' : 'Dodaj zdjęcie'}
                                            <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={imageUploading}
                                                onChange={async (e) => { const files = Array.from(e.target.files || []); for (const f of files.slice(0, 5 - (taskForm.image_urls || []).length)) { await handleImageUpload(f, 'create'); } e.target.value = ''; }}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                onClick={handleCreateTask}
                                disabled={!taskForm.title.trim() || taskSaving}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: taskForm.title.trim() ? 'linear-gradient(135deg, #38bdf8, #0ea5e9)' : 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    color: '#fff',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    cursor: taskForm.title.trim() ? 'pointer' : 'not-allowed',
                                    opacity: taskSaving ? 0.7 : 1,
                                    marginTop: '0.25rem',
                                }}
                            >
                                {taskSaving ? 'Zapisywanie...' : 'Utwórz zadanie'}
                            </button>
                        </div>
                    </div>
                )
            }

            {/* ═══ CALENDAR PULSE ANIMATION ═══ */}
            <style>{`
                @keyframes calPulse {
                    0%   { box-shadow: 0 0 0 0 rgba(56,189,248,0.5); transform: scale(1); }
                    50%  { box-shadow: 0 0 0 5px rgba(56,189,248,0); transform: scale(1.08); }
                    100% { box-shadow: 0 0 0 0 rgba(56,189,248,0); transform: scale(1); }
                }
            `}</style>

            {/* ═══ CALENDAR DAY TASKS POPUP ═══ */}
            {
                calendarDayPopup && (
                    <div
                        onClick={() => setCalendarDayPopup(null)}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
                            zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '1rem',
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '1rem',
                                width: '100%',
                                maxWidth: '480px',
                                maxHeight: '80vh',
                                overflowY: 'auto',
                                padding: '1.25rem',
                                boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
                            }}
                        >
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>
                                        {calendarDayPopup.day} {calendarMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.1rem' }}>
                                        {calendarDayPopup.tasks.length} {calendarDayPopup.tasks.length === 1 ? 'zadanie' : calendarDayPopup.tasks.length < 5 ? 'zadania' : 'zadań'}
                                    </div>
                                </div>
                                <button onClick={() => setCalendarDayPopup(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.2rem', padding: '0' }}>✕</button>
                            </div>
                            {/* Task list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {calendarDayPopup.tasks.map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => {
                                            // Open task detail on top of this popup
                                            setSelectedViewTask(t);
                                            setTaskHistoryExpanded(false);
                                            setTaskHistory([]);
                                            setTaskHistoryLoading(true);
                                            fetch(`/api/employee/tasks/${t.id}?history=true`)
                                                .then(r => r.json())
                                                .then(d => setTaskHistory(d.history || []))
                                                .catch(() => setTaskHistory([]))
                                                .finally(() => setTaskHistoryLoading(false));
                                            fetchComments(t.id);
                                        }}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            background: 'rgba(255,255,255,0.04)',
                                            border: `1px solid rgba(255,255,255,0.08)`,
                                            borderLeft: `3px solid ${getStatusColor(t.status)}`,
                                            borderRadius: '0.6rem',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.07)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {t.priority === 'urgent' && <span style={{ color: '#ef4444', marginRight: '0.25rem' }}>⚡</span>}
                                                {t.is_private && <span style={{ color: '#a78bfa', marginRight: '0.25rem' }}>🔒</span>}
                                                {t.title}
                                            </span>
                                            <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '1rem', background: `${getStatusColor(t.status)}22`, color: getStatusColor(t.status), border: `1px solid ${getStatusColor(t.status)}44`, flexShrink: 0 }}>
                                                {getStatusLabel(t.status)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                                            {t.due_time && <span>⏰ {t.due_time}</span>}
                                            {t.patient_name && <span>👤 {t.patient_name}</span>}
                                            {t.task_type && <span>{t.task_type}</span>}
                                            {t.checklist_items && t.checklist_items.length > 0 && (
                                                <span>☑ {t.checklist_items.filter(ci => ci.done).length}/{t.checklist_items.length}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ═══ EDIT TASK MODAL ═══ */}
            {
                editingTask && (
                    <div
                        onClick={() => setEditingTask(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(6px)',
                            zIndex: 3100,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem',
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(165deg, #1a1a2e, #16213e)',
                                border: '1px solid rgba(56, 189, 248, 0.15)',
                                borderRadius: '1rem',
                                width: '100%',
                                maxWidth: '480px',
                                maxHeight: '85vh',
                                overflowY: 'auto',
                                padding: '1.5rem',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ color: '#fff', fontSize: '1.05rem', margin: 0 }}>✏️ Edytuj zadanie</h3>
                                <button onClick={() => setEditingTask(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {/* Title */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', display: 'block' }}>Tytuł</label>
                                    <input
                                        value={editForm.title || ''}
                                        onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.5rem', padding: '0.6rem 0.85rem', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', display: 'block' }}>Opis</label>
                                    <textarea
                                        value={editForm.description || ''}
                                        onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                                        rows={2}
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.5rem', padding: '0.6rem 0.85rem', color: '#fff', fontSize: '0.85rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                                    />
                                </div>

                                {/* Priority + Assignee row */}
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', display: 'block' }}>Priorytet</label>
                                        <select
                                            value={editForm.priority || 'normal'}
                                            onChange={e => setEditForm(p => ({ ...p, priority: e.target.value }))}
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.5rem', padding: '0.6rem 0.85rem', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                                        >
                                            <option value="low">Niski</option>
                                            <option value="normal">Normalny</option>
                                            <option value="urgent">Pilny</option>
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', display: 'block' }}>Przypisz do (wielu)</label>
                                        {/* Selected chips */}
                                        {(editForm.assigned_to || []).length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.4rem' }}>
                                                {(editForm.assigned_to || []).map((a: any, i: number) => (
                                                    <span key={i} style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                        background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)',
                                                        borderRadius: '1rem', padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#38bdf8',
                                                    }}>
                                                        {a.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditForm((p: any) => ({ ...p, assigned_to: (p.assigned_to || []).filter((_: any, idx: number) => idx !== i) }))}
                                                            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.7rem', padding: 0, lineHeight: 1 }}
                                                        >✕</button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <select
                                            value=""
                                            onChange={e => {
                                                const selectedStaff = staffList.find(s => s.id === e.target.value);
                                                if (selectedStaff && !(editForm.assigned_to || []).some((a: any) => a.id === selectedStaff.id)) {
                                                    setEditForm((p: any) => ({ ...p, assigned_to: [...(p.assigned_to || []), { id: selectedStaff.id, name: selectedStaff.name }] }));
                                                }
                                            }}
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.5rem', padding: '0.6rem 0.85rem', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                                        >
                                            <option value="">+ Dodaj pracownika...</option>
                                            {staffList.filter(s => !(editForm.assigned_to || []).some((a: any) => a.id === s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Patient search */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', display: 'block' }}>👤 Pacjent</label>
                                    {editForm.patient_id ? (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
                                            borderRadius: '0.5rem', padding: '0.5rem 0.85rem',
                                        }}>
                                            <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: '600', flex: 1 }}>👤 {editForm.patient_name}</span>
                                            <button type="button" onClick={() => { setEditForm((p: any) => ({ ...p, patient_id: '', patient_name: '' })); setEditPatientSearchQuery(''); setEditPatientSearchResults([]); }}
                                                style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                                        </div>
                                    ) : (
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                value={editPatientSearchQuery}
                                                onChange={e => { setEditPatientSearchQuery(e.target.value); searchPatients(e.target.value, 'edit'); }}
                                                placeholder="Wyszukaj pacjenta..."
                                                style={{
                                                    width: '100%', background: 'rgba(255,255,255,0.06)',
                                                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.5rem',
                                                    padding: '0.6rem 0.85rem', color: '#fff', fontSize: '0.85rem',
                                                    outline: 'none', boxSizing: 'border-box' as const,
                                                }}
                                            />
                                            {editPatientSearchLoading && <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Szukam...</div>}
                                            {editPatientSearchResults.length > 0 && (
                                                <div style={{
                                                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                                                    background: '#1a1a2e', border: '1px solid rgba(56,189,248,0.2)',
                                                    borderRadius: '0 0 0.5rem 0.5rem', maxHeight: '180px', overflowY: 'auto',
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                                }}>
                                                    {editPatientSearchResults.map(p => (
                                                        <button key={p.id} type="button"
                                                            onClick={() => {
                                                                setEditForm((prev: any) => ({ ...prev, patient_id: p.id, patient_name: p.fullName }));
                                                                setEditPatientSearchQuery('');
                                                                setEditPatientSearchResults([]);
                                                            }}
                                                            style={{
                                                                width: '100%', padding: '0.5rem 0.85rem', background: 'transparent',
                                                                border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                                color: '#fff', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left' as const,
                                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                            }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.1)')}
                                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                        >
                                                            <span style={{ fontWeight: '600' }}>{p.fullName}</span>
                                                            {p.phone && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>📱 {p.phone}</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Due date */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', display: 'block' }}>📅 Termin realizacji</label>
                                    <input
                                        type="date"
                                        value={editForm.due_date || ''}
                                        onChange={e => setEditForm(p => ({ ...p, due_date: e.target.value }))}
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.5rem', padding: '0.6rem 0.85rem', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                                    />
                                </div>

                                {/* Multi-photo */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', display: 'block' }}>📸 Zdjęcia (maks. 5 — kompresja auto)</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {((editForm.image_urls || []) as string[]).map((url: string, idx: number) => (
                                            <div key={idx} style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                                                <img src={url} alt="" onClick={() => setZoomedImage(url)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.12)', cursor: 'zoom-in' }} />
                                                <button onClick={() => setEditForm((p: any) => { const urls = ((p.image_urls || []) as string[]).filter((_: string, i: number) => i !== idx); return { ...p, image_urls: urls, image_url: urls[0] || '' }; })} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.8)', border: 'none', color: '#fff', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: '0.6rem', lineHeight: '18px', textAlign: 'center', padding: 0 }}>✕</button>
                                            </div>
                                        ))}
                                        {((editForm.image_urls || []) as string[]).length < 5 && (
                                            <label style={{ width: 72, height: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '0.4rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', textAlign: 'center', gap: '0.2rem', cursor: imageUploading ? 'wait' : 'pointer', opacity: imageUploading ? 0.5 : 1, flexShrink: 0 }}>
                                                <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{imageUploading ? '⏳' : '📷'}</span>
                                                {imageUploading ? 'Przesyłanie...' : 'Dodaj zdjęcie'}
                                                <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={imageUploading}
                                                    onChange={async (e) => { const files = Array.from(e.target.files || []); for (const f of files.slice(0, 5 - ((editForm.image_urls || []) as string[]).length)) { await handleImageUpload(f, 'edit'); } e.target.value = ''; }}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {/* Save */}
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={editSaving}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        color: '#fff',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        opacity: editSaving ? 0.7 : 1,
                                    }}
                                >
                                    {editSaving ? 'Zapisywanie...' : '💾 Zapisz zmiany'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ═══ ZOOMED IMAGE OVERLAY ═══ */}
            {
                zoomedImage && (
                    <div
                        onClick={() => setZoomedImage(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.85)',
                            zIndex: 5000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'zoom-out',
                            padding: '1rem',
                        }}
                    >
                        <img
                            src={zoomedImage}
                            alt="Powiększone zdjęcie"
                            style={{ maxWidth: '95vw', maxHeight: '90vh', borderRadius: '0.5rem', objectFit: 'contain' }}
                        />
                    </div>
                )
            }

            {/* ═══ LOGIN TASK POPUP ═══ */}
            {
                showLoginPopup && loginPopupTasks.length > 0 && (
                    <div
                        onClick={() => setShowLoginPopup(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(6px)',
                            zIndex: 4000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem',
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(135deg, #0d1b2a 0%, #1b2838 100%)',
                                border: '1px solid rgba(56, 189, 248, 0.25)',
                                borderRadius: '1rem',
                                width: '100%',
                                maxWidth: '480px',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Popup Header */}
                            <div style={{
                                padding: '1.25rem 1.5rem',
                                background: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(56,189,248,0.04))',
                                borderBottom: '1px solid rgba(56,189,248,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                            }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <Bell size={20} color="#fff" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '600', color: '#fff' }}>
                                        Twoje zadania do realizacji
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.15rem' }}>
                                        Masz {loginPopupTasks.length}{loginPopupTasks.length >= 5 ? '+' : ''} {loginPopupTasks.length === 1 ? 'zadanie' : loginPopupTasks.length < 5 ? 'zadania' : 'zadań'} do wykonania
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowLoginPopup(false)}
                                    style={{
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: '0.5rem',
                                        width: '28px',
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                    }}
                                >✕</button>
                            </div>

                            {/* Task list */}
                            <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {loginPopupTasks.map(task => {
                                    const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                                    return (
                                        <div key={task.id}
                                            onClick={() => {
                                                setShowLoginPopup(false);
                                                // setActiveTab('zadania') — parent controls active tab;
                                                setSelectedViewTask(task);
                                            }}
                                            style={{
                                                padding: '0.65rem 0.85rem',
                                                background: overdue ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.04)',
                                                border: `1px solid ${overdue ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.08)'}`,
                                                borderRadius: '0.6rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.6rem',
                                                cursor: 'pointer',
                                                transition: 'background 0.15s, border-color 0.15s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = overdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56,189,248,0.08)'; e.currentTarget.style.borderColor = overdue ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56,189,248,0.3)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = overdue ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = overdue ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.08)'; }}
                                        >
                                            {/* Priority indicator */}
                                            <div style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: getPriorityColor(task.priority),
                                                flexShrink: 0,
                                            }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    color: '#fff',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '500',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}>
                                                    {task.title}
                                                </div>
                                                {task.description && (
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        color: 'rgba(255,255,255,0.35)',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        marginTop: '0.1rem',
                                                    }}>
                                                        {task.description}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                                                    {task.due_date && (
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            color: overdue ? '#ef4444' : 'rgba(255,255,255,0.4)',
                                                            fontWeight: overdue ? '600' : '400',
                                                        }}>
                                                            {overdue ? '⚠ Termin minął: ' : '📅 '}
                                                            {new Date(task.due_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    )}
                                                    {task.priority === 'urgent' && (
                                                        <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: '600' }}>⚡ Pilne</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ color: 'rgba(56,189,248,0.6)', fontSize: '0.75rem', flexShrink: 0 }}>→</div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Action buttons */}
                            <div style={{ padding: '0.75rem 1.25rem 1.25rem', display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => {
                                        setShowLoginPopup(false);
                                        // setActiveTab('zadania') — parent controls active tab;
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '0.65rem',
                                        background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        color: '#fff',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Przejdź do zadań
                                </button>
                                <button
                                    onClick={() => setShowLoginPopup(false)}
                                    style={{
                                        padding: '0.65rem 1rem',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '0.5rem',
                                        color: 'rgba(255,255,255,0.6)',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Zamknij
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ─── Task Type Manager Modal ───────────────────────────── */}
            {
                showTypeManager && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        padding: '1rem',
                    }} onClick={() => setShowTypeManager(false)}>
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '1rem',
                                width: '100%', maxWidth: '600px', maxHeight: '85vh',
                                display: 'flex', flexDirection: 'column',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Header */}
                            <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>⚙️ Zarządzaj typami zadań</h3>
                                <button onClick={() => setShowTypeManager(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
                            </div>

                            {/* Scrollable body */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
                                {/* Existing types */}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Istniejące typy</h4>
                                    {taskTypeTemplates.length === 0 && (
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                            Brak szablonów w bazie — używane są domyślne typy. Dodaj pierwszy typ poniżej, a system przełączy się na dynamiczne szablony.
                                        </p>
                                    )}
                                    {taskTypeTemplates.map(tmpl => (
                                        <div key={tmpl.id} style={{
                                            background: editingTypeId === tmpl.id ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.03)',
                                            border: editingTypeId === tmpl.id ? '1px solid rgba(168,85,247,0.3)' : '1px solid rgba(255,255,255,0.06)',
                                            borderRadius: '0.6rem',
                                            padding: '0.75rem',
                                            marginBottom: '0.5rem',
                                            transition: 'all 0.15s',
                                        }}>
                                            {editingTypeId === tmpl.id ? (
                                                /* Edit mode */
                                                <div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                        <input
                                                            value={typeManagerForm.icon}
                                                            onChange={e => setTypeManagerForm(p => ({ ...p, icon: e.target.value }))}
                                                            style={{ width: '3rem', padding: '0.4rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.4rem', color: '#fff', fontSize: '1.1rem', textAlign: 'center' }}
                                                            placeholder="📋"
                                                        />
                                                        <input
                                                            value={typeManagerForm.label}
                                                            onChange={e => setTypeManagerForm(p => ({ ...p, label: e.target.value }))}
                                                            style={{ flex: 1, padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.4rem', color: '#fff', fontSize: '0.85rem' }}
                                                            placeholder="Nazwa typu"
                                                        />
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.3rem' }}>Checklist items:</div>
                                                    {typeManagerForm.items.map((item, idx) => (
                                                        <div key={idx} style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.3rem' }}>
                                                            <input
                                                                value={item}
                                                                onChange={e => {
                                                                    const newItems = [...typeManagerForm.items];
                                                                    newItems[idx] = e.target.value;
                                                                    setTypeManagerForm(p => ({ ...p, items: newItems }));
                                                                }}
                                                                style={{ flex: 1, padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.3rem', color: '#fff', fontSize: '0.8rem' }}
                                                                placeholder={`Krok ${idx + 1}`}
                                                            />
                                                            <button
                                                                onClick={() => setTypeManagerForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
                                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '0 0.3rem' }}
                                                            >×</button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => setTypeManagerForm(p => ({ ...p, items: [...p.items, ''] }))}
                                                        style={{ background: 'none', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '0.3rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', marginBottom: '0.5rem', width: '100%' }}
                                                    >+ Dodaj krok</button>
                                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                        <button
                                                            disabled={typeManagerSaving}
                                                            onClick={async () => {
                                                                setTypeManagerSaving(true);
                                                                try {
                                                                    const cleanItems = typeManagerForm.items.filter(i => i.trim());
                                                                    await fetch('/api/employee/task-types', {
                                                                        method: 'PUT',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ id: tmpl.id, label: typeManagerForm.label, icon: typeManagerForm.icon, items: cleanItems }),
                                                                    });
                                                                    await fetchTaskTypes();
                                                                    setEditingTypeId(null);
                                                                } finally { setTypeManagerSaving(false); }
                                                            }}
                                                            style={{ padding: '0.4rem 0.75rem', background: '#22c55e', border: 'none', borderRadius: '0.4rem', color: '#fff', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}
                                                        >{typeManagerSaving ? 'Zapisuję...' : '✓ Zapisz'}</button>
                                                        <button
                                                            onClick={() => setEditingTypeId(null)}
                                                            style={{ padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', cursor: 'pointer' }}
                                                        >Anuluj</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* View mode */
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff', marginBottom: '0.2rem' }}>
                                                            {tmpl.icon} {tmpl.label}
                                                        </div>
                                                        {tmpl.items.length > 0 && (
                                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                                                {tmpl.items.join(' → ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                                                        <button
                                                            onClick={() => {
                                                                setEditingTypeId(tmpl.id);
                                                                setTypeManagerForm({ label: tmpl.label, icon: tmpl.icon, items: tmpl.items.length > 0 ? [...tmpl.items] : [''] });
                                                            }}
                                                            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.4rem' }}
                                                        >✏️</button>
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm(`Usunąć typ "${tmpl.label}"? Istniejące zadania tego typu nie zostaną zmienione.`)) return;
                                                                await fetch('/api/employee/task-types', {
                                                                    method: 'DELETE',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ id: tmpl.id }),
                                                                });
                                                                await fetchTaskTypes();
                                                            }}
                                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.4rem' }}
                                                        >🗑️</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Add new type */}
                                {editingTypeId !== 'new' ? (
                                    <button
                                        onClick={() => {
                                            setEditingTypeId('new');
                                            setTypeManagerForm({ label: '', icon: '📋', items: [''] });
                                        }}
                                        style={{
                                            width: '100%', padding: '0.7rem',
                                            background: 'rgba(56,189,248,0.08)',
                                            border: '1px dashed rgba(56,189,248,0.3)',
                                            borderRadius: '0.6rem',
                                            color: '#38bdf8',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                        }}
                                    >
                                        + Dodaj nowy typ zadania
                                    </button>
                                ) : (
                                    <div style={{
                                        background: 'rgba(56,189,248,0.06)',
                                        border: '1px solid rgba(56,189,248,0.2)',
                                        borderRadius: '0.6rem',
                                        padding: '0.75rem',
                                    }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#38bdf8', marginBottom: '0.5rem' }}>Nowy typ zadania</div>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <input
                                                value={typeManagerForm.icon}
                                                onChange={e => setTypeManagerForm(p => ({ ...p, icon: e.target.value }))}
                                                style={{ width: '3rem', padding: '0.4rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.4rem', color: '#fff', fontSize: '1.1rem', textAlign: 'center' }}
                                                placeholder="📋"
                                            />
                                            <input
                                                value={typeManagerForm.label}
                                                onChange={e => setTypeManagerForm(p => ({ ...p, label: e.target.value }))}
                                                style={{ flex: 1, padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.4rem', color: '#fff', fontSize: '0.85rem' }}
                                                placeholder="Nazwa nowego typu (np. Proteza)"
                                                autoFocus
                                            />
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.3rem' }}>Checklist items:</div>
                                        {typeManagerForm.items.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.3rem' }}>
                                                <input
                                                    value={item}
                                                    onChange={e => {
                                                        const newItems = [...typeManagerForm.items];
                                                        newItems[idx] = e.target.value;
                                                        setTypeManagerForm(p => ({ ...p, items: newItems }));
                                                    }}
                                                    style={{ flex: 1, padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.3rem', color: '#fff', fontSize: '0.8rem' }}
                                                    placeholder={`Krok ${idx + 1}`}
                                                />
                                                <button
                                                    onClick={() => setTypeManagerForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '0 0.3rem' }}
                                                >×</button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setTypeManagerForm(p => ({ ...p, items: [...p.items, ''] }))}
                                            style={{ background: 'none', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '0.3rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', marginBottom: '0.5rem', width: '100%' }}
                                        >+ Dodaj krok</button>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <button
                                                disabled={typeManagerSaving || !typeManagerForm.label.trim()}
                                                onClick={async () => {
                                                    setTypeManagerSaving(true);
                                                    try {
                                                        const cleanItems = typeManagerForm.items.filter(i => i.trim());
                                                        const res = await fetch('/api/employee/task-types', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ label: typeManagerForm.label, icon: typeManagerForm.icon, items: cleanItems }),
                                                        });
                                                        if (res.ok) {
                                                            await fetchTaskTypes();
                                                            setEditingTypeId(null);
                                                            setTypeManagerForm({ label: '', icon: '📋', items: [''] });
                                                        } else {
                                                            const err = await res.json();
                                                            alert(err.error || 'Błąd');
                                                        }
                                                    } finally { setTypeManagerSaving(false); }
                                                }}
                                                style={{
                                                    padding: '0.4rem 0.75rem',
                                                    background: typeManagerForm.label.trim() ? '#22c55e' : 'rgba(255,255,255,0.1)',
                                                    border: 'none', borderRadius: '0.4rem',
                                                    color: '#fff', fontSize: '0.78rem', fontWeight: '600',
                                                    cursor: typeManagerForm.label.trim() ? 'pointer' : 'not-allowed',
                                                }}
                                            >{typeManagerSaving ? 'Tworzę...' : '+ Utwórz typ'}</button>
                                            <button
                                                onClick={() => setEditingTypeId(null)}
                                                style={{ padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', cursor: 'pointer' }}
                                            >Anuluj</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </>);
}
