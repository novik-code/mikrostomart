'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { EmployeeTask, FutureAppointment, StaffMember, TaskTypeTemplate, ChecklistItem, FALLBACK_TASK_TYPE_CHECKLISTS } from '@/types';

// ─── Task Form Shape ─────────────────────────────────────────────
export interface TaskFormData {
    title: string;
    description: string;
    priority: 'low' | 'normal' | 'urgent';
    task_type: string;
    checklist_items: ChecklistItem[];
    image_url: string;
    image_urls: string[];
    assigned_to: { id: string; name: string }[];
    due_date: string;
    linked_appointment_date: string;
    linked_appointment_info: string;
    is_private: boolean;
    patient_id: string;
    patient_name: string;
}

const EMPTY_TASK_FORM: TaskFormData = {
    title: '',
    description: '',
    priority: 'normal',
    task_type: '',
    checklist_items: [],
    image_url: '',
    image_urls: [],
    assigned_to: [],
    due_date: '',
    linked_appointment_date: '',
    linked_appointment_info: '',
    is_private: false,
    patient_id: '',
    patient_name: '',
};

// ─── Patient Search Result ───────────────────────────────────────
export interface PatientSearchResult {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    fullName: string;
}

// ─── Hook Props ──────────────────────────────────────────────────
interface UseTasksProps {
    tasks: EmployeeTask[];
    setTasks: React.Dispatch<React.SetStateAction<EmployeeTask[]>>;
    staffList: StaffMember[];
    currentUserId: string | null;
    currentUserEmail: string | null;
    showTaskModal: boolean;
    setShowTaskModal: (v: boolean) => void;
    taskModalPrefill: { patientId?: string; patientName?: string; appointmentType?: string } | null;
    setTaskModalPrefill: (v: { patientId?: string; patientName?: string; appointmentType?: string } | null) => void;
}

