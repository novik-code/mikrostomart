import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { logAudit } from '@/lib/auditLog';
import { buildTasks, warsawIso, PAST_GRACE_HOURS, type CareMedication, type CareStepRow, type CareTaskRow } from '@/lib/careflowSchedule';
import { warsawDayRange } from '@/lib/careflowLifecycle';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/** Odpowiedzi z danymi pacjenta nie mogą osiąść w cache przeglądarki ani proxy. */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/** Ważność bezhasłowego linku pacjenta (kolumna z mig 181) — 180 dni od zapisu. */
const ACCESS_TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000;

/**
 * Grafik i Prodentis podają godzinę zabiegu w czasie lokalnym Polski, bez offsetu
 * (`2026-07-27T15:30:00`). `new Date()` czyta taki string jako czas SERWERA — na
 * Vercelu w UTC — i cały harmonogram przesuwa się o 1-2 h. Gdy offset jest podany
 * (`Z` albo `+02:00`), zostawiamy wartość bez zmian.
 */
function parseAppointmentDate(value: string): Date {
    const raw = String(value).trim();
    const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw);
    const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(raw);
    if (match && !hasZone) return new Date(warsawIso(match[1], match[2]));
    return new Date(raw);
}

/**
 * Czy błąd oznacza „nie ma takiej kolumny"? (kopia wzorca z `careflowLifecycle.ts`)
 *
 * Postgres zwraca 42703, a PostgREST (>= v12) odrzuca nieznaną kolumnę z ładunku
 * jeszcze przed bazą, kodem PGRST204. Od tej odpowiedzi zależy, czy zapis pacjenta
 * przejdzie na produkcji, na której migracja 181 nie została jeszcze wgrana.
 */
function isMissingColumnError(error: { code?: string | null; message?: string | null } | null, column: string): boolean {
    if (!error) return false;
    if (error.code === '42703' || error.code === 'PGRST204') return true;
    const message = String(error.message ?? '');
    return message.includes(column) && /column|schema cache/i.test(message);
}

/** Zadanie po INSERT-cie (albo jego lokalny odpowiednik, gdy baza nie zwróciła wierszy). */
type InsertedTask = { id?: string | null; sort_order: number; scheduled_at: string; skipped_at?: string | null };

/**
 * Wpisy audytowe dla kroków, które URODZIŁY SIĘ pominięte (termin minął przed zapisem).
 *
 * Bez nich raport zgodności pokazuje czerwone pozycje bez żadnego wyjaśnienia, a to
 * pominięcie SYSTEMU (krok nie został pacjentowi w ogóle wysłany), nie odmowa pacjenta.
 */
function pastDueAuditRows(enrollmentId: string, tasks: InsertedTask[]) {
    return tasks
        .filter((task) => !!task.skipped_at)
        .map((task) => ({
            enrollment_id: enrollmentId,
            task_id: task.id ?? null,
            action: 'task_skipped_past_due',
            actor: 'system',
            details: {
                reason: `Termin kroku minął ponad ${PAST_GRACE_HOURS} h przed zapisaniem protokołu — krok powstał od razu zamknięty i NIE został pacjentowi wysłany. To pominięcie systemowe, nie odmowa pacjenta.`,
                grace_hours: PAST_GRACE_HOURS,
                sort_order: task.sort_order,
                scheduled_at: task.scheduled_at,
                skipped_at: task.skipped_at,
            },
        }));
}

/**
 * `care_template_steps.medication_index` to indeks POZYCYJNY na liście leków protokołu:
 * krok „Weź antybiotyk" wskazuje pozycję 0, a nie konkretną nazwę leku. Gdy personel nadpisze
 * listę KRÓTSZĄ (np. usunie z niej amoksycylinę przy alergii), pod pozycję 0 wskakuje kolejny
 * lek i pacjent dostaje sześć zadań „Weź antybiotyk" z nazwą i dawką ibuprofenu. Odwrotny
 * wariant (lista krótsza niż najwyższy indeks) daje zadanie o leku bez nazwy i bez dawki.
 *
 * Dlatego: nadpisanie jest POZYCYJNE i musi mieć dokładnie tyle pozycji, co lista z szablonu,
 * a każdy indeks kroku musi mieścić się w liście efektywnej.
 *
 * Zwraca komunikat błędu po polsku albo `null`, gdy zestaw jest spójny.
 */
