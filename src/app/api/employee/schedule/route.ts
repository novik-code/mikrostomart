import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';
import { demoSanitize } from '@/lib/brandConfig';

export const dynamic = 'force-dynamic';

const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || 'http://localhost:3000';
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Normalize a name for fuzzy matching (lowercase, strip accents, collapse whitespace) */
function normalizeName(n: string): string {
    return n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

interface ProdentisBadge {
    id: string;
    name: string;
    color: string | null;
}

interface ProdentisAppointment {
    id: string;
    date: string;
    endDate?: string | null;   // End date/time of appointment (reliable duration source)
    patientName: string;
    patientPhone: string;
    patientId?: string;
    doctor: {
        id: string;
        name: string;
    };
    appointmentType: {
        id: string;
        name: string;
    };
    isWorkingHour: boolean;
    duration?: number | null;
    notes: string | null;
    badges?: ProdentisBadge[];
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
    badges: ProdentisBadge[];
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
                // Robust time extraction: parse HH:MM directly from the date string.
                // Prodentis may return ISO strings with a timezone offset (+02:00) or
                // without. Using Date methods (getHours/getUTCHours) is unreliable on
                // Vercel (UTC server). Instead, take the 'T' portion of the string.
                // e.g. '2026-02-23T09:00:00+01:00' → startHour=9, startMinute=0
                let startHour: number;
                let startMinute: number;
                const dateStr_apt = apt.date as string;
                const tIdx = dateStr_apt.indexOf('T');
                if (tIdx !== -1) {
                    // Extract the time portion immediately after 'T'
                    const timePart = dateStr_apt.slice(tIdx + 1, tIdx + 6); // 'HH:MM'
                    startHour = parseInt(timePart.slice(0, 2), 10);
                    startMinute = parseInt(timePart.slice(3, 5), 10);
                } else {
                    // Fallback
                    const aptDate = new Date(dateStr_apt);
                    startHour = aptDate.getHours();
                    startMinute = aptDate.getMinutes();
                }

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

                    // Compute duration from endDate when available (most reliable)
                    // IMPORTANT: Parse the time portion as a string (same as startTime above)
                    // to avoid UTC timezone sensitivity on Vercel (UTC server vs UTC+1/+2 local).
                    let duration: number = 0;
                    const endDateStr = p.raw.endDate;
                    if (endDateStr) {
                        const eTIdx = String(endDateStr).indexOf('T');
                        if (eTIdx !== -1) {
                            const eTimePart = String(endDateStr).slice(eTIdx + 1, eTIdx + 6); // 'HH:MM'
                            const eHour = parseInt(eTimePart.slice(0, 2), 10);
                            const eMin = parseInt(eTimePart.slice(3, 5), 10);
                            const endMinutes = eHour * 60 + eMin;
                            duration = endMinutes - p.startMinutes;
                            // Sanity: appointment must be between 5 min and 8 hours
                            if (duration <= 0 || duration > 480) duration = 0;
                        }
                    }

                    if (duration <= 0 && p.raw.duration && p.raw.duration > 0) {
                        // Fallback: use API-provided duration field (in minutes)
                        duration = p.raw.duration;
                    }

                    if (duration <= 0) {
                        // Last resort: infer from gap to next appointment of the same doctor
                        if (j + 1 < docApts.length) {
                            duration = docApts[j + 1].startMinutes - p.startMinutes;
                            if (duration <= 0) duration = 15;
                            if (duration > 240) duration = 30;
                        } else {
                            duration = 30; // Last appointment of the day
                        }
                    }

                    const endMinutes = p.startMinutes + duration;
                    const endHour = Math.floor(endMinutes / 60);
                    const endMinute = endMinutes % 60;
                    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

                    appointments.push({
                        id: p.raw.id,
                        patientName: p.raw.patientName || 'Brak danych',
                        patientId: p.raw.patientId || '',
                        doctorName,
                        doctorId: p.raw.doctor?.id || '',
                        startTime,
                        endTime,
                        duration,
                        appointmentType: p.raw.appointmentType?.name || 'Wizyta',
                        appointmentTypeId: p.raw.appointmentType?.id || '',
                        isWorkingHour: p.raw.isWorkingHour ?? true,
                        patientPhone: p.raw.patientPhone || '',
                        notes: p.raw.notes || null,
                        badges: p.raw.badges || [],
                    });
                }
            }

            // Debug: log first few appointments to verify date parsing and duration
            if (appointments.length > 0) {
                const sample = appointments.slice(0, 3);
                console.log(`[Schedule DEBUG] ${dateStr} — ${appointments.length} appointments, sample:`,
                    sample.map(a => ({
                        rawDate: rawApts.find(r => r.id === a.id)?.date,
                        startTime: a.startTime,
                        endTime: a.endTime,
                        duration: a.duration,
                        rawDuration: rawApts.find(r => r.id === a.id)?.duration,
                    }))
                );
            }

            // Sort by time
            appointments.sort((a, b) => a.startTime.localeCompare(b.startTime));

            days.push({ date: dateStr, dayName, appointments });
        } catch (err) {
            console.error(`[Schedule] Error fetching ${dateStr}:`, err);
            days.push({ date: dateStr, dayName, appointments: [] });
        }
    }

    // ── Auto-discover Prodentis operators into employees table ──────────
    // This ensures every operator seen in the schedule has a record that
    // can be deactivated from the admin panel.
    if (allDoctors.size > 0) {
        try {
            // Fetch ALL employees (active + inactive) to know who already exists
            const { data: existingEmployees } = await supabase
                .from('employees')
                .select('id, name, prodentis_id, is_active');

            const existingNormalised = new Set(
                (existingEmployees || []).map(e => normalizeName(e.name || '')).filter(Boolean)
            );

            // Collect doctor→id mapping from all days' appointments
            const doctorIdMap = new Map<string, string>();
            for (const day of days) {
                for (const apt of day.appointments) {
                    if (apt.doctorId && !doctorIdMap.has(apt.doctorName)) {
                        doctorIdMap.set(apt.doctorName, apt.doctorId);
                    }
                }
            }

            const toInsert: { name: string; email: string; prodentis_id: string; is_active: boolean }[] = [];
            for (const doctorName of allDoctors) {
                const norm = normalizeName(doctorName);
                if (!existingNormalised.has(norm)) {
                    // Generate a unique placeholder email (email is NOT NULL + UNIQUE in DB)
                    const prodId = doctorIdMap.get(doctorName) || '';
                    const slug = norm.replace(/\s+/g, '.') || 'unknown';
                    const email = prodId
                        ? `prodentis-${prodId}@auto.mikrostomart.pl`
                        : `${slug}-${Date.now()}@auto.mikrostomart.pl`;
                    toInsert.push({
                        name: doctorName,
                        email,
                        prodentis_id: prodId,
                        is_active: true,
                    });
                }
            }

            if (toInsert.length > 0) {
                // Insert one-by-one to handle individual failures gracefully
                for (const emp of toInsert) {
                    const { error: insertErr } = await supabase.from('employees').insert(emp);
                    if (insertErr) {
                        console.error(`[Schedule] Failed to auto-create employee "${emp.name}":`, insertErr.message);
                    } else {
                        console.log(`[Schedule] Auto-discovered: ${emp.name} (${emp.email})`);
                    }
                }
            }

            // ── Re-check deactivated list (may have just-deactivated operators) ──
            // Also now filter the results
            const { data: freshDeactivated } = await supabase
                .from('employees')
                .select('name, prodentis_id')
                .eq('is_active', false);

            const freshDeactivatedNames = new Set(
                (freshDeactivated || []).map(e => normalizeName(e.name || '')).filter(Boolean)
            );
            const freshDeactivatedIds = new Set(
                (freshDeactivated || []).map(e => e.prodentis_id).filter(Boolean)
            );

            // Filter appointments and doctors
            for (const day of days) {
                day.appointments = day.appointments.filter(apt => {
                    const norm = normalizeName(apt.doctorName);
                    if (freshDeactivatedNames.has(norm)) return false;
                    if (apt.doctorId && freshDeactivatedIds.has(apt.doctorId)) return false;
                    return true;
                });
            }

            const filteredDoctors = Array.from(allDoctors).filter(name => {
                const norm = normalizeName(name);
                return !freshDeactivatedNames.has(norm);
            });

            return NextResponse.json({
                weekStart: weekStart.toISOString().split('T')[0],
                days,
                doctors: filteredDoctors.sort(),
            });
        } catch (err) {
            console.error('[Schedule] Auto-discovery error:', err);
            // Fall through to return unfiltered data
        }
    }

    return NextResponse.json({
        weekStart: weekStart.toISOString().split('T')[0],
        days,
        doctors: Array.from(allDoctors).sort(),
    });
}
