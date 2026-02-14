"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { LogOut, ChevronLeft, ChevronRight, Calendar, RefreshCw, CheckSquare, Plus, User, AlertTriangle, Trash2, Clock, X, Bell } from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";

// ─── Types ───────────────────────────────────────────────────────
interface Badge {
    id: string;
    name: string;
    color: string | null;
}

interface ScheduleAppointment {
    id: string;
    patientName: string;
    patientId: string;
    doctorName: string;
    doctorId: string;
    startTime: string;
    endTime: string;
    duration: number;
    appointmentType: string;
    appointmentTypeId: string;
    isWorkingHour: boolean;
    patientPhone: string;
    notes: string | null;
    badges: Badge[];
}

interface Visit {
    date: string;
    endDate: string;
    doctor: {
        id: string;
        name: string;
        title?: string;
    };
    cost: number;
    paid: number;
    balance: number;
    paymentStatus: string;
    medicalDetails?: {
        diagnosis?: string;
        visitDescription?: string;
        recommendations?: string;
        procedures?: Array<{
            tooth?: string;
            procedureName: string;
            diagnosis?: string;
            price: number;
        }>;
        medications?: Array<{
            name: string;
            dosage?: string;
            duration?: string;
        }>;
    };
}

interface ChecklistItem {
    label: string;
    done: boolean;
    checked_by?: string;
    checked_by_name?: string;
}

interface EmployeeTask {
    id: string;
    title: string;
    description: string | null;
    status: 'todo' | 'in_progress' | 'done';
    priority: 'low' | 'normal' | 'urgent';
    task_type: string | null;
    checklist_items: ChecklistItem[];
    image_url: string | null;
    patient_id: string | null;
    patient_name: string | null;
    appointment_type: string | null;
    due_date: string | null;
    linked_appointment_date: string | null;
    linked_appointment_info: string | null;
    assigned_to_doctor_id: string | null;
    assigned_to_doctor_name: string | null;
    assigned_to: { id: string; name: string }[];
    created_by_email: string | null;
    created_at: string;
    updated_at: string;
}

interface FutureAppointment {
    id: string;
    date: string;
    endDate: string | null;
    doctor: { id: string; name: string };
    appointmentType: string;
    duration: number | null;
}

interface StaffMember {
    id: string;
    name: string;
    email?: string;
}

interface ScheduleDay {
    date: string;
    dayName: string;
    appointments: ScheduleAppointment[];
}

interface ScheduleData {
    weekStart: string;
    days: ScheduleDay[];
    doctors: string[];
}

// ─── Prodentis appointment type color map (by ID, matching desktop app) ────
const PRODENTIS_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
    '0000000001': { bg: '#FFD700', border: '#DAA520', text: '#000', label: 'Zachowawcza' },       // zachowawcza — yellow
    '0000000003': { bg: '#FF00FF', border: '#CC00CC', text: '#fff', label: 'Chirurgia' },          // chirurgia — magenta
    '0000000006': { bg: '#FFA500', border: '#E08900', text: '#000', label: 'Pierwsza wizyta' },    // pierwsza wizyta — orange
    '0000000010': { bg: '#00CC00', border: '#009900', text: '#000', label: 'Protetyka' },          // protetyka — green
    '0000000012': { bg: '#FFFF00', border: '#CCCC00', text: '#000', label: 'Konsultacja' },        // konsultacja — bright yellow
    '0000000014': { bg: '#00CCCC', border: '#009999', text: '#000', label: 'Higienizacja' },       // higienizacja — cyan/teal
    '0000000016': { bg: '#00FF00', border: '#00CC00', text: '#000', label: 'KONTROLA' },           // KONTROLA — bright green
    '0000000027': { bg: '#6699FF', border: '#3366CC', text: '#fff', label: 'Gabinet nr 1' },       // Gabinet nr 1 — blue
    '0000000029': { bg: '#FF0000', border: '#CC0000', text: '#fff', label: 'LASER' },              // LASER — red
    '0000000030': { bg: '#FF66CC', border: '#CC3399', text: '#000', label: 'Odbudowa do ENDO' },   // odbudowa do ENDO — pink
    '0000000033': { bg: '#FF3333', border: '#CC0000', text: '#fff', label: 'ORTODONCJA' },         // ORTODONCJA — red
    '0000000034': { bg: '#CC99FF', border: '#9966CC', text: '#000', label: 'Endodoncja' },         // endodoncja — purple
    '0000000035': { bg: '#FFFFFF', border: '#CCCCCC', text: '#000', label: 'Wolny termin' },       // wolny termin — white
    '0000000036': { bg: '#999999', border: '#666666', text: '#fff', label: 'Obiąd' },              // Obiąd — gray
    '0000000037': { bg: '#66CCFF', border: '#3399CC', text: '#000', label: 'Siłownia' },           // Siłownia — light blue
    '0000000038': { bg: '#FF9966', border: '#CC6633', text: '#000', label: 'Badanie + leczenie' }, // Badanie + leczenie — orange-ish
};

const DEFAULT_COLOR = { bg: '#14b8a6', border: '#0d9488', text: '#fff', label: 'Inne' };

// ─── Task Type Checklists (from Ściąga Tiny PDF) ─────────────────────
const TASK_TYPE_CHECKLISTS: Record<string, { label: string; icon: string; items: string[] }> = {
    'modele_archiwalne': {
        label: 'Modele Archiwalne',
        icon: '📦',
        items: ['Zgrać skany'],
    },
    'modele_analityczne': {
        label: 'Modele Analityczne / Wax Up',
        icon: '🔬',
        items: ['Zgrać skany'],
    },
    'korona_zab': {
        label: 'Korona na Zębie',
        icon: '🦷',
        items: ['Zgrać dane', 'Projekt', 'Frez', 'Piec', 'Charakteryzacja', 'Wycienienie', 'Spr'],
    },
    'korona_implant': {
        label: 'Korona na Implancie',
        icon: '🔩',
        items: ['Zgrać dane', 'Stworzyć model', 'Projekt', 'Frez', 'Piec', 'Charakteryzacja', 'Skleić z ti base', 'Spr'],
    },
    'chirurgia': {
        label: 'Chirurgia / Implantologia',
        icon: '🏥',
        items: ['Zgrać CBCT', 'Zgrać skany', 'Projekt szablonu', 'Podać rozmiar implantów', 'Zamówić implant', 'Zamówić multiunit', 'Druk', 'Sprawdzić dziurki', 'Sterylizacja', 'Wpłacony zadatek'],
    },
    'ortodoncja': {
        label: 'Ortodoncja',
        icon: '😁',
        items: ['Wgrać dane do CC', 'Pokazać wizualizacje', 'Akceptacja', 'Wpłata 50%', 'Zamówienie nakładek'],
    },
    'inne': {
        label: 'Inne',
        icon: '📋',
        items: [],
    },
};