function validateMedicationIndexes(params: {
    steps: CareStepRow[];
    templateMedications: unknown;
    overrideMedications: unknown;
}): string | null {
    const indexes = (params.steps ?? [])
        .map((s) => s.medication_index)
        .filter((i): i is number => i !== null && i !== undefined);

    const templateMeds = Array.isArray(params.templateMedications) ? params.templateMedications : [];
    const hasOverride = params.overrideMedications !== undefined && params.overrideMedications !== null;
    if (hasOverride && !Array.isArray(params.overrideMedications)) {
        return 'Nieprawidłowa lista leków — oczekiwano listy pozycji.';
    }
    const override = hasOverride ? (params.overrideMedications as unknown[]) : null;

    if (override && indexes.length > 0 && override.length !== templateMeds.length) {
        return `Lista leków musi mieć dokładnie tyle pozycji, ile ma protokół (${templateMeds.length}), a ma ${override.length}. Kroki wskazują lek po POZYCJI na liście, więc usunięcie pozycji podmienia lek pod krokiem (np. krok „Weź antybiotyk" dostałby ibuprofen). Leki wolno podmieniać tylko na tej samej pozycji — jeśli pacjent ma danego leku nie brać, usuń odpowiadający mu krok protokołu.`;
    }

    const effective = override ?? templateMeds;
    const outOfRange = indexes.find((i) => !Number.isInteger(i) || i < 0 || i >= effective.length);
    if (outOfRange !== undefined) {
        return `Krok protokołu wskazuje lek na pozycji ${outOfRange + 1}, a lista leków ma ${effective.length} poz. Uzupełnij listę leków albo popraw protokół.`;
    }

    return null;
}

