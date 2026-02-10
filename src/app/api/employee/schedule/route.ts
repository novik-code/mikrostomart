import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || 'http://localhost:3000';

interface ProdentisAppointment {
    id: string;
    date: string;
    patientName: string;
    patientPhone: string;
    doctor: {
        id: string;
        name: string;
    };
    appointmentType: {
        id: string;
        name: string;
    };
    isWorkingHour: boolean;
    duration?: number;
}

interface ScheduleAppointment {
    id: string;
    patientName: string;
    doctorName: string;
    doctorId: string;
    startTime: string;
    endTime: string;
    duration: number;
    appointmentType: string;
    isWorkingHour: boolean;
    patientPhone: string;
}

interface ScheduleDay {
    date: string;
    dayName: string;
    appointments: ScheduleAppointment[];
}

const POLISH_DAYS = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

/**
 * GET /api/employee/schedule?weekStart=2026-02-09
 * Returns weekly schedule with appointments for all operators
 */
export async function GET(req: Request) {
    // Auth check — must be logged in
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check employee or admin role
    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień pracownika' }, { status: 403 });
    }

    const url = new URL(req.url);
    const weekStartParam = url.searchParams.get('weekStart');

    // Calculate week start (Monday)
    let weekStart: Date;
    if (weekStartParam) {
        weekStart = new Date(weekStartParam + 'T00:00:00');
    } else {
        // Default to current week's Monday
        weekStart = new Date();
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Monday
        weekStart = new Date(weekStart.setDate(diff));
    }
    weekStart.setHours(0, 0, 0, 0);

    const days: ScheduleDay[] = [];
    const allDoctors = new Set<string>();

    // Fetch 7 days of appointments
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = POLISH_DAYS[date.getDay()];

        try {
            const apiUrl = `${PRODENTIS_API_URL}/api/appointments/by-date?date=${dateStr}`;
            const response = await fetch(apiUrl, {
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                console.error(`[Schedule] Failed to fetch ${dateStr}: ${response.status}`);
                days.push({ date: dateStr, dayName, appointments: [] });
                continue;
            }

            const data = await response.json();
            const appointments: ScheduleAppointment[] = [];

            for (const apt of (data.appointments || []) as ProdentisAppointment[]) {
                // Parse time from Prodentis date field
                const aptDate = new Date(apt.date);
                const startHour = aptDate.getUTCHours();
                const startMinute = aptDate.getUTCMinutes();

                // Skip very early informational entries
                if (startHour < 7) continue;

                const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;

                // Estimate duration (default 30 min if not provided)
                const duration = apt.duration || 30;
                const endMinutes = startHour * 60 + startMinute + duration;
                const endHour = Math.floor(endMinutes / 60);
                const endMinute = endMinutes % 60;
                const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

                const doctorName = apt.doctor?.name?.replace(/\s*\(I\)\s*/g, ' ').trim() || 'Nieznany';

                allDoctors.add(doctorName);

                appointments.push({
                    id: apt.id,
                    patientName: apt.patientName || 'Brak danych',
                    doctorName,
                    doctorId: apt.doctor?.id || '',
                    startTime,
                    endTime,
                    duration,
                    appointmentType: apt.appointmentType?.name || 'Wizyta',
                    isWorkingHour: apt.isWorkingHour ?? true,
                    patientPhone: apt.patientPhone || '',
                });
            }

            // Sort by time
            appointments.sort((a, b) => a.startTime.localeCompare(b.startTime));

            days.push({ date: dateStr, dayName, appointments });
        } catch (err) {
            console.error(`[Schedule] Error fetching ${dateStr}:`, err);
            days.push({ date: dateStr, dayName, appointments: [] });
        }
    }

    return NextResponse.json({
        weekStart: weekStart.toISOString().split('T')[0],
        days,
        doctors: Array.from(allDoctors).sort(),
    });
}
