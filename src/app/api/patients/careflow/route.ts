import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTokenFromRequest } from '@/lib/jwt';
import { checkRateLimit } from '@/lib/rateLimit';
import type { CareMedication } from '@/lib/careflowSchedule';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/** Dane medyczne — nic nie może osiąść w cache CDN ani przeglądarki. */
const NO_STORE: Record<string, string> = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
};

/** Wartość wchodzi do filtra PostgREST `or=` — przecinek/nawias rozwaliłby zapytanie. */
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

/** Historia (completed/cancelled) tylko z ostatnich 90 dni. */
const HISTORY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

/** Wiersz `care_enrollments` w zakresie kolumn pobieranych dla pacjenta. */
type EnrollmentRow = {
    id: string;
    template_name: string | null;
    doctor_name: string | null;
    appointment_date: string;
    status: string;
    prescription_code: string | null;
    custom_notes: string | null;
    custom_medications: CareMedication[] | null;
    follow_up_appointments: unknown[] | null;
    completed_at: string | null;
    cancelled_at: string | null;
};

/** Wiersz `care_tasks` w zakresie kolumn pobieranych dla pacjenta. */
type TaskRow = {
    id: string;
    enrollment_id: string;
    sort_order: number | null;
    title: string | null;
    description: string | null;
    icon: string | null;
    scheduled_at: string | null;
    completed_at: string | null;
    skipped_at: string | null;
    medication_name: string | null;
    medication_dose: string | null;
    medication_description: string | null;
    visible_from: string | null;
    requires_confirmation: boolean | null;
};

/**
 * Zapis pacjenta wiążemy DWOMA kluczami: `patient_id` to PRODENTIS ID (TEXT),
 * a `patient_db_id` to `patients.id` (UUID, bywa NULL). Filtr po jednym z nich
 * gubi część zapisów.
 */
/**
 * Odtworzenie listy leków ze SNAPSHOTU ZADAŃ (`care_tasks`), dla zapisów bez
 * `custom_medications` (wiersze sprzed wprowadzenia snapshotu). To zawsze dokładnie
 * te leki, które pacjent realnie ma do wzięcia — w przeciwieństwie do żywego szablonu.
 * `medication_description` w zadaniu ma już doklejoną częstotliwość (patrz
 * `resolveMedication` w careflowSchedule), więc osobnego pola `frequency` nie ma.
 */