// ─── Badge letter map (from Prodentis API /api/badge-types) ──────
const BADGE_LETTERS: Record<string, string> = {
    '0000000001': 'V',     // VIP
    '0000000002': '!',     // WAŻNE
    '0000000003': '?',     // Pacjent NIE potwierdzony
    '0000000004': 'B',     // Pacjent z bólem
    '0000000005': 'A',     // AWARIA
    '0000000006': 'MGR',   // Dane do magisterki MN
    '0000000007': 'PL',    // Plan leczenia do oddania
    '0000000008': 'TK',    // CBCT kontr.do wykonania
    '0000000009': 'P',     // Pierwszorazowy
    '0000000010': ';)',    // Pacjent potwierdzony
    '0000000011': 'KASA',  // spr.czy przyszedł przelew
};

function getBadgeLetter(badgeId: string): string {
    return BADGE_LETTERS[badgeId] || '•';
}

function getAppointmentColor(typeId: string): { bg: string; border: string; text: string } {
    return PRODENTIS_COLORS[typeId] || DEFAULT_COLOR;
}

// ─── Time helpers ────────────────────────────────────────────────
const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 20; h++) {
    for (let m = 0; m < 60; m += 15) {
        if (h === 20 && m > 0) break;
        TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
}

function timeToSlotIndex(time: string): number {
    return TIME_SLOTS.indexOf(time);
}

function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDateShort(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

// ─── Main Component ─────────────────────────────────────────────
export default function EmployeePage() {
    const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));
    const [hoveredAppointment, setHoveredAppointment] = useState<ScheduleAppointment | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [notesAppointment, setNotesAppointment] = useState<ScheduleAppointment | null>(null);
    const [notesTooltipPos, setNotesTooltipPos] = useState({ x: 0, y: 0 });
    const [badgeTooltip, setBadgeTooltip] = useState<{ badges: Badge[], x: number, y: number } | null>(null);
    const [userEmail, setUserEmail] = useState<string>('');
    const [hiddenDoctors, setHiddenDoctors] = useState<Set<string>>(new Set());
    const [selectedAppointment, setSelectedAppointment] = useState<ScheduleAppointment | null>(null);
    const [patientHistory, setPatientHistory] = useState<Visit[] | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'grafik' | 'zadania'>('grafik');

    // ─── Task Management State ───────────────────────────────
    const [tasks, setTasks] = useState<EmployeeTask[]>([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [taskFilter, setTaskFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskModalPrefill, setTaskModalPrefill] = useState<{
        patientId?: string;
        patientName?: string;
        appointmentType?: string;
    } | null>(null);
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        priority: 'normal' as 'low' | 'normal' | 'urgent',
        task_type: '' as string,
        checklist_items: [] as ChecklistItem[],
        image_url: '' as string,
        assigned_to: [] as { id: string; name: string }[],
        due_date: '',
        linked_appointment_date: '',
        linked_appointment_info: '',
    });
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [futureAppointments, setFutureAppointments] = useState<FutureAppointment[]>([]);
    const [futureAptsLoading, setFutureAptsLoading] = useState(false);
    const [taskSaving, setTaskSaving] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [editingTask, setEditingTask] = useState<EmployeeTask | null>(null);
    const [editForm, setEditForm] = useState<Record<string, any>>({});
    const [editSaving, setEditSaving] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [taskHistory, setTaskHistory] = useState<any[]>([]);
    const [taskHistoryLoading, setTaskHistoryLoading] = useState(false);
    const [taskHistoryExpanded, setTaskHistoryExpanded] = useState(false);
    const [showLoginPopup, setShowLoginPopup] = useState(false);
    const [loginPopupTasks, setLoginPopupTasks] = useState<EmployeeTask[]>([]);
    const router = useRouter();
    const { userId: currentUserId, email: currentUserEmail } = useUserRoles();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Check auth
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/pracownik/login");
            } else {
                setUserEmail(user.email || '');
            }
        };
        checkAuth();
    }, []);

    // Fetch schedule
    const fetchSchedule = useCallback(async () => {
        setLoading(true);
        try {
            const weekStr = currentWeekStart.toISOString().split('T')[0];
            const response = await fetch(`/api/employee/schedule?weekStart=${weekStr}`);
            if (!response.ok) {
                if (response.status === 403) {
                    router.push("/pracownik/login");
                    return;
                }
                throw new Error('Failed to fetch schedule');
            }
            const data = await response.json();
            setScheduleData(data);
        } catch (err) {
            console.error('Failed to fetch schedule:', err);
        } finally {
            setLoading(false);
        }
    }, [currentWeekStart]);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    const navigateWeek = (direction: number) => {
        setCurrentWeekStart(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + direction * 7);
            return d;
        });
    };

    const goToToday = () => {
        setCurrentWeekStart(getMonday(new Date()));
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/pracownik/login");
    };

    // Get appointments for a specific doctor and day
    const getAppointmentsForCell = (doctor: string, day: ScheduleDay): ScheduleAppointment[] => {
        return day.appointments.filter(apt => apt.doctorName === doctor);
    };

    // Check if a time slot is occupied by an appointment
    const getAppointmentAtSlot = (appointments: ScheduleAppointment[], slotTime: string): ScheduleAppointment | null => {
        const slotMinutes = timeToMinutes(slotTime);
        for (const apt of appointments) {
            const startMin = timeToMinutes(apt.startTime);
            const endMin = startMin + apt.duration;
            if (slotMinutes >= startMin && slotMinutes < endMin) {
                return apt;
            }
        }
        return null;
    };

    // Calculate row span for an appointment
    const getAppointmentRowSpan = (apt: ScheduleAppointment): number => {
        return Math.max(1, Math.ceil(apt.duration / 15));
    };

    const isToday = (dateStr: string): boolean => {
        const today = new Date().toISOString().split('T')[0];
        return dateStr === today;
    };

    // Determine which days to show (skip Sat/Sun if empty)
    const getVisibleDays = (): ScheduleDay[] => {
        if (!scheduleData) return [];
        return scheduleData.days.filter((day, i) => {
            // Always show Mon-Fri
            if (i < 5) return true;
            // Show Sat/Sun only if they have appointments
            return day.appointments.length > 0;
        });
    };

    const weekEndDate = new Date(currentWeekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekLabel = `${currentWeekStart.getDate().toString().padStart(2, '0')}.${(currentWeekStart.getMonth() + 1).toString().padStart(2, '0')} - ${weekEndDate.getDate().toString().padStart(2, '0')}.${(weekEndDate.getMonth() + 1).toString().padStart(2, '0')}.${weekEndDate.getFullYear()}`;

    const visibleDays = getVisibleDays();
    const doctors = scheduleData?.doctors || [];
    const visibleDoctors = doctors.filter(d => !hiddenDoctors.has(d));

    const toggleDoctor = (doctor: string) => {
        setHiddenDoctors(prev => {
            const next = new Set(prev);
            if (next.has(doctor)) {
                next.delete(doctor);
            } else {
                next.add(doctor);
            }
            return next;
        });
    };

    const showAllDoctors = () => setHiddenDoctors(new Set());
    const hideAllDoctors = () => setHiddenDoctors(new Set(doctors));

    // Open patient history modal
    const openPatientHistory = useCallback(async (apt: ScheduleAppointment) => {
        if (!apt.patientId) return;
        setSelectedAppointment(apt);
        setPatientHistory(null);
        setHistoryError(null);
        setHistoryLoading(true);
        // Dismiss tooltips
        setHoveredAppointment(null);
        setNotesAppointment(null);
        setBadgeTooltip(null);
        try {
            const res = await fetch(`/api/employee/patient-history?patientId=${apt.patientId}&limit=50`);
            if (!res.ok) throw new Error('Nie udało się pobrać historii wizyt');
            const data = await res.json();
            setPatientHistory(data.appointments || []);
        } catch (err: any) {
            console.error('[PatientHistory] Error:', err);
            setHistoryError(err.message || 'Błąd serwera');
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    // Close modal on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && selectedAppointment) {
                setSelectedAppointment(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedAppointment]);

    // ─── Task Management Functions ──────────────────────────────
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

    const fetchEmployees = useCallback(async () => {
        try {
            const res = await fetch('/api/employee/staff');
            if (!res.ok) return;
            const data = await res.json();
            const allStaff: StaffMember[] = (data.staff || []).map((s: any) => ({
                id: s.id,
                name: s.name || s.email,
                email: s.email,
            }));
            setStaffList(allStaff);
        } catch (err) {
            console.error('[Staff] Error:', err);
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

    // Load tasks when switching to Zadania tab
    useEffect(() => {
        if (activeTab === 'zadania') {
            fetchTasks();
        }
    }, [activeTab, fetchTasks]);

    // Load employee list on mount
    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    // Login popup — show pending tasks once per session
    useEffect(() => {
        if (!currentUserId || !currentUserEmail) return;
        const popupKey = `taskPopupShown_${currentUserId}`;
        if (typeof window !== 'undefined' && sessionStorage.getItem(popupKey)) return;

        const fetchMyPending = async () => {
            try {
                const res = await fetch('/api/employee/tasks?status=todo&status=in_progress');
                if (!res.ok) return;
                const data = await res.json();
                const allTasks: EmployeeTask[] = data.tasks || [];
                // Filter to tasks assigned to me
                const myTasks = allTasks.filter(t =>
                    (t.assigned_to || []).some(a => a.id === currentUserId) ||
                    t.assigned_to_doctor_id === currentUserId ||
                    t.created_by_email === currentUserEmail
                );
                if (myTasks.length > 0) {
                    // Sort: overdue first, then by priority (urgent > normal > low), then by due date
                    const priorityOrder: Record<string, number> = { urgent: 0, normal: 1, low: 2 };
                    myTasks.sort((a, b) => {
                        const now = new Date();
                        const aOverdue = a.due_date && new Date(a.due_date) < now ? 0 : 1;
                        const bOverdue = b.due_date && new Date(b.due_date) < now ? 0 : 1;
                        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
                        const aPri = priorityOrder[a.priority] ?? 1;
                        const bPri = priorityOrder[b.priority] ?? 1;
                        if (aPri !== bPri) return aPri - bPri;
                        if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                        if (a.due_date) return -1;
                        if (b.due_date) return 1;
                        return 0;
                    });
                    setLoginPopupTasks(myTasks.slice(0, 5));
                    setShowLoginPopup(true);
                    if (typeof window !== 'undefined') sessionStorage.setItem(popupKey, '1');
                }
            } catch (err) {
                console.error('[LoginPopup] Error:', err);
            }
        };
        fetchMyPending();
    }, [currentUserId, currentUserEmail]);

    const resetTaskForm = () => {
        setTaskForm({
            title: '',
            description: '',
            priority: 'normal',
            task_type: '',
            checklist_items: [],
            image_url: '',
            assigned_to: [],
            due_date: '',
            linked_appointment_date: '',
            linked_appointment_info: '',
        });
        setTaskModalPrefill(null);
        setFutureAppointments([]);
    };

    // Image upload handler (for both create and edit)
    const handleImageUpload = async (file: File, mode: 'create' | 'edit' = 'create') => {
        setImageUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/employee/tasks/upload-image', {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            if (mode === 'create') {
                setTaskForm(p => ({ ...p, image_url: data.url }));
            } else {
                setEditForm(p => ({ ...p, image_url: data.url }));
            }
        } catch (err) {
            console.error('[Tasks] Image upload error:', err);
            alert('Nie udało się przesłać zdjęcia');
        } finally {
            setImageUploading(false);
        }
    };

    // Edit task
    const openEditModal = (task: EmployeeTask) => {
        setEditingTask(task);
        setEditForm({
            title: task.title || '',
            description: task.description || '',
            priority: task.priority || 'normal',
            task_type: task.task_type || '',
            due_date: task.due_date || '',
            assigned_to: task.assigned_to || [],
            image_url: task.image_url || '',
        });
    };

    const handleSaveEdit = async () => {
        if (!editingTask) return;
        setEditSaving(true);
        try {
            const res = await fetch(`/api/employee/tasks/${editingTask.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            if (!res.ok) throw new Error('Failed to update task');
            setEditingTask(null);
            setEditForm({});
            fetchTasks();
        } catch (err) {
            console.error('[Tasks] Edit error:', err);
        } finally {
            setEditSaving(false);
        }
    };

    const openTaskModal = (prefill?: { patientId?: string; patientName?: string; appointmentType?: string }) => {
        resetTaskForm();
        if (prefill) {
            setTaskModalPrefill(prefill);
            setTaskForm(prev => ({
                ...prev,
                title: prefill.appointmentType ? `${prefill.appointmentType} — ${prefill.patientName || ''}` : '',
            }));
            if (prefill.patientId) {
                fetchFutureAppointments(prefill.patientId);
            }
        }
        setShowTaskModal(true);
    };

    const handleCreateTask = async () => {
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
                patient_id: taskModalPrefill?.patientId || null,
                patient_name: taskModalPrefill?.patientName || null,
                appointment_type: taskModalPrefill?.appointmentType || null,
                assigned_to: taskForm.assigned_to.length > 0 ? taskForm.assigned_to : [],
                // Keep legacy fields for backward compat
                assigned_to_doctor_id: taskForm.assigned_to[0]?.id || null,
                assigned_to_doctor_name: taskForm.assigned_to[0]?.name || null,
                due_date: taskForm.due_date || null,
                linked_appointment_date: taskForm.linked_appointment_date || null,
                linked_appointment_info: taskForm.linked_appointment_info || null,
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
    };

    const handleUpdateStatus = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
        try {
            const res = await fetch(`/api/employee/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error('Failed');
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        } catch (err) {
            console.error('[Tasks] Update error:', err);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Czy na pewno chcesz usunąć to zadanie?')) return;
        try {
            const res = await fetch(`/api/employee/tasks/${taskId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            setTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (err) {
            console.error('[Tasks] Delete error:', err);
        }
    };

    const selectFutureAppointment = (apt: FutureAppointment) => {
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
    };

    const getStatusLabel = (s: string) => s === 'todo' ? 'Do zrobienia' : s === 'in_progress' ? 'W trakcie' : 'Gotowe';
    const getStatusColor = (s: string) => s === 'todo' ? '#94a3b8' : s === 'in_progress' ? '#f59e0b' : '#22c55e';
    const getPriorityLabel = (p: string) => p === 'low' ? 'Niski' : p === 'normal' ? 'Normalny' : 'Pilne';
    const getPriorityColor = (p: string) => p === 'low' ? '#64748b' : p === 'normal' ? '#38bdf8' : '#ef4444';
    const getNextStatus = (s: string): 'todo' | 'in_progress' | 'done' => s === 'todo' ? 'in_progress' : s === 'in_progress' ? 'done' : 'todo';

    // Toggle a checklist item and persist to DB
    const handleToggleChecklist = async (taskId: string, itemIndex: number) => {
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
    };

    const isMyTask = useCallback((task: EmployeeTask) => {
        const assignedToMe = (task.assigned_to || []).some(a => a.id === currentUserId);
        return assignedToMe || task.assigned_to_doctor_id === currentUserId || task.created_by_email === currentUserEmail;
    }, [currentUserId, currentUserEmail]);

    const filteredTasks = useMemo(() => {
        const base = taskFilter === 'all' ? tasks : tasks.filter(t => t.status === taskFilter);
        const priorityOrder: Record<string, number> = { urgent: 0, normal: 1, low: 2 };
        return [...base].sort((a, b) => {
            // My tasks first
            const aMine = isMyTask(a) ? 0 : 1;
            const bMine = isMyTask(b) ? 0 : 1;
            if (aMine !== bMine) return aMine - bMine;
            // Then by priority
            const aPri = priorityOrder[a.priority] ?? 1;
            const bPri = priorityOrder[b.priority] ?? 1;
            if (aPri !== bPri) return aPri - bPri;
            // Then by due date (earliest first)
            if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            if (a.due_date) return -1;
            if (b.due_date) return 1;
            return 0;
        });
    }, [tasks, taskFilter, isMyTask]);

    return (
        <div
            onClick={() => {
                // Dismiss tooltips when tapping outside (mobile support)
                setNotesAppointment(null);
                setBadgeTooltip(null);
            }}
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #0d1b2a 50%, #1b2838 100%)',
                color: '#fff',
            }}>
            {/* Header */}
            <header style={{
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
                padding: '1rem 2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.3rem',
                    }}>
                        👷
                    </div>
                    <div>
                        <h1 style={{
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            background: 'linear-gradient(135deg, #fff, #38bdf8)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            margin: 0,
                        }}>
                            Strefa Pracownika
                        </h1>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                            {userEmail}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem 1rem',
                        color: 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                        e.currentTarget.style.color = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                    }}
                >
                    <LogOut size={16} />
                    Wyloguj
                </button>
            </header>

            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                gap: '0.25rem',
                padding: '0.75rem 2rem 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(0, 0, 0, 0.15)',
            }}>
                {[
                    { id: 'grafik' as const, label: 'Grafik', icon: <Calendar size={16} /> },
                    { id: 'zadania' as const, label: 'Zadania', icon: <CheckSquare size={16} /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.65rem 1.25rem',
                            background: activeTab === tab.id ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
                            borderRadius: '0.5rem 0.5rem 0 0',
                            color: activeTab === tab.id ? '#38bdf8' : 'rgba(255,255,255,0.5)',
                            fontWeight: activeTab === tab.id ? '600' : '400',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            if (activeTab !== tab.id) {
                                e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== tab.id) {
                                e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══ GRAFIK TAB ═══ */}
            {activeTab === 'grafik' && (<>

                {/* Week Navigation */}
                <div style={{
                    padding: '1.25rem 2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Calendar size={20} style={{ color: '#38bdf8' }} />
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>
                            Grafik tygodniowy
                        </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                            onClick={() => navigateWeek(-1)}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '0.5rem',
                                padding: '0.5rem',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <button
                            onClick={goToToday}
                            style={{
                                background: 'rgba(56, 189, 248, 0.1)',
                                border: '1px solid rgba(56, 189, 248, 0.2)',
                                borderRadius: '0.5rem',
                                padding: '0.5rem 1rem',
                                color: '#38bdf8',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                        >
                            Dziś
                        </button>

                        <span style={{
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            color: 'rgba(255,255,255,0.9)',
                            minWidth: '200px',
                            textAlign: 'center',
                        }}>
                            {weekLabel}
                        </span>

                        <button
                            onClick={() => navigateWeek(1)}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '0.5rem',
                                padding: '0.5rem',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        >
                            <ChevronRight size={18} />
                        </button>

                        <button
                            onClick={fetchSchedule}
                            disabled={loading}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '0.5rem',
                                padding: '0.5rem',
                                color: loading ? 'rgba(255,255,255,0.3)' : '#fff',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.2s',
                            }}
                        >
                            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        </button>
                    </div>
                </div>

                {/* Loading state */}
                {loading && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '4rem 2rem',
                    }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem',
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                border: '3px solid rgba(56, 189, 248, 0.2)',
                                borderTop: '3px solid #38bdf8',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                            }} />
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                                Ładowanie grafiku...
                            </p>
                        </div>
                    </div>
                )}

                {/* Schedule Grid */}
                {!loading && scheduleData && (
                    <div style={{
                        padding: '1rem',
                    }}>
                        {/* Statistics bar */}
                        <div style={{
                            display: 'flex',
                            gap: '1.5rem',
                            marginBottom: '1rem',
                            flexWrap: 'wrap',
                        }}>
                            <div style={{
                                background: 'rgba(56, 189, 248, 0.08)',
                                border: '1px solid rgba(56, 189, 248, 0.15)',
                                borderRadius: '0.75rem',
                                padding: '0.75rem 1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>👨‍⚕️</span>
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                                    Operatorzy: <strong style={{ color: '#38bdf8' }}>{doctors.length}</strong>
                                </span>
                            </div>
                            <div style={{
                                background: 'rgba(34, 197, 94, 0.08)',
                                border: '1px solid rgba(34, 197, 94, 0.15)',
                                borderRadius: '0.75rem',
                                padding: '0.75rem 1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>📋</span>
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                                    Wizyt w tygodniu: <strong style={{ color: '#22c55e' }}>
                                        {scheduleData.days.reduce((sum, d) => sum + d.appointments.length, 0)}
                                    </strong>
                                </span>
                            </div>
                        </div>

                        {/* Operator Toggle Bar */}
                        <div style={{
                            marginBottom: '1rem',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '0.75rem',
                            padding: '0.75rem 1rem',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginRight: '0.25rem' }}>Operatorzy:</span>
                                <button
                                    onClick={showAllDoctors}
                                    style={{
                                        padding: '0.25rem 0.6rem',
                                        background: 'rgba(56, 189, 248, 0.1)',
                                        border: '1px solid rgba(56, 189, 248, 0.2)',
                                        borderRadius: '4px',
                                        color: '#38bdf8',
                                        cursor: 'pointer',
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                    }}
                                >Wszyscy</button>
                                <button
                                    onClick={hideAllDoctors}
                                    style={{
                                        padding: '0.25rem 0.6rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '4px',
                                        color: 'rgba(255,255,255,0.5)',
                                        cursor: 'pointer',
                                        fontSize: '0.7rem',
                                    }}
                                >Żaden</button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                {doctors.map(doctor => {
                                    const isVisible = !hiddenDoctors.has(doctor);
                                    return (
                                        <button
                                            key={doctor}
                                            onClick={() => toggleDoctor(doctor)}
                                            style={{
                                                padding: '0.3rem 0.7rem',
                                                background: isVisible ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)',
                                                border: `1px solid ${isVisible ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                                                borderRadius: '6px',
                                                color: isVisible ? '#38bdf8' : 'rgba(255,255,255,0.3)',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem',
                                                fontWeight: isVisible ? '600' : '400',
                                                transition: 'all 0.15s',
                                                textDecoration: isVisible ? 'none' : 'line-through',
                                            }}
                                        >
                                            {isVisible ? '✓ ' : ''}{doctor.split(' ').slice(0, 2).join(' ')}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* The grid table — scrollable container */}
                        <div style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '1rem',
                            overflowX: 'auto',
                            WebkitOverflowScrolling: 'touch',
                        }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                minWidth: `${(visibleDays.length * visibleDoctors.length * 120) + 80}px`,
                                tableLayout: 'fixed',
                            }}>
                                {/* Header Row 1: Day names */}
                                <thead>
                                    <tr>
                                        <th style={{
                                            width: '70px',
                                            minWidth: '70px',
                                            background: 'rgba(0,0,0,0.4)',
                                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                                            borderRight: '2px solid rgba(56, 189, 248, 0.2)',
                                            padding: '0.5rem',
                                            position: 'sticky',
                                            left: 0,
                                            zIndex: 10,
                                        }}>
                                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Godzina</span>
                                        </th>
                                        {visibleDays.map((day) => (
                                            <th
                                                key={day.date}
                                                colSpan={visibleDoctors.length}
                                                style={{
                                                    background: isToday(day.date) ? 'rgba(56, 189, 248, 0.12)' : 'rgba(0,0,0,0.4)',
                                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                                    borderRight: '2px solid rgba(255,255,255,0.1)',
                                                    padding: '0.6rem 0.5rem 0.3rem',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                <div style={{
                                                    fontSize: '0.85rem',
                                                    fontWeight: 'bold',
                                                    color: isToday(day.date) ? '#38bdf8' : 'rgba(255,255,255,0.9)',
                                                }}>
                                                    {day.dayName}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.7rem',
                                                    color: isToday(day.date) ? '#38bdf8' : 'rgba(255,255,255,0.5)',
                                                    fontWeight: isToday(day.date) ? '600' : '400',
                                                }}>
                                                    {formatDateShort(day.date)}
                                                    {isToday(day.date) && ' (dziś)'}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>

                                    {/* Header Row 2: Doctor names */}
                                    <tr>
                                        <th style={{
                                            background: 'rgba(0,0,0,0.4)',
                                            borderBottom: '2px solid rgba(56, 189, 248, 0.3)',
                                            borderRight: '2px solid rgba(56, 189, 248, 0.2)',
                                            padding: '0.4rem',
                                            position: 'sticky',
                                            left: 0,
                                            zIndex: 10,
                                        }} />
                                        {visibleDays.map((day) =>
                                            visibleDoctors.map((doctor, dIdx) => {
                                                // Count appointments for this doctor on this day
                                                const count = day.appointments.filter(a => a.doctorName === doctor).length;
                                                return (
                                                    <th
                                                        key={`${day.date}-${doctor}`}
                                                        style={{
                                                            background: isToday(day.date) ? 'rgba(56, 189, 248, 0.06)' : 'rgba(0,0,0,0.3)',
                                                            borderBottom: '2px solid rgba(56, 189, 248, 0.3)',
                                                            borderRight: dIdx === visibleDoctors.length - 1
                                                                ? '2px solid rgba(255,255,255,0.1)'
                                                                : '1px solid rgba(255,255,255,0.05)',
                                                            padding: '0.35rem 0.25rem',
                                                            textAlign: 'center',
                                                            width: '120px',
                                                            minWidth: '120px',
                                                        }}
                                                    >
                                                        <div style={{
                                                            fontSize: '0.65rem',
                                                            fontWeight: '600',
                                                            color: 'rgba(255,255,255,0.8)',
                                                            lineHeight: '1.2',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                        }}>
                                                            {doctor.split(' ').slice(0, 2).join(' ')}
                                                        </div>
                                                        {count > 0 && (
                                                            <div style={{
                                                                fontSize: '0.6rem',
                                                                color: '#38bdf8',
                                                                marginTop: '2px',
                                                            }}>
                                                                {count} wiz.
                                                            </div>
                                                        )}
                                                    </th>
                                                );
                                            })
                                        )}
                                    </tr>
                                </thead>

                                {/* Body: Time slots */}
                                <tbody>
                                    {TIME_SLOTS.map((slotTime, slotIdx) => {
                                        const isHourStart = slotTime.endsWith(':00');
                                        const isHalfHour = slotTime.endsWith(':30');
                                        return (
                                            <tr key={slotTime}>
                                                {/* Time label */}
                                                <td style={{
                                                    background: 'rgba(0,0,0,0.3)',
                                                    borderRight: '2px solid rgba(56, 189, 248, 0.2)',
                                                    borderBottom: isHourStart ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.03)',
                                                    padding: '0 0.4rem',
                                                    fontSize: '0.65rem',
                                                    color: isHourStart ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                                                    fontWeight: isHourStart ? '600' : '400',
                                                    textAlign: 'right',
                                                    height: '24px',
                                                    position: 'sticky',
                                                    left: 0,
                                                    zIndex: 5,
                                                    fontFamily: 'monospace',
                                                }}>
                                                    {(isHourStart || isHalfHour) ? slotTime : ''}
                                                </td>

                                                {/* Cells for each doctor × day */}
                                                {visibleDays.map((day) =>
                                                    visibleDoctors.map((doctor, dIdx) => {
                                                        const dayAppointments = getAppointmentsForCell(doctor, day);
                                                        const apt = getAppointmentAtSlot(dayAppointments, slotTime);

                                                        // Check if this is the START of an appointment
                                                        const isStart = apt && apt.startTime === slotTime;
                                                        // If appointment continues from above, skip rendering
                                                        if (apt && !isStart) {
                                                            return null; // will be covered by rowSpan
                                                        }

                                                        const rowSpan = isStart ? getAppointmentRowSpan(apt) : 1;
                                                        const color = isStart ? getAppointmentColor(apt.appointmentTypeId) : null;

                                                        return (
                                                            <td
                                                                key={`${day.date}-${doctor}-${slotTime}`}
                                                                rowSpan={rowSpan}
                                                                style={{
                                                                    borderBottom: isHourStart ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.02)',
                                                                    borderRight: dIdx === visibleDoctors.length - 1
                                                                        ? '2px solid rgba(255,255,255,0.08)'
                                                                        : '1px solid rgba(255,255,255,0.03)',
                                                                    padding: isStart ? '2px 3px' : '0',
                                                                    verticalAlign: 'top',
                                                                    height: '24px',
                                                                    background: isToday(day.date)
                                                                        ? 'rgba(56, 189, 248, 0.02)'
                                                                        : 'transparent',
                                                                    position: 'relative',
                                                                }}
                                                            >
                                                                {isStart && apt && color && (
                                                                    <div
                                                                        style={{
                                                                            background: color.bg,
                                                                            borderLeft: `3px solid ${color.border}`,
                                                                            borderRadius: '4px',
                                                                            padding: '3px 5px',
                                                                            height: '100%',
                                                                            overflow: 'hidden',
                                                                            cursor: 'pointer',
                                                                            transition: 'opacity 0.15s',
                                                                            position: 'relative',
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.opacity = '0.85';
                                                                            setHoveredAppointment(apt);
                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                            setTooltipPos({
                                                                                x: rect.left + rect.width / 2,
                                                                                y: rect.bottom + 5,
                                                                            });
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.opacity = '1';
                                                                            setHoveredAppointment(null);
                                                                        }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (apt.patientId) {
                                                                                openPatientHistory(apt);
                                                                            }
                                                                        }}
                                                                    >
                                                                        {/* Notes icon — top-right corner */}
                                                                        {apt.notes && (
                                                                            <div
                                                                                style={{
                                                                                    position: 'absolute',
                                                                                    top: '1px',
                                                                                    right: '2px',
                                                                                    width: '14px',
                                                                                    height: '14px',
                                                                                    borderRadius: '50%',
                                                                                    background: 'rgba(0,0,0,0.35)',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    fontSize: '0.5rem',
                                                                                    fontWeight: 'bold',
                                                                                    color: '#fff',
                                                                                    cursor: 'help',
                                                                                    zIndex: 2,
                                                                                    lineHeight: 1,
                                                                                }}
                                                                                onMouseEnter={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setNotesAppointment(apt);
                                                                                    setHoveredAppointment(null);
                                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                                    setNotesTooltipPos({
                                                                                        x: rect.left + rect.width / 2,
                                                                                        y: rect.bottom + 5,
                                                                                    });
                                                                                }}
                                                                                onMouseLeave={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setNotesAppointment(null);
                                                                                }}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    e.preventDefault();
                                                                                    if (notesAppointment?.id === apt.id) {
                                                                                        setNotesAppointment(null);
                                                                                    } else {
                                                                                        setNotesAppointment(apt);
                                                                                        setHoveredAppointment(null);
                                                                                        setBadgeTooltip(null);
                                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                                        setNotesTooltipPos({
                                                                                            x: rect.left + rect.width / 2,
                                                                                            y: rect.bottom + 5,
                                                                                        });
                                                                                    }
                                                                                }}
                                                                            >
                                                                                i
                                                                            </div>
                                                                        )}
                                                                        <div style={{
                                                                            fontSize: '0.6rem',
                                                                            fontWeight: 'bold',
                                                                            color: color.text,
                                                                            lineHeight: '1.2',
                                                                            whiteSpace: 'nowrap',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            paddingRight: apt.notes ? '14px' : '0',
                                                                        }}>
                                                                            {apt.patientName}
                                                                        </div>
                                                                        {rowSpan > 1 && (
                                                                            <div style={{
                                                                                fontSize: '0.55rem',
                                                                                color: color.text,
                                                                                opacity: 0.8,
                                                                                marginTop: '1px',
                                                                                whiteSpace: 'nowrap',
                                                                                overflow: 'hidden',
                                                                                textOverflow: 'ellipsis',
                                                                            }}>
                                                                                {apt.appointmentType}
                                                                            </div>
                                                                        )}
                                                                        {/* Badge icons — bottom-left corner */}
                                                                        {apt.badges && apt.badges.length > 0 && (
                                                                            <div
                                                                                style={{
                                                                                    position: 'absolute',
                                                                                    bottom: '1px',
                                                                                    left: '2px',
                                                                                    display: 'flex',
                                                                                    gap: '1px',
                                                                                    zIndex: 2,
                                                                                }}
                                                                                onMouseEnter={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setHoveredAppointment(null);
                                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                                    setBadgeTooltip({
                                                                                        badges: apt.badges,
                                                                                        x: rect.left + rect.width / 2,
                                                                                        y: rect.top - 5,
                                                                                    });
                                                                                }}
                                                                                onMouseLeave={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setBadgeTooltip(null);
                                                                                }}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    e.preventDefault();
                                                                                    if (badgeTooltip) {
                                                                                        setBadgeTooltip(null);
                                                                                    } else {
                                                                                        setHoveredAppointment(null);
                                                                                        setNotesAppointment(null);
                                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                                        setBadgeTooltip({
                                                                                            badges: apt.badges,
                                                                                            x: rect.left + rect.width / 2,
                                                                                            y: rect.top - 5,
                                                                                        });
                                                                                    }
                                                                                }}
                                                                            >
                                                                                {apt.badges.map((badge) => (
                                                                                    <div
                                                                                        key={badge.id}
                                                                                        style={{
                                                                                            minWidth: '13px',
                                                                                            height: '13px',
                                                                                            borderRadius: '3px',
                                                                                            background: badge.color || '#888',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            fontSize: '0.4rem',
                                                                                            fontWeight: 'bold',
                                                                                            color: '#fff',
                                                                                            cursor: 'help',
                                                                                            lineHeight: 1,
                                                                                            padding: '0 1px',
                                                                                            textShadow: '0 0 2px rgba(0,0,0,0.5)',
                                                                                        }}
                                                                                    >
                                                                                        {getBadgeLetter(badge.id)}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Legend */}
                        <div style={{
                            marginTop: '1.5rem',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                            padding: '1rem',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '0.75rem',
                            border: '1px solid rgba(255,255,255,0.05)',
                        }}>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginRight: '0.5rem' }}>Legenda:</span>
                            {Object.values(PRODENTIS_COLORS).map(item => (
                                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '3px',
                                        background: item.bg,
                                        border: `1px solid ${item.border}`,
                                    }} />
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tooltip */}
                {hoveredAppointment && (
                    <div style={{
                        position: 'fixed',
                        left: `${Math.min(tooltipPos.x, window.innerWidth - 280)}px`,
                        top: `${Math.min(tooltipPos.y, window.innerHeight - 200)}px`,
                        background: 'rgba(10, 10, 10, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '0.75rem',
                        padding: '0.875rem 1rem',
                        zIndex: 1000,
                        minWidth: '240px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                        pointerEvents: 'none',
                        transform: 'translateX(-50%)',
                    }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.5rem' }}>
                            {hoveredAppointment.patientName}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.75rem' }}>
                            <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                                ⏰ {hoveredAppointment.startTime} - {hoveredAppointment.endTime} ({hoveredAppointment.duration} min)
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                                🩺 {hoveredAppointment.doctorName}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                                📋 {hoveredAppointment.appointmentType}
                            </div>
                            {hoveredAppointment.patientPhone && (
                                <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                                    📞 {hoveredAppointment.patientPhone}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Notes Tooltip */}
                {notesAppointment && notesAppointment.notes && (
                    <div style={{
                        position: 'fixed',
                        left: `${Math.min(notesTooltipPos.x, typeof window !== 'undefined' ? window.innerWidth - 320 : 600)}px`,
                        top: `${Math.min(notesTooltipPos.y, typeof window !== 'undefined' ? window.innerHeight - 250 : 400)}px`,
                        background: 'rgba(10, 10, 10, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '0.75rem',
                        padding: '0.75rem 1rem',
                        zIndex: 1001,
                        minWidth: '200px',
                        maxWidth: '320px',
                        maxHeight: '250px',
                        overflowY: 'auto',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                        pointerEvents: 'auto',
                        transform: 'translateX(-50%)',
                    }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            marginBottom: '0.5rem',
                            borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
                            paddingBottom: '0.4rem',
                        }}>
                            <span style={{ fontSize: '0.8rem' }}>ℹ️</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#38bdf8' }}>
                                Notatka — {notesAppointment.patientName}
                            </span>
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'rgba(255,255,255,0.85)',
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.5',
                            wordBreak: 'break-word',
                        }}>
                            {notesAppointment.notes}
                        </div>
                    </div>
                )}

                {/* Badge Tooltip */}
                {badgeTooltip && (
                    <div style={{
                        position: 'fixed',
                        left: `${Math.min(badgeTooltip.x, typeof window !== 'undefined' ? window.innerWidth - 250 : 500)}px`,
                        top: `${Math.max(badgeTooltip.y - 10, 10)}px`,
                        background: 'rgba(10, 10, 10, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '0.6rem',
                        padding: '0.5rem 0.75rem',
                        zIndex: 1001,
                        minWidth: '140px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                        pointerEvents: 'auto',
                        transform: 'translateX(-50%) translateY(-100%)',
                    }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem' }}>
                            Odznaczenia
                        </div>
                        {badgeTooltip.badges.map((badge) => (
                            <div key={badge.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.15rem 0',
                                fontSize: '0.75rem',
                            }}>
                                <div style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '3px',
                                    background: badge.color || '#888',
                                    flexShrink: 0,
                                }} />
                                <span style={{ color: 'rgba(255,255,255,0.9)' }}>
                                    {badge.name}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Patient History Modal */}
                {selectedAppointment && (
                    <div
                        onClick={() => setSelectedAppointment(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 2000,
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
                                maxWidth: '700px',
                                maxHeight: '85vh',
                                overflowY: 'auto',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{
                                position: 'sticky',
                                top: 0,
                                background: 'linear-gradient(135deg, #0d1b2a, #1b2838)',
                                borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
                                padding: '1.25rem 1.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                zIndex: 1,
                                borderRadius: '1rem 1rem 0 0',
                            }}>
                                <div>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.3rem' }}>
                                        {selectedAppointment.patientName}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                        {selectedAppointment.appointmentType} • {selectedAppointment.doctorName}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.15rem' }}>
                                        {selectedAppointment.startTime} – {selectedAppointment.endTime} ({selectedAppointment.duration} min)
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexShrink: 0 }}>
                                    <button
                                        onClick={() => {
                                            openTaskModal({
                                                patientId: selectedAppointment.patientId,
                                                patientName: selectedAppointment.patientName,
                                                appointmentType: selectedAppointment.appointmentType,
                                            });
                                        }}
                                        style={{
                                            background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                                            border: 'none',
                                            borderRadius: '0.5rem',
                                            padding: '0.4rem 0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            color: '#fff',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        <Plus size={14} /> Zadanie
                                    </button>
                                    <button
                                        onClick={() => setSelectedAppointment(null)}
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
                                            flexShrink: 0,
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div style={{ padding: '1.25rem 1.5rem' }}>
                                {historyLoading && (
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
                                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                                            Ładowanie historii wizyt...
                                        </p>
                                    </div>
                                )}

                                {historyError && (
                                    <div style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '0.75rem',
                                        padding: '1rem',
                                        color: '#ef4444',
                                        fontSize: '0.85rem',
                                        textAlign: 'center',
                                    }}>
                                        ❌ {historyError}
                                    </div>
                                )}

                                {patientHistory && patientHistory.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
                                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                                            Brak historii wizyt dla tego pacjenta
                                        </p>
                                    </div>
                                )}

                                {patientHistory && patientHistory.length > 0 && (
                                    <div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'rgba(255,255,255,0.5)',
                                            marginBottom: '1rem',
                                        }}>
                                            Historia wizyt ({patientHistory.length})
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {patientHistory.map((visit, idx) => (
                                                <div key={idx} style={{
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '0.75rem',
                                                    padding: '1rem',
                                                }}>
                                                    {/* Visit header */}
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'flex-start',
                                                        marginBottom: visit.medicalDetails ? '0.75rem' : '0',
                                                        flexWrap: 'wrap',
                                                        gap: '0.5rem',
                                                    }}>
                                                        <div>
                                                            <div style={{ color: '#38bdf8', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                                                                {new Date(visit.date).toLocaleDateString('pl-PL', {
                                                                    weekday: 'short',
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </div>
                                                            <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                                {visit.doctor?.name || 'Nieznany lekarz'}
                                                            </div>
                                                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                                                                {new Date(visit.date).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                                                {visit.endDate && ` – ${new Date(visit.endDate).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`}
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}>
                                                                {visit.cost ? visit.cost.toFixed(2) : '0.00'} PLN
                                                            </div>
                                                            <div style={{
                                                                display: 'inline-block',
                                                                padding: '0.2rem 0.6rem',
                                                                background: visit.balance === 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                                                                border: `1px solid ${visit.balance === 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(249, 115, 22, 0.3)'}`,
                                                                borderRadius: '99px',
                                                                color: visit.balance === 0 ? '#22c55e' : '#f97316',
                                                                fontSize: '0.65rem',
                                                                fontWeight: 'bold',
                                                                marginTop: '0.25rem',
                                                            }}>
                                                                {visit.balance === 0 ? '✓ Opłacono' : `Do zapłaty: ${(visit.balance || 0).toFixed(2)} PLN`}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Medical Details */}
                                                    {visit.medicalDetails && (
                                                        <div style={{
                                                            background: 'rgba(0, 0, 0, 0.2)',
                                                            borderRadius: '0.5rem',
                                                            padding: '0.85rem',
                                                        }}>
                                                            {visit.medicalDetails.visitDescription && (
                                                                <div style={{ marginBottom: '0.75rem' }}>
                                                                    <div style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                                                                        📝 Opis wizyty
                                                                    </div>
                                                                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                                                                        {visit.medicalDetails.visitDescription}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {visit.medicalDetails.diagnosis && (
                                                                <div style={{ marginBottom: '0.75rem' }}>
                                                                    <div style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                                                                        🔬 Rozpoznanie
                                                                    </div>
                                                                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
                                                                        {visit.medicalDetails.diagnosis}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {visit.medicalDetails.procedures && visit.medicalDetails.procedures.length > 0 && (
                                                                <div style={{ marginBottom: '0.75rem' }}>
                                                                    <div style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                                                                        🦷 Procedury
                                                                    </div>
                                                                    {visit.medicalDetails.procedures.map((proc, pidx) => (
                                                                        <div key={pidx} style={{
                                                                            background: 'rgba(255,255,255,0.03)',
                                                                            padding: '0.5rem 0.6rem',
                                                                            borderRadius: '0.35rem',
                                                                            marginBottom: '0.35rem',
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'flex-start',
                                                                            gap: '0.5rem',
                                                                        }}>
                                                                            <div>
                                                                                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                                                    {proc.procedureName} {proc.tooth && `(ząb ${proc.tooth})`}
                                                                                </div>
                                                                                {proc.diagnosis && (
                                                                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginTop: '0.15rem' }}>
                                                                                        {proc.diagnosis}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                                                {(proc.price || 0).toFixed(2)} PLN
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {visit.medicalDetails.recommendations && (
                                                                <div style={{ marginBottom: '0.75rem' }}>
                                                                    <div style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                                                                        💊 Zalecenia
                                                                    </div>
                                                                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                                                                        {visit.medicalDetails.recommendations}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {visit.medicalDetails.medications && visit.medicalDetails.medications.length > 0 && (
                                                                <div>
                                                                    <div style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                                                                        💉 Leki
                                                                    </div>
                                                                    {visit.medicalDetails.medications.map((med, midx) => (
                                                                        <div key={midx} style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                                                                            • {med.name}{med.dosage ? ` — ${med.dosage}` : ''}{med.duration ? ` (${med.duration})` : ''}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </>)}

            {/* ═══ ZADANIA TAB ═══ */}
            {activeTab === 'zadania' && (
                <div style={{
                    padding: '2rem',
                    maxWidth: '900px',
                    margin: '0 auto',
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '1.25rem',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <CheckSquare size={24} style={{ color: '#38bdf8' }} />
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                                Lista zadań
                            </h2>
                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>({tasks.length})</span>
                        </div>
                        <button
                            onClick={() => openTaskModal()}
                            style={{
                                background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                padding: '0.5rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                color: '#fff',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                            }}
                        >
                            <Plus size={16} /> Dodaj zadanie
                        </button>
                    </div>

                    {/* Filter bar */}
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
                                {f === 'all' ? `Wszystkie (${tasks.length})` : `${getStatusLabel(f)} (${tasks.filter(t => t.status === f).length})`}
                            </button>
                        ))}
                    </div>

                    {/* Task list */}
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
                                        borderLeft: mine ? '3px solid #38bdf8' : undefined,
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
                                                const newId = expandedTaskId === task.id ? null : task.id;
                                                setExpandedTaskId(newId);
                                                setTaskHistoryExpanded(false);
                                                if (newId) {
                                                    // Fetch history
                                                    setTaskHistoryLoading(true);
                                                    setTaskHistory([]);
                                                    fetch(`/api/employee/tasks/${newId}?history=true`)
                                                        .then(r => r.json())
                                                        .then(d => setTaskHistory(d.history || []))
                                                        .catch(() => setTaskHistory([]))
                                                        .finally(() => setTaskHistoryLoading(false));
                                                }
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
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.5rem' }}>
                                                    Utworzone przez {(() => {
                                                        const match = staffList.find(s => s.email === task.created_by_email);
                                                        return match ? match.name : task.created_by_email;
                                                    })()} • {new Date(task.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
                                                                                    let oldDisplay = val.old || '—';
                                                                                    let newDisplay = val.new || '—';
                                                                                    if (key === 'status') {
                                                                                        oldDisplay = statusLabels[val.old] || val.old || '—';
                                                                                        newDisplay = statusLabels[val.new] || val.new || '—';
                                                                                    } else if (key === 'priority') {
                                                                                        oldDisplay = priorityLabels[val.old] || val.old || '—';
                                                                                        newDisplay = priorityLabels[val.new] || val.new || '—';
                                                                                    } else if (key === 'image_url') {
                                                                                        oldDisplay = val.old ? '📷' : '—';
                                                                                        newDisplay = val.new ? '📷' : '—';
                                                                                    } else if (key === 'due_date') {
                                                                                        oldDisplay = val.old ? new Date(val.old).toLocaleDateString('pl-PL') : '—';
                                                                                        newDisplay = val.new ? new Date(val.new).toLocaleDateString('pl-PL') : '—';
                                                                                    }
                                                                                    // Skip internal IDs
                                                                                    if (key === 'assigned_to_doctor_id') return null;
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
                </div>
            )}

            {/* ═══ NEW TASK MODAL ═══ */}
            {showTaskModal && (
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

                        {/* Photo upload */}
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', display: 'block' }}>📸 Zdjęcie (opcjonalnie)</label>
                            {taskForm.image_url ? (
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <img src={taskForm.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }} />
                                    <button
                                        onClick={() => setTaskForm(p => ({ ...p, image_url: '' }))}
                                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '0.7rem' }}
                                    >✕</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <label style={{
                                        flex: 1,
                                        padding: '0.6rem',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '0.5rem',
                                        color: 'rgba(255,255,255,0.6)',
                                        fontSize: '0.8rem',
                                        textAlign: 'center',
                                        cursor: imageUploading ? 'wait' : 'pointer',
                                        opacity: imageUploading ? 0.5 : 1,
                                    }}>
                                        {imageUploading ? '⏳ Przesyłanie...' : '📷 Aparat / Galeria'}
                                        <input
                                            type="file"
                                            accept="image/*"

                                            style={{ display: 'none' }}
                                            disabled={imageUploading}
                                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'create'); }}
                                        />
                                    </label>
                                </div>
                            )}
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

                                {/* Photo */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', display: 'block' }}>📸 Zdjęcie</label>
                                    {editForm.image_url ? (
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                            <img src={editForm.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }} />
                                            <button
                                                onClick={() => setEditForm(p => ({ ...p, image_url: '' }))}
                                                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '0.7rem' }}
                                            >✕</button>
                                        </div>
                                    ) : (
                                        <label style={{
                                            display: 'block',
                                            padding: '0.6rem',
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            borderRadius: '0.5rem',
                                            color: 'rgba(255,255,255,0.6)',
                                            fontSize: '0.8rem',
                                            textAlign: 'center',
                                            cursor: imageUploading ? 'wait' : 'pointer',
                                            opacity: imageUploading ? 0.5 : 1,
                                        }}>
                                            {imageUploading ? '⏳ Przesyłanie...' : '📷 Dodaj zdjęcie'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                disabled={imageUploading}
                                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'edit'); }}
                                            />
                                        </label>
                                    )}
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
                                        <div key={task.id} style={{
                                            padding: '0.65rem 0.85rem',
                                            background: overdue ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.04)',
                                            border: `1px solid ${overdue ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.08)'}`,
                                            borderRadius: '0.6rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.6rem',
                                        }}>
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
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Action buttons */}
                            <div style={{ padding: '0.75rem 1.25rem 1.25rem', display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => {
                                        setShowLoginPopup(false);
                                        setActiveTab('zadania');
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

            {/* CSS animations */}
            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div >
    );
}
