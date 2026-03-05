'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ScheduleAppointment, ScheduleDay, ScheduleData } from '../components/ScheduleTypes';
import { getMonday, timeToMinutes } from '../components/ScheduleTypes';

// ─── Context Menu State ──────────────────────────────────────────
export interface ScheduleContextMenuState {
    apt: ScheduleAppointment;
    dayDate: string;
    x: number;
    y: number;
}

// ─── Hook Props ──────────────────────────────────────────────────
interface UseScheduleProps {
    scheduleData: ScheduleData | null;
    currentWeekStart: Date;
    setCurrentWeekStart: (v: Date | ((prev: Date) => Date)) => void;
    fetchSchedule: () => void;
}

// ─── useSchedule Hook ────────────────────────────────────────────
export function useSchedule({
    scheduleData, currentWeekStart, setCurrentWeekStart, fetchSchedule,
}: UseScheduleProps) {

    // ── Context Menu ─────────────────────────────────────────────
    const [scheduleContextMenu, setScheduleContextMenu] = useState<ScheduleContextMenuState | null>(null);
    const [scheduleColors, setScheduleColors] = useState<any[]>([]);
    const [scheduleIcons, setScheduleIcons] = useState<any[]>([]);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressFiredRef = useRef(false);

    // ── Hidden Doctors / Days (persisted to localStorage) ────────
    const [hiddenDoctors, setHiddenDoctors] = useState<Set<string>>(() => {
        try {
            const saved = typeof window !== "undefined" ? localStorage.getItem("schedule-hidden-doctors") : null;
            return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
        } catch { return new Set(); }
    });
    const [hiddenScheduleDays, setHiddenScheduleDays] = useState<Set<number>>(() => {
        try {
            const saved = typeof window !== "undefined" ? localStorage.getItem("schedule-hidden-days") : null;
            return saved ? new Set(JSON.parse(saved) as number[]) : new Set();
        } catch { return new Set(); }
    });

    // ─────────────────────────────────────────────────────────────
    // Fetch Colors & Icons
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchColorsIcons = async () => {
            try {
                const [colorsRes, iconsRes] = await Promise.all([
                    fetch("/api/admin/prodentis-schedule/colors"),
                    fetch("/api/admin/prodentis-schedule/icons"),
                ]);
                if (colorsRes.ok) { setScheduleColors((await colorsRes.json()).colors || []); }
                if (iconsRes.ok) { setScheduleIcons((await iconsRes.json()).icons || []); }
            } catch (err) { console.error("[Schedule] Failed to fetch colors/icons:", err); }
        };
        fetchColorsIcons();
    }, []);

    // Close context menu on click outside or Escape
    useEffect(() => {
        if (!scheduleContextMenu) return;
        const close = () => setScheduleContextMenu(null);
        const keyClose = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
        window.addEventListener("click", close);
        window.addEventListener("keydown", keyClose);
        return () => { window.removeEventListener("click", close); window.removeEventListener("keydown", keyClose); };
    }, [scheduleContextMenu]);

    // ─────────────────────────────────────────────────────────────
    // Handler Functions
    // ─────────────────────────────────────────────────────────────

    const isAppointmentPast = useCallback((dayDate: string, apt: ScheduleAppointment): boolean => {
        const now = new Date();
        const [h, m] = apt.endTime.split(':').map(Number);
        const aptEnd = new Date(dayDate + 'T00:00:00');
        aptEnd.setHours(h, m, 0, 0);
        return aptEnd < now;
    }, []);

    const handleScheduleContextMenu = useCallback((e: React.MouseEvent, apt: ScheduleAppointment, dayDate: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (isAppointmentPast(dayDate, apt)) return;
        setScheduleContextMenu({ apt, dayDate, x: e.clientX, y: e.clientY });
    }, [isAppointmentPast]);

    const handleTouchStart = useCallback((e: React.TouchEvent, apt: ScheduleAppointment, dayDate: string) => {
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
    }, [isAppointmentPast]);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const handleTouchMove = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const handleChangeScheduleColor = useCallback(async (appointmentId: string, colorId: string, colorName: string) => {
        setScheduleContextMenu(null);
        try {
            const res = await fetch('/api/admin/prodentis-schedule/color', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId, colorId }),
            });
            if (res.ok) {
                alert(`✅ Kolor zmieniony na: ${colorName}`);
                fetchSchedule();
            } else {
                const data = await res.json();
                alert(`❌ Błąd: ${data.error || data.message}`);
            }
        } catch (err) {
            console.error('[Schedule] Color change error:', err);
            alert('❌ Błąd połączenia');
        }
    }, [fetchSchedule]);

    const handleAddScheduleIcon = useCallback(async (appointmentId: string, iconId: string, iconName: string) => {
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
    }, [fetchSchedule]);

    // ─────────────────────────────────────────────────────────────
    // Navigation
    // ─────────────────────────────────────────────────────────────

    const navigateWeek = useCallback((direction: number) => {
        setCurrentWeekStart((prev: Date) => {
            const d = new Date(prev);
            d.setDate(d.getDate() + direction * 7);
            return d;
        });
    }, [setCurrentWeekStart]);

    const goToToday = useCallback(() => {
        setCurrentWeekStart(getMonday(new Date()));
    }, [setCurrentWeekStart]);

    // ─────────────────────────────────────────────────────────────
    // Schedule Grid Helpers
    // ─────────────────────────────────────────────────────────────

    const getAppointmentsForCell = useCallback((doctor: string, day: ScheduleDay): ScheduleAppointment[] => {
        return day.appointments.filter(apt => apt.doctorName === doctor);
    }, []);

    const getAppointmentAtSlot = useCallback((appointments: ScheduleAppointment[], slotTime: string): ScheduleAppointment | null => {
        const slotMinutes = timeToMinutes(slotTime);
        for (const apt of appointments) {
            const startMin = timeToMinutes(apt.startTime);
            const endMin = startMin + apt.duration;
            if (slotMinutes >= startMin && slotMinutes < endMin) {
                return apt;
            }
        }
        return null;
    }, []);

    const getAppointmentRowSpan = useCallback((apt: ScheduleAppointment): number => {
        return Math.max(1, Math.ceil(apt.duration / 15));
    }, []);

    const isToday = useCallback((dateStr: string): boolean => {
        const today = new Date().toISOString().split('T')[0];
        return dateStr === today;
    }, []);

    const getVisibleDays = useCallback((): ScheduleDay[] => {
        if (!scheduleData) return [];
        return scheduleData.days.filter((day) => {
            const jsDay = new Date(day.date + 'T12:00:00').getDay();
            if (hiddenScheduleDays.has(jsDay)) return false;
            if (jsDay >= 1 && jsDay <= 5) return true;
            return day.appointments.length > 0;
        });
    }, [scheduleData, hiddenScheduleDays]);

    const toggleScheduleDay = useCallback((dayIdx: number) => {
        setHiddenScheduleDays(prev => {
            const next = new Set(prev);
            if (next.has(dayIdx)) next.delete(dayIdx); else next.add(dayIdx);
            try { localStorage.setItem('schedule-hidden-days', JSON.stringify([...next])); } catch { }
            return next;
        });
    }, []);

    const toggleDoctor = useCallback((doctor: string) => {
        setHiddenDoctors(prev => {
            const next = new Set(prev);
            if (next.has(doctor)) next.delete(doctor); else next.add(doctor);
            try { localStorage.setItem('schedule-hidden-doctors', JSON.stringify([...next])); } catch { }
            return next;
        });
    }, []);

    const showAllDoctors = useCallback(() => {
        setHiddenDoctors(new Set());
        try { localStorage.setItem('schedule-hidden-doctors', '[]'); } catch { }
    }, []);

    const hideAllDoctors = useCallback(() => {
        const allDoctors = scheduleData?.doctors || [];
        const allHidden = new Set(allDoctors);
        setHiddenDoctors(allHidden);
        try { localStorage.setItem('schedule-hidden-doctors', JSON.stringify([...allHidden])); } catch { }
    }, [scheduleData]);

    // ── Derived values ───────────────────────────────────────────
    const doctors = scheduleData?.doctors || [];
    const visibleDoctors = doctors.filter(d => !hiddenDoctors.has(d));
    const visibleDays = getVisibleDays();

    const weekEndDate = new Date(currentWeekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekLabel = `${currentWeekStart.getDate().toString().padStart(2, '0')}.${(currentWeekStart.getMonth() + 1).toString().padStart(2, '0')} - ${weekEndDate.getDate().toString().padStart(2, '0')}.${(weekEndDate.getMonth() + 1).toString().padStart(2, '0')}.${weekEndDate.getFullYear()}`;

    // ─────────────────────────────────────────────────────────────
    // Return
    // ─────────────────────────────────────────────────────────────
    return {
        // Context menu
        scheduleContextMenu, setScheduleContextMenu,
        scheduleColors, scheduleIcons,

        // Hidden doctors/days
        hiddenDoctors, hiddenScheduleDays,

        // Handlers
        isAppointmentPast,
        handleScheduleContextMenu,
        handleTouchStart, handleTouchEnd, handleTouchMove,
        handleChangeScheduleColor, handleAddScheduleIcon,

        // Navigation
        navigateWeek, goToToday,

        // Grid helpers
        getAppointmentsForCell, getAppointmentAtSlot, getAppointmentRowSpan,
        isToday, getVisibleDays,

        // Refs
        longPressFiredRef,

        // Toggles
        toggleScheduleDay, toggleDoctor, showAllDoctors, hideAllDoctors,

        // Derived
        doctors, visibleDoctors, visibleDays, weekLabel,
    };
}