function medicationsFromTasks(tasks: TaskRow[]): CareMedication[] {
    const out: CareMedication[] = [];
    const seen = new Set<string>();
    for (const t of tasks) {
        const name = t.medication_name?.trim();
        if (!name) continue;
        const dose = t.medication_dose?.trim() || undefined;
        const description = t.medication_description?.trim() || undefined;
        const key = `${name}|${dose ?? ''}|${description ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ name, dose, description });
    }
    return out;
}

function ownershipFilter(prodentisId?: string, userId?: string): string | null {
    const parts: string[] = [];
    if (prodentisId && SAFE_ID.test(prodentisId)) parts.push(`patient_id.eq.${prodentisId}`);
    if (userId && SAFE_ID.test(userId)) parts.push(`patient_db_id.eq.${userId}`);
    return parts.length > 0 ? parts.join(',') : null;
}

/**
 * GET /api/patients/careflow?status=active|all
 *
 * Przebieg opieki pozabiegowej (CareFlow) dla ZALOGOWANEGO pacjenta — bez
 * `access_token` z SMS-a (apka mobilna ma JWT). Odpowiednik publicznej trasy
 * /api/careflow/[token], ale własność liczona z tokenu pacjenta.
 *
 * - `active` (domyślnie) → tylko trwające (`active` + `paused`); `all` → dodatkowo
 *   zamknięte z 90 dni.
 * - Status `proposed` (propozycja auto-kwalifikacji przed akceptacją lekarza)
 *   NIGDY nie wychodzi do pacjenta — stąd allowlista statusów, nie blacklista.
 *   Propozycja ODRZUCONA przez lekarza dostaje `cancelled`, więc allowlista jej nie
 *   zatrzymuje — odsiewa ją dopiero warunek „ma co najmniej jedno zadanie".
 * - `paused` wychodzi jawnie (apka pokazuje „wstrzymany przez gabinet"), ale z
 *   `canComplete: false` — potwierdzeń i tak nie przyjmuje trasa /complete.
 * - Widoczność zadań filtruje SERWER (`visible_from`), tak samo jak `canComplete`:
 *   apka niczego nie wylicza sama (wzorzec `actions` z appointments/[id]/status).
 * - Do klienta nie wychodzą: access_token, telefon, identyfikatory kartoteki,
 *   enrolled_by ani report_pdf_url.
 */
export async function GET(request: NextRequest) {
    try {
        const payload = verifyTokenFromRequest(request);

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
        }

        // Luźny limit — ekran opieki odpytuje przy każdym wejściu i po powrocie z tła.
        const rlKey = payload.userId || payload.prodentisId || 'unknown';
        const rl = await checkRateLimit(`careflow-list:${rlKey}`, 120, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'rate_limited' },
                { status: 429, headers: { ...NO_STORE, 'Retry-After': '60' } }
            );
        }

        const filter = ownershipFilter(payload.prodentisId, payload.userId);
        if (!filter) {
            console.error('[PatientCareFlow] Token bez użytecznego identyfikatora pacjenta');
            return NextResponse.json({ enrollments: [] }, { headers: NO_STORE });
        }

        const mode = new URL(request.url).searchParams.get('status') === 'all' ? 'all' : 'active';
        // `paused` to proces TRWAJĄCY, tylko wstrzymany przez gabinet — bez niego protokół
        // znikał z apki bez słowa (na webie pacjent dostaje 410 z wyjaśnieniem).
        const statuses = mode === 'all'
            ? ['active', 'paused', 'completed', 'cancelled']
            : ['active', 'paused'];

        const { data: rows, error: enrollErr } = await supabase
            .from('care_enrollments')
            .select('id, template_name, doctor_name, appointment_date, status, prescription_code, custom_notes, custom_medications, follow_up_appointments, completed_at, cancelled_at')
            .in('status', statuses)
            .or(filter)
            .order('appointment_date', { ascending: false })
            .limit(50);

        if (enrollErr) {
            console.error('[PatientCareFlow] Enrollments query error:', enrollErr);
            return NextResponse.json({ error: 'Błąd serwera' }, { status: 500, headers: NO_STORE });
        }

        const now = new Date();
        const historyCutoff = new Date(now.getTime() - HISTORY_WINDOW_MS);

        // Data zamknięcia bywa pusta (zapisy sprzed kolumn) → fallback na datę zabiegu.
        // Okno 90 dni dotyczy TYLKO zamkniętych — proces trwający (active/paused) zostaje zawsze.
        const enrollmentRows = ((rows || []) as EnrollmentRow[]).filter((e) => {
            if (e.status === 'active' || e.status === 'paused') return true;
            const closedAt = e.completed_at || e.cancelled_at || e.appointment_date;
            return closedAt ? new Date(closedAt) >= historyCutoff : false;
        });

        if (enrollmentRows.length === 0) {
            return NextResponse.json({ enrollments: [] }, { headers: NO_STORE });
        }

        const enrollmentIds = enrollmentRows.map((e) => e.id);
        const { data: taskRows, error: taskErr } = await supabase
            .from('care_tasks')
            .select('id, enrollment_id, sort_order, title, description, icon, scheduled_at, completed_at, skipped_at, medication_name, medication_dose, medication_description, visible_from, requires_confirmation')
            .in('enrollment_id', enrollmentIds)
            .order('sort_order', { ascending: true });

        if (taskErr) {
            console.error('[PatientCareFlow] Tasks query error:', taskErr);
            return NextResponse.json({ error: 'Błąd serwera' }, { status: 500, headers: NO_STORE });
        }

        const tasksByEnrollment = new Map<string, TaskRow[]>();
        for (const t of (taskRows || []) as TaskRow[]) {
            const list = tasksByEnrollment.get(t.enrollment_id);
            if (list) list.push(t);
            else tasksByEnrollment.set(t.enrollment_id, [t]);
        }

        // Odrzucona propozycja też kończy jako `cancelled`, ale nie ma ANI JEDNEGO zadania —
        // zadania powstają dopiero przy akceptacji lekarza (D1). Dla pacjenta taki zapis
        // nigdy nie istniał; bez tego filtra widziałby „anulowany" proces z nazwiskiem
        // lekarza i kodem recepty dla protokołu, którego nigdy nie było.
        const visibleEnrollments = enrollmentRows.filter(
            (e) => e.status === 'active' || (tasksByEnrollment.get(e.id)?.length ?? 0) > 0
        );

        const isVisible = (t: TaskRow) => !t.visible_from || new Date(t.visible_from) <= now;
        const isDue = (t: TaskRow) => (t.scheduled_at ? new Date(t.scheduled_at) <= now : false);

        const enrollments = visibleEnrollments.map((e) => {
            const allTasks = tasksByEnrollment.get(e.id) || [];
            const visibleTasks = allTasks.filter(isVisible);

            // Postęp liczymy po CAŁYM protokole (także po krokach jeszcze ukrytych) —
            // tak samo jak reguła auto-zamknięcia zapisu, więc 100% == status completed.
            const total = allTasks.length;
            const completed = allTasks.filter((t) => t.completed_at).length;
            const skipped = allTasks.filter((t) => !t.completed_at && t.skipped_at).length;

            const aptDate = new Date(e.appointment_date);
            const hoursUntil = Math.round(((aptDate.getTime() - now.getTime()) / (1000 * 60 * 60)) * 10) / 10;

            // Leki WYŁĄCZNIE ze snapshotu zapisu. Żywy `care_templates.default_medications`
            // NIE jest tu źródłem: edycja protokołu przez admina podmieniałaby pacjentowi
            // listę leków w trakcie trwającej kuracji, bez ostrzeżenia i bez wersjonowania.
            // Brak snapshotu (stare wiersze) → odtwarzamy listę ze snapshotu ZADAŃ.
            const snapshotMeds: CareMedication[] | null =
                Array.isArray(e.custom_medications) && e.custom_medications.length > 0
                    ? e.custom_medications
                    : null;
            const medications = snapshotMeds ?? medicationsFromTasks(allTasks);

            return {
                id: e.id,
                templateName: e.template_name,
                doctorName: e.doctor_name,
                appointmentDate: e.appointment_date,
                status: e.status,
                phase: now < aptDate ? 'pre' : 'post',
                hoursUntilAppointment: hoursUntil,
                prescriptionCode: e.prescription_code,
                customNotes: e.custom_notes,
                followUpAppointments: e.follow_up_appointments || [],
                progress: {
                    total,
                    completed,
                    skipped,
                    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
                },
                medications: medications.map((m) => ({
                    name: m?.name ?? null,
                    dose: m?.dose ?? null,
                    description: m?.description ?? null,
                    frequency: m?.frequency ?? null,
                })),
                tasks: visibleTasks.map((t) => {
                    // Krok pominięty (zaległy już w chwili generowania albo odpuszczony przez
                    // personel) NIE jest krokiem do wykonania — apka ma go pokazać jako
                    // „termin minął". Flaga jawna, żeby klient nie musiał tego wnioskować.
                    const isSkipped = Boolean(t.skipped_at) && !t.completed_at;
                    return {
                        id: t.id,
                        sortOrder: t.sort_order,
                        title: t.title,
                        description: t.description,
                        icon: t.icon,
                        scheduledAt: t.scheduled_at,
                        completedAt: t.completed_at,
                        skippedAt: t.skipped_at,
                        isSkipped,
                        medicationName: t.medication_name,
                        medicationDose: t.medication_dose,
                        medicationDescription: t.medication_description,
                        requiresConfirmation: t.requires_confirmation,
                        // Serwer decyduje, co pacjent może odhaczyć — apka tylko renderuje przycisk.
                        canComplete:
                            Boolean(t.requires_confirmation) &&
                            !t.completed_at &&
                            !t.skipped_at &&
                            isDue(t) &&
                            isVisible(t) &&
                            e.status === 'active',
                    };
                }),
            };
        });

        return NextResponse.json({ enrollments }, { headers: NO_STORE });
    } catch (err) {
        console.error('[PatientCareFlow] GET error:', err);
        return NextResponse.json({ error: 'Błąd serwera' }, { status: 500, headers: NO_STORE });
    }
}