/**
 * POST /api/employee/careflow/enroll
 * Enroll a patient in a CareFlow process.
 * Auth: employee or admin role.
 * Body: { templateId, patientId, patientName, patientPhone, appointmentId, appointmentDate, doctorName, doctorId, prescriptionCode?, customNotes?, customMedications? }
 */
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAdmin();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
        const isEmployee = await hasRole(user.id, 'employee');
        const isAdmin = await hasRole(user.id, 'admin');
        if (!isEmployee && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE });

        const body = await req.json();
        const { templateId, patientId, patientName, patientPhone, appointmentId, appointmentDate, doctorName, doctorId, prescriptionCode, customNotes, customMedications } = body;

        if (!templateId || !patientId || !patientName || !appointmentDate) {
            return NextResponse.json({ error: 'Missing required fields: templateId, patientId, patientName, appointmentDate' }, { status: 400, headers: NO_STORE });
        }

        const appointmentDateObj = parseAppointmentDate(appointmentDate);
        if (Number.isNaN(appointmentDateObj.getTime())) {
            return NextResponse.json({ error: 'Nieprawidłowa data zabiegu' }, { status: 400, headers: NO_STORE });
        }

        // Duplikat protokołu = podwójny komplet dawek, więc guard musi trafiać także wtedy,
        // gdy zapisy opisują tę samą wizytę inaczej: cron zapisuje propozycję z `appointment_id`
        // z Prodentisa (albo z NULL-em, gdy go nie ma), a grafik (ScheduleTab) zapisuje BEZ niego.
        // Porównanie samym `appointment_id` przepuszczało obie strony tej rozbieżności, dlatego
        // okno TEJ SAMEJ DOBY warszawskiej sprawdzamy ZAWSZE, a po ID wizyty tylko dodatkowo.
        // 'proposed' blokuje na równi z 'active': to ten sam schemat lekowy, tylko przed akceptacją.
        type DuplicateRow = { id: string; status: string };
        const dupQuery = () =>
            supabase
                .from('care_enrollments')
                .select('id, status')
                .eq('patient_id', patientId)
                .in('status', ['active', 'proposed']);

        const { from, to } = warsawDayRange(appointmentDateObj);
        const { data: sameDay } = await dupQuery()
            .gte('appointment_date', from)
            .lt('appointment_date', to)
            .limit(5);
        const duplicates: DuplicateRow[] = [...((sameDay as DuplicateRow[] | null) ?? [])];
        if (appointmentId) {
            const { data: sameAppointment } = await dupQuery().eq('appointment_id', appointmentId).limit(5);
            duplicates.push(...((sameAppointment as DuplicateRow[] | null) ?? []));
        }
        // Aktywny protokół ma pierwszeństwo w komunikacie — to inna akcja personelu niż propozycja.
        const existing = duplicates.find((d) => d.status === 'active') ?? duplicates[0];

        if (existing) {
            const proposed = existing.status === 'proposed';
            return NextResponse.json(
                {
                    error: proposed
                        ? 'Ten pacjent ma już propozycję opieki na ten dzień — zaakceptuj ją zamiast tworzyć nowy zapis'
                        : 'Ten pacjent ma już aktywny protokół opieki na ten dzień',
                    code: proposed ? 'duplicate_proposed' : 'duplicate_active',
                    enrollmentId: existing.id,
                    status: existing.status,
                },
                { status: 409, headers: NO_STORE }
            );
        }

        // Get template with steps
        const { data: template, error: tErr } = await supabase
            .from('care_templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (tErr || !template) return NextResponse.json({ error: 'Template not found' }, { status: 404, headers: NO_STORE });

        const { data: steps } = await supabase
            .from('care_template_steps')
            .select('*')
            .eq('template_id', templateId)
            .order('sort_order', { ascending: true });

        if (!steps || steps.length === 0) {
            return NextResponse.json({ error: 'Template has no steps' }, { status: 400, headers: NO_STORE });
        }

        // Zanim powstanie jakikolwiek zapis: lista leków musi pasować do indeksów w krokach.
        const medicationError = validateMedicationIndexes({
            steps: steps as CareStepRow[],
            templateMedications: template.default_medications,
            overrideMedications: customMedications,
        });
        if (medicationError) {
            return NextResponse.json(
                { error: medicationError, code: 'medication_list_mismatch' },
                { status: 400, headers: NO_STORE }
            );
        }

        // Snapshot leków należy do ZAPISU, nie do szablonu: gdy admin później zmieni
        // `default_medications`, pacjent w trakcie kuracji zobaczyłby na liście inny lek,
        // niż niosą jego zadania (te mają snapshot z chwili zapisu). Efektywną listę
        // utrwalamy więc zawsze — także wtedy, gdy pochodzi wprost z szablonu.
        const medications: CareMedication[] = Array.isArray(customMedications)
            ? customMedications
            : Array.isArray(template.default_medications)
                ? template.default_medications
                : [];

        // Find patient's DB UUID for push notifications
        const { data: patientRow } = await supabase
            .from('patients')
            .select('id, phone')
            .eq('prodentis_id', patientId)
            .maybeSingle();

        const pushSettings = template.push_settings || {};
        const quietStart = pushSettings.quiet_hours_start ?? 22;
        const quietEnd = pushSettings.quiet_hours_end ?? 7;

        // Harmonogram liczymy PRZED zapisem czegokolwiek do bazy: gdy cały protokół
        // wypada po terminie, jedyną poprawną odpowiedzią jest odmowa (niżej), a nie
        // zapis-widmo, po którym nie poleci ani jedno przypomnienie.
        const scheduledRows: CareTaskRow[] = buildTasks({
            steps: steps as CareStepRow[],
            medications,
            appointmentDate: appointmentDateObj,
            quietStart,
            quietEnd,
            // Zapis powstaje czasem kilka godzin przed zabiegiem — kroki „-24 h / -16 h / -8 h"
            // mają wtedy termin w przeszłości i najbliższy przebieg crona wysłałby je wszystkie
            // w jednej minucie. Z `now` powstają od razu pominięte (patrz PAST_GRACE_HOURS).
            now: new Date(),
        });

        const tasksSkippedPastDue = scheduledRows.filter((row) => !!row.skipped_at).length;

        // Protokół w CAŁOŚCI po terminie (np. zapis dobę po zabiegu przy protokole
        // przedzabiegowym): zadania powstałyby wszystkie zamknięte, pacjent nie dostałby
        // ani jednego przypomnienia, a cron domknąłby zapis raportem zgodności 0% —
        // i wszystko to pod komunikatem „Protokół uruchomiony". Nie uruchamiamy go.
        if (scheduledRows.length - tasksSkippedPastDue === 0) {
            return NextResponse.json(
                {
                    error: 'Wszystkie kroki tego protokołu mają już termin w przeszłości — pacjent nie dostałby ani jednego przypomnienia. Zmień termin zabiegu albo wybierz protokół z krokami po zabiegu.',
                    code: 'all_steps_past_due',
                    tasksSkippedPastDue,
                },
                { status: 409, headers: NO_STORE }
            );
        }

        const enrollmentRow = {
            patient_id: patientId,
            patient_name: patientName,
            // Zapis z grafiku nie niesie telefonu — bez tego fallbacku SMS nigdy nie ma dokąd polecieć.
            patient_phone: patientPhone || patientRow?.phone || null,
            patient_db_id: patientRow?.id || null,
            template_id: templateId,
            template_name: template.name,
            appointment_id: appointmentId || null,
            appointment_date: appointmentDateObj.toISOString(),
            doctor_name: doctorName || null,
            doctor_id: doctorId || null,
            prescription_code: prescriptionCode || null,
            custom_notes: customNotes || null,
            custom_medications: medications,
            enrolled_by: user.email || 'employee',
        };

        // Create enrollment
        let { data: enrollment, error: eErr } = await supabase
            .from('care_enrollments')
            .insert({
                ...enrollmentRow,
                // Link bezhasłowy = pełny dostęp do danych medycznych; bez terminu ważności
                // działałby bezterminowo (mig 181 dokłada kolumnę, zapisuje ją aplikacja).
                access_token_expires_at: new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString(),
            })
            .select()
            .single();

        // Kod może trafić na produkcję przed migracją 181 — wtedy BRAK kolumny wywracałby
        // każdy zapis do CareFlow. Zapis protokołu jest ważniejszy niż data ważności linku.
        if (eErr && isMissingColumnError(eErr, 'access_token_expires_at')) {
            console.error(
                '[CareFlow] 🚨 Brak kolumny access_token_expires_at — migracja 181 NIE jest wgrana. ' +
                    'Zapisuję pacjenta bez terminu ważności linku (link działa bezterminowo do czasu migracji).'
            );
            ({ data: enrollment, error: eErr } = await supabase
                .from('care_enrollments')
                .insert(enrollmentRow)
                .select()
                .single());
        }

        if (eErr || !enrollment) {
            console.error('[CareFlow] Enroll insert failed:', eErr);
            return NextResponse.json({ error: 'Nie udało się zapisać pacjenta do CareFlow' }, { status: 500, headers: NO_STORE });
        }

        // Generate tasks from template steps
        const taskRows = scheduledRows.map((row) => ({ ...row, enrollment_id: enrollment.id }));

        const { data: insertedTasks, error: taskErr } = await supabase
            .from('care_tasks')
            .insert(taskRows)
            .select('id, sort_order, scheduled_at, skipped_at');
        if (taskErr) {
            // PostgREST nie ma transakcji na dwa zapytania. Zapis bez zadań cron domknąłby
            // jako 'completed' i wyeksportował raport zgodności 0% do kartoteki — kasujemy ręcznie.
            console.error('[CareFlow] Task creation failed, rolling back enrollment', enrollment.id, taskErr);
            await supabase.from('care_enrollments').delete().eq('id', enrollment.id);
            return NextResponse.json({ error: 'Nie udało się utworzyć zadań CareFlow' }, { status: 500, headers: NO_STORE });
        }

        // Ślad dla kroków urodzonych pominiętych — inaczej raport ma czerwone pozycje bez powodu.
        if (tasksSkippedPastDue > 0) {
            const { error: pastDueAuditErr } = await supabase
                .from('care_audit_log')
                .insert(pastDueAuditRows(enrollment.id, (insertedTasks as InsertedTask[] | null) ?? taskRows));
            if (pastDueAuditErr) console.error('[CareFlow] Past-due audit insert failed:', pastDueAuditErr);
        }

        // Audit log
        await supabase.from('care_audit_log').insert({
            enrollment_id: enrollment.id,
            action: 'enrolled',
            actor: user.email || 'employee',
            details: {
                template_name: template.name,
                patient_name: patientName,
                tasks_created: taskRows.length,
                tasks_skipped_past_due: tasksSkippedPastDue,
            },
        });

        await logAudit({
            userId: user.id,
            userEmail: user.email || '',
            action: 'enroll_careflow',
            resourceType: 'careflow',
            resourceId: enrollment.id,
            patientName,
            metadata: {
                template_name: template.name,
                tasks_created: taskRows.length,
                tasks_skipped_past_due: tasksSkippedPastDue,
                patient_id: patientId,
            },
            request: req,
        });

        return NextResponse.json({
            success: true,
            // Płaskie aliasy dla panelu web (ScheduleTab czyta `data.accessToken` i
            // `data.tasksCreated`) — nowi konsumenci czytają `enrollment.*`.
            accessToken: enrollment.access_token,
            tasksCreated: taskRows.length,
            // Ile kroków powstało już zamkniętych, bo ich termin minął przed zapisem.
            // BEZ tego pola recepcja widziała „10 zadań utworzonych" dla protokołu,
            // w którym 4 kroki (w tym osłona antybiotykowa sprzed zabiegu) są martwe
            // i nigdy nie zostaną wysłane.
            tasksSkippedPastDue,
            enrollment: {
                id: enrollment.id,
                accessToken: enrollment.access_token,
                landingPageUrl: `/opieka/${enrollment.access_token}`,
                tasksCreated: taskRows.length,
                tasksSkippedPastDue,
            },
        }, { headers: NO_STORE });
    } catch (err) {
        console.error('[CareFlow] Enroll error:', err);
        return NextResponse.json({ error: 'Nie udało się zapisać pacjenta do CareFlow' }, { status: 500, headers: NO_STORE });
    }
}
