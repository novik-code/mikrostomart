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
    appointmentTypeId: string;
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
            const rawApts: ProdentisAppointment[] = (data.appointments || []);

            // First pass: parse all appointments and group by doctor
            interface ParsedApt {
                raw: ProdentisAppointment;
                startMinutes: number;
                doctorName: string;
            }
            const parsed: ParsedApt[] = [];

            for (const apt of rawApts) {
                const aptDate = new Date(apt.date);
                const startHour = aptDate.getUTCHours();
                const startMinute = aptDate.getUTCMinutes();

                // Skip very early informational entries
                if (startHour < 7) continue;

                const doctorName = apt.doctor?.name?.replace(/\s*\(I\)\s*/g, ' ').trim() || 'Nieznany';
                allDoctors.add(doctorName);

                parsed.push({
                    raw: apt,
                    startMinutes: startHour * 60 + startMinute,
                    doctorName,
                });
            }

            // Group by doctor for duration inference
            const byDoctor = new Map<string, ParsedApt[]>();
            for (const p of parsed) {
                if (!byDoctor.has(p.doctorName)) byDoctor.set(p.doctorName, []);
                byDoctor.get(p.doctorName)!.push(p);
            }

            // Sort each doctor's appointments by time
            for (const [, docApts] of byDoctor) {
                docApts.sort((a, b) => a.startMinutes - b.startMinutes);
            }

            // Second pass: build ScheduleAppointments with inferred durations
            const appointments: ScheduleAppointment[] = [];

            for (const [doctorName, docApts] of byDoctor) {
                for (let j = 0; j < docApts.length; j++) {
                    const p = docApts[j];
                    const startHour = Math.floor(p.startMinutes / 60);
                    const startMinute = p.startMinutes % 60;
                    const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;

                    // Infer duration from gap to next appointment for same doctor
                    let duration: number;
                    if (j + 1 < docApts.length) {
                        duration = docApts[j + 1].startMinutes - p.startMinutes;
                        // Sanity: cap at 4 hours, minimum 15 min
                        if (duration <= 0) duration = 15;
                        if (duration > 240) duration = 30;
                    } else {
                        // Last appointment of the day — default 30 min
                        duration = 30;
                    }

                    const endMinutes = p.startMinutes + duration;
                    const endHour = Math.floor(endMinutes / 60);
                    const endMinute = endMinutes % 60;
                    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

                    appointments.push({
                        id: p.raw.id,
                        patientName: p.raw.patientName || 'Brak danych',
                        doctorName,
                        doctorId: p.raw.doctor?.id || '',
                        startTime,
                        endTime,
                        duration,
                        appointmentType: p.raw.appointmentType?.name || 'Wizyta',
                        appointmentTypeId: p.raw.appointmentType?.id || '',
                        isWorkingHour: p.raw.isWorkingHour ?? true,
                        patientPhone: p.raw.patientPhone || '',
                    });
                }
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
