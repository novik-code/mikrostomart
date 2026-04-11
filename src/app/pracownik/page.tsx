"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { LogOut, ChevronLeft, ChevronRight, Calendar, RefreshCw, CheckSquare, Plus, User, AlertTriangle, Trash2, Clock, X, Bell, Bot, Lightbulb, ThumbsUp, MessageSquare, MessageCircle, Send, Menu, Search, Mail, Settings } from "lucide-react";
import VoiceAssistant from "@/components/VoiceAssistant";
import { useUserRoles } from "@/hooks/useUserRoles";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";
import { QRCodeSVG } from "qrcode.react";
import { CONSENT_TYPES as HARDCODED_CONSENT_TYPES } from "@/lib/consentTypes";

// ─── Extracted Types & Constants ─────────────────────────────────
import type { Badge, ScheduleAppointment, Visit, ScheduleDay, ScheduleData } from './components/ScheduleTypes';
import { PRODENTIS_COLORS, DEFAULT_COLOR, BADGE_LETTERS, getBadgeLetter, getAppointmentColor, TIME_SLOTS, timeToSlotIndex, timeToMinutes, getMonday, formatDateShort } from './components/ScheduleTypes';
import type { ChecklistItem, EmployeeTask, FutureAppointment, StaffMember, TaskTypeTemplate } from './components/TaskTypes';
import { TASK_TYPE_COLORS, getTaskTypeColor, FALLBACK_TASK_TYPE_CHECKLISTS } from './components/TaskTypes';
import NotificationsTab from './components/NotificationsTab';
import SuggestionsTab from './components/SuggestionsTab';
import PatientsTab from './components/PatientsTab';
import PreferencesTab from './components/PreferencesTab';
import dynamic from 'next/dynamic';

// Heavy tabs — code-split so Safari doesn't choke on initial bundle
const ScheduleTab = dynamic(() => import('./components/ScheduleTab'), { ssr: false });
const TasksTab = dynamic(() => import('./components/TasksTab'), { ssr: false });
const EmailTab = dynamic(() => import('./components/EmailTab'), { ssr: false });
const AdminChat = dynamic(() => import('@/components/AdminChat'), { ssr: false });

