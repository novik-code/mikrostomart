import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';
import { demoSanitize } from '@/lib/brandConfig';
import { prodentisFetch } from '@/lib/prodentisFetch';
import { zbudujZbioryZgod, flagiDlaWizyty } from '@/lib/zgodyPoEkarcie';

export const dynamic = 'force-dynamic';

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
    /** Additive (2026-09-11) — apka 1.3.x czyta tę trasę i nieznane pola ignoruje. */
    ekartaDzis?: boolean;
    zgodyDzis?: boolean;
}

interface ScheduleDay {
    date: string;
    dayName: string;
    appointments: ScheduleAppointment[];
}

const POLISH_DAYS = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

/**
 * Górna granica wierszy na jedno zapytanie flag. Zgód podpisuje się kilkadziesiąt
 * dziennie, e-Kart kilka — 1000 na 9 dni to wielokrotny zapas. Zwrot RÓWNY limitowi
 * znaczy „lista mogła zostać ucięta" i wtedy flag nie dokładamy (patrz niżej).
 */
const LIMIT_WIERSZY_FLAG = 1000;

/**
 * Dokłada każdej wizycie flagi `ekartaDzis` / `zgodyDzis` (2026-09-11).
 *
 * PO CO: u nowych pacjentów w Prodentisie brakowało biometrii podpisu, bo nikt nie
 * wystawił im linku do zgód — a biometria powstaje WYŁĄCZNIE przy podpisywaniu zgód.
 * Status e-Karty był widoczny dopiero w oknie zgód. Te flagi pozwalają panelowi
 * ostrzec rejestrację na kafelku wizyty, bez klikania.
 *
 * 🔑 DWA zapytania na CAŁY tydzień, nie po jednym na wizytę — i tylko po DACIE,
 *    bez `.in(pacjenci)`: tydzień grafiku to kilkaset pacjentów, a PostgREST niesie
 *    ten filtr w adresie URL. Wierszy z samego zakresu dat jest niewiele.
 * 🔑 Zakres poszerzony o dobę w obie strony: dzień liczymy w strefie Warszawy,
 *    a baza trzyma UTC.
 * 🔴 FAIL-SOFT I CAŁOŚCIOWO: grafik jest narzędziem krytycznym, ostrzeżenie —
 *    pomocniczym. Gdy padnie KTÓREKOLWIEK z zapytań albo lista mogła zostać ucięta,
 *    nie dokładamy ŻADNYCH flag. Same e-Karty bez kompletu zgód dałyby fałszywe
 *    „brak zgód" u każdego pacjenta z e-Kartą.
 */