// ─── useTasks Hook ───────────────────────────────────────────────
export function useTasks({
    tasks, setTasks, staffList, currentUserId, currentUserEmail,
    showTaskModal, setShowTaskModal, taskModalPrefill, setTaskModalPrefill,
}: UseTasksProps) {

    // ── Loading / saving ─────────────────────────────────────────
    const [tasksLoading, setTasksLoading] = useState(false);
    const [taskSaving, setTaskSaving] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [commentLoading, setCommentLoading] = useState(false);

    // ── Task form (create) ───────────────────────────────────────
    const [taskForm, setTaskForm] = useState<TaskFormData>({ ...EMPTY_TASK_FORM });
    const [futureAppointments, setFutureAppointments] = useState<FutureAppointment[]>([]);
    const [futureAptsLoading, setFutureAptsLoading] = useState(false);

    // ── Patient search ───────────────────────────────────────────
    const [patientSearchQuery, setPatientSearchQuery] = useState('');
    const [patientSearchResults, setPatientSearchResults] = useState<PatientSearchResult[]>([]);
    const [patientSearchLoading, setPatientSearchLoading] = useState(false);
    const [editPatientSearchQuery, setEditPatientSearchQuery] = useState('');
    const [editPatientSearchResults, setEditPatientSearchResults] = useState<PatientSearchResult[]>([]);
    const [editPatientSearchLoading, setEditPatientSearchLoading] = useState(false);
    const patientSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Edit form ────────────────────────────────────────────────
    const [editingTask, setEditingTask] = useState<EmployeeTask | null>(null);
    const [editForm, setEditForm] = useState<Record<string, any>>({});

    // ── Comments ─────────────────────────────────────────────────
    const [taskComments, setTaskComments] = useState<Record<string, any[]>>({});
    const [commentInput, setCommentInput] = useState('');

    // ── Labels ───────────────────────────────────────────────────
    const [allLabels, setAllLabels] = useState<{ id: string; name: string; color: string }[]>([]);
    const [taskLabelMap, setTaskLabelMap] = useState<Record<string, string[]>>({});

    // ── Task Type Templates ──────────────────────────────────────
    const [taskTypeTemplates, setTaskTypeTemplates] = useState<TaskTypeTemplate[]>([]);
    const [showTypeManager, setShowTypeManager] = useState(false);
    const [typeManagerForm, setTypeManagerForm] = useState({ label: '', icon: '📋', items: [''] });
    const [typeManagerSaving, setTypeManagerSaving] = useState(false);
    const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

    // ── Login popup ──────────────────────────────────────────────
    const [showLoginPopup, setShowLoginPopup] = useState(false);
    const [loginPopupTasks, setLoginPopupTasks] = useState<EmployeeTask[]>([]);

    // ── Deep link ────────────────────────────────────────────────
    const [deepLinkTaskId, setDeepLinkTaskId] = useState<string | null>(null);

    // ─────────────────────────────────────────────────────────────
    // Data Fetching
    // ─────────────────────────────────────────────────────────────

    const fetchTasks = useCallback(async () => {
        setTasksLoading(true);
        try {
            const res = await fetch('/api/employee/tasks');
            if (!res.ok) throw new Error('Failed to fetch tasks');
            const data = await res.json();
            setTasks(data.tasks || []);
        } catch (err) {
            console.error('[Tasks] Error:', err);
        } finally {
            setTasksLoading(false);
        }
    }, []);

    const fetchFutureAppointments = useCallback(async (patientId: string) => {
        setFutureAptsLoading(true);
        setFutureAppointments([]);
        try {
            const res = await fetch(`/api/employee/patient-appointments?patientId=${patientId}`);
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setFutureAppointments(data.appointments || []);
        } catch (err) {
            console.error('[FutureApts] Error:', err);
        } finally {
            setFutureAptsLoading(false);
        }
    }, []);

    const fetchComments = useCallback(async (taskId: string) => {
        try {
            const res = await fetch(`/api/employee/tasks/${taskId}/comments`);
            if (!res.ok) return;
            const data = await res.json();
            setTaskComments(prev => ({ ...prev, [taskId]: data.comments || [] }));
        } catch { } // silent
    }, []);

    const fetchLabels = useCallback(async () => {
        try {
            const res = await fetch('/api/employee/tasks/labels');
            if (!res.ok) return;
            const data = await res.json();
            setAllLabels(data.labels || []);
        } catch { } // silent
    }, []);

    const fetchTaskTypes = useCallback(async () => {
        try {
            const res = await fetch('/api/employee/task-types');
            if (!res.ok) return;
            const data = await res.json();
            setTaskTypeTemplates(data.templates || []);
        } catch { } // silent — fallback to hardcoded
    }, []);

    // ── Login popup — show pending tasks once per session ─────────
    const fetchMyPending = useCallback(async () => {
        if (!currentUserId || !currentUserEmail) return;
        const popupKey = `taskPopupShown_${currentUserId}`;
        if (typeof window !== 'undefined' && sessionStorage.getItem(popupKey)) return;
        try {
            const res = await fetch('/api/employee/tasks');
            if (!res.ok) return;
            const data = await res.json();
            const mine = (data.tasks || []).filter((t: EmployeeTask) =>
                (t.status === 'todo' || t.status === 'in_progress') &&
                ((t.assigned_to || []).some(a => a.id === currentUserId) ||
                    t.assigned_to_doctor_id === currentUserId ||
                    t.created_by_email === currentUserEmail)
            );
            if (mine.length > 0) {
                setLoginPopupTasks(mine);
                setShowLoginPopup(true);
                if (typeof window !== 'undefined') sessionStorage.setItem(popupKey, '1');
            }
        } catch { }
    }, [currentUserId, currentUserEmail]);

    // ─────────────────────────────────────────────────────────────
    // Mount Effects
    // ─────────────────────────────────────────────────────────────

    useEffect(() => { fetchTasks(); }, [fetchTasks]);
    useEffect(() => { fetchLabels(); }, [fetchLabels]);
    useEffect(() => { fetchTaskTypes(); }, [fetchTaskTypes]);

    // Deep link from push notifications
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('taskId');
        if (taskId) setDeepLinkTaskId(taskId);
    }, []);

    // Login popup
    useEffect(() => {
        fetchMyPending();
    }, [fetchMyPending]);

    // ─────────────────────────────────────────────────────────────
    // Task CRUD
    // ─────────────────────────────────────────────────────────────

    const resetTaskForm = useCallback(() => {
        setTaskForm({ ...EMPTY_TASK_FORM });
        setTaskModalPrefill(null);
        setFutureAppointments([]);
        setPatientSearchQuery('');
        setPatientSearchResults([]);
    }, [setTaskModalPrefill]);

    const openTaskModal = useCallback((prefill?: { patientId?: string; patientName?: string; appointmentType?: string }) => {
        resetTaskForm();
        if (prefill) {
            setTaskModalPrefill(prefill);
            setTaskForm(prev => ({
                ...prev,
                title: prefill.appointmentType ? `${prefill.appointmentType} — ${prefill.patientName || ''}` : '',
            }));
            if (prefill.patientId) fetchFutureAppointments(prefill.patientId);
        }
        setShowTaskModal(true);
    }, [resetTaskForm, setTaskModalPrefill, fetchFutureAppointments, setShowTaskModal]);

    const handleCreateTask = useCallback(async () => {
        if (!taskForm.title.trim()) return;
        setTaskSaving(true);
        try {
            const body: any = {
                title: taskForm.title,
                description: taskForm.description || null,
                priority: taskForm.priority,
                task_type: taskForm.task_type || null,
                checklist_items: taskForm.checklist_items.length > 0 ? taskForm.checklist_items : null,
                image_url: taskForm.image_url || null,
                image_urls: taskForm.image_urls || [],
                patient_id: taskModalPrefill?.patientId || taskForm.patient_id || null,
                patient_name: taskModalPrefill?.patientName || taskForm.patient_name || null,
                appointment_type: taskModalPrefill?.appointmentType || null,
                assigned_to: taskForm.assigned_to.length > 0 ? taskForm.assigned_to : [],
                assigned_to_doctor_id: taskForm.assigned_to[0]?.id || null,
                assigned_to_doctor_name: taskForm.assigned_to[0]?.name || null,
                due_date: taskForm.due_date || null,
                linked_appointment_date: taskForm.linked_appointment_date || null,
                linked_appointment_info: taskForm.linked_appointment_info || null,
                is_private: taskForm.is_private,
            };
            const res = await fetch('/api/employee/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('Failed to create task');
            setShowTaskModal(false);
            resetTaskForm();
            fetchTasks();
        } catch (err) {
            console.error('[Tasks] Create error:', err);
        } finally {
            setTaskSaving(false);
        }
    }, [taskForm, taskModalPrefill, setShowTaskModal, resetTaskForm, fetchTasks]);

    const handleUpdateStatus = useCallback(async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done' | 'archived') => {
        try {
            const res = await fetch(`/api/employee/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed');
            }
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        } catch (err: any) {
            console.error('[Tasks] Update error:', err);
            alert(`Błąd zmiany statusu: ${err.message || 'Spróbuj ponownie'}`);
        }
    }, [setTasks]);

    const handleDeleteTask = useCallback(async (taskId: string) => {
        if (!confirm('Czy na pewno chcesz usunąć to zadanie?')) return;
        try {
            const res = await fetch(`/api/employee/tasks/${taskId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            setTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (err) {
            console.error('[Tasks] Delete error:', err);
        }
    }, [setTasks]);

    // ── Edit ─────────────────────────────────────────────────────
    const openEditModal = useCallback((task: EmployeeTask) => {
        setEditingTask(task);
        setEditForm({
            title: task.title || '',
            description: task.description || '',
            priority: task.priority || 'normal',
            task_type: task.task_type || '',
            due_date: task.due_date || '',
            assigned_to: task.assigned_to || [],
            image_url: task.image_url || '',
            image_urls: (task as any).image_urls || (task.image_url ? [task.image_url] : []),
            patient_id: task.patient_id || '',
            patient_name: task.patient_name || '',
        });
        setEditPatientSearchQuery('');
        setEditPatientSearchResults([]);
    }, []);

    const handleSaveEdit = useCallback(async () => {
        if (!editingTask) return;
        setEditSaving(true);
        try {
            const res = await fetch(`/api/employee/tasks/${editingTask.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to update task');
            }
            setEditingTask(null);
            setEditForm({});
            fetchTasks();
        } catch (err: any) {
            console.error('[Tasks] Edit error:', err);
            alert(`Błąd zapisu: ${err.message || 'Spróbuj ponownie'}`);
        } finally {
            setEditSaving(false);
        }
    }, [editingTask, editForm, fetchTasks]);

    // ─────────────────────────────────────────────────────────────
    // Utilities
    // ─────────────────────────────────────────────────────────────

    const searchPatients = useCallback((query: string, target: 'create' | 'edit') => {
        const setResults = target === 'create' ? setPatientSearchResults : setEditPatientSearchResults;
        const setLoading = target === 'create' ? setPatientSearchLoading : setEditPatientSearchLoading;
        if (patientSearchTimerRef.current) clearTimeout(patientSearchTimerRef.current);
        if (query.length < 2) { setResults([]); setLoading(false); return; }
        setLoading(true);
        patientSearchTimerRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/employee/patient-search?q=${encodeURIComponent(query)}&limit=5`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.patients || []);
                } else { setResults([]); }
            } catch { setResults([]); }
            finally { setLoading(false); }
        }, 300);
    }, []);

    const compressImage = useCallback((file: File, maxKB = 200): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                const MAX_DIM = 1200;
                if (width > MAX_DIM) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
                if (height > MAX_DIM) { width = Math.round(width * MAX_DIM / height); height = MAX_DIM; }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, width, height);
                let quality = 0.85;
                const tryCompress = () => {
                    canvas.toBlob(blob => {
                        if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
                        if (blob.size <= maxKB * 1024 || quality <= 0.3) { resolve(blob); }
                        else { quality -= 0.1; tryCompress(); }
                    }, 'image/jpeg', quality);
                };
                tryCompress();
            };
            img.onerror = reject;
            img.src = objectUrl;
        });
    }, []);

    const handleImageUpload = useCallback(async (file: File, mode: 'create' | 'edit' = 'create') => {
        setImageUploading(true);
        try {
            const compressed = await compressImage(file);
            const compressedFile = new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
            const formData = new FormData();
            formData.append('file', compressedFile);
            const res = await fetch('/api/employee/tasks/upload-image', {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            if (mode === 'create') {
                setTaskForm(p => ({ ...p, image_url: p.image_url || data.url, image_urls: [...(p.image_urls || []), data.url] }));
            } else {
                setEditForm(p => ({ ...p, image_url: p.image_url || data.url, image_urls: [...(p.image_urls || []), data.url] }));
            }
        } catch (err) {
            console.error('[Tasks] Image upload error:', err);
            alert('Nie udało się przesłać zdjęcia');
        } finally {
            setImageUploading(false);
        }
    }, [compressImage]);

    const handleToggleChecklist = useCallback(async (taskId: string, itemIndex: number) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const items = [...(task.checklist_items || [])];
        const newDone = !items[itemIndex].done;
        items[itemIndex] = {
            ...items[itemIndex],
            done: newDone,
            checked_by: newDone ? (currentUserId || undefined) : undefined,
            checked_by_name: newDone ? (staffList.find(s => s.id === currentUserId)?.name || currentUserEmail || undefined) : undefined,
        };
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, checklist_items: items } : t));
        try {
            await fetch(`/api/employee/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checklist_items: items }),
            });
        } catch (err) {
            console.error('[Tasks] Checklist update error:', err);
        }
    }, [tasks, currentUserId, currentUserEmail, staffList, setTasks]);

    const handlePostComment = useCallback(async (taskId: string) => {
        if (!commentInput.trim()) return;
        setCommentLoading(true);
        try {
            const authorName = staffList.find(s => s.id === currentUserId)?.name || currentUserEmail || '';
            const res = await fetch(`/api/employee/tasks/${taskId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: commentInput, authorName }),
            });
            if (!res.ok) throw new Error('Failed');
            setCommentInput('');
            fetchComments(taskId);
        } catch (err) {
            console.error('[Comments] Post error:', err);
        } finally {
            setCommentLoading(false);
        }
    }, [commentInput, staffList, currentUserId, currentUserEmail, fetchComments]);

    const selectFutureAppointment = useCallback((apt: FutureAppointment) => {
        const d = new Date(apt.date);
        const dateStr = d.toISOString().split('T')[0];
        const timeStr = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        const info = `${d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })} ${timeStr} — ${apt.appointmentType}, ${apt.doctor?.name || ''}`;
        setTaskForm(prev => ({
            ...prev,
            due_date: dateStr,
            linked_appointment_date: d.toISOString(),
            linked_appointment_info: info,
        }));
    }, []);

    const isMyTask = useCallback((task: EmployeeTask) => {
        const assignedToMe = (task.assigned_to || []).some(a => a.id === currentUserId);
        return assignedToMe || task.assigned_to_doctor_id === currentUserId || task.created_by_email === currentUserEmail;
    }, [currentUserId, currentUserEmail]);

    // ── Dynamic TASK_TYPE_CHECKLISTS from templates or fallback ──
    const TASK_TYPE_CHECKLISTS: Record<string, { label: string; icon: string; items: string[] }> = useMemo(() => {
        if (taskTypeTemplates.length === 0) return FALLBACK_TASK_TYPE_CHECKLISTS;
        const result: Record<string, { label: string; icon: string; items: string[] }> = {};
        for (const t of taskTypeTemplates) {
            result[t.key] = { label: t.label, icon: t.icon, items: t.items };
        }
        return result;
    }, [taskTypeTemplates]);

    // ── Status / Priority helpers ────────────────────────────────
    const getStatusLabel = (s: string) => s === 'todo' ? 'Do zrobienia' : s === 'in_progress' ? 'W trakcie' : s === 'archived' ? 'Archiwum' : 'Gotowe';
    const getStatusColor = (s: string) => s === 'todo' ? '#94a3b8' : s === 'in_progress' ? '#f59e0b' : s === 'archived' ? '#6b7280' : '#22c55e';
    const getPriorityLabel = (p: string) => p === 'low' ? 'Niski' : p === 'normal' ? 'Normalny' : 'Pilne';
    const getPriorityColor = (p: string) => p === 'low' ? '#64748b' : p === 'normal' ? '#38bdf8' : '#ef4444';
    const getNextStatus = (s: string): 'todo' | 'in_progress' | 'done' => s === 'todo' ? 'in_progress' : s === 'in_progress' ? 'done' : 'todo';

    // ─────────────────────────────────────────────────────────────
    // Return
    // ─────────────────────────────────────────────────────────────
    return {
        // Loading states
        tasksLoading, taskSaving, imageUploading, editSaving, commentLoading,

        // Task form (create)
        taskForm, setTaskForm, resetTaskForm,
        futureAppointments, futureAptsLoading,

        // Patient search
        patientSearchQuery, setPatientSearchQuery, patientSearchResults, setPatientSearchResults, patientSearchLoading,
        editPatientSearchQuery, setEditPatientSearchQuery, editPatientSearchResults, setEditPatientSearchResults, editPatientSearchLoading,
        searchPatients,

        // Edit form
        editingTask, setEditingTask, editForm, setEditForm, openEditModal, handleSaveEdit,

        // Comments
        taskComments, commentInput, setCommentInput, fetchComments, handlePostComment,

        // Labels
        allLabels, taskLabelMap, setTaskLabelMap,

        // Task type templates
        taskTypeTemplates, setTaskTypeTemplates,
        showTypeManager, setShowTypeManager,
        typeManagerForm, setTypeManagerForm, typeManagerSaving, setTypeManagerSaving,
        editingTypeId, setEditingTypeId,
        TASK_TYPE_CHECKLISTS, fetchTaskTypes,

        // Login popup
        showLoginPopup, setShowLoginPopup, loginPopupTasks,

        // Deep link
        deepLinkTaskId, setDeepLinkTaskId,

        // CRUD
        fetchTasks, openTaskModal, handleCreateTask, handleUpdateStatus, handleDeleteTask,
        handleToggleChecklist, handleImageUpload, selectFutureAppointment,

        // Utilities
        isMyTask, compressImage,
        getStatusLabel, getStatusColor, getPriorityLabel, getPriorityColor, getNextStatus,
    };
}
