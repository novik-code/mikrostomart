import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
// Zgodność liczymy TĄ SAMĄ funkcją, co raport PDF idący do kartoteki — dwie własne
// definicje „zgodności" oznaczałyby dwa różne wyniki dla tego samego zapisu.
import {
    summarizeCareflowCompliance,
    type CareflowComplianceSummary,
    type CareflowReportAudit,
    type CareflowReportTask,
} from '@/lib/careflowPdf';

export const dynamic = 'force-dynamic';

/**
 * PostgREST oddaje maksymalnie 1000 wierszy na zapytanie i NIE mówi, że uciął resztę.
 * Gołe `select()` liczyło więc analitykę na skrawku bazy: zadania nowszych zapisów w ogóle
 * nie dochodziły, a każdy taki zapis wyglądał na „zero wykonanych kroków" — zaniżona
 * zgodność i zaniżony completion rate, bez jednego ostrzeżenia na ekranie.
 */
const PAGE_SIZE = 1000;

/**
 * Twardy limit stron — analityka nie ma prawa zawiesić lambdy na rosnącej tabeli.
 * Po jego wyczerpaniu liczymy na tym, co udało się przeczytać, ale mówimy o tym
 * wprost w odpowiedzi (`dataComplete` / `incompleteDatasets`).
 */
const MAX_PAGES = 12;

/**
 * Akcja audytu dla kroku, który POWSTAŁ pominięty (termin minął przed zapisaniem protokołu).
 * Stała jest kopią prywatnej stałej z `careflowPdf` — obie muszą wskazywać tę samą akcję,
 * bo od niej zależy, czy krok policzymy jako pominięcie SYSTEMU, czy zaniedbanie PACJENTA.
 */
const PAST_DUE_AUDIT_ACTION = 'task_skipped_past_due';

type EnrollmentRow = {
    id: string;
    status: string;
    template_name: string | null;
    doctor_name: string | null;
    enrolled_at: string;
    completed_at: string | null;
    report_exported_to_prodentis: boolean | null;
};

type TaskRow = {
    id: string;
    enrollment_id: string;
    scheduled_at: string;
    completed_at: string | null;
    skipped_at: string | null;
    sms_sent: boolean | null;
    description: string | null;
};

type PastDueAuditRow = {
    enrollment_id: string;
    task_id: string | null;
    action: string;
    actor: string;
    created_at: string;
};

/** Kształt odpowiedzi PostgREST, którego potrzebuje `scanAll` (reszta pól nieistotna). */
type RowsResponse<T> = { data: T[] | null; error: { message: string } | null };

type ScanResult<T> = { rows: T[]; complete: boolean };

/**
 * Czyta całą tabelę stronami po `PAGE_SIZE`, sortując po stabilnym kluczu (`id`) —
 * bez jawnego sortowania kolejne zakresy potrafią się nakładać i gubić wiersze.
 *
 * `complete: false` oznacza, że skan zatrzymał się na limicie stron: wskaźniki są
 * policzone na CZĘŚCI danych i odpowiedź musi to przyznać.
 */
async function scanAll<T>(
    label: string,
    page: (from: number, to: number) => PromiseLike<RowsResponse<T>>
): Promise<ScanResult<T>> {
    const rows: T[] = [];
    let from = 0;
    for (let i = 0; i < MAX_PAGES; i++) {
        const { data, error } = await page(from, from + PAGE_SIZE - 1);
        // Surowy komunikat bazy zostaje po stronie serwera — klient dostaje zdanie z `catch`.
        if (error) throw new Error(`${label}: ${error.message}`);
        const batch = data ?? [];
        for (const row of batch) rows.push(row);
        // Koniec rozpoznajemy po PUSTEJ stronie, a kolejny zakres liczymy od tego, ile
        // wierszy realnie przyszło: gdyby serwer miał limit niższy niż `PAGE_SIZE`,
        // warunek „mniej niż strona = koniec" uznałby pierwszą odpowiedź za komplet
        // i wróciłby dokładnie ten cichy obcięty zbiór, który tu naprawiamy.
        if (batch.length === 0) return { rows, complete: true };
        from += batch.length;
    }
    console.warn(
        `[CareFlow Stats] ${label}: limit ${MAX_PAGES} stron (${MAX_PAGES * PAGE_SIZE} wierszy) — dane niepełne`
    );
    return { rows, complete: false };
}

/**
 * GET /api/admin/careflow/stats
 * Returns aggregated CareFlow analytics data for the dashboard.
 */