// ─── Main Component ─────────────────────────────────────────────
export default function EmployeePage() {
    const router = useRouter();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));
    const [userEmail, setUserEmail] = useState<string>('');
    const [userId, setUserId] = useState<string>('');

    const [selectedAppointment, setSelectedAppointment] = useState<ScheduleAppointment | null>(null);
    const [patientHistory, setPatientHistory] = useState<Visit[] | null>(null);

    // Patient data modal state
    const [patientDataModal, setPatientDataModal] = useState<any>(null);
    const [patientDataLoading, setPatientDataLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<string>('');
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [sessionTimeoutWarning, setSessionTimeoutWarning] = useState(false);
    const { userId: currentUserId, email: currentUserEmail, isAdmin } = useUserRoles();
    const [activeTab, setActiveTab] = useState<'grafik' | 'zadania' | 'asystent' | 'powiadomienia' | 'sugestie' | 'pacjenci' | 'poczta' | 'czat' | 'preferencje'>('grafik');
    const [loginPopupTasks, setLoginPopupTasks] = useState<EmployeeTask[]>([]);
    const [showLoginPopup, setShowLoginPopup] = useState(false);

    // ─── Feature suggestions state (shared — list loaded on tab switch) ───
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [sugLoading, setSugLoading] = useState(false);
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
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskModalPrefill, setTaskModalPrefill] = useState<{
        patientId?: string;
        patientName?: string;
        appointmentType?: string;
    } | null>(null);
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
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


    // ─── Session Timeout: 30 min idle → auto-logout, 25 min → warning ────────
    useEffect(() => {
        const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
        const WARNING_MS = 25 * 60 * 1000; // 25 minutes
        let timeoutId: ReturnType<typeof setTimeout>;
        let warningId: ReturnType<typeof setTimeout>;

        const resetTimers = () => {
            setSessionTimeoutWarning(false);
            clearTimeout(timeoutId);
            clearTimeout(warningId);
            warningId = setTimeout(() => setSessionTimeoutWarning(true), WARNING_MS);
            timeoutId = setTimeout(async () => {
                await supabase.auth.signOut();
                window.location.href = '/pracownik/login?reason=timeout';
            }, TIMEOUT_MS);
        };

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, resetTimers, { passive: true }));
        resetTimers();

        return () => {
            clearTimeout(timeoutId);
            clearTimeout(warningId);
            events.forEach(e => window.removeEventListener(e, resetTimers));
        };
    }, []);

    // Fetch schedule
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/pracownik/login");
    };

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

    // Fetch tasks on mount so ScheduleTab dashboard stats are populated
    // AND trigger login popup showing pending tasks (once per session)
    const fetchTasksForDashboard = useCallback(async () => {
        try {
            const res = await fetch('/api/employee/tasks');
            if (!res.ok) return;
            const data = await res.json();
            const allTasks: EmployeeTask[] = data.tasks || [];
            setTasks(allTasks);

            // Show login popup once per session if user has pending tasks
            if (currentUserId && currentUserEmail) {
                const popupKey = `taskPopupShown_${currentUserId}`;
                if (typeof window !== 'undefined' && !sessionStorage.getItem(popupKey)) {
                    const mine = allTasks.filter(t =>
                        (t.status === 'todo' || t.status === 'in_progress') &&
                        ((t.assigned_to || []).some(a => a.id === currentUserId) ||
                            t.assigned_to_doctor_id === currentUserId ||
                            t.created_by_email === currentUserEmail)
                    );
                    if (mine.length > 0) {
                        setLoginPopupTasks(mine);
                        setShowLoginPopup(true);
                        sessionStorage.setItem(popupKey, '1');
                    }
                }
            }
        } catch (err) {
            console.error('[Tasks] Dashboard fetch error:', err);
        }
    }, [currentUserId, currentUserEmail]);

    useEffect(() => {
        fetchTasksForDashboard();
    }, [fetchTasksForDashboard]);




    // Open patient history modal
    const openPatientHistory = useCallback(async (apt: ScheduleAppointment) => {
        if (!apt.patientId) return;
        setSelectedAppointment(apt);
        setPatientHistory(null);
        setHistoryError(null);
        setHistoryLoading(true);
        // Auto-switch to grafik tab (patient history modal renders inside ScheduleTab)
        setActiveTab('grafik');
        // Tooltips are now managed inside ScheduleTab
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

    const openTaskModal = (prefill?: { patientId?: string; patientName?: string; appointmentType?: string }) => {
        if (prefill) {
            setTaskModalPrefill(prefill);
        }
        setShowTaskModal(true);
        // Auto-switch to zadania tab (task modal renders inside TasksTab)
        setActiveTab('zadania');
    };

    // Fetch employee list for task assignment dropdowns
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

    // Load employee list on mount
    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    return (
        <div
            className="pw-content-area"
            onClick={() => {
                // Dismiss tooltips when tapping outside (mobile support)
                // (These tooltips are now managed inside ScheduleTab)
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
                {currentUserId && (
                    <PushNotificationPrompt
                        userType="employee"
                        userId={currentUserId}
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
                            { id: 'pacjenci' as const, label: 'Pacjenci', icon: <Search size={20} />, color: '#e879f9' },
                            { id: 'preferencje' as const, label: 'Preferencje', icon: <Settings size={20} />, color: '#94a3b8' },
                            { id: 'czat' as const, label: 'Czat', icon: <MessageCircle size={20} />, color: '#06b6d4' },
                            ...(isAdmin ? [{ id: 'poczta' as const, label: 'Poczta', icon: <Mail size={20} />, color: '#34d399' }] : []),
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
                        { id: 'pacjenci' as const, label: 'Pacjenci', icon: <Search size={18} /> },
                        { id: 'preferencje' as const, label: 'Preferencje', icon: <Settings size={18} /> },
                        { id: 'czat' as const, label: '💬 Czat', icon: <MessageCircle size={18} /> },
                        ...(isAdmin ? [{ id: 'poczta' as const, label: '📧 Poczta', icon: <Mail size={18} /> }] : []),
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
            {activeTab === 'grafik' && (
                <ScheduleTab
                    scheduleData={scheduleData}
                    loading={loading}
                    currentWeekStart={currentWeekStart}
                    setCurrentWeekStart={setCurrentWeekStart}
                    selectedAppointment={selectedAppointment}
                    setSelectedAppointment={setSelectedAppointment}
                    patientHistory={patientHistory}
                    setPatientHistory={setPatientHistory}
                    patientDataModal={patientDataModal}
                    setPatientDataModal={setPatientDataModal}
                    patientDataLoading={patientDataLoading}
                    setPatientDataLoading={setPatientDataLoading}
                    historyLoading={historyLoading}
                    historyError={historyError}
                    isMobile={isMobile}
                    fetchSchedule={fetchSchedule}
                    openPatientHistory={openPatientHistory}
                    openTaskModal={openTaskModal}
                    tasks={tasks}
                    userId={userId}
                    userEmail={userEmail}
                />
            )}

            {/* ═══ ZADANIA TAB ═══ */}
            {/* ═══ ZADANIA TAB ═══ */}
            {activeTab === 'zadania' && (
                <TasksTab
                    tasks={tasks}
                    setTasks={setTasks}
                    showTaskModal={showTaskModal}
                    setShowTaskModal={setShowTaskModal}
                    taskModalPrefill={taskModalPrefill}
                    setTaskModalPrefill={setTaskModalPrefill}
                    staffList={staffList}
                    currentUserId={currentUserId}
                    currentUserEmail={currentUserEmail}
                    isAdmin={isAdmin}
                    userId={userId}
                    userEmail={userEmail}
                    isMobile={isMobile}
                />
            )}


            {/* ═══ ASYSTENT AI TAB ═══ */}
            {activeTab === 'asystent' && (
                <VoiceAssistant userId={userId} userEmail={currentUserEmail || ''} />
            )}

            {/* ═══ POWIADOMIENIA TAB ═══ */}
            {activeTab === 'powiadomienia' && (
                <NotificationsTab
                    pushNotifications={pushNotifications}
                    pushNotifLoading={pushNotifLoading}
                    pushNotifError={pushNotifError}
                    fetchPushNotifications={fetchPushNotifications}
                />
            )}

            {activeTab === 'sugestie' && (
                <SuggestionsTab
                    suggestions={suggestions}
                    setSuggestions={setSuggestions}
                    sugLoading={sugLoading}
                    isMobile={isMobile}
                    currentUserEmail={currentUserEmail}
                    currentUserId={userId}
                    staffList={staffList}
                />
            )}

            {activeTab === 'pacjenci' && (
                <PatientsTab openPatientHistory={openPatientHistory} />
            )}

            {/* ═══ PREFERENCJE TAB ═══ */}
            {activeTab === 'preferencje' && (
                <PreferencesTab isMobile={isMobile} />
            )}

            {/* ═══ POCZTA TAB (admin only) ═══ */}
            {activeTab === 'poczta' && isAdmin && (
                <EmailTab />
            )}

            {/* ═══ CZAT TAB ═══ */}
            {activeTab === 'czat' && (
                <div style={{ padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                    <AdminChat />
                </div>
            )}



            {/* Login Popup — pending tasks */}
            {showLoginPopup && loginPopupTasks.length > 0 && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem',
                }} onClick={() => setShowLoginPopup(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                        border: '1px solid rgba(56,189,248,0.2)',
                        borderRadius: '1rem',
                        padding: '1.5rem',
                        maxWidth: '380px',
                        width: '100%',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                    }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>📋</div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', textAlign: 'center', marginBottom: '0.3rem' }}>
                            Masz {loginPopupTasks.length} {loginPopupTasks.length === 1 ? 'zadanie' : loginPopupTasks.length < 5 ? 'zadania' : 'zadań'} do realizacji
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: '1rem' }}>
                            {loginPopupTasks.filter(t => t.status === 'todo').length} nowych, {loginPopupTasks.filter(t => t.status === 'in_progress').length} w trakcie
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => { setShowLoginPopup(false); setActiveTab('zadania'); }}
                                style={{
                                    flex: 1, padding: '0.6rem', borderRadius: '0.5rem',
                                    background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                                    border: 'none', color: '#fff', fontWeight: 600,
                                    cursor: 'pointer', fontSize: '0.85rem',
                                }}
                            >
                                Przejdź do zadań
                            </button>
                            <button
                                onClick={() => setShowLoginPopup(false)}
                                style={{
                                    padding: '0.6rem 1rem', borderRadius: '0.5rem',
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.5)',
                                    cursor: 'pointer', fontSize: '0.85rem',
                                }}
                            >
                                Zamknij
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Session Timeout Warning */}
            {sessionTimeoutWarning && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        background: 'rgba(15,15,30,0.97)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        maxWidth: '360px',
                        textAlign: 'center',
                        boxShadow: '0 12px 48px rgba(239,68,68,0.2)',
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏳</div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '0.5rem' }}>
                            Sesja wygasa
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                            Ze względów bezpieczeństwa zostaniesz wylogowany za <strong style={{ color: '#ef4444' }}>5 minut</strong> braku aktywności.<br />
                            Kliknij poniżej aby kontynuować.
                        </p>
                        <button
                            onClick={() => setSessionTimeoutWarning(false)}
                            style={{
                                padding: '0.6rem 2rem',
                                background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: '#fff',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                            }}
                        >
                            ✅ Kontynuuj sesję
                        </button>
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

            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div >
    );
}
