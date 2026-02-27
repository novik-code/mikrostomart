"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { LogOut, ChevronLeft, ChevronRight, Calendar, RefreshCw, CheckSquare, Plus, User, AlertTriangle, Trash2, Clock, X, Bell, Bot, Lightbulb, ThumbsUp, MessageSquare, Send, Menu } from "lucide-react";
import VoiceAssistant from "@/components/VoiceAssistant";
import { useUserRoles } from "@/hooks/useUserRoles";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";
import { QRCodeSVG } from "qrcode.react";
import { CONSENT_TYPES } from "@/lib/consentTypes";

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
    status: 'todo' | 'in_progress' | 'done' | 'archived';
    priority: 'low' | 'normal' | 'urgent';
    task_type: string | null;
    checklist_items: ChecklistItem[];
    image_url: string | null;
    patient_id: string | null;
    patient_name: string | null;
    appointment_type: string | null;
    due_date: string | null;
    due_time: string | null;
    linked_appointment_date: string | null;
    linked_appointment_info: string | null;
    assigned_to_doctor_id: string | null;
    assigned_to_doctor_name: string | null;
    assigned_to: { id: string; name: string }[];
    created_by_email: string | null;
    created_at: string;
    updated_at: string;
    // Private task fields (migration 028)
    is_private: boolean;
    owner_user_id: string | null;
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

// ─── Task Type Templates (dynamic from DB, fallback hardcoded) ───────
interface TaskTypeTemplate {
    id: string;
    key: string;
    label: string;
    icon: string;
    items: string[];
    sort_order: number;
    is_active: boolean;
}

