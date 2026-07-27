import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { logAudit } from '@/lib/auditLog';
import { buildTasks, warsawIso, PAST_GRACE_HOURS, type CareMedication, type CareStepRow, type CareTaskRow } from '@/lib/careflowSchedule';
import { warsawDayRange, notifyPatientProtocolStarted } from '@/lib/careflowLifecycle';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/** Odpowiedzi z danymi pacjenta nie mogą osiąść w cache przeglądarki ani proxy. */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/** Ważność bezhasłowego linku pacjenta (kolumna z mig 181) — 180 dni od uruchomienia protokołu. */
const ACCESS_TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000;

/**
 * Godzina zabiegu bywa podawana w czasie lokalnym Polski bez offsetu — `new Date()`
 * przeczytałby ją jako czas serwera (na Vercelu UTC) i przesunął cały harmonogram.
 */
function parseAppointmentDate(value: string): Date {
    const raw = String(value).trim();
    const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw);
    const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(raw);
    if (match && !hasZone) return new Date(warsawIso(match[1], match[2]));
    return new Date(raw);
}

/**
 * Czy błąd oznacza „nie ma takiej kolumny"? (kopia wzorca z `enroll/route.ts`)
 *
 * Postgres zwraca 42703, a PostgREST (>= v12) odrzuca nieznaną kolumnę z ładunku
 * jeszcze przed bazą, kodem PGRST204. Od tej odpowiedzi zależy, czy akceptacja
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
 * Wpisy audytowe dla kroków, które URODZIŁY SIĘ pominięte (termin minął przed akceptacją).
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
                reason: `Termin kroku minął ponad ${PAST_GRACE_HOURS} h przed akceptacją propozycji — krok powstał od razu zamknięty i NIE został pacjentowi wysłany. To pominięcie systemowe, nie odmowa pacjenta.`,
                grace_hours: PAST_GRACE_HOURS,
                sort_order: task.sort_order,
                scheduled_at: task.scheduled_at,
                skipped_at: task.skipped_at,
            },
        }));
}

/**
 * `care_template_steps.medication_index` to indeks POZYCYJNY na liście leków protokołu:
 * krok „Weź antybiotyk" wskazuje pozycję 0, a nie konkretną nazwę leku. Gdy lekarz zaakceptuje
 * propozycję z listą KRÓTSZĄ (np. wykreśli amoksycylinę przy alergii), pod pozycję 0 wskakuje
 * kolejny lek i pacjent dostaje sześć zadań „Weź antybiotyk" z nazwą i dawką ibuprofenu.
 * Odwrotny wariant (lista krótsza niż najwyższy indeks) daje zadanie o leku bez nazwy i dawki.
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
 * POST /api/employee/careflow/enrollments/[id]/accept
 * Auth: employee or admin (Bearer OK — strefa personelu w apce).
 *
 * BRAMKA KLINICZNA. Auto-kwalifikacja z crona tworzy wyłącznie PROPOZYCJĘ
 * (`status = 'proposed'`, zero `care_tasks`, zero powiadomień). Dopiero akceptacja
 * lekarza generuje zadania i uruchamia protokół — żaden schemat lekowy nie startuje
 * bez tego kliknięcia.
 *
 * Body (wszystko opcjonalne, nadpisuje pola propozycji):
 * { doctorId?, doctorName?, prescriptionCode?, customNotes?, customMedications?, appointmentDate? }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    try {
        const { id } = await params;

        let body: {
            doctorId?: string;
            doctorName?: string;
            prescriptionCode?: string;
            customNotes?: string;
            customMedications?: CareMedication[];
            appointmentDate?: string;
        } = {};
        try {
            body = (await req.json()) || {};
        } catch {
            body = {}; // akceptacja bez ciała żądania jest poprawna
        }

        const { data: enrollment } = await supabase
            .from('care_enrollments')
            .select('id, status, template_id, template_name, patient_id, patient_db_id, patient_name, appointment_date, custom_medications, doctor_id, doctor_name')
            .eq('id', id)
            .maybeSingle();

        if (!enrollment) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
        if (enrollment.status !== 'proposed') {
            return NextResponse.json({ error: 'not_proposed' }, { status: 409, headers: NO_STORE });
        }

        const appointmentDateObj = body.appointmentDate !== undefined
            ? parseAppointmentDate(body.appointmentDate)
            : new Date(enrollment.appointment_date);
        if (Number.isNaN(appointmentDateObj.getTime())) {
            return NextResponse.json({ error: 'Nieprawidłowa data zabiegu' }, { status: 400, headers: NO_STORE });
        }

        // Recepcja mogła w międzyczasie zapisać tego samego pacjenta z grafiku (bez ID wizyty),
        // więc sam status 'proposed' nie wystarcza: akceptacja dołożyłaby drugi komplet dawek
        // na tę samą dobę. Blokujemy i pokazujemy lekarzowi zapis, który już działa.
        const { from, to } = warsawDayRange(appointmentDateObj);
        const { data: activeSameDay } = await supabase
            .from('care_enrollments')
            .select('id')
            .eq('patient_id', enrollment.patient_id)
            .eq('status', 'active')
            .neq('id', id)
            .gte('appointment_date', from)
            .lt('appointment_date', to)
            .limit(1);

        if (activeSameDay && activeSameDay.length > 0) {
            return NextResponse.json(
                { error: 'duplicate_active', enrollmentId: activeSameDay[0].id },
                { status: 409, headers: NO_STORE }
            );
        }

        // Protokół i kroki pobieramy PRZED zmianą statusu — brak kroków nie może
        // zostawić propozycji przełączonej na 'active' bez zadań.
        const { data: template } = await supabase
            .from('care_templates')
            .select('name, push_settings, default_medications')
            .eq('id', enrollment.template_id)
            .maybeSingle();

        if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404, headers: NO_STORE });

        const { data: steps } = await supabase
            .from('care_template_steps')
            .select('*')
            .eq('template_id', enrollment.template_id)
            .order('sort_order', { ascending: true });

        if (!steps || steps.length === 0) {
            return NextResponse.json({ error: 'Template has no steps' }, { status: 400, headers: NO_STORE });
        }

        // Zanim protokół ruszy: lista leków musi pasować do indeksów w krokach. Sprawdzamy też
        // listę zapisaną wcześniej przy propozycji — ona też jest nadpisaniem POZYCYJNYM.
        const medicationError = validateMedicationIndexes({
            steps: steps as CareStepRow[],
            templateMedications: template.default_medications,
            overrideMedications: body.customMedications ?? enrollment.custom_medications,
        });
        if (medicationError) {
            return NextResponse.json(
                { error: medicationError, code: 'medication_list_mismatch' },
                { status: 400, headers: NO_STORE }
            );
        }

        // Snapshot leków należy do ZAPISU, nie do szablonu: gdy admin później zmieni
        // `default_medications`, pacjent w trakcie kuracji zobaczyłby na liście inny lek,
        // niż niosą jego zadania (te mają snapshot z chwili akceptacji). Efektywną listę
        // utrwalamy więc zawsze — także wtedy, gdy pochodzi wprost z szablonu.
        const medications: CareMedication[] = Array.isArray(body.customMedications)
            ? body.customMedications
            : Array.isArray(enrollment.custom_medications)
                ? enrollment.custom_medications
                : Array.isArray(template.default_medications)
                    ? template.default_medications
                    : [];

        // Harmonogram liczymy PRZED przełączeniem statusu: propozycje powstają co rano na
        // następny dzień i nic ich nie wygasza, więc akceptacja tydzień później dotyczy
        // protokołu w całości po terminie. Odmawiamy zanim zapis stanie się 'active' —
        // gdyby przełączyć status i dopiero potem cofać, cron (co 5 min) mógłby trafić
        // w to okno, domknąć zapis i wyeksportować raport zgodności 0% do kartoteki.
        const pushSettings = template.push_settings || {};
        const scheduledRows: CareTaskRow[] = buildTasks({
            steps: steps as CareStepRow[],
            medications,
            appointmentDate: appointmentDateObj,
            quietStart: pushSettings.quiet_hours_start ?? 22,
            quietEnd: pushSettings.quiet_hours_end ?? 7,
            // Akceptacja wypada często na kilka godzin przed zabiegiem — kroki „-24 h / -16 h / -8 h"
            // mają wtedy termin w przeszłości i najbliższy przebieg crona wysłałby je wszystkie
            // w jednej minucie. Z `now` powstają od razu pominięte (patrz PAST_GRACE_HOURS).
            now: new Date(),
        });

        // Ile kroków rodzi się pominiętych PRZEZ SYSTEM (termin minął), a nie przez pacjenta.
        const tasksSkippedPastDue = scheduledRows.filter((row) => !!row.skipped_at).length;

        // Cały protokół po terminie: pacjent nie dostałby ani jednego przypomnienia, a lekarz
        // zobaczyłby „Protokół uruchomiony (15 zadań)". Zapis ZOSTAJE propozycją.
        if (scheduledRows.length - tasksSkippedPastDue === 0) {
            return NextResponse.json(
                {
                    error: 'Cały protokół jest już po terminie — pacjent nie dostałby ani jednego przypomnienia. Zmień datę zabiegu albo wybierz inny protokół.',
                    code: 'all_steps_past_due',
                    tasksSkippedPastDue,
                    status: enrollment.status,
                },
                { status: 409, headers: NO_STORE }
            );
        }

        // Lekarz akceptujący: z ciała żądania (apka zna zalogowanego), inaczej z kartoteki pracownika.
        const { data: employee } = await supabase
            .from('employees')
            .select('name, prodentis_id')
            .eq('user_id', auth.user.id)
            .maybeSingle();

        const acceptedDoctorId = body.doctorId
            ?? (employee?.prodentis_id != null ? String(employee.prodentis_id) : null)
            ?? enrollment.doctor_id
            ?? null;
        const acceptedDoctorName = body.doctorName ?? employee?.name ?? enrollment.doctor_name ?? null;

        const updates: {
            status: string;
            doctor_id: string | null;
            doctor_name: string | null;
            access_token_expires_at: string;
            custom_medications: CareMedication[];
            prescription_code?: string;
            custom_notes?: string;
            appointment_date?: string;
        } = {
            status: 'active',
            doctor_id: acceptedDoctorId,
            doctor_name: acceptedDoctorName,
            // Zapis niesie własny, niezmienny snapshot listy leków (patrz wyżej).
            custom_medications: medications,
            // Link pacjenta zaczyna działać dopiero teraz (propozycja go nie udostępnia),
            // więc termin ważności liczymy od akceptacji.
            access_token_expires_at: new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString(),
        };
        if (body.prescriptionCode !== undefined) updates.prescription_code = body.prescriptionCode;
        if (body.customNotes !== undefined) updates.custom_notes = body.customNotes;
        if (body.appointmentDate !== undefined) updates.appointment_date = appointmentDateObj.toISOString();

        // Compare-and-swap na statusie: dwa równoległe kliknięcia „Akceptuję" wygenerowałyby
        // dwa komplety zadań (podwójne dawkowanie). Wygrywa to, które zastanie 'proposed'.
        const acceptSwap = (payload: Partial<typeof updates>) =>
            supabase
                .from('care_enrollments')
                .update(payload)
                .eq('id', id)
                .eq('status', 'proposed')
                .select('id, access_token')
                .maybeSingle();

        let { data: accepted, error: casErr } = await acceptSwap(updates);

        // Kod może trafić na produkcję przed migracją 181 — wtedy BRAK kolumny wywracałby
        // każdą akceptację. Uruchomienie protokołu jest ważniejsze niż data ważności linku.
        if (casErr && isMissingColumnError(casErr, 'access_token_expires_at')) {
            console.error(
                '[CareFlow] 🚨 Brak kolumny access_token_expires_at — migracja 181 NIE jest wgrana. ' +
                    'Akceptuję propozycję bez terminu ważności linku (link działa bezterminowo do czasu migracji).'
            );
            const withoutExpiry: Partial<typeof updates> = { ...updates };
            delete withoutExpiry.access_token_expires_at;
            ({ data: accepted, error: casErr } = await acceptSwap(withoutExpiry));
        }

        if (casErr) {
            console.error('[CareFlow] Accept status update failed:', casErr);
            return NextResponse.json({ error: 'Nie udało się zaakceptować propozycji' }, { status: 500, headers: NO_STORE });
        }
        if (!accepted) {
            return NextResponse.json({ error: 'not_proposed' }, { status: 409, headers: NO_STORE });
        }

        const taskRows = scheduledRows.map((row) => ({ ...row, enrollment_id: id }));

        const { data: insertedTasks, error: taskErr } = await supabase
            .from('care_tasks')
            .insert(taskRows)
            .select('id, sort_order, scheduled_at, skipped_at');
        if (taskErr) {
            // Bez transakcji: cofamy status, żeby nie został „aktywny" protokół z zerem zadań
            // (cron domknąłby go jako 'completed' z raportem zgodności 0%).
            console.error('[CareFlow] Accept task creation failed, reverting to proposed', id, taskErr);
            await supabase.from('care_enrollments').update({ status: 'proposed' }).eq('id', id);
            return NextResponse.json({ error: 'Nie udało się utworzyć zadań CareFlow' }, { status: 500, headers: NO_STORE });
        }

        // Ślad dla kroków urodzonych pominiętych — inaczej raport ma czerwone pozycje bez powodu
        // i wygląda, jakby to pacjent ich nie wykonał.
        if (tasksSkippedPastDue > 0) {
            const { error: pastDueAuditErr } = await supabase
                .from('care_audit_log')
                .insert(pastDueAuditRows(id, (insertedTasks as InsertedTask[] | null) ?? taskRows));
            if (pastDueAuditErr) console.error('[CareFlow] Past-due audit insert failed:', pastDueAuditErr);
        }

        await supabase.from('care_audit_log').insert({
            enrollment_id: id,
            action: 'proposal_accepted',
            actor: auth.user.email || 'employee',
            details: {
                tasks_created: taskRows.length,
                tasks_skipped_past_due: tasksSkippedPastDue,
                doctor_name: acceptedDoctorName,
                template_name: template.name || enrollment.template_name,
                accepted_by_user_id: auth.user.id,
            },
        });

        await logAudit({
            userId: auth.user.id,
            userEmail: auth.user.email || '',
            action: 'accept_careflow_proposal',
            resourceType: 'careflow',
            resourceId: id,
            patientName: enrollment.patient_name || undefined,
            metadata: {
                tasks_created: taskRows.length,
                tasks_skipped_past_due: tasksSkippedPastDue,
                doctor_name: acceptedDoctorName,
                patient_id: enrollment.patient_id,
                // Odpowiedź zawiera access_token (personel wysyła pacjentowi link) — token to
                // pełne uwierzytelnienie do danych medycznych, więc każde ujawnienie zostawia ślad.
                access_token_revealed: true,
            },
            request: req,
        });

        // Pacjent dowiaduje się, że plan czeka — dopiero AKCEPTACJA go uruchamia, więc
        // to jest właściwy moment (propozycja jest przed pacjentem ukryta).
        // Nieblokujące: akceptacja protokołu nie może paść przez powiadomienie.
        const notified = await notifyPatientProtocolStarted({
            enrollmentId: id,
            patientId: enrollment.patient_id,
            patientDbId: enrollment.patient_db_id,
        });

        return NextResponse.json({
            success: true,
            // Płaskie aliasy: interfejs ma pokazać lekarzowi, ile kroków powstało już zamkniętych
            // (termin minął PRZED akceptacją) — to pominięcia systemowe, nie odmowy pacjenta.
            tasksCreated: taskRows.length,
            tasksSkippedPastDue,
            /** Czy pacjent dostał powiadomienie o uruchomieniu planu (i jeśli nie — dlaczego). */
            patientNotified: notified.sent,
            patientNotifyReason: notified.reason,
            enrollment: {
                id,
                accessToken: accepted.access_token,
                tasksCreated: taskRows.length,
                tasksSkippedPastDue,
            },
        }, { headers: NO_STORE });
    } catch (err) {
        console.error('[CareFlow] Accept proposal error:', err);
        return NextResponse.json({ error: 'Nie udało się zaakceptować propozycji' }, { status: 500, headers: NO_STORE });
    }
}