async function dolozFlagiZgod(days: ScheduleDay[]): Promise<void> {
    if (!days.some(d => d.appointments.some(a => a.patientId))) return;

    const od = new Date(`${days[0].date}T00:00:00Z`);
    od.setUTCDate(od.getUTCDate() - 1);
    const doDnia = new Date(`${days[days.length - 1].date}T00:00:00Z`);
    doDnia.setUTCDate(doDnia.getUTCDate() + 2);

    try {
        const [ekarty, zgody] = await Promise.all([
            supabase
                .from('patient_intake_submissions')
                .select('prodentis_patient_id, submitted_at')
                .gte('submitted_at', od.toISOString())
                .lt('submitted_at', doDnia.toISOString())
                .limit(LIMIT_WIERSZY_FLAG),
            supabase
                .from('patient_consents')
                .select('prodentis_patient_id, signed_at')
                .gte('signed_at', od.toISOString())
                .lt('signed_at', doDnia.toISOString())
                .limit(LIMIT_WIERSZY_FLAG),
        ]);
        if (ekarty.error || zgody.error) {
            console.error('[Schedule] flagi zgód pominięte — zapytanie padło:',
                ekarty.error?.message ?? zgody.error?.message);
            return;
        }
        if ((ekarty.data?.length ?? 0) >= LIMIT_WIERSZY_FLAG || (zgody.data?.length ?? 0) >= LIMIT_WIERSZY_FLAG) {
            console.error('[Schedule] flagi zgód pominięte — lista mogła zostać ucięta na limicie');
            return;
        }
        const zbiory = zbudujZbioryZgod(ekarty.data ?? [], zgody.data ?? []);
        for (const day of days) {
            for (const apt of day.appointments) {
                Object.assign(apt, flagiDlaWizyty(day.date, apt.patientId, zbiory));
            }
        }
    } catch (err) {
        console.error('[Schedule] flagi zgód pominięte:', err);
    }
}

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
            const response = await prodentisFetch(`/api/appointments/by-date?date=${dateStr}`, { klucz: 'personel' });

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

    // Flagi „e-Karta bez zgód" — PRZED filtrem, żeby niosły je OBIE ścieżki zwrotne
    // (po filtrze i awaryjna po jego błędzie). Wstawione za filtrem, znikałyby
    // akurat wtedy, gdy filtr padnie.
    await dolozFlagiZgod(days);

    // ── Filtr dezaktywowanych operatorów (auto-discovery NIE robi się tutaj) ──
    //
    // Wcześniej ten endpoint sam auto-tworzył wpisy `employees` z Prodentis
    // discovery — usunięte, bo powodowało osierocone duplikaty (jeden
    // zdezaktywowany dublet w zniknął cały operator z grafiku przez filtr
    // po znormalizowanej nazwie). Auto-discovery żyje teraz tylko w
    // `/api/admin/employees` jako manual sync inicjowany przez admina.
    //
    // Filtr dezaktywowanych pracuje teraz po **prodentis_id** (deterministyczny),
    // z fallbackiem na znormalizowaną nazwę tylko dla wpisów bez prodentis_id.
    try {
        const { data: deactivated } = await supabase
            .from('employees')
            .select('name, prodentis_id')
            .eq('is_active', false);

        // Mapy filtrowania
        const deactivatedProdentisIds = new Set(
            (deactivated || []).map(e => e.prodentis_id).filter(Boolean) as string[]
        );
        // Nazwy nieaktywnych bez prodentis_id — wąski fallback dla edge cases
        const deactivatedNamesNoPid = new Set(
            (deactivated || [])
                .filter(e => !e.prodentis_id && e.name)
                .map(e => normalizeName(e.name as string))
        );

        // Filter wizyt
        for (const day of days) {
            day.appointments = day.appointments.filter(apt => {
                // Primary: po prodentis_id (deterministyczne)
                if (apt.doctorId && deactivatedProdentisIds.has(apt.doctorId)) return false;
                // Fallback: po nazwie tylko jeśli ten doctor nie ma prodentis_id
                if (!apt.doctorId && deactivatedNamesNoPid.has(normalizeName(apt.doctorName))) return false;
                return true;
            });
        }

        // Filter listy operatorów (kolumny w UI): wytrącamy doktorów, których
        // wszyscy doctorId zostały odfiltrowani powyżej. Najpierw wyodrębniamy
        // doctorId per name z appointments żeby ten filter był spójny.
        const doctorIdByName = new Map<string, string | undefined>();
        for (const day of days) {
            for (const apt of day.appointments) {
                if (!doctorIdByName.has(apt.doctorName)) {
                    doctorIdByName.set(apt.doctorName, apt.doctorId || undefined);
                }
            }
        }
        const filteredDoctors = Array.from(allDoctors).filter(name => {
            const docId = doctorIdByName.get(name);
            if (docId && deactivatedProdentisIds.has(docId)) return false;
            if (!docId && deactivatedNamesNoPid.has(normalizeName(name))) return false;
            return true;
        });

        return NextResponse.json({
            weekStart: weekStart.toISOString().split('T')[0],
            days,
            doctors: filteredDoctors.sort(),
        });
    } catch (err) {
        console.error('[Schedule] Deactivated filter error:', err);
        // Fall through: zwracamy niefiltrowane dane (lepiej niż 500)
    }

    return NextResponse.json({
        weekStart: weekStart.toISOString().split('T')[0],
        days,
        doctors: Array.from(allDoctors).sort(),
    });
}
