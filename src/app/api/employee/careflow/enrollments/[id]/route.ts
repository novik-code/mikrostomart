import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { logAudit } from '@/lib/auditLog';
import { smartSnap, warsawIso, PAST_GRACE_HOURS, PAST_DUE_NOTE } from '@/lib/careflowSchedule';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/** Odpowiedzi z danymi pacjenta nie mogą osiąść w cache przeglądarki ani proxy. */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/**
 * Jawna lista kolumn zamiast `*`. Poza odpowiedzią świadomie zostaje `access_token`
 * (bezhasłowy dostęp do danych medycznych — wydaje go `GET .../[id]/link`).
 * `report_pdf_url` (signed URL na rok) czytamy tylko po to, żeby zwrócić flagę
 * `hasReport`; świeży link na 5 minut wydaje `GET .../[id]/report-link`.
 */
const ENROLLMENT_COLUMNS = `
    id, patient_id, patient_name, patient_phone, patient_db_id,
    template_id, template_name, appointment_id, appointment_date,
    doctor_name, doctor_id, status,
    custom_medications, custom_notes, prescription_code, follow_up_appointments,
    enrolled_by, enrolled_at, completed_at, cancelled_at,
    report_exported_to_prodentis, report_generated_at, report_pdf_url
`;

const ALLOWED_STATUSES = ['active', 'completed', 'cancelled', 'paused', 'proposed'];

/**
 * Grafik i apka podają godzinę zabiegu w czasie lokalnym Polski, czasem bez offsetu.
 * `new Date()` czytałby taki string jako czas serwera (na Vercelu UTC) i przesunął
 * cały harmonogram o 1-2 h. Gdy offset jest podany, wartość zostaje bez zmian.
 */
function parseAppointmentDate(value: string): Date {
    const raw = String(value).trim();
    const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw);
    const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(raw);
    if (match && !hasZone) return new Date(warsawIso(match[1], match[2]));
    return new Date(raw);
}