export async function GET() {
    try {
        const auth = await requireEmployeeOrAdmin();
        if (!auth.ok) return auth.response;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // ── Fetch all enrollments / tasks / audit (stronicowane) ──
        // Trzy skany równolegle: każdy jest wewnątrz sekwencyjny, więc szeregowanie ich
        // jeszcze i między sobą potrafiłoby wejść w limit czasu funkcji.
        const [enrollmentScan, taskScan, pastDueScan] = await Promise.all([
            scanAll<EnrollmentRow>('care_enrollments', (from, to) =>
                supabase
                    .from('care_enrollments')
                    // Bez `patient_name` i `appointment_date`: analityka ich nie liczy,
                    // a to dane pacjenta — nie ma powodu ciągnąć ich do statystyk.
                    .select('id, status, template_name, doctor_name, enrolled_at, completed_at, report_exported_to_prodentis')
                    .order('id', { ascending: true })
                    .range(from, to)
            ),
            scanAll<TaskRow>('care_tasks', (from, to) =>
                supabase
                    .from('care_tasks')
                    .select('id, enrollment_id, scheduled_at, completed_at, skipped_at, sms_sent, description')
                    .order('id', { ascending: true })
                    .range(from, to)
            ),
            // Tylko wpisy o krokach urodzonych pominiętymi — pełny audyt byłby o rzędy
            // wielkości większy, a do rozróżnienia „system vs pacjent" nic więcej nie trzeba.
            scanAll<PastDueAuditRow>('care_audit_log', (from, to) =>
                supabase
                    .from('care_audit_log')
                    .select('enrollment_id, task_id, action, actor, created_at')
                    .eq('action', PAST_DUE_AUDIT_ACTION)
                    .order('id', { ascending: true })
                    .range(from, to)
            ).catch((err): ScanResult<PastDueAuditRow> => {
                // Audyt to sygnał GŁÓWNY rozróżnienia „system vs pacjent", ale nie jedyny
                // (zapasowy: PAST_DUE_NOTE w opisie kroku). Jego awaria nie może wywrócić
                // całej analityki — liczymy na sygnale zapasowym i przyznajemy niepełne dane.
                console.error('[CareFlow Stats] Skan audytu past-due nie powiódł się:', err);
                return { rows: [], complete: false };
            }),
        ]);

        const all = enrollmentScan.rows;
        const allTasks = taskScan.rows;
        const now = new Date();

        // Jawny sygnał obcięcia — inaczej ucięty skan wygląda na spadek zgodności w klinice.
        const incompleteDatasets = [
            ...(enrollmentScan.complete ? [] : ['care_enrollments']),
            ...(taskScan.complete ? [] : ['care_tasks']),
            ...(pastDueScan.complete ? [] : ['care_audit_log']),
        ];
        const dataComplete = incompleteDatasets.length === 0;

        // ── Per-enrollment compliance ──
        const tasksByEnrollment = new Map<string, CareflowReportTask[]>();
        for (const t of allTasks) {
            const row: CareflowReportTask = {
                id: t.id,
                // `title` i `sort_order` są wymagane przez typ raportu (drukuje je PDF),
                // ale liczenie zgodności ich nie czyta — nie ciągniemy ich z bazy.
                title: '',
                sort_order: 0,
                scheduled_at: t.scheduled_at,
                completed_at: t.completed_at ?? undefined,
                skipped_at: t.skipped_at ?? undefined,
                description: t.description,
            };
            const list = tasksByEnrollment.get(t.enrollment_id);
            if (list) list.push(row);
            else tasksByEnrollment.set(t.enrollment_id, [row]);
        }

        const pastDueByEnrollment = new Map<string, CareflowReportAudit[]>();
        for (const row of pastDueScan.rows) {
            const list = pastDueByEnrollment.get(row.enrollment_id);
            if (list) list.push(row);
            else pastDueByEnrollment.set(row.enrollment_id, [row]);
        }

        /**
         * Zgodność liczy `summarizeCareflowCompliance` — ten sam wzór, który drukuje raport
         * PDF trafiający do kartoteki. Dashboard i dokumentacja nie mogą pokazywać dwóch
         * różnych „zgodności" tego samego zapisu.
         *
         * Kluczowe: mianownikiem są WYŁĄCZNIE kroki, o które pacjent realnie był proszony.
         * Krok zamknięty przez system (termin minął przed startem protokołu — recepcja
         * zapisuje pacjenta po zabiegu) nigdy do pacjenta nie poszedł, a krok, którego pora
         * jeszcze nie nadeszła, nie jest zaniedbaniem. Liczone po staremu `wykonane/wszystkie`
         * dawały klinice zgodność zaniżoną o kroki, których nikt nie zlecił.
         */
        const summaries = new Map<string, CareflowComplianceSummary>();
        for (const [enrollmentId, enrollmentTasks] of tasksByEnrollment) {
            summaries.set(
                enrollmentId,
                summarizeCareflowCompliance(enrollmentTasks, pastDueByEnrollment.get(enrollmentId) ?? [], now)
            );
        }

        /**
         * Odrzucona propozycja dostaje status 'cancelled', ale nigdy nie miała ani jednego
         * zadania — zadania powstają dopiero przy akceptacji lekarza (D1). Wliczanie jej do
         * mianownika zaniżałoby wskaźnik ukończenia za to, że bramka bezpieczeństwa zadziałała.
         *
         * Rozpoznanie po BRAKU zadań wymaga kompletnego skanu `care_tasks` — przy
         * `dataComplete === false` również ten podział jest przybliżony.
         */
        const isRejectedProposal = (e: { id: string; status: string }) =>
            e.status === 'cancelled' && !tasksByEnrollment.has(e.id);

        // ── Overview stats ──
        const total = all.length;
        const active = all.filter(e => e.status === 'active').length;
        // Propozycje z auto-kwalifikacji: czekają na akceptację, nie są ani aktywne, ani porzucone.
        const proposed = all.filter(e => e.status === 'proposed').length;
        const completed = all.filter(e => e.status === 'completed').length;
        const cancelled = all.filter(e => e.status === 'cancelled').length;
        const rejectedProposals = all.filter(isRejectedProposal).length;
        const cancelledStarted = cancelled - rejectedProposals;
        const completionRate = (completed + cancelledStarted) > 0
            ? Math.round((completed / (completed + cancelledStarted)) * 100)
            : 0;

        // ── Avg completion time (hours) ──
        const completionTimes = all
            .filter(e => e.status === 'completed' && e.completed_at && e.enrolled_at)
            .map(e => (new Date(e.completed_at!).getTime() - new Date(e.enrolled_at).getTime()) / (1000 * 60 * 60));
        const avgCompletionHours = completionTimes.length > 0
            ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
            : 0;

        /**
         * Propozycja z auto-kwalifikacji czeka na akceptację lekarza i nie ma zadań, więc dziś
         * i tak nie wchodzi do średniej. Odsiewamy ją JAWNIE, żeby przyszła zmiana (propozycja
         * z podglądem kroków) nie wsypała nagle klinice zer do wskaźnika zgodności.
         *
         * `compliance === null` = zapisu nie ma z czego ocenić (pacjent nie został poproszony
         * o ani jeden krok) — taki zapis również zostaje poza średnią, zamiast liczyć się jako 0%.
         */
        const complianceByEnrollment = new Map<string, number>();
        let tasksSkippedBySystem = 0;
        let tasksSkippedByPatient = 0;
        for (const e of all) {
            const summary = summaries.get(e.id);
            if (!summary) continue;
            tasksSkippedBySystem += summary.skippedBySystem;
            tasksSkippedByPatient += summary.skippedByPatient;
            if (e.status === 'proposed' || summary.compliance === null) continue;
            complianceByEnrollment.set(e.id, summary.compliance);
        }

        const complianceRates = Array.from(complianceByEnrollment.values());
        const avgCompliance = complianceRates.length > 0
            ? Math.round(complianceRates.reduce((a, b) => a + b, 0) / complianceRates.length)
            : 0;

        // ── Avg response time (minutes) for completed tasks ──
        const responseTimes = allTasks
            .filter(t => t.completed_at && t.scheduled_at)
            .map(t => {
                const diff = new Date(t.completed_at!).getTime() - new Date(t.scheduled_at).getTime();
                return Math.max(0, diff / (1000 * 60)); // minutes, min 0
            });
        const avgResponseMinutes = responseTimes.length > 0
            ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
            : 0;

        // ── SMS fallback rate ──
        const totalTasks = allTasks.length;
        const smsSentTasks = allTasks.filter(t => t.sms_sent).length;
        const smsFallbackRate = totalTasks > 0
            ? Math.round((smsSentTasks / totalTasks) * 100)
            : 0;

        // ── Prodentis export count ──
        const exportedToProdentis = all.filter(e => e.report_exported_to_prodentis).length;

        // ── Template breakdown ──
        const templateMap = new Map<string, { count: number; proposed: number; completed: number; cancelled: number; rejected: number }>();
        for (const e of all) {
            const name = e.template_name || 'Brak szablonu';
            const entry = templateMap.get(name) || { count: 0, proposed: 0, completed: 0, cancelled: 0, rejected: 0 };
            entry.count++;
            if (e.status === 'proposed') entry.proposed++;
            if (e.status === 'completed') entry.completed++;
            if (e.status === 'cancelled') entry.cancelled++;
            if (isRejectedProposal(e)) entry.rejected++;
            templateMap.set(name, entry);
        }
        const byTemplate = Array.from(templateMap.entries())
            .map(([name, stats]) => {
                const started = stats.completed + stats.cancelled - stats.rejected;
                return {
                    name,
                    count: stats.count,
                    proposed: stats.proposed,
                    completed: stats.completed,
                    cancelled: stats.cancelled,
                    rejectedProposals: stats.rejected,
                    completionRate: started > 0
                        ? Math.round((stats.completed / started) * 100)
                        : 0,
                };
            })
            .sort((a, b) => b.count - a.count);

        // ── Doctor breakdown ──
        const doctorMap = new Map<string, { count: number; proposed: number; completed: number }>();
        for (const e of all) {
            const name = e.doctor_name || 'Brak lekarza';
            const entry = doctorMap.get(name) || { count: 0, proposed: 0, completed: 0 };
            entry.count++;
            if (e.status === 'proposed') entry.proposed++;
            if (e.status === 'completed') entry.completed++;
            doctorMap.set(name, entry);
        }

        // Compute avg compliance per doctor
        const doctorComplianceMap = new Map<string, number[]>();
        for (const e of all) {
            const compliance = complianceByEnrollment.get(e.id);
            if (compliance === undefined) continue;
            const name = e.doctor_name || 'Brak lekarza';
            const arr = doctorComplianceMap.get(name) || [];
            arr.push(compliance);
            doctorComplianceMap.set(name, arr);
        }

        const byDoctor = Array.from(doctorMap.entries())
            .map(([name, stats]) => {
                const compArr = doctorComplianceMap.get(name) || [];
                return {
                    name,
                    count: stats.count,
                    proposed: stats.proposed,
                    completed: stats.completed,
                    avgCompliance: compArr.length > 0
                        ? Math.round(compArr.reduce((a, b) => a + b, 0) / compArr.length)
                        : 0,
                };
            })
            .sort((a, b) => b.count - a.count);

        // ── Monthly timeline (last 6 months) ──
        const monthlyMap = new Map<string, number>();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap.set(key, 0);
        }
        for (const e of all) {
            const d = new Date(e.enrolled_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyMap.has(key)) {
                monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
            }
        }
        const monthlyTimeline = Array.from(monthlyMap.entries()).map(([month, count]) => ({
            month,
            count,
        }));

        return NextResponse.json({
            overview: {
                total,
                active,
                proposed,
                completed,
                cancelled,
                rejectedProposals,
                completionRate,
                avgCompletionHours,
                avgCompliance,
                avgResponseMinutes,
                smsFallbackRate,
                exportedToProdentis,
                totalTasks,
                smsSentTasks,
                // Kroki zamknięte przez system (termin minął przed startem protokołu) — NIE są
                // zaniedbaniem pacjenta i nie wchodzą do mianownika zgodności.
                tasksSkippedBySystem,
                // Realne pominięcia pacjenta — te do mianownika wchodzą.
                tasksSkippedByPatient,
                // Ile zapisów w ogóle dało się ocenić (mianownik średniej zgodności).
                complianceEnrollments: complianceRates.length,
            },
            byTemplate,
            byDoctor,
            monthlyTimeline,
            // `false` = któryś skan urwał się na limicie stron, więc wskaźniki w tej odpowiedzi
            // są policzone na części danych. Bez tego pola obcięcie wygląda na realny spadek
            // zgodności, a `incompleteDatasets` mówi, którego zbioru brakuje.
            dataComplete,
            incompleteDatasets,
        });
    } catch (err) {
        // Surowy komunikat Postgresa zostaje w logach, nie leci do klienta.
        console.error('[CareFlow Stats] Error:', err);
        return NextResponse.json({ error: 'Nie udało się policzyć statystyk CareFlow' }, { status: 500 });
    }
}