// Fallback used before DB templates are loaded
const FALLBACK_TASK_TYPE_CHECKLISTS: Record<string, { label: string; icon: string; items: string[] }> = {
    'modele_archiwalne': { label: 'Modele Archiwalne', icon: '📦', items: ['Zgrać skany'] },
    'modele_analityczne': { label: 'Modele Analityczne / Wax Up', icon: '🔬', items: ['Zgrać skany'] },
    'korona_zab': { label: 'Korona na Zębie', icon: '🦷', items: ['Zgrać dane', 'Projekt', 'Frez', 'Piec', 'Charakteryzacja', 'Wycienienie', 'Spr'] },
    'korona_implant': { label: 'Korona na Implancie', icon: '🔩', items: ['Zgrać dane', 'Stworzyć model', 'Projekt', 'Frez', 'Piec', 'Charakteryzacja', 'Skleić z ti base', 'Spr'] },
    'chirurgia': { label: 'Chirurgia / Implantologia', icon: '🏥', items: ['Zgrać CBCT', 'Zgrać skany', 'Projekt szablonu', 'Podać rozmiar implantów', 'Zamówić implant', 'Zamówić multiunit', 'Druk', 'Sprawdzić dziurki', 'Sterylizacja', 'Wpłacony zadatek'] },
    'ortodoncja': { label: 'Ortodoncja', icon: '😁', items: ['Wgrać dane do CC', 'Pokazać wizualizacje', 'Akceptacja', 'Wpłata 50%', 'Zamówienie nakładek'] },
    'plan_leczenia': { label: 'Plan Leczenia', icon: '📝', items: ['Plan', 'Prezentacja', 'Sprawdzić', 'Druk', 'Oddanie'] },
    'inne': { label: 'Inne', icon: '📋', items: [] },
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
    const [userId, setUserId] = useState<string>('');
    const [hiddenDoctors, setHiddenDoctors] = useState<Set<string>>(() => {
        try {
            const saved = typeof window !== 'undefined' ? localStorage.getItem('schedule-hidden-doctors') : null;
            return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
        } catch { return new Set(); }
    });
    // ─── Schedule: hidden days of week (persisted to localStorage) ─────────
    const [hiddenScheduleDays, setHiddenScheduleDays] = useState<Set<number>>(() => {
        try {
            const saved = typeof window !== 'undefined' ? localStorage.getItem('schedule-hidden-days') : null;
            return saved ? new Set(JSON.parse(saved) as number[]) : new Set();
        } catch { return new Set(); }
    });
    const [selectedAppointment, setSelectedAppointment] = useState<ScheduleAppointment | null>(null);
    const [patientHistory, setPatientHistory] = useState<Visit[] | null>(null);
    // E-Karta QR state
    const [qrModal, setQrModal] = useState<{ url: string; expiresAt: string } | null>(null);
    const [qrLoading, setQrLoading] = useState(false);
    // Patient data modal state
    const [patientDataModal, setPatientDataModal] = useState<any>(null);
    const [patientDataLoading, setPatientDataLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<string>('');
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'grafik' | 'zadania' | 'asystent' | 'powiadomienia' | 'sugestie'>('grafik');

    // ─── Feature suggestions state ───
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [sugLoading, setSugLoading] = useState(false);
    const [sugForm, setSugForm] = useState({ content: '', category: 'funkcja' });
    const [sugSubmitting, setSugSubmitting] = useState(false);
    const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
    const [sugComments, setSugComments] = useState<Record<string, any[]>>({});
    const [sugCommentText, setSugCommentText] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile viewport for tab bar layout
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // ─── Push Notification History ────────────────────────────────
    const [pushNotifications, setPushNotifications] = useState<{ id: string; title: string; body: string; url: string | null; tag: string | null; sent_at: string }[]>([]);
    const [pushNotifLoading, setPushNotifLoading] = useState(false);
    const [pushNotifError, setPushNotifError] = useState<string | null>(null);

    const fetchPushNotifications = useCallback(async () => {
        setPushNotifLoading(true);
        setPushNotifError(null);
        try {
            const res = await fetch('/api/employee/push/history');
            if (!res.ok) throw new Error('Błąd serwera');
            const data = await res.json();
            setPushNotifications(data.notifications || []);
        } catch (e: any) {
            setPushNotifError(e?.message || 'Błąd pobierania historii');
        } finally {
            setPushNotifLoading(false);
        }
    }, []);

    // ─── Task Management State ───────────────────────────────
    const [tasks, setTasks] = useState<EmployeeTask[]>([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [taskFilter, setTaskFilter] = useState<'all' | 'todo' | 'in_progress' | 'done' | 'archived'>('all');
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
        image_urls: [] as string[],
        assigned_to: [] as { id: string; name: string }[],
        due_date: '',
        linked_appointment_date: '',
        linked_appointment_info: '',
        is_private: false,
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
    const [selectedViewTask, setSelectedViewTask] = useState<EmployeeTask | null>(null);
    const [taskHistory, setTaskHistory] = useState<any[]>([]);
    const [taskHistoryLoading, setTaskHistoryLoading] = useState(false);
    const [taskHistoryExpanded, setTaskHistoryExpanded] = useState(false);
    const [showLoginPopup, setShowLoginPopup] = useState(false);
    const [loginPopupTasks, setLoginPopupTasks] = useState<EmployeeTask[]>([]);
    // ─── Enhanced Task Management State ──────────────────
    const [taskViewMode, setTaskViewMode] = useState<'list' | 'kanban' | 'calendar'>('kanban');
    const [taskSearchQuery, setTaskSearchQuery] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [taskComments, setTaskComments] = useState<Record<string, any[]>>({});
    const [commentInput, setCommentInput] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [allLabels, setAllLabels] = useState<{ id: string; name: string; color: string }[]>([]);
    const [taskLabelMap, setTaskLabelMap] = useState<Record<string, string[]>>({});
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [calendarDayPopup, setCalendarDayPopup] = useState<{ day: number; tasks: EmployeeTask[] } | null>(null);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
    // ─── Dynamic Task Type Templates ──────────────────────
    const [taskTypeTemplates, setTaskTypeTemplates] = useState<TaskTypeTemplate[]>([]);
    const [showTypeManager, setShowTypeManager] = useState(false);
    const [typeManagerForm, setTypeManagerForm] = useState({ label: '', icon: '📋', items: [''] });
    const [typeManagerSaving, setTypeManagerSaving] = useState(false);
    const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
    // ─── Push Send Widget State ───────────────────────────────────
    const [showPushModal, setShowPushModal] = useState(false);
    const [pushSendTitle, setPushSendTitle] = useState('');
    const [pushSendBody, setPushSendBody] = useState('');
    const [pushSendUrl, setPushSendUrl] = useState('/pracownik');
    const [pushSendIndividuals, setPushSendIndividuals] = useState<string[]>([]);
    const [pushSendGroups, setPushSendGroups] = useState<string[]>([]);
    const [pushSending, setPushSending] = useState(false);
    const [pushSendResult, setPushSendResult] = useState<{ sent?: number; failed?: number; error?: string } | null>(null);
    const [pushEmpSearch, setPushEmpSearch] = useState('');

    // ─── Schedule Context Menu (color/icon changes) ──────────
    const [scheduleContextMenu, setScheduleContextMenu] = useState<{
        apt: ScheduleAppointment;
        dayDate: string;
        x: number;
        y: number;
    } | null>(null);
    const [scheduleColors, setScheduleColors] = useState<any[]>([]);
    const [scheduleIcons, setScheduleIcons] = useState<any[]>([]);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressFiredRef = useRef(false);

    // ─── Consent Signing System ───────────────────
    const [consentModalOpen, setConsentModalOpen] = useState(false);
    const [consentSelectedTypes, setConsentSelectedTypes] = useState<string[]>([]);
    const [consentGenerating, setConsentGenerating] = useState(false);
    const [consentUrl, setConsentUrl] = useState('');
    const [patientConsents, setPatientConsents] = useState<any[]>([]);
    const [patientSignature, setPatientSignature] = useState<string | null>(null);
    const [showSignature, setShowSignature] = useState(false);

    const router = useRouter();
    const { userId: currentUserId, email: currentUserEmail, isAdmin } = useUserRoles();

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
                setUserId(user.id);
            }
        };
        checkAuth();
    }, []);

    // Fetch schedule
    const fetchSchedule = useCallback(async () => {
        setLoading(true);
        try {
            // Use local date string to avoid UTC midnight rollback (timezone bug)
            const d = currentWeekStart;
            const weekStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

    // Fetch Prodentis colors and icons for schedule context menu
    useEffect(() => {
        const fetchColorsIcons = async () => {
            try {
                const [colorsRes, iconsRes] = await Promise.all([
                    fetch('/api/admin/prodentis-schedule/colors'),
                    fetch('/api/admin/prodentis-schedule/icons'),
                ]);
                if (colorsRes.ok) {
                    const colorsData = await colorsRes.json();
                    setScheduleColors(colorsData.colors || []);
                }
                if (iconsRes.ok) {
                    const iconsData = await iconsRes.json();
                    setScheduleIcons(iconsData.icons || []);
                }
            } catch (err) {
                console.error('[Schedule] Failed to fetch colors/icons:', err);
            }
        };
        fetchColorsIcons();
    }, []);

    // Close context menu on click outside or Escape
    useEffect(() => {
        if (!scheduleContextMenu) return;
        const close = () => setScheduleContextMenu(null);
        const keyClose = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('click', close);
        window.addEventListener('keydown', keyClose);
        return () => { window.removeEventListener('click', close); window.removeEventListener('keydown', keyClose); };
    }, [scheduleContextMenu]);

    // Check if appointment is in the past (date+endTime < now)
    const isAppointmentPast = (dayDate: string, apt: ScheduleAppointment): boolean => {
        const now = new Date();
        const [h, m] = apt.endTime.split(':').map(Number);
        const aptEnd = new Date(dayDate + 'T00:00:00');
        aptEnd.setHours(h, m, 0, 0);
        return aptEnd < now;
    };

    // Open context menu on right-click
    const handleScheduleContextMenu = (e: React.MouseEvent, apt: ScheduleAppointment, dayDate: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (isAppointmentPast(dayDate, apt)) {
            return;
        }
        setScheduleContextMenu({ apt, dayDate, x: e.clientX, y: e.clientY });
    };

    // Long-press for mobile
    const handleTouchStart = (e: React.TouchEvent, apt: ScheduleAppointment, dayDate: string) => {
        longPressFiredRef.current = false;
        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        longPressTimerRef.current = setTimeout(() => {
            longPressFiredRef.current = true;
            if (!isAppointmentPast(dayDate, apt)) {
                setScheduleContextMenu({ apt, dayDate, x, y });
            }
        }, 500);
    };
    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };
    const handleTouchMove = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    // Change appointment color in Prodentis
    const handleChangeScheduleColor = async (appointmentId: string, colorId: string, colorName: string) => {
        setScheduleContextMenu(null);
        try {
            const res = await fetch('/api/admin/prodentis-schedule/color', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId, colorId }),
            });
            if (res.ok) {
                alert(`✅ Kolor zmieniony na: ${colorName}`);
                fetchSchedule(); // Refresh to show new color
            } else {
                const data = await res.json();
                alert(`❌ Błąd: ${data.error || data.message}`);
            }
        } catch (err) {
            console.error('[Schedule] Color change error:', err);
            alert('❌ Błąd połączenia');
        }
    };

    // Add icon to appointment in Prodentis
    const handleAddScheduleIcon = async (appointmentId: string, iconId: string, iconName: string) => {
        setScheduleContextMenu(null);
        try {
            const res = await fetch('/api/admin/prodentis-schedule/icon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId, iconId }),
            });
            if (res.ok) {
                alert(`✅ Ikona "${iconName}" dodana`);
                fetchSchedule();
            } else {
                const data = await res.json();
                alert(`❌ Błąd: ${data.error || data.message}`);
            }
        } catch (err) {
            console.error('[Schedule] Icon add error:', err);
            alert('❌ Błąd połączenia');
        }
    };

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

    // Determine which days to show (skip Sat/Sun if empty, respect hiddenScheduleDays)
    // hiddenScheduleDays stores JS day-of-week: 0=Sun, 1=Mon, 2=Tue, ..., 6=Sat
    const getVisibleDays = (): ScheduleDay[] => {
        if (!scheduleData) return [];
        return scheduleData.days.filter((day) => {
            const jsDay = new Date(day.date + 'T12:00:00').getDay(); // noon to avoid DST issues
            // If explicitly hidden by user → never show
            if (hiddenScheduleDays.has(jsDay)) return false;
            // Mon–Fri: always show unless hidden
            if (jsDay >= 1 && jsDay <= 5) return true;
            // Sat/Sun: show only if they have appointments
            return day.appointments.length > 0;
        });
    };

    const toggleScheduleDay = (dayIdx: number) => {
        setHiddenScheduleDays(prev => {
            const next = new Set(prev);
            if (next.has(dayIdx)) next.delete(dayIdx); else next.add(dayIdx);
            try { localStorage.setItem('schedule-hidden-days', JSON.stringify([...next])); } catch { }
            return next;
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
            try { localStorage.setItem('schedule-hidden-doctors', JSON.stringify([...next])); } catch { }
            return next;
        });
    };

    const showAllDoctors = () => {
        setHiddenDoctors(new Set());
        try { localStorage.setItem('schedule-hidden-doctors', '[]'); } catch { }
    };
    const hideAllDoctors = () => {
        const allHidden = new Set(doctors);
        setHiddenDoctors(allHidden);
        try { localStorage.setItem('schedule-hidden-doctors', JSON.stringify([...allHidden])); } catch { }
    };

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

    // ─── Deep link from push notifications ─────────────────────────────────
    // Reads ?tab= and ?taskId= from URL on mount (client-side only via
    // window.location — avoids useSearchParams Suspense requirement).
    const [deepLinkTaskId, setDeepLinkTaskId] = useState<string | null>(null);
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        const taskId = params.get('taskId');
        if (tab && ['grafik', 'zadania', 'asystent', 'powiadomienia'].includes(tab)) {
            setActiveTab(tab as 'grafik' | 'zadania' | 'asystent' | 'powiadomienia');
        }
        if (taskId) {
            setDeepLinkTaskId(taskId);
        }
    }, []); // run exactly once on mount

    // Once tasks are loaded, open the deep-linked task
    useEffect(() => {
        if (!deepLinkTaskId || tasks.length === 0) return;
        const task = tasks.find(t => t.id === deepLinkTaskId);
        if (task) {
            setSelectedViewTask(task);
            setDeepLinkTaskId(null);
        }
    }, [deepLinkTaskId, tasks]);

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
            image_urls: [],
            assigned_to: [],
            due_date: '',
            linked_appointment_date: '',
            linked_appointment_info: '',
            is_private: false,
        });
        setTaskModalPrefill(null);
        setFutureAppointments([]);
    };

    // ─── Image compression utility (Canvas → JPEG ≤2-3s, ≤200KB) ───────
    const compressImage = (file: File, maxKB = 200): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                // Scale down if image is very large (max 1200px wide)
                const MAX_DIM = 1200;
                if (width > MAX_DIM) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
                if (height > MAX_DIM) { width = Math.round(width * MAX_DIM / height); height = MAX_DIM; }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, width, height);
                // Try decreasing quality until size fits
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
    };

    // Image upload handler (for both create and edit) — compresses then appends to array
    const handleImageUpload = async (file: File, mode: 'create' | 'edit' = 'create') => {
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
            image_urls: (task as any).image_urls || (task.image_url ? [task.image_url] : []),
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
                image_urls: taskForm.image_urls || [],

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
    };

    const handleUpdateStatus = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done' | 'archived') => {
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

    const getStatusLabel = (s: string) => s === 'todo' ? 'Do zrobienia' : s === 'in_progress' ? 'W trakcie' : s === 'archived' ? 'Archiwum' : 'Gotowe';
    const getStatusColor = (s: string) => s === 'todo' ? '#94a3b8' : s === 'in_progress' ? '#f59e0b' : s === 'archived' ? '#6b7280' : '#22c55e';
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

    // ─── Enhanced: Comments ────────────────────────────────
    const fetchComments = useCallback(async (taskId: string) => {
        try {
            const res = await fetch(`/api/employee/tasks/${taskId}/comments`);
            if (!res.ok) return;
            const data = await res.json();
            setTaskComments(prev => ({ ...prev, [taskId]: data.comments || [] }));
        } catch { } // silent
    }, []);

    const handlePostComment = async (taskId: string) => {
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
            // Browser notification for others
            if (notifPermission === 'granted') {
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    new Notification('Nowy komentarz', { body: `${authorName}: ${commentInput.substring(0, 80)}`, icon: '/favicon.ico' });
                }
            }
        } catch (err) {
            console.error('[Comments] Post error:', err);
        } finally {
            setCommentLoading(false);
        }
    };

    // ─── Enhanced: Labels ──────────────────────────────────
    const fetchLabels = useCallback(async () => {
        try {
            const res = await fetch('/api/employee/tasks/labels');
            if (!res.ok) return;
            const data = await res.json();
            setAllLabels(data.labels || []);
        } catch { } // silent
    }, []);

    useEffect(() => { fetchLabels(); }, [fetchLabels]);

    // ─── Fetch Task Type Templates ────────────────────────
    const fetchTaskTypes = useCallback(async () => {
        try {
            const res = await fetch('/api/employee/task-types');
            if (!res.ok) return;
            const data = await res.json();
            setTaskTypeTemplates(data.templates || []);
        } catch { } // silent — fallback to hardcoded
    }, []);

    useEffect(() => { fetchTaskTypes(); }, [fetchTaskTypes]);

    // Build dynamic TASK_TYPE_CHECKLISTS from templates (or fallback)
    const TASK_TYPE_CHECKLISTS: Record<string, { label: string; icon: string; items: string[] }> = useMemo(() => {
        if (taskTypeTemplates.length === 0) return FALLBACK_TASK_TYPE_CHECKLISTS;
        const result: Record<string, { label: string; icon: string; items: string[] }> = {};
        for (const t of taskTypeTemplates) {
            result[t.key] = { label: t.label, icon: t.icon, items: t.items };
        }
        return result;
    }, [taskTypeTemplates]);

    // ─── Enhanced: Browser Notifications ───────────────────
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setNotifPermission(Notification.permission);
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(p => setNotifPermission(p));
            }
        }
    }, []);

    // ─── Enhanced: Kanban Drag & Drop ──────────────────────
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
        // Type filter
        if (filterType === '__private__') {
            base = base.filter(t => t.is_private && t.owner_user_id === currentUserId);
        } else if (filterType) {
            base = base.filter(t => t.task_type === filterType);
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
    }, [tasks, taskFilter, taskSearchQuery, filterAssignee, filterType, filterPriority, isMyTask]);

    return (
        <div
            className="pw-content-area"
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
                {userId && (
                    <PushNotificationPrompt
                        userType="employee"
                        userId={userId}
                        locale="pl"
                        compact
                    />
                )}
            </header>

            {/* Tab Navigation — top on desktop, FAB hamburger on mobile */}
            {isMobile ? (
                <>
                    {/* Backdrop overlay when menu is open */}
                    {mobileMenuOpen && (
                        <div
                            onClick={() => setMobileMenuOpen(false)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0,0,0,0.5)',
                                zIndex: 9990,
                                transition: 'opacity 0.3s',
                            }}
                        />
                    )}
                    {/* FAB Menu Items — expand upward */}
                    <div style={{
                        position: 'fixed',
                        bottom: 'calc(70px + env(safe-area-inset-bottom, 0px))',
                        right: 16,
                        zIndex: 9995,
                        display: 'flex',
                        flexDirection: 'column-reverse',
                        gap: '10px',
                        pointerEvents: mobileMenuOpen ? 'auto' : 'none',
                    }}>
                        {[
                            { id: 'grafik' as const, label: 'Grafik', icon: <Calendar size={20} />, color: '#38bdf8' },
                            { id: 'zadania' as const, label: 'Zadania', icon: <CheckSquare size={20} />, color: '#4ade80' },
                            { id: 'asystent' as const, label: 'AI', icon: <Bot size={20} />, color: '#a78bfa' },
                            { id: 'powiadomienia' as const, label: 'Alerty', icon: <Bell size={20} />, color: '#f59e0b' },
                            { id: 'sugestie' as const, label: 'Sugestie', icon: <Lightbulb size={20} />, color: '#fb923c' },
                        ].map((tab, i, arr) => {
                            const isActive = activeTab === tab.id;
                            const delay = (arr.length - 1 - i) * 50;
                            return (
                                <div
                                    key={tab.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        justifyContent: 'flex-end',
                                        opacity: mobileMenuOpen ? 1 : 0,
                                        transform: mobileMenuOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.6)',
                                        transition: `all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${mobileMenuOpen ? delay : 0}ms`,
                                    }}
                                >
                                    {/* Label pill */}
                                    <span style={{
                                        background: isActive ? tab.color : 'rgba(15,23,42,0.95)',
                                        color: isActive ? '#0f172a' : 'rgba(255,255,255,0.85)',
                                        padding: '5px 12px',
                                        borderRadius: '8px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                                        border: `1px solid ${isActive ? tab.color : 'rgba(255,255,255,0.1)'}`,
                                    }}>
                                        {tab.label}
                                    </span>
                                    {/* Icon circle */}
                                    <button
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setMobileMenuOpen(false);
                                            if (tab.id === 'powiadomienia') fetchPushNotifications();
                                            if (tab.id === 'sugestie' && suggestions.length === 0) {
                                                setSugLoading(true);
                                                fetch('/api/employee/suggestions').then(r => r.json()).then(d => setSuggestions(Array.isArray(d) ? d : [])).catch(() => { }).finally(() => setSugLoading(false));
                                            }
                                        }}
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '50%',
                                            background: isActive
                                                ? `linear-gradient(135deg, ${tab.color}, ${tab.color}cc)`
                                                : 'rgba(15,23,42,0.95)',
                                            color: isActive ? '#0f172a' : tab.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: isActive
                                                ? `0 4px 20px ${tab.color}66`
                                                : '0 2px 12px rgba(0,0,0,0.4)',
                                            border: `1px solid ${isActive ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                                            flexShrink: 0,
                                            WebkitTapHighlightColor: 'transparent',
                                        }}
                                    >
                                        {tab.icon}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    {/* FAB Toggle Button */}
                    <button
                        onClick={() => setMobileMenuOpen(prev => !prev)}
                        style={{
                            position: 'fixed',
                            bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
                            right: 16,
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            border: 'none',
                            background: mobileMenuOpen
                                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                : 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 9999,
                            boxShadow: mobileMenuOpen
                                ? '0 4px 24px rgba(239,68,68,0.5)'
                                : '0 4px 24px rgba(56,189,248,0.4)',
                            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            transform: mobileMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                            WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </>
            ) : (
                <div style={{
                    display: 'flex',
                    gap: '0.25rem',
                    padding: '0.75rem 2rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(0,0,0,0.15)',
                    overflowX: 'auto',
                }}>
                    {[
                        { id: 'grafik' as const, label: 'Grafik', icon: <Calendar size={18} /> },
                        { id: 'zadania' as const, label: 'Zadania', icon: <CheckSquare size={18} /> },
                        { id: 'asystent' as const, label: 'AI', icon: <Bot size={18} /> },
                        { id: 'powiadomienia' as const, label: 'Alerty', icon: <Bell size={18} /> },
                        { id: 'sugestie' as const, label: 'Sugestie', icon: <Lightbulb size={18} /> },
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    if (tab.id === 'powiadomienia') fetchPushNotifications();
                                    if (tab.id === 'sugestie' && suggestions.length === 0) {
                                        setSugLoading(true);
                                        fetch('/api/employee/suggestions').then(r => r.json()).then(d => setSuggestions(Array.isArray(d) ? d : [])).catch(() => { }).finally(() => setSugLoading(false));
                                    }
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.6rem 1.1rem',
                                    background: isActive ? 'rgba(56,189,248,0.1)' : 'transparent',
                                    border: 'none',
                                    borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                                    borderRadius: '0.5rem 0.5rem 0 0',
                                    color: isActive ? '#38bdf8' : 'rgba(255,255,255,0.5)',
                                    cursor: 'pointer',
                                    fontSize: '0.88rem',
                                    fontWeight: isActive ? 600 : 400,
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    transition: 'all 0.2s',
                                }}
                            >
                                {tab.icon}
                                <span style={{ fontSize: '0.88rem', lineHeight: 1 }}>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}

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

                        {/* Day-of-week toggle bar */}
                        <div style={{
                            marginBottom: '0.6rem',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '0.75rem',
                            padding: '0.55rem 0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            flexWrap: 'wrap',
                        }}>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginRight: '0.25rem', whiteSpace: 'nowrap' }}>Dni:</span>
                            {(['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'] as const).map((label, i) => {
                                // Map UI label index to JS day-of-week: Pn=1, Wt=2, ..., Sb=6, Nd=0
                                const jsDay = i < 6 ? i + 1 : 0; // Nd is last in UI (i=6) but JS day 0
                                const isVisible = !hiddenScheduleDays.has(jsDay);
                                return (
                                    <button
                                        key={label}
                                        onClick={() => toggleScheduleDay(jsDay)}
                                        title={isVisible ? `Ukryj ${label}` : `Pokaż ${label}`}
                                        style={{
                                            padding: '0.2rem 0.5rem',
                                            background: isVisible ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${isVisible ? 'rgba(56,189,248,0.28)' : 'rgba(255,255,255,0.08)'}`,
                                            borderRadius: '5px',
                                            color: isVisible ? '#38bdf8' : 'rgba(255,255,255,0.25)',
                                            cursor: 'pointer',
                                            fontSize: '0.72rem',
                                            fontWeight: isVisible ? '600' : '400',
                                            transition: 'all 0.12s',
                                            minWidth: '28px',
                                            textAlign: 'center',
                                            textDecoration: isVisible ? 'none' : 'line-through',
                                        }}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
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
                                                                            if (longPressFiredRef.current) return; // Don't open history after long-press
                                                                            if (apt.patientId) {
                                                                                openPatientHistory(apt);
                                                                            }
                                                                        }}
                                                                        onContextMenu={(e) => handleScheduleContextMenu(e, apt, day.date)}
                                                                        onTouchStart={(e) => handleTouchStart(e, apt, day.date)}
                                                                        onTouchEnd={handleTouchEnd}
                                                                        onTouchMove={handleTouchMove}
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

                {/* Schedule Context Menu (right-click on appointment) */}
                {scheduleContextMenu && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'fixed',
                            left: `${Math.min(scheduleContextMenu.x, window.innerWidth - 300)}px`,
                            top: `${Math.min(scheduleContextMenu.y, window.innerHeight - 350)}px`,
                            background: 'rgba(15, 15, 20, 0.97)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(56, 189, 248, 0.2)',
                            borderRadius: '0.75rem',
                            padding: '0.75rem',
                            zIndex: 2000,
                            minWidth: '260px',
                            maxHeight: '400px',
                            overflowY: 'auto',
                            boxShadow: '0 15px 50px rgba(0,0,0,0.6)',
                        }}
                    >
                        {/* Header */}
                        <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.5rem', paddingBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            {scheduleContextMenu.apt.patientName}
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'normal', marginTop: '2px' }}>
                                {scheduleContextMenu.apt.startTime} — {scheduleContextMenu.apt.appointmentType}
                            </div>
                        </div>

                        {/* Color section */}
                        <div style={{ marginBottom: '0.5rem' }}>
                            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', fontWeight: 'bold' }}>
                                🎨 Zmień typ wizyty
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {scheduleColors.map((c: any) => (
                                    <button
                                        key={c.id}
                                        onClick={() => handleChangeScheduleColor(scheduleContextMenu.apt.id, c.id, c.name)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                                            padding: '0.2rem 0.4rem',
                                            background: scheduleContextMenu.apt.appointmentTypeId === c.id
                                                ? 'rgba(255,255,255,0.1)'
                                                : 'rgba(255,255,255,0.02)',
                                            border: scheduleContextMenu.apt.appointmentTypeId === c.id
                                                ? '1px solid rgba(255,255,255,0.3)'
                                                : '1px solid rgba(255,255,255,0.06)',
                                            borderRadius: '0.3rem',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <span style={{
                                            width: '16px', height: '16px', borderRadius: '3px', flexShrink: 0,
                                            background: c.rgb ? `rgb(${c.rgb.r},${c.rgb.g},${c.rgb.b})` : '#666',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                        }} />
                                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.85)' }}>
                                            {c.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Icons section */}
                        <div>
                            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', fontWeight: 'bold' }}>
                                🏷️ Dodaj ikonę
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {scheduleIcons.map((icon: any) => (
                                    <button
                                        key={icon.id}
                                        onClick={() => handleAddScheduleIcon(scheduleContextMenu.apt.id, icon.id, icon.name)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                                            padding: '0.25rem 0.5rem',
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            borderRadius: '0.3rem',
                                            color: 'rgba(255,255,255,0.8)',
                                            cursor: 'pointer',
                                            fontSize: '0.68rem',
                                            textAlign: 'left',
                                        }}
                                    >
                                        {icon.name}
                                    </button>
                                ))}
                            </div>
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
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '260px' }}>
                                    {/* E-Karta QR button */}
                                    <button
                                        onClick={async () => {
                                            setQrLoading(true);
                                            try {
                                                const supabase = createBrowserClient(
                                                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                                                );
                                                const { data: { user } } = await supabase.auth.getUser();
                                                const employee = user?.email || 'pracownik';
                                                const res = await fetch('/api/intake/generate-token', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        prodentisPatientId: selectedAppointment.patientId || undefined,
                                                        prefillFirstName: selectedAppointment.patientName.split(' ')[1] || '',
                                                        prefillLastName: selectedAppointment.patientName.split(' ')[0] || '',
                                                        appointmentId: selectedAppointment.id,
                                                        appointmentDate: selectedAppointment.startTime,
                                                        appointmentType: selectedAppointment.appointmentType,
                                                        createdByEmployee: employee,
                                                        expiresInHours: 2,
                                                    }),
                                                });
                                                const data = await res.json();
                                                if (data.url) setQrModal({ url: data.url, expiresAt: data.expiresAt });
                                            } catch { alert('Błąd generowania kodu QR'); }
                                            finally { setQrLoading(false); }
                                        }}
                                        style={{
                                            background: 'linear-gradient(135deg, #4ade80, #22c55e)',
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
                                        title="Generuj kod QR do e-karty pacjenta"
                                        disabled={qrLoading}
                                    >
                                        {qrLoading ? '⏳' : '📋'} E-Karta
                                    </button>
                                    {/* Patient Data button */}
                                    <button
                                        onClick={async () => {
                                            if (!selectedAppointment?.patientId) return;
                                            setPatientDataLoading(true);
                                            try {
                                                const res = await fetch(`/api/employee/patient-details?patientId=${selectedAppointment.patientId}`);
                                                if (res.ok) {
                                                    const data = await res.json();
                                                    setPatientDataModal(data);
                                                } else {
                                                    alert('Nie udało się pobrać danych pacjenta');
                                                }
                                            } catch { alert('Błąd połączenia z Prodentis'); }
                                            finally { setPatientDataLoading(false); }
                                        }}
                                        style={{
                                            background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                                            border: 'none',
                                            borderRadius: '0.5rem',
                                            padding: '0.4rem 0.65rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            color: '#fff',
                                            fontSize: '0.72rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                        }}
                                        title="Pokaż dane pacjenta z Prodentis"
                                        disabled={patientDataLoading || !selectedAppointment?.patientId}
                                    >
                                        {patientDataLoading ? '⏳' : '👤'} Dane
                                    </button>
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
                                    {/* Consent signing button */}
                                    <button
                                        onClick={async () => {
                                            setConsentModalOpen(true);
                                            setConsentSelectedTypes([]);
                                            setConsentUrl('');
                                            setShowSignature(false);
                                            if (selectedAppointment.patientId) {
                                                try {
                                                    const [consentsRes, intakeRes] = await Promise.all([
                                                        fetch(`/api/employee/patient-consents?prodentisId=${selectedAppointment.patientId}`),
                                                        fetch(`/api/employee/patient-intake?prodentisId=${selectedAppointment.patientId}`),
                                                    ]);
                                                    if (consentsRes.ok) {
                                                        const d = await consentsRes.json();
                                                        setPatientConsents(d.consents || []);
                                                    }
                                                    if (intakeRes.ok) {
                                                        const d = await intakeRes.json();
                                                        setPatientSignature(d.intake?.signatureData || null);
                                                    }
                                                } catch { /* ignore */ }
                                            }
                                        }}
                                        style={{
                                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                            border: 'none',
                                            borderRadius: '0.5rem',
                                            padding: '0.4rem 0.65rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            color: '#fff',
                                            fontSize: '0.72rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                        }}
                                        title="Generuj link do podpisania zgód"
                                    >
                                        📝 Zgody
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

            {/* ═══ CONSENT MODAL ═══ */}
            {consentModalOpen && selectedAppointment && (
                <div
                    onClick={() => setConsentModalOpen(false)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 3000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '1rem',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(135deg, #0d1b2a, #1b2838)',
                            border: '1px solid rgba(56,189,248,0.2)',
                            borderRadius: '1rem',
                            width: '100%', maxWidth: '550px',
                            maxHeight: '85vh', overflowY: 'auto',
                            padding: '1.5rem',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>📝 Zgody pacjenta</h3>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.15rem' }}>
                                    {selectedAppointment.patientName}
                                </div>
                            </div>
                            <button
                                onClick={() => setConsentModalOpen(false)}
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', width: '28px', height: '28px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >✕</button>
                        </div>

                        {/* Token generation */}
                        {!consentUrl ? (
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                    Wybierz zgody do podpisania:
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.75rem' }}>
                                    <button
                                        onClick={() => {
                                            const allKeys = Object.keys(CONSENT_TYPES);
                                            setConsentSelectedTypes(prev => prev.length === allKeys.length ? [] : allKeys);
                                        }}
                                        style={{
                                            padding: '0.35rem 0.6rem',
                                            background: consentSelectedTypes.length === Object.keys(CONSENT_TYPES).length ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '0.4rem',
                                            color: '#fff', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold',
                                        }}
                                    >
                                        {consentSelectedTypes.length === Object.keys(CONSENT_TYPES).length ? '✅ Odznacz wszystkie' : '☐ Zaznacz wszystkie'}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
                                    {Object.entries(CONSENT_TYPES).map(([key, val]) => (
                                        <label
                                            key={key}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                padding: '0.4rem 0.6rem',
                                                background: consentSelectedTypes.includes(key) ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.02)',
                                                border: consentSelectedTypes.includes(key) ? '1px solid rgba(56,189,248,0.2)' : '1px solid rgba(255,255,255,0.06)',
                                                borderRadius: '0.4rem',
                                                cursor: 'pointer',
                                                fontSize: '0.78rem', color: '#fff',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={consentSelectedTypes.includes(key)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setConsentSelectedTypes(p => [...p, key]);
                                                    else setConsentSelectedTypes(p => p.filter(t => t !== key));
                                                }}
                                                style={{ accentColor: '#38bdf8' }}
                                            />
                                            {val.label}
                                        </label>
                                    ))}
                                </div>
                                <button
                                    disabled={!consentSelectedTypes.length || consentGenerating}
                                    onClick={async () => {
                                        setConsentGenerating(true);
                                        try {
                                            const res = await fetch('/api/employee/consent-tokens', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    patientName: selectedAppointment.patientName,
                                                    prodentisPatientId: selectedAppointment.patientId || undefined,
                                                    consentTypes: consentSelectedTypes,
                                                }),
                                            });
                                            const data = await res.json();
                                            if (data.url) setConsentUrl(data.url);
                                            else alert(`Błąd: ${data.error}`);
                                        } catch { alert('Błąd połączenia'); }
                                        finally { setConsentGenerating(false); }
                                    }}
                                    style={{
                                        width: '100%', padding: '0.7rem',
                                        background: consentSelectedTypes.length ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.06)',
                                        border: 'none', borderRadius: '0.5rem',
                                        color: '#fff', fontWeight: 'bold', fontSize: '0.85rem',
                                        cursor: consentSelectedTypes.length ? 'pointer' : 'default',
                                        opacity: (!consentSelectedTypes.length || consentGenerating) ? 0.5 : 1,
                                    }}
                                >
                                    {consentGenerating ? '⏳ Generuję...' : `📝 Generuj link (${consentSelectedTypes.length} zgód)`}
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
                                    Link do podpisania zgód:
                                </div>
                                <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '1rem', display: 'inline-block', marginBottom: '0.75rem' }}>
                                    <QRCodeSVG value={consentUrl} size={180} />
                                </div>
                                <div style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '0.5rem',
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.7rem',
                                    color: '#38bdf8',
                                    wordBreak: 'break-all',
                                    marginBottom: '0.5rem',
                                }}>
                                    {consentUrl}
                                </div>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(consentUrl); alert('Link skopiowany!'); }}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(56,189,248,0.15)',
                                        border: '1px solid rgba(56,189,248,0.3)',
                                        borderRadius: '0.4rem',
                                        color: '#38bdf8', fontSize: '0.78rem', cursor: 'pointer',
                                    }}
                                >
                                    📋 Kopiuj link
                                </button>
                            </div>
                        )}

                        {/* Signed consents */}
                        {patientConsents.length > 0 && (
                            <div style={{ marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                    ✅ Podpisane zgody ({patientConsents.length})
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    {patientConsents.map((c: any) => (
                                        <a
                                            key={c.id}
                                            href={c.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '0.45rem 0.6rem',
                                                background: 'rgba(34,197,94,0.06)',
                                                border: '1px solid rgba(34,197,94,0.15)',
                                                borderRadius: '0.4rem',
                                                textDecoration: 'none',
                                            }}
                                        >
                                            <span style={{ fontSize: '0.75rem', color: '#fff' }}>📄 {c.consent_label}</span>
                                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                                                {new Date(c.signed_at).toLocaleDateString('pl-PL')}
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* E-karta signature */}
                        {patientSignature && (
                            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                                <button
                                    onClick={() => setShowSignature(!showSignature)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem',
                                    }}
                                >
                                    ✍️ {showSignature ? 'Ukryj' : 'Pokaż'} podpis e-karty
                                </button>
                                {showSignature && (
                                    <div style={{
                                        background: '#fff',
                                        borderRadius: '0.5rem',
                                        padding: '0.75rem',
                                        marginTop: '0.5rem',
                                        textAlign: 'center',
                                    }}>
                                        <img
                                            src={patientSignature}
                                            alt="Podpis pacjenta"
                                            style={{ maxWidth: '100%', maxHeight: '150px' }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ ZADANIA TAB ═══ */}
            {activeTab === 'zadania' && (
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
                        <select
                            value={filterAssignee}
                            onChange={e => setFilterAssignee(e.target.value)}
                            style={{ padding: '0.4rem 0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: filterAssignee ? '#38bdf8' : 'rgba(255,255,255,0.5)', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                            <option value="">Wszyscy</option>
                            {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            style={{ padding: '0.4rem 0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: filterType ? '#a855f7' : 'rgba(255,255,255,0.5)', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                            <option value="">Typ: Wszystkie</option>
                            <option value="__private__">🔒 Prywatne</option>
                            {Object.entries(TASK_TYPE_CHECKLISTS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                        </select>
                        <select
                            value={filterPriority}
                            onChange={e => setFilterPriority(e.target.value)}
                            style={{ padding: '0.4rem 0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: filterPriority ? getPriorityColor(filterPriority) : 'rgba(255,255,255,0.5)', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                            <option value="">Priorytet: Wszystkie</option>
                            <option value="urgent">⚡ Pilne</option>
                            <option value="normal">Normalny</option>
                            <option value="low">Niski</option>
                        </select>
                        {(taskSearchQuery || filterAssignee || filterType || filterPriority) && (
                            <button
                                onClick={() => { setTaskSearchQuery(''); setFilterAssignee(''); setFilterType(''); setFilterPriority(''); }}
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
                                                            borderRadius: '0.5rem',
                                                            padding: '0.6rem 0.75rem',
                                                            cursor: draggedTaskId ? 'grabbing' : 'pointer',
                                                            opacity: draggedTaskId === task.id ? 0.5 : 1,
                                                            transition: 'all 0.15s',
                                                        }}
                                                    >
                                                        <div style={{ fontSize: '0.8rem', fontWeight: '500', color: '#fff', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {task.priority === 'urgent' && <span style={{ color: '#ef4444', marginRight: '0.3rem' }}>⚡</span>}
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
                                                        {/* ← → arrows: mobile-friendly way to move between columns */}
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
            {calendarDayPopup && (
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
            )}

            {/* ═══ E-KARTA QR MODAL ═══ */}
            {qrModal && (
                <div
                    onClick={() => setQrModal(null)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                >
                    <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, #0d1b2a, #1b2838)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '1rem', padding: '2rem', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>E-Karta Pacjenta</div>
                        <h3 style={{ margin: '0 0 1.25rem', color: '#4ade80', fontSize: '1.1rem' }}>
                            {selectedAppointment?.patientName}
                        </h3>
                        {/* QR Code */}
                        <div style={{ background: '#fff', display: 'inline-block', padding: '12px', borderRadius: '0.75rem', marginBottom: '1rem' }}>
                            <QRCodeSVG
                                value={qrModal.url}
                                size={200}
                                level="M"
                                includeMargin={false}
                            />
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                            Pacjent skanuje kod swoim telefonem i wypełnia dane
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginBottom: '1.25rem' }}>
                            Ważny do: {new Date(qrModal.expiresAt).toLocaleString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => navigator.clipboard?.writeText(qrModal.url)}
                                style={{ flex: 1, padding: '0.6rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', color: '#e2e8f0', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                                📋 Kopiuj link
                            </button>
                            <button
                                onClick={() => setQrModal(null)}
                                style={{ flex: 1, padding: '0.6rem', background: 'linear-gradient(135deg, #4ade80, #22c55e)', border: 'none', borderRadius: '0.5rem', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                            >
                                ✓ Gotowe
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ PATIENT DATA MODAL ═══ */}
            {patientDataModal && (
                <div
                    onClick={() => setPatientDataModal(null)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 4500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem' }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(135deg, #0d1b2a, #1b2838)',
                            border: '1px solid rgba(167,139,250,0.3)',
                            borderRadius: '1rem',
                            maxWidth: 520,
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '1rem 1.25rem',
                            background: 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(124,58,237,0.06))',
                            borderBottom: '1px solid rgba(167,139,250,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexShrink: 0,
                        }}>
                            <div>
                                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dane pacjenta z Prodentis</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a78bfa', marginTop: '0.15rem' }}>
                                    {patientDataModal.firstName} {patientDataModal.lastName}
                                </div>
                            </div>
                            <button onClick={() => setPatientDataModal(null)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', width: 30, height: 30, color: '#fff', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                        {/* Scrollable body */}
                        <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', flex: 1 }}>
                            {/* Personal data */}
                            <div style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Dane osobowe</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '1rem' }}>
                                {[
                                    ['PESEL', patientDataModal.pesel],
                                    ['Data ur.', patientDataModal.birthDate ? new Date(patientDataModal.birthDate).toLocaleDateString('pl-PL') : null],
                                    ['Płeć', patientDataModal.gender === 'M' ? 'Mężczyzna' : patientDataModal.gender === 'K' ? 'Kobieta' : null],
                                    ['Nazwisko rodowe', patientDataModal.maidenName],
                                    ['Imię drugie', patientDataModal.middleName],
                                ].filter(([, val]) => val).map(([label, val]) => (
                                    <div key={label as string} style={{ padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.4rem' }}>
                                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.1rem' }}>{label}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500 }}>{val}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Contact */}
                            <div style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Kontakt</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '1rem' }}>
                                {[
                                    ['📱 Telefon', patientDataModal.phone],
                                    ['📧 Email', patientDataModal.email],
                                    ['🏠 Adres', patientDataModal.address ? [patientDataModal.address.street, patientDataModal.address.houseNumber, patientDataModal.address.apartmentNumber ? `m. ${patientDataModal.address.apartmentNumber}` : ''].filter(Boolean).join(' ') : null],
                                    ['🏙️ Miasto', patientDataModal.address ? [patientDataModal.address.postalCode, patientDataModal.address.city].filter(Boolean).join(' ') : null],
                                ].map(([label, val]) => (
                                    <div key={label as string} style={{ padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.4rem' }}>
                                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.1rem' }}>{label}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500, wordBreak: 'break-all' }}>{val || '—'}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Informacje o pacjencie */}
                            {patientDataModal.notes && (
                                <>
                                    <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>📝 Informacje o pacjencie</div>
                                    <div style={{
                                        padding: '0.75rem',
                                        background: 'rgba(245,158,11,0.06)',
                                        border: '1px solid rgba(245,158,11,0.15)',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.8rem',
                                        color: 'rgba(255,255,255,0.8)',
                                        lineHeight: 1.6,
                                        whiteSpace: 'pre-wrap',
                                        marginBottom: '1rem',
                                        maxHeight: '250px',
                                        overflowY: 'auto',
                                    }}>
                                        {patientDataModal.notes}
                                    </div>
                                </>
                            )}

                            {/* Uwagi i ostrzeżenia dla lekarza (warnings[]) */}
                            {patientDataModal.warnings?.length > 0 && (
                                <>
                                    <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>⚠️ Uwagi i ostrzeżenia dla lekarza</div>
                                    {patientDataModal.warnings.map((w: any, i: number) => (
                                        <div key={i} style={{
                                            padding: '0.65rem 0.85rem',
                                            background: 'rgba(239,68,68,0.06)',
                                            border: '1px solid rgba(239,68,68,0.15)',
                                            borderRadius: '0.5rem',
                                            marginBottom: '0.4rem',
                                        }}>
                                            {(w.date || w.author) && (
                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.25rem' }}>
                                                    {w.date && new Date(w.date).toLocaleDateString('pl-PL')} {w.author && `• ${w.author}`}
                                                </div>
                                            )}
                                            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                                {w.text}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* ID */}
                            <div style={{ marginTop: '1rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                                Prodentis ID: {patientDataModal.id || '—'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedViewTask && (
                <div
                    onClick={() => setSelectedViewTask(null)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
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
                            maxWidth: '560px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            padding: '1.5rem',
                            boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                            <button
                                onClick={() => {
                                    handleUpdateStatus(selectedViewTask.id, getNextStatus(selectedViewTask.status));
                                    setSelectedViewTask(prev => prev ? { ...prev, status: getNextStatus(prev.status) } : null);
                                }}
                                title={`Zmień na: ${getStatusLabel(getNextStatus(selectedViewTask.status))}`}
                                style={{
                                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, marginTop: '2px',
                                    border: `2px solid ${getStatusColor(selectedViewTask.status)}`,
                                    background: selectedViewTask.status === 'done' ? getStatusColor(selectedViewTask.status) : 'transparent',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                                }}
                            >
                                {selectedViewTask.status === 'done' && '✓'}
                            </button>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#fff', lineHeight: 1.3 }}>
                                    {selectedViewTask.priority === 'urgent' && <span style={{ color: '#ef4444', marginRight: '0.3rem' }}>⚡</span>}
                                    {selectedViewTask.title}
                                </h3>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', background: `${getStatusColor(selectedViewTask.status)}22`, color: getStatusColor(selectedViewTask.status), border: `1px solid ${getStatusColor(selectedViewTask.status)}44` }}>
                                        {getStatusLabel(selectedViewTask.status)}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', background: `${getPriorityColor(selectedViewTask.priority)}22`, color: getPriorityColor(selectedViewTask.priority), border: `1px solid ${getPriorityColor(selectedViewTask.priority)}44` }}>
                                        {getPriorityLabel(selectedViewTask.priority)}
                                    </span>
                                    {selectedViewTask.is_private && <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>🔒 Prywatne</span>}
                                    {selectedViewTask.task_type && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{selectedViewTask.task_type}</span>}
                                </div>
                            </div>
                            <button onClick={() => setSelectedViewTask(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.2rem', padding: '0', flexShrink: 0 }}>✕</button>
                        </div>

                        {/* Meta info row */}
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                            {selectedViewTask.due_date && (
                                <span style={{ color: new Date(selectedViewTask.due_date) < new Date() && selectedViewTask.status !== 'done' ? '#ef4444' : 'rgba(255,255,255,0.5)' }}>
                                    📅 {new Date(selectedViewTask.due_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    {selectedViewTask.due_time && ` o ${selectedViewTask.due_time}`}
                                </span>
                            )}
                            {selectedViewTask.patient_name && <span>👤 {selectedViewTask.patient_name}</span>}
                            {selectedViewTask.assigned_to && selectedViewTask.assigned_to.length > 0 && (
                                <span>👥 {selectedViewTask.assigned_to.map((a: any) => a.name || a).join(', ')}</span>
                            )}
                        </div>

                        {/* Description */}
                        {selectedViewTask.description && (
                            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.5rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
                                {selectedViewTask.description}
                            </div>
                        )}

                        {/* Checklist */}
                        {selectedViewTask.checklist_items && selectedViewTask.checklist_items.length > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Lista kontrolna ({selectedViewTask.checklist_items.filter(ci => ci.done).length}/{selectedViewTask.checklist_items.length})
                                </div>
                                {/* Progress bar */}
                                <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                                    <div style={{ width: `${(selectedViewTask.checklist_items.filter(ci => ci.done).length / selectedViewTask.checklist_items.length) * 100}%`, height: '100%', background: selectedViewTask.checklist_items.every(ci => ci.done) ? '#22c55e' : '#38bdf8', transition: 'width 0.3s' }} />
                                </div>
                                {selectedViewTask.checklist_items.map((ci, idx) => (
                                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox" checked={ci.done}
                                            onChange={() => {
                                                handleToggleChecklist(selectedViewTask.id, idx);
                                                setSelectedViewTask(prev => {
                                                    if (!prev) return null;
                                                    const newItems = prev.checklist_items!.map((item, i) => i === idx ? { ...item, done: !item.done } : item);
                                                    return { ...prev, checklist_items: newItems };
                                                });
                                            }}
                                            style={{ accentColor: '#38bdf8', width: '14px', height: '14px' }}
                                        />
                                        <span style={{ fontSize: '0.82rem', color: ci.done ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.8)', textDecoration: ci.done ? 'line-through' : 'none' }}>{ci.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {/* 💬 Comments */}
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                💬 Komentarze ({(taskComments[selectedViewTask.id] || []).length})
                            </div>
                            {(taskComments[selectedViewTask.id] || []).map((c: any) => (
                                <div key={c.id} style={{ padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.4rem', marginBottom: '0.3rem', fontSize: '0.78rem' }}>
                                    <span style={{ color: '#38bdf8', fontWeight: '600', fontSize: '0.7rem' }}>{c.author_name || c.author_email?.split('@')[0]}</span>
                                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', marginLeft: '0.4rem' }}>{new Date(c.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                    <div style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.15rem' }}>{c.content}</div>
                                </div>
                            ))}
                            {/* Comment input */}
                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                                <input
                                    type="text"
                                    placeholder="Napisz komentarz..."
                                    value={commentInput}
                                    onChange={e => setCommentInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handlePostComment(selectedViewTask.id); }}
                                    style={{ flex: 1, padding: '0.45rem 0.7rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.5rem', color: '#fff', fontSize: '0.8rem', outline: 'none' }}
                                />
                                <button
                                    onClick={() => handlePostComment(selectedViewTask.id)}
                                    disabled={commentLoading || !commentInput.trim()}
                                    style={{ padding: '0.45rem 0.85rem', background: commentInput.trim() ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${commentInput.trim() ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '0.5rem', color: commentInput.trim() ? '#38bdf8' : 'rgba(255,255,255,0.3)', cursor: commentInput.trim() ? 'pointer' : 'default', fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap' }}
                                >
                                    {commentLoading ? '...' : 'Wyślij'}
                                </button>
                            </div>
                        </div>

                        {/* 📜 Edit history */}
                        {taskHistoryLoading && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>Ładowanie historii...</div>}
                        {!taskHistoryLoading && (
                            <div style={{ marginBottom: '1rem' }}>
                                <button
                                    onClick={() => setTaskHistoryExpanded(!taskHistoryExpanded)}
                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', cursor: 'pointer', padding: '0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: taskHistory.length > 0 ? '600' : '400' }}
                                >
                                    📜 Historia zmian {taskHistory.length > 0 ? `(${taskHistory.length})` : '(brak)'}
                                    <span style={{ fontSize: '0.6rem' }}>{taskHistoryExpanded ? '▲' : '▼'}</span>
                                </button>
                                {taskHistoryExpanded && (
                                    <div style={{ marginTop: '0.35rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.5rem', padding: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                                        {taskHistory.length === 0 ? (
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '0.5rem' }}>Brak historii zmian</div>
                                        ) : (
                                            taskHistory.map((h: any, idx: number) => {
                                                const changedByName = staffList.find(s => s.email === h.changed_by)?.name || h.changed_by;
                                                const dateStr = new Date(h.changed_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                                                const fieldLabels: Record<string, string> = {
                                                    title: 'Tytuł', description: 'Opis', status: 'Status', priority: 'Priorytet',
                                                    task_type: 'Typ', due_date: 'Termin', assigned_to_doctor_name: 'Przypisano do', image_url: 'Zdjęcie',
                                                };
                                                const statusLabels: Record<string, string> = { todo: 'Do zrobienia', in_progress: 'W trakcie', done: 'Wykonane', archived: 'Archiwum' };
                                                const priorityLabels: Record<string, string> = { low: 'Niski', normal: 'Normalny', urgent: 'Pilny' };
                                                return (
                                                    <div key={idx} style={{ padding: '0.35rem 0', borderBottom: idx < taskHistory.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.1rem' }}>
                                                            {h.change_type === 'status' ? '🔄' : h.change_type === 'checklist' ? '☑️' : '✏️'} <strong>{changedByName}</strong> • {dateStr}
                                                        </div>
                                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)' }}>
                                                            {Object.entries(h.changes || {}).map(([key, val]: [string, any]) => {
                                                                if (h.change_type === 'checklist') return <div key={key}>{val.done ? '✅' : '⬜'} {val.item}</div>;
                                                                if (key === 'assigned_to_doctor_id' || key === 'patient_id' || key === 'linked_appointment_info') return null;
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
                                                                if (key === 'status') { oldDisplay = statusLabels[val.old] || val.old || '—'; newDisplay = statusLabels[val.new] || val.new || '—'; }
                                                                else if (key === 'priority') { oldDisplay = priorityLabels[val.old] || val.old || '—'; newDisplay = priorityLabels[val.new] || val.new || '—'; }
                                                                else if (key === 'image_url' || key === 'image_urls') {
                                                                    oldDisplay = Array.isArray(val.old) ? (val.old.length > 0 ? `📷 ×${val.old.length}` : '—') : (val.old ? '📷' : '—');
                                                                    newDisplay = Array.isArray(val.new) ? (val.new.length > 0 ? `📷 ×${val.new.length}` : '—') : (val.new ? '📷' : '—');
                                                                }
                                                                else if (key === 'due_date') { oldDisplay = val.old ? new Date(val.old).toLocaleDateString('pl-PL') : '—'; newDisplay = val.new ? new Date(val.new).toLocaleDateString('pl-PL') : '—'; }
                                                                return <div key={key}>{label}: {oldDisplay} → {newDisplay}</div>;
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                            <button
                                onClick={() => {
                                    const task = selectedViewTask;
                                    setSelectedViewTask(null);
                                    openEditModal(task);
                                }}
                                style={{ flex: 1, padding: '0.6rem 1rem', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '0.5rem', color: '#38bdf8', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}
                            >
                                ✏️ Edytuj zadanie
                            </button>
                            {(['todo', 'in_progress', 'done'] as const).map(s => s !== selectedViewTask.status && (
                                <button
                                    key={s}
                                    onClick={() => {
                                        handleUpdateStatus(selectedViewTask.id, s);
                                        setSelectedViewTask(prev => prev ? { ...prev, status: s } : null);
                                    }}
                                    style={{ padding: '0.6rem 0.75rem', background: `${getStatusColor(s)}15`, border: `1px solid ${getStatusColor(s)}44`, borderRadius: '0.5rem', color: getStatusColor(s), cursor: 'pointer', fontSize: '0.75rem' }}
                                >
                                    → {getStatusLabel(s)}
                                </button>
                            ))}
                            {isAdmin && (
                                <button
                                    onClick={() => { handleDeleteTask(selectedViewTask.id); setSelectedViewTask(null); }}
                                    style={{ padding: '0.6rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.5rem', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}
                                >
                                    🗑️ Usuń
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                                                setActiveTab('zadania');
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

            {/* ─── Task Type Manager Modal ───────────────────────────── */}
            {showTypeManager && (
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
            )}

            {/* ═══ ASYSTENT AI TAB ═══ */}
            {activeTab === 'asystent' && (
                <VoiceAssistant userId={userId} userEmail={currentUserEmail || ''} />
            )}

            {/* ═══ POWIADOMIENIA TAB ═══ */}
            {activeTab === 'powiadomienia' && (() => {
                // Helpers
                const fmtRelative = (iso: string) => {
                    const d = new Date(iso);
                    const now = new Date();
                    const diff = (now.getTime() - d.getTime()) / 1000;
                    if (diff < 60) return 'przed chwilą';
                    if (diff < 3600) return `${Math.floor(diff / 60)} min temu`;
                    if (diff < 86400) return `${Math.floor(diff / 3600)} godz. temu`;
                    const days = Math.floor(diff / 86400);
                    if (days === 1) return 'wczoraj';
                    return `${days} dni temu`;
                };
                const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
                const fmtDay = (iso: string) => {
                    const d = new Date(iso);
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
                    const nd = new Date(d); nd.setHours(0, 0, 0, 0);
                    if (nd.getTime() === today.getTime()) return 'Dziś';
                    if (nd.getTime() === yest.getTime()) return 'Wczoraj';
                    return d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
                };
                const tagIcon = (tag: string | null) => {
                    if (!tag) return '🔔';
                    if (tag.startsWith('task')) return '📋';
                    if (tag.startsWith('appointment')) return '📅';
                    if (tag.startsWith('assistant')) return '🤖';
                    if (tag.startsWith('manual')) return '📣';
                    return '🔔';
                };

                // Group by day
                const byDay: Record<string, typeof pushNotifications> = {};
                for (const n of pushNotifications) {
                    const key = fmtDay(n.sent_at);
                    if (!byDay[key]) byDay[key] = [];
                    byDay[key].push(n);
                }

                return (
                    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                                    🔔 Historia powiadomień
                                </h2>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: '0.25rem 0 0' }}>
                                    Ostatnie 7 dni • Pokazujesz tylko swoje powiadomienia
                                </p>
                            </div>
                            <button
                                onClick={fetchPushNotifications}
                                disabled={pushNotifLoading}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.5rem 1rem',
                                    background: 'rgba(56, 189, 248, 0.08)',
                                    border: '1px solid rgba(56, 189, 248, 0.2)',
                                    borderRadius: '0.5rem', color: '#38bdf8',
                                    fontSize: '0.8rem', cursor: pushNotifLoading ? 'not-allowed' : 'pointer',
                                    opacity: pushNotifLoading ? 0.5 : 1, transition: 'all 0.2s',
                                }}
                            >
                                <RefreshCw size={13} style={{ animation: pushNotifLoading ? 'spin 1s linear infinite' : 'none' }} />
                                Odśwież
                            </button>
                        </div>

                        {/* Error */}
                        {pushNotifError && (
                            <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.75rem', color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                ⚠️ {pushNotifError}
                            </div>
                        )}

                        {/* Loading skeleton */}
                        {pushNotifLoading && pushNotifications.length === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} style={{ height: '64px', background: 'rgba(255,255,255,0.04)', borderRadius: '0.75rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                ))}
                            </div>
                        )}

                        {/* Empty state */}
                        {!pushNotifLoading && pushNotifications.length === 0 && !pushNotifError && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1rem', color: 'rgba(255,255,255,0.35)' }}>
                                <Bell size={48} style={{ opacity: 0.2 }} />
                                <p style={{ fontSize: '1rem', margin: 0 }}>Brak powiadomień z ostatnich 7 dni</p>
                                <p style={{ fontSize: '0.8rem', margin: 0, opacity: 0.7 }}>Powiadomienia będą się tu pojawiać automatycznie</p>
                            </div>
                        )}

                        {/* Grouped notification list */}
                        {!pushNotifLoading && Object.entries(byDay).map(([day, items]) => (
                            <div key={day} style={{ marginBottom: '1.5rem' }}>
                                {/* Day header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{day}</span>
                                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                                </div>

                                {/* Notification rows */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {items.map(notif => (
                                        <div
                                            key={notif.id}
                                            onClick={() => notif.url && window.open(notif.url, '_self')}
                                            style={{
                                                display: 'flex', alignItems: 'flex-start', gap: '0.9rem',
                                                padding: '0.85rem 1rem',
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                borderRadius: '0.75rem',
                                                cursor: notif.url ? 'pointer' : 'default',
                                                transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => { if (notif.url) (e.currentTarget as HTMLDivElement).style.background = 'rgba(56,189,248,0.05)'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
                                        >
                                            {/* Icon */}
                                            <div style={{ fontSize: '1.3rem', lineHeight: 1, flexShrink: 0, marginTop: '0.1rem' }}>{tagIcon(notif.tag)}</div>

                                            {/* Content */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ margin: '0 0 0.2rem', fontSize: '0.9rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notif.title}</p>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{notif.body}</p>
                                            </div>

                                            {/* Timestamp */}
                                            <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                                <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>{fmtTime(notif.sent_at)}</p>
                                                <p style={{ margin: '0.15rem 0 0', fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>{fmtRelative(notif.sent_at)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })()}

            {activeTab === 'sugestie' && (() => {
                const categoryLabels: Record<string, { label: string; color: string; icon: string }> = {
                    'funkcja': { label: 'Nowa funkcja', color: '#a78bfa', icon: '✨' },
                    'poprawka': { label: 'Poprawka', color: '#f59e0b', icon: '🔧' },
                    'pomysł': { label: 'Pomysł', color: '#38bdf8', icon: '💡' },
                    'inny': { label: 'Inny', color: '#94a3b8', icon: '📝' },
                };
                const statusLabels: Record<string, { label: string; color: string }> = {
                    'nowa': { label: 'Nowa', color: '#94a3b8' },
                    'w_dyskusji': { label: 'W dyskusji', color: '#f59e0b' },
                    'zaplanowana': { label: 'Zaplanowana', color: '#38bdf8' },
                    'wdrożona': { label: 'Wdrożona', color: '#4ade80' },
                    'odrzucona': { label: 'Odrzucona', color: '#ef4444' },
                };

                const handleSubmitSuggestion = async () => {
                    if (!sugForm.content.trim()) return;
                    setSugSubmitting(true);
                    try {
                        const authorName = staffList.find(s => s.id === currentUserId)?.name || currentUserEmail || '';
                        const res = await fetch('/api/employee/suggestions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                author_email: currentUserEmail,
                                author_name: authorName,
                                content: sugForm.content,
                                category: sugForm.category,
                            }),
                        });
                        if (res.ok) {
                            const newSug = await res.json();
                            setSuggestions(prev => [{ ...newSug, feature_suggestion_comments: [{ count: 0 }] }, ...prev]);
                            setSugForm({ content: '', category: 'funkcja' });
                        } else {
                            const err = await res.json().catch(() => ({}));
                            alert(`Błąd: ${err.error || res.status}`);
                        }
                    } catch (e: any) { alert(`Błąd sieci: ${e.message}`); }
                    finally { setSugSubmitting(false); }
                };

                const handleUpvote = async (id: string) => {
                    const res = await fetch('/api/employee/suggestions', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, action: 'upvote', email: currentUserEmail }),
                    });
                    if (res.ok) {
                        const { upvotes } = await res.json();
                        setSuggestions(prev => prev.map(s => s.id === id ? { ...s, upvotes } : s));
                    }
                };

                const loadComments = async (id: string) => {
                    if (expandedSuggestion === id) { setExpandedSuggestion(null); return; }
                    setExpandedSuggestion(id);
                    setSugCommentText('');
                    if (!sugComments[id]) {
                        const res = await fetch(`/api/employee/suggestions/${id}/comments`);
                        if (res.ok) {
                            const data = await res.json();
                            setSugComments(prev => ({ ...prev, [id]: data }));
                        }
                    }
                };

                const submitComment = async (sugId: string) => {
                    if (!sugCommentText.trim()) return;
                    const authorName = staffList.find(s => s.id === currentUserId)?.name || currentUserEmail || '';
                    const res = await fetch(`/api/employee/suggestions/${sugId}/comments`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            author_email: currentUserEmail,
                            author_name: authorName,
                            content: sugCommentText,
                        }),
                    });
                    if (res.ok) {
                        const newComment = await res.json();
                        setSugComments(prev => ({ ...prev, [sugId]: [...(prev[sugId] || []), newComment] }));
                        setSugCommentText('');
                        setSuggestions(prev => prev.map(s => s.id === sugId ? {
                            ...s,
                            feature_suggestion_comments: [{ count: (s.feature_suggestion_comments?.[0]?.count || 0) + 1 }]
                        } : s));
                    }
                };

                return (
                    <div style={{ maxWidth: 700, margin: '0 auto', padding: isMobile ? '0.75rem' : '1.5rem', paddingBottom: isMobile ? '5rem' : '1.5rem' }}>
                        {/* Header */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#e2e8f0', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Lightbulb size={22} style={{ color: '#f59e0b' }} /> Sugestie funkcji
                            </h2>
                            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.3rem' }}>
                                Podziel się pomysłem na nową funkcję lub poprawki w aplikacji
                            </p>
                        </div>

                        {/* New suggestion form */}
                        <div style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '0.75rem',
                            padding: '1rem',
                            marginBottom: '1.25rem',
                        }}>
                            <textarea
                                value={sugForm.content}
                                onChange={e => setSugForm(f => ({ ...f, content: e.target.value }))}
                                placeholder="Opisz swoją sugestję lub pomysł..."
                                style={{
                                    width: '100%',
                                    minHeight: 80,
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '0.5rem',
                                    padding: '0.65rem 0.75rem',
                                    color: '#e2e8f0',
                                    fontSize: '0.85rem',
                                    resize: 'vertical',
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box',
                                }}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <select
                                    value={sugForm.category}
                                    onChange={e => setSugForm(f => ({ ...f, category: e.target.value }))}
                                    style={{
                                        background: 'rgba(255,255,255,0.07)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '0.4rem',
                                        padding: '0.35rem 0.5rem',
                                        color: '#e2e8f0',
                                        fontSize: '0.78rem',
                                    }}
                                >
                                    <option value="funkcja">✨ Nowa funkcja</option>
                                    <option value="poprawka">🔧 Poprawka</option>
                                    <option value="pomysł">💡 Pomysł</option>
                                    <option value="inny">📝 Inny</option>
                                </select>
                                <button
                                    onClick={handleSubmitSuggestion}
                                    disabled={sugSubmitting || !sugForm.content.trim()}
                                    style={{
                                        marginLeft: 'auto',
                                        background: sugForm.content.trim() ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.06)',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        padding: '0.5rem 1.2rem',
                                        color: sugForm.content.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        cursor: sugForm.content.trim() ? 'pointer' : 'default',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        opacity: sugSubmitting ? 0.6 : 1,
                                        WebkitTapHighlightColor: 'transparent',
                                        touchAction: 'manipulation',
                                    }}
                                >
                                    <Send size={14} /> {sugSubmitting ? 'Wysyłam...' : 'Wyślij'}
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        {sugLoading ? (
                            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,255,255,0.4)' }}>
                                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                            </div>
                        ) : suggestions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,255,255,0.3)' }}>
                                <Lightbulb size={40} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                                <div>Brak sugestii. Bądź pierwszy!</div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {suggestions.map(sug => {
                                    const cat = categoryLabels[sug.category] || categoryLabels['inny'];
                                    const st = statusLabels[sug.status] || statusLabels['nowa'];
                                    const upvoteCount = sug.upvotes?.length || 0;
                                    const hasUpvoted = sug.upvotes?.includes(currentUserEmail);
                                    const commentCount = sug.feature_suggestion_comments?.[0]?.count || 0;
                                    const isExpanded = expandedSuggestion === sug.id;

                                    return (
                                        <div key={sug.id} style={{
                                            background: 'rgba(255,255,255,0.04)',
                                            border: `1px solid ${isExpanded ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                            borderRadius: '0.75rem',
                                            overflow: 'hidden',
                                            transition: 'border-color 0.2s',
                                        }}>
                                            {/* Suggestion header */}
                                            <div style={{ padding: '0.85rem 1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                                                    {/* Upvote */}
                                                    <button
                                                        onClick={() => handleUpvote(sug.id)}
                                                        style={{
                                                            background: hasUpvoted ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                                                            border: `1px solid ${hasUpvoted ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                                            borderRadius: '0.5rem',
                                                            padding: '0.35rem 0.5rem',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            gap: '0.15rem',
                                                            cursor: 'pointer',
                                                            color: hasUpvoted ? '#f59e0b' : 'rgba(255,255,255,0.4)',
                                                            minWidth: 38,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <ThumbsUp size={14} />
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{upvoteCount}</span>
                                                    </button>
                                                    {/* Content */}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                                                            <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', background: `${cat.color}22`, color: cat.color, fontWeight: 600 }}>
                                                                {cat.icon} {cat.label}
                                                            </span>
                                                            <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', background: `${st.color}22`, color: st.color, fontWeight: 600 }}>
                                                                {st.label}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                                                            {sug.content}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>
                                                                {sug.author_name} • {new Date(sug.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                                                            </span>
                                                            <button
                                                                onClick={() => loadComments(sug.id)}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: isExpanded ? '#f59e0b' : 'rgba(255,255,255,0.4)',
                                                                    fontSize: '0.72rem',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.25rem',
                                                                    padding: 0,
                                                                }}
                                                            >
                                                                <MessageSquare size={12} /> {commentCount} komentarz{commentCount === 1 ? '' : commentCount > 1 && commentCount < 5 ? 'e' : 'y'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Comments (expanded) */}
                                            {isExpanded && (
                                                <div style={{
                                                    borderTop: '1px solid rgba(255,255,255,0.06)',
                                                    background: 'rgba(0,0,0,0.15)',
                                                    padding: '0.75rem 1rem',
                                                }}>
                                                    {(sugComments[sug.id] || []).length === 0 && (
                                                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '0.5rem 0' }}>
                                                            Brak komentarzy
                                                        </div>
                                                    )}
                                                    {(sugComments[sug.id] || []).map((c: any) => (
                                                        <div key={c.id} style={{ marginBottom: '0.5rem' }}>
                                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.15rem' }}>
                                                                {c.author_name} • {new Date(c.created_at).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                            <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                                                                {c.content}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {/* Add comment */}
                                                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                                                        <input
                                                            value={sugCommentText}
                                                            onChange={e => setSugCommentText(e.target.value)}
                                                            onKeyDown={e => e.key === 'Enter' && submitComment(sug.id)}
                                                            placeholder="Dodaj komentarz..."
                                                            style={{
                                                                flex: 1,
                                                                background: 'rgba(255,255,255,0.06)',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                borderRadius: '0.4rem',
                                                                padding: '0.4rem 0.6rem',
                                                                color: '#e2e8f0',
                                                                fontSize: '0.8rem',
                                                                outline: 'none',
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => submitComment(sug.id)}
                                                            disabled={!sugCommentText.trim()}
                                                            style={{
                                                                background: sugCommentText.trim() ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.06)',
                                                                border: 'none',
                                                                borderRadius: '0.4rem',
                                                                padding: '0.4rem 0.6rem',
                                                                color: sugCommentText.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                                                                cursor: sugCommentText.trim() ? 'pointer' : 'default',
                                                            }}
                                                        >
                                                            <Send size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })()}

            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div >
    );
}