/**
 * GET /api/employee/careflow/enrollments/[id]
 * Full enrollment details with all tasks.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
        const isEmployee = await hasRole(user.id, 'employee');
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE });
        const { id } = await params;

        const { data: enrollment, error } = await supabase
            .from('care_enrollments')
            .select(ENROLLMENT_COLUMNS)
            .eq('id', id)
            .maybeSingle();

        if (error || !enrollment) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });

        const { data: tasks } = await supabase
            .from('care_tasks')
            .select('*')
            .eq('enrollment_id', id)
            .order('sort_order', { ascending: true });

        const { data: auditLog } = await supabase
            .from('care_audit_log')
            .select('*')
            .eq('enrollment_id', id)
            .order('created_at', { ascending: false })
            .limit(50);

        await logAudit({
            userId: user.id,
            userEmail: user.email || '',
            action: 'view_careflow_detail',
            resourceType: 'careflow',
            resourceId: id,
            patientName: enrollment.patient_name || undefined,
            request: req,
        });

        return NextResponse.json(
            {
                enrollment: { ...enrollment, hasReport: !!enrollment.report_pdf_url, report_pdf_url: undefined },
                tasks: tasks || [],
                auditLog: auditLog || [],
            },
            { headers: NO_STORE }
        );
    } catch (err) {
        console.error('[CareFlow] GET enrollment error:', err);
        return NextResponse.json({ error: 'Nie udało się pobrać danych CareFlow' }, { status: 500, headers: NO_STORE });
    }
}

/**
 * PUT /api/employee/careflow/enrollments/[id]
 * Update enrollment (prescriptions, notes, follow-ups, status, appointment details).
 * When appointment_date changes, recalculates all task scheduled_at times.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
        const isEmployee = await hasRole(user.id, 'employee');
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE });
        const { id } = await params;

        // Bez tego PUT na nieistniejący UUID kończył się `success: true` (UPDATE 0 wierszy).
        const { data: current } = await supabase
            .from('care_enrollments')
            .select('id, patient_name, appointment_date, template_id, status')
            .eq('id', id)
            .maybeSingle();

        if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });

        const body = await req.json();
        const updates: Record<string, any> = {};

        // Allow updating specific fields
        if (body.prescriptionCode !== undefined) updates.prescription_code = body.prescriptionCode;
        if (body.customNotes !== undefined) updates.custom_notes = body.customNotes;
        if (body.customMedications !== undefined) updates.custom_medications = body.customMedications;
        if (body.followUpAppointments !== undefined) updates.follow_up_appointments = body.followUpAppointments;
        if (body.patientName !== undefined) updates.patient_name = body.patientName;
        if (body.patientPhone !== undefined) updates.patient_phone = body.patientPhone;
        if (body.doctorName !== undefined) updates.doctor_name = body.doctorName;
        if (body.doctorId !== undefined) updates.doctor_id = body.doctorId;
        if (body.status !== undefined) {
            // Walidacja przed bazą — inaczej zła wartość leci na CHECK i wraca 500.
            if (!ALLOWED_STATUSES.includes(body.status)) {
                return NextResponse.json({ error: 'Nieprawidłowy status' }, { status: 400, headers: NO_STORE });
            }
            // Bramka kliniczna: propozycję uruchamia WYŁĄCZNIE POST .../accept, bo tylko on
            // generuje zadania. PUT-em powstałby zapis 'active' z zerem zadań — protokół
            // leczenia bez ani jednego przypomnienia, którego cron już nie domknie.
            if (current.status === 'proposed' && body.status === 'active') {
                return NextResponse.json({ error: 'use_accept_endpoint' }, { status: 409, headers: NO_STORE });
            }
            // Ta sama bramka, ale postawiona na CELU zamiast na źródle: 'proposed' → 'paused'
            // → 'active' (dwa żądania) omijało warunek wyżej i dawało protokół 'active'
            // z ZEREM zadań — pacjent widzi aktywny plan opieki z nazwiskiem lekarza, zerem
            // kroków i zerem przypomnień, a cron takiego zapisu nigdy nie domknie.
            if (body.status === 'active') {
                const { count, error: taskCountErr } = await supabase
                    .from('care_tasks')
                    .select('id', { count: 'exact', head: true })
                    .eq('enrollment_id', id);
                if (taskCountErr) {
                    console.error('[CareFlow] PUT task count failed:', taskCountErr);
                    return NextResponse.json({ error: 'Nie udało się zapisać zmian' }, { status: 500, headers: NO_STORE });
                }
                if (!count) {
                    return NextResponse.json({ error: 'use_accept_endpoint' }, { status: 409, headers: NO_STORE });
                }
            }
            updates.status = body.status;
            if (body.status === 'cancelled') updates.cancelled_at = new Date().toISOString();
            if (body.status === 'completed') updates.completed_at = new Date().toISOString();
        }

        let newAppointmentIso: string | null = null;
        if (body.appointmentDate !== undefined) {
            const parsed = parseAppointmentDate(body.appointmentDate);
            if (Number.isNaN(parsed.getTime())) {
                return NextResponse.json({ error: 'Nieprawidłowa data zabiegu' }, { status: 400, headers: NO_STORE });
            }
            newAppointmentIso = parsed.toISOString();
            updates.appointment_date = newAppointmentIso;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400, headers: NO_STORE });
        }

        const { error } = await supabase.from('care_enrollments').update(updates).eq('id', id);
        if (error) {
            console.error('[CareFlow] PUT enrollment update failed:', error);
            return NextResponse.json({ error: 'Nie udało się zapisać zmian' }, { status: 500, headers: NO_STORE });
        }

        // Handle appointment_date change — recalculate all task scheduled_at
        let tasksRecalculated = 0;
        const diffMs = newAppointmentIso
            ? new Date(newAppointmentIso).getTime() - new Date(current.appointment_date).getTime()
            : 0;

        if (diffMs !== 0) {
            // Wykonanych zadań nie ruszamy — historia potwierdzeń pacjenta ma zostać na miejscu.
            const { data: tasks } = await supabase
                .from('care_tasks')
                // `description` jest potrzebny, by przy automatycznym pominięciu dokleić
                // adnotację PAST_DUE_NOTE — to sygnał zapasowy dla raportu zgodności.
                .select('id, step_id, scheduled_at, visible_from, skipped_at, description')
                .eq('enrollment_id', id)
                .is('completed_at', null);

            // Godziny ciszy protokołu + informacja, które kroki w ogóle podlegają snapowaniu.
            const { data: template } = await supabase
                .from('care_templates')
                .select('push_settings')
                .eq('id', current.template_id)
                .maybeSingle();
            const quietStart = template?.push_settings?.quiet_hours_start ?? 22;
            const quietEnd = template?.push_settings?.quiet_hours_end ?? 7;

            const stepIds = [...new Set((tasks || []).map((t: any) => t.step_id).filter(Boolean))];
            const snapByStep = new Map<string, boolean>();
            if (stepIds.length > 0) {
                const { data: steps } = await supabase
                    .from('care_template_steps')
                    .select('id, smart_snap')
                    .in('id', stepIds);
                for (const step of (steps || [])) snapByStep.set(step.id, step.smart_snap === true);
            }

            const nowMs = Date.now();
            const nowIso = new Date(nowMs).toISOString();
            // Przełożenie wizyty na WCZEŚNIEJSZY termin wrzuca część dawek w przeszłość —
            // najbliższy przebieg crona wysłałby je wszystkie naraz. Takie zadania od razu
            // zamykamy jako pominięte (fail-safe: żadnego „weź teraz" o dawce sprzed doby).
            // Zadań już pominiętych nie przestemplowujemy — to może być decyzja personelu.
            const pastDueBeforeMs = nowMs - PAST_GRACE_HOURS * 60 * 60 * 1000;
            /** Kroki zamknięte automatycznie w tej operacji — do zbiorczego wpisu audytowego. */
            const pastDueTaskIds: string[] = [];
            for (const task of (tasks || [])) {
                const oldScheduled = new Date(task.scheduled_at);
                let newScheduled = new Date(oldScheduled.getTime() + diffMs);
                // Sama delta potrafi wrzucić dawkę w środek nocy — snapujemy ponownie te kroki,
                // które miały smart_snap w protokole.
                if (snapByStep.get(task.step_id)) {
                    newScheduled = smartSnap(newScheduled, quietStart, quietEnd);
                }

                const taskUpdate: Record<string, any> = { scheduled_at: newScheduled.toISOString() };
                if (task.visible_from) {
                    // Zachowujemy dotychczasowe wyprzedzenie widoczności względem nowej godziny.
                    const lead = oldScheduled.getTime() - new Date(task.visible_from).getTime();
                    taskUpdate.visible_from = new Date(newScheduled.getTime() - lead).toISOString();
                }
                if (newScheduled.getTime() > nowMs) {
                    // Zadanie znów jest przed nami — bez zerowania liczników zostałoby
                    // z wyczerpanym limitem pushy i nigdy by nie przypomniało.
                    taskUpdate.push_sent_count = 0;
                    taskUpdate.push_last_sent_at = null;
                    taskUpdate.sms_sent = false;
                } else if (!task.skipped_at && newScheduled.getTime() < pastDueBeforeMs) {
                    taskUpdate.skipped_at = nowIso;
                    // Bez TYCH DWÓCH sygnałów raport zgodności zaliczyłby krok jako
                    // „pominięty przez pacjenta" i wydrukował w dokumentacji medycznej
                    // werdykt o niezastosowaniu się do zaleceń — za decyzję systemu.
                    if (!(task.description ?? '').includes(PAST_DUE_NOTE)) {
                        taskUpdate.description = task.description
                            ? `${task.description}\n${PAST_DUE_NOTE}`
                            : PAST_DUE_NOTE;
                    }
                    pastDueTaskIds.push(task.id);
                }

                await supabase.from('care_tasks').update(taskUpdate).eq('id', task.id);
                tasksRecalculated++;
            }

            if (pastDueTaskIds.length > 0) {
                // Sygnał główny dla raportu: jednoznaczny wpis po task_id.
                const { error: pastDueAuditErr } = await supabase.from('care_audit_log').insert(
                    pastDueTaskIds.map((taskId) => ({
                        enrollment_id: id,
                        task_id: taskId,
                        action: 'task_skipped_past_due',
                        actor: 'system',
                        details: {
                            reason: 'Termin kroku minal po zmianie daty zabiegu — pominiecie SYSTEMOWE, nie odmowa pacjenta',
                            grace_hours: PAST_GRACE_HOURS,
                            changed_by: user.email || 'employee',
                        },
                    }))
                );
                if (pastDueAuditErr) {
                    console.error('[CareFlow] past-due audit insert failed:', pastDueAuditErr.message);
                }
            }
        }

        // Audit log
        await supabase.from('care_audit_log').insert({
            enrollment_id: id,
            action: body.status === 'cancelled' ? 'cancelled' : 'updated',
            actor: user.email || 'employee',
            details: { ...updates, tasksRecalculated },
        });

        await logAudit({
            userId: user.id,
            userEmail: user.email || '',
            action: 'edit_careflow_enrollment',
            resourceType: 'careflow',
            resourceId: id,
            patientName: current.patient_name || undefined,
            metadata: { fields: Object.keys(updates), tasksRecalculated },
            request: req,
        });

        return NextResponse.json({ success: true, tasksRecalculated }, { headers: NO_STORE });
    } catch (err) {
        console.error('[CareFlow] PUT enrollment error:', err);
        return NextResponse.json({ error: 'Nie udało się zapisać zmian' }, { status: 500, headers: NO_STORE });
    }
}
