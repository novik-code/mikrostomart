/**
 * CareFlow — cykl życia zapisu wobec zdarzeń wizyty i konta pacjenta.
 *
 * Trzy dziury, które istniały od wdrożenia CareFlow:
 * - odwołanie wizyty nie dotykało `care_enrollments` (cron dalej przypominał
 *   „weź antybiotyk" po zabiegu, który się nie odbył — aż do wyczerpania limitu),
 * - przełożenie wizyty nie przesuwało zadań (offsety liczone od starej daty),
 * - usunięcie konta zostawiało imię i telefon w `care_enrollments` i w audycie.
 *
 * Wszystkie eksportowane funkcje są FAIL-SAFE: nigdy nie rzucają, błąd trafia
 * wyłącznie do logu serwera. Wpinamy je w trasy anulowania / przekładania wizyty
 * i usuwania konta, a żadna z tych operacji nie może paść przez CareFlow.
 */

import { createClient } from '@supabase/supabase-js';
import { sendTelegramNotification } from '@/lib/telegram';
import { sendPushToGroups, pushToPatientAll, type PushGroup } from '@/lib/pushService';
import { getPushTranslation } from '@/lib/pushTranslations';
import {
    buildTasks,
    warsawIso,
    PAST_GRACE_HOURS,
    PAST_DUE_NOTE,
    type CareMedication,
    type CareStepRow,
    type CareTaskRow,
} from '@/lib/careflowSchedule';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Statusy „żywe" — tylko takie zamykamy i przeliczamy ('proposed' dokłada mig 181). */
const OPEN_STATUSES = ['active', 'proposed'];

/** Wartość wchodzi do filtra PostgREST `or=` — przecinek/nawias rozwaliłby zapytanie. */
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

const ENROLLMENT_COLUMNS = 'id, patient_id, appointment_id, appointment_date, template_id, custom_medications, status';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Okno dopasowania zapisu bez `appointment_id` do wizyty — pacjent bywa tego dnia dwa razy.
 *
 * 90 minut, nie 3 h: przy 3 h higienizacja o 9:00 „łapała" protokół implantacyjny na 11:00.
 * Okno ma pokryć poślizg godziny zapisu wobec grafiku, a nie sąsiednią wizytę.
 */
const MATCH_WINDOW_MS = 90 * 60 * 1000;

/** Klucz w `push_notification_config` sterujący grupami alarmu o niejednoznaczności. */
const AMBIGUITY_PUSH_KEY = 'careflow-ambiguous-match';

/** Grupy personelu alarmowane, gdy nie ma wpisu w `push_notification_config`. */
const DEFAULT_AMBIGUITY_GROUPS: PushGroup[] = ['doctors', 'admin'];

/**
 * Wynik operacji cyklu życia.
 *
 * `ambiguousEnrollmentIds` jest niepuste TYLKO wtedy, gdy dopasowanie po pacjencie
 * i godzinie trafiło więcej niż jednego kandydata — wtedy świadomie NIE ruszamy
 * żadnego zapisu (`count === 0`) i zostawiamy decyzję personelowi.
 *
 * Powiadomienie personelu wychodzi JUŻ Z TEGO MODUŁU (`reportAmbiguousMatch`), więc
 * wywołujący NIE musi go wysyłać — inaczej ten sam alarm poszedłby trzy razy z trzech
 * tras. Wywołujący może dopisać własny kontekst do logu (np. ID wizyty w portalu,
 * którego ten moduł nie zna), ale sam alarm ma dokładnie jedno źródło.
 */
export type CareflowLifecycleResult = {
    count: number;
    ambiguousEnrollmentIds: string[];
};

type LifecycleEnrollment = {
    id: string;
    patient_id: string;
    appointment_id: string | null;
    appointment_date: string;
    template_id: string;
    custom_medications: CareMedication[] | null;
    status: string;
};

type ExistingTask = {
    id: string;
    step_id: string | null;
    original_offset_hours: number | string | null;
    scheduled_at: string;
    description: string | null;
    completed_at: string | null;
    skipped_at: string | null;
};

/**
 * Dopisek dla zadania, którego termin wypadł w przeszłości — treść jest jedna
 * (`PAST_DUE_NOTE` z `careflowSchedule`), tu tylko doklejamy ją do istniejącego opisu.
 */
function withPastDueNote(description: string | null): string {
    const base = description?.trim();
    return base ? `${base}\n${PAST_DUE_NOTE}` : PAST_DUE_NOTE;
}

const warsawDayFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

/** Dzień WARSZAWSKI (YYYY-MM-DD) — 23:30 UTC w lipcu to w Polsce już następny dzień. */
function warsawDay(date: Date): string {
    const parts = warsawDayFormatter.formatToParts(date);
    const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
}

const warsawHourFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw',
    hour: '2-digit',
    hourCycle: 'h23',
});

/** Godzina warszawska (0-23). Ta sama podstawa co cisza nocna w cronie przypomnień. */
function warsawHour(date: Date): number {
    const raw = warsawHourFormatter.formatToParts(date).find((p) => p.type === 'hour')?.value ?? '0';
    return Number(raw) % 24;
}

/**
 * Doba warszawska jako półotwarty przedział [from, to).
 *
 * Używane przez guardy duplikatu w `enroll` i `accept`: bez ID wizyty jedynym
 * wspólnym mianownikiem propozycji z crona i ręcznego zapisu z grafiku jest doba zabiegu.
 */
export function warsawDayRange(date: Date): { from: string; to: string } {
    const from = warsawIso(warsawDay(date), '00:00');
    // +36 h zawsze wpada w kolejny dzień, także w dobie zmiany czasu (23 h / 25 h)
    const to = warsawIso(warsawDay(new Date(new Date(from).getTime() + 36 * HOUR_MS)), '00:00');
    return { from, to };
}

/** Wynik dopasowania: na `enrollments` wolno działać, `ambiguous` wymaga człowieka. */
type EnrollmentMatch = {
    enrollments: LifecycleEnrollment[];
    ambiguous: LifecycleEnrollment[];
};

/**
 * Zapisy CareFlow dopasowane do wizyty: najpierw po `appointment_id`
 * (identyfikator z Prodentisa), a gdy go brak lub nic nie trafia — po pacjencie
 * i GODZINIE zabiegu (+/- 90 min), bo panel personelu zapisuje czasem bez ID wizyty.
 *
 * Fallback celowo wąski i tylko dla zapisów BEZ `appointment_id`:
 * - zapis z własnym `appointment_id` dotyczy innej, konkretnej wizyty i został już
 *   rozstrzygnięty w pierwszym zapytaniu,
 * - dopasowanie po całej dobie zamykało protokół implantu z rana, gdy pacjent odwołał
 *   higienizację po południu (przypomnienia o osłonie antybiotykowej milkły).
 *
 * KILKU kandydatów = brak dopasowania. Fallback jest domysłem po godzinie, nie faktem:
 * pacjent z higienizacją o 9:00 i implantacją o 11:00 miałby zamknięty protokół zabiegu,
 * który się ODBĘDZIE — cicho, razem z osłoną antybiotykową. Lepiej zostawić protokół
 * działający i zawołać człowieka niż zgasić właściwy.
 */
async function findOpenEnrollments(params: {
    appointmentId?: string;
    prodentisId?: string;
    appointmentDate?: string;
}): Promise<EnrollmentMatch> {
    const nothing: EnrollmentMatch = { enrollments: [], ambiguous: [] };

    if (params.appointmentId) {
        const { data, error } = await supabase
            .from('care_enrollments')
            .select(ENROLLMENT_COLUMNS)
            .eq('appointment_id', params.appointmentId)
            .in('status', OPEN_STATUSES);

        if (error) throw error;
        // Dopasowanie po ID wizyty jest pewne — także wtedy, gdy zapisów jest kilka.
        if (data && data.length > 0) return { enrollments: data as LifecycleEnrollment[], ambiguous: [] };
    }

    if (!params.prodentisId || !params.appointmentDate) return nothing;

    const appointmentDate = new Date(params.appointmentDate);
    if (Number.isNaN(appointmentDate.getTime())) return nothing;

    const from = new Date(appointmentDate.getTime() - MATCH_WINDOW_MS).toISOString();
    const to = new Date(appointmentDate.getTime() + MATCH_WINDOW_MS).toISOString();
    const { data, error } = await supabase
        .from('care_enrollments')
        .select(ENROLLMENT_COLUMNS)
        .eq('patient_id', params.prodentisId)
        .in('status', OPEN_STATUSES)
        .is('appointment_id', null)
        .gte('appointment_date', from)
        .lte('appointment_date', to);

    if (error) throw error;

    const candidates = (data ?? []) as LifecycleEnrollment[];
    if (candidates.length > 1) return { enrollments: [], ambiguous: candidates };
    return { enrollments: candidates, ambiguous: [] };
}

/** Telegram wysyłamy z `parse_mode=HTML` — nieescape'owany `<` to błąd 400 i alarm ginie. */
function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Alarm dla personelu o niejednoznacznym dopasowaniu.
 *
 * Sam `console.warn` NIE jest powiadomieniem: ląduje w logach Vercela, których nikt nie
 * czyta, a w tym czasie protokół odwołanego/przełożonego zabiegu dalej wysyła pacjentowi
 * przypomnienia (w tym o osłonie antybiotykowej). Dlatego dokładamy ten sam mechanizm,
 * którego używa `cron/careflow-auto-qualify`: Telegram gabinetu + push do grup personelu
 * z `push_notification_config` (fallback: lekarze + admin).
 *
 * TREŚĆ BEZ PII: wyłącznie identyfikatory zapisów i wizyty. Nazwisko razem z nazwą
 * protokołu chirurgicznego to dana o zdrowiu i nie ma prawa wyjść poza bazę.
 *
 * NIE RZUCA. Każdy kanał w osobnym `try`, żeby awaria jednego nie zabrała drugiego —
 * i żeby awaria powiadomienia nigdy nie wywróciła odwołania ani przełożenia wizyty.
 */
async function reportAmbiguousMatch(
    operation: string,
    ambiguous: LifecycleEnrollment[],
    params: { appointmentId?: string; appointmentDate?: string }
): Promise<void> {
    console.warn(
        `[CareFlowLifecycle] ${operation}: dopasowanie niejednoznaczne — ${ambiguous.length} zapis(ów) ` +
            `w oknie +/-${MATCH_WINDOW_MS / 60_000} min od ${params.appointmentDate ?? '(brak daty)'} ` +
            `(wizyta: ${params.appointmentId ?? 'bez ID'}). ` +
            `NIE ruszam żadnego, wymagana decyzja personelu. Kandydaci: ` +
            ambiguous.map((e) => `${e.id}@${e.appointment_date}`).join(', ')
    );

    const ids = ambiguous.map((e) => e.id);
    if (ids.length === 0) return;

    // Bez odmiany przez przypadki („2 protokoły" / „5 protokołów") — jedna forma dla każdej liczby.
    const summary = `${operation}: do wizyty pasuje więcej niż jeden protokół opieki (kandydatów: ${ids.length}).`;

    try {
        await sendTelegramNotification(
            `🚨 <b>CareFlow — wymagana ręczna decyzja</b>\n\n` +
                `${escapeHtml(summary)}\n` +
                `Termin wizyty: ${escapeHtml(params.appointmentDate ?? 'nieznany')}\n` +
                `ID wizyty: ${escapeHtml(params.appointmentId ?? 'brak')}\n\n` +
                `⚠️ ŻADEN protokół nie został zamknięty ani przesunięty — przypomnienia ` +
                `(w tym osłona antybiotykowa) NADAL lecą do pacjenta.\n` +
                `Otwórz panel i rozstrzygnij ręcznie, który protokół dotyczy tej wizyty.\n\n` +
                `Zapisy: ${escapeHtml(ids.join(', '))}`,
            'default'
        );
    } catch (err) {
        console.error('[CareFlowLifecycle] Alarm o niejednoznaczności — Telegram nie poszedł:', err);
    }

    try {
        const { data: configs } = await supabase
            .from('push_notification_config')
            .select('key, groups, enabled')
            .eq('key', AMBIGUITY_PUSH_KEY);

        const cfg = (configs || [])[0] as { groups: string[] | null; enabled: boolean } | undefined;
        // Brak wiersza w konfiguracji nie może wyciszyć alarmu klinicznego — wtedy fallback.
        const groups = (cfg && cfg.enabled !== false && cfg.groups && cfg.groups.length > 0)
            ? cfg.groups as PushGroup[]
            : DEFAULT_AMBIGUITY_GROUPS;

        await sendPushToGroups(groups, {
            title: '🚨 CareFlow — wymagana ręczna decyzja',
            body: `${summary} Żaden nie został zamknięty — przypomnienia nadal lecą.`,
            url: '/admin',
            // Stały tag sklejałby różne wizyty w jedno powiadomienie — kotwiczymy w pierwszym zapisie.
            tag: `careflow-ambiguous-${ids[0]}`,
            // 🔴 To alarm KLINICZNY: pacjent ma dwa nakładające się protokoły, żaden nie
            // został zamknięty, więc dalej dostaje przypomnienia o osłonie antybiotykowej
            // z nieaktualnego planu. Bez kanału aplikacji szedł wyłącznie do przeglądarki,
            // której lekarz nie ma otwartej — i na Telegram, czyli kanał zbiorczy.
            // Zdarzenie jest rzadkie i z definicji wymaga decyzji człowieka.
            data: {
                type: 'careflow_ambiguous_match',
                operation,
                enrollment_ids: ids,
                appointment_id: params.appointmentId ?? null,
                appointment_date: params.appointmentDate ?? null,
            },
        }, { alsoApp: true });
    } catch (err) {
        console.error('[CareFlowLifecycle] Alarm o niejednoznaczności — push nie poszedł:', err);
    }
}

/**
 * Zamyka zapisy CareFlow powiązane z odwołaną wizytą.
 *
 * Status `cancelled` wystarcza, żeby zatrzymać wysyłkę: cron push/SMS pobiera
 * wyłącznie zadania z `care_enrollments.status = 'active'`.
 *
 * @returns liczba zamkniętych zapisów + ewentualni niejednoznaczni kandydaci
 *          (zera również przy błędzie — nigdy nie rzuca)
 */
export async function cancelCareflowForAppointment(params: {
    appointmentId?: string;
    prodentisId?: string;
    appointmentDate?: string;
    actor: string;
    reason: string;
}): Promise<CareflowLifecycleResult> {
    try {
        const { enrollments, ambiguous } = await findOpenEnrollments(params);
        if (ambiguous.length > 0) {
            await reportAmbiguousMatch('Odwołanie wizyty', ambiguous, params);
            return { count: 0, ambiguousEnrollmentIds: ambiguous.map((e) => e.id) };
        }
        if (enrollments.length === 0) return { count: 0, ambiguousEnrollmentIds: [] };

        const ids = enrollments.map((e) => e.id);
        const { error } = await supabase
            .from('care_enrollments')
            .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
            .in('id', ids);

        if (error) throw error;

        const { error: auditError } = await supabase.from('care_audit_log').insert(
            enrollments.map((e) => ({
                enrollment_id: e.id,
                action: 'cancelled_by_appointment_cancel',
                actor: params.actor,
                details: {
                    reason: params.reason,
                    appointment_id: params.appointmentId ?? e.appointment_id ?? null,
                },
            }))
        );
        if (auditError) console.error('[CareFlowLifecycle] Audit insert failed (cancel):', auditError);

        console.log(`[CareFlowLifecycle] Odwołanie wizyty zamknęło ${ids.length} zapis(ów) CareFlow`);
        return { count: ids.length, ambiguousEnrollmentIds: [] };
    } catch (err) {
        console.error('[CareFlowLifecycle] cancelCareflowForAppointment error:', err);
        return { count: 0, ambiguousEnrollmentIds: [] };
    }
}

/** Klucz dopasowania stare↔nowe zadanie: krok + offset (offset koduje też numer dawki). */
function taskKey(stepId: string | null | undefined, offsetHours: number | string | null | undefined): string {
    return `${stepId ?? ''}|${Number(offsetHours ?? 0)}`;
}

/**
 * Przelicza zadania jednego zapisu na nowy termin zabiegu.
 *
 * Harmonogram budujemy od zera przez `buildTasks` (a nie przesuwamy stałą deltą),
 * bo smart-snap i rekurencja zależą od tego, w którą porę doby wpadnie zabieg.
 * Zadania wykonane i pominięte zostają nietknięte — są dokumentacją tego, co się
 * wydarzyło.
 *
 * Zadanie, którego NOWY termin wypada już w przeszłości (poza okresem łaski
 * `PAST_GRACE_HOURS`), zamykamy od razu przez `skipped_at` + dopisek dla pacjenta.
 * Inaczej przełożenie wizyty „na dziś rano" wypuszczałoby zaległe dawki serią
 * przy najbliższym przebiegu crona.
 */
async function rescheduleEnrollment(
    enrollment: LifecycleEnrollment,
    newDateIso: string,
    actor: string,
    appointmentId?: string
): Promise<boolean> {
    // Propozycja auto-kwalifikacji nie ma jeszcze ŻADNYCH zadań i mieć ich nie może
    // przed akceptacją lekarza — przesuwamy sam termin.
    if (enrollment.status === 'proposed') {
        const { error } = await supabase
            .from('care_enrollments')
            .update({ appointment_date: newDateIso })
            .eq('id', enrollment.id);
        if (error) throw error;

        const { error: auditError } = await supabase.from('care_audit_log').insert({
            enrollment_id: enrollment.id,
            action: 'rescheduled_by_appointment',
            actor,
            details: {
                old_date: enrollment.appointment_date,
                new_date: newDateIso,
                appointment_id: appointmentId ?? enrollment.appointment_id ?? null,
                proposed: true,
            },
        });
        if (auditError) console.error('[CareFlowLifecycle] Audit insert failed (reschedule):', auditError);
        return true;
    }

    const { data: template } = await supabase
        .from('care_templates')
        .select('default_medications, push_settings')
        .eq('id', enrollment.template_id)
        .single();

    const { data: steps } = await supabase
        .from('care_template_steps')
        .select('*')
        .eq('template_id', enrollment.template_id)
        .order('sort_order', { ascending: true });

    const pushSettings = (template?.push_settings ?? {}) as { quiet_hours_start?: number; quiet_hours_end?: number };
    const medications = (enrollment.custom_medications ?? template?.default_medications ?? []) as CareMedication[];

    // Przełożenie wizyty NA WCZEŚNIEJ wpycha kroki przedzabiegowe w przeszłość — dokładnie
    // ta sama pułapka co zapis tuż przed zabiegiem. `now` sprawia, że takie zadania powstają
    // od razu pominięte, zamiast polecieć zaległą serią przy najbliższym przebiegu crona.
    const now = new Date();
    const nowIso = now.toISOString();
    const pastDueBeforeMs = now.getTime() - PAST_GRACE_HOURS * HOUR_MS;

    const newRows = buildTasks({
        steps: (steps ?? []) as CareStepRow[],
        medications,
        appointmentDate: new Date(newDateIso),
        quietStart: pushSettings.quiet_hours_start ?? 22,
        quietEnd: pushSettings.quiet_hours_end ?? 7,
        now,
    });

    const { data: existing } = await supabase
        .from('care_tasks')
        .select('id, step_id, original_offset_hours, scheduled_at, description, completed_at, skipped_at')
        .eq('enrollment_id', enrollment.id)
        .order('scheduled_at', { ascending: true });

    const tasks = (existing ?? []) as ExistingTask[];
    const closed = tasks.filter((t) => t.completed_at !== null || t.skipped_at !== null);
    const pending = tasks.filter((t) => t.completed_at === null && t.skipped_at === null);

    // Kolejka nowych zadań per klucz — krok z zerowym interwałem rekurencji potrafi
    // dać kilka zadań o tym samym kluczu, więc konsumujemy je po jednym.
    const newByKey = new Map<string, CareTaskRow[]>();
    for (const row of newRows) {
        const key = taskKey(row.step_id, row.original_offset_hours);
        const queue = newByKey.get(key);
        if (queue) queue.push(row);
        else newByKey.set(key, [row]);
    }

    // Zadanie wykonane/pominięte zostaje bez zmian, ale „zjada" swój odpowiednik
    // w nowym harmonogramie — inaczej pacjent dostałby je drugi raz.
    for (const task of closed) {
        newByKey.get(taskKey(task.step_id, task.original_offset_hours))?.shift();
    }

    const orphans: ExistingTask[] = [];
    let moved = 0;
    let skippedPastDue = 0;

    for (const task of pending) {
        const match = newByKey.get(taskKey(task.step_id, task.original_offset_hours))?.shift();
        if (!match) {
            orphans.push(task);
            continue;
        }
        // `buildTasks` z `now` oznaczyło ten termin jako zaległy — zamykamy zadanie zamiast
        // przestawiać je w przeszłość z żywym `skipped_at IS NULL` (cron wysłałby je od razu).
        const pastDueAt = match.skipped_at ?? null;
        const { error } = await supabase
            .from('care_tasks')
            .update({
                scheduled_at: match.scheduled_at,
                visible_from: match.visible_from,
                sort_order: match.sort_order,
                // nowy termin = nowy komplet przypomnień
                push_sent_count: 0,
                push_last_sent_at: null,
                sms_sent: false,
                ...(pastDueAt ? { skipped_at: pastDueAt, description: match.description } : {}),
            })
            .eq('id', task.id);
        if (error) throw error;
        if (pastDueAt) skippedPastDue++;
        else moved++;
    }

    // Kroki dołożone do protokołu po zapisie pacjenta — brak ich w bazie, dokładamy.
    const inserts = [...newByKey.values()].flat().map((row) => ({ ...row, enrollment_id: enrollment.id }));
    if (inserts.length > 0) {
        const { error } = await supabase.from('care_tasks').insert(inserts);
        if (error) throw error;
    }

    // Kroki USUNIĘTE z protokołu po zapisie: nie ma ich w nowym harmonogramie,
    // a skasować nie można (audyt trzyma FK do zadania) — przesuwamy je deltą terminów.
    const deltaMs = new Date(newDateIso).getTime() - new Date(enrollment.appointment_date).getTime();
    for (const task of orphans) {
        const shiftedMs = new Date(task.scheduled_at).getTime() + deltaMs;
        // Ta sama zasada co wyżej: przesunięcie w przeszłość zamyka zadanie, nie wypuszcza go.
        const isPastDue = shiftedMs < pastDueBeforeMs;
        const { error } = await supabase
            .from('care_tasks')
            .update({
                scheduled_at: new Date(shiftedMs).toISOString(),
                push_sent_count: 0,
                push_last_sent_at: null,
                sms_sent: false,
                ...(isPastDue ? { skipped_at: nowIso, description: withPastDueNote(task.description) } : {}),
            })
            .eq('id', task.id);
        if (error) throw error;
        if (isPastDue) skippedPastDue++;
    }

    const { error: enrollmentError } = await supabase
        .from('care_enrollments')
        .update({ appointment_date: newDateIso })
        .eq('id', enrollment.id);
    if (enrollmentError) throw enrollmentError;

    const { error: auditError } = await supabase.from('care_audit_log').insert({
        enrollment_id: enrollment.id,
        action: 'rescheduled_by_appointment',
        actor,
        details: {
            old_date: enrollment.appointment_date,
            new_date: newDateIso,
            appointment_id: appointmentId ?? enrollment.appointment_id ?? null,
            tasks_rescheduled: moved,
            tasks_added: inserts.length,
            tasks_shifted: orphans.length,
            tasks_kept: closed.length,
            // zadania zamknięte, bo po zmianie terminu ich pora minęła (zaległe dawki)
            tasks_skipped_past_due: skippedPastDue,
        },
    });
    if (auditError) console.error('[CareFlowLifecycle] Audit insert failed (reschedule):', auditError);

    return true;
}

/**
 * Przesuwa zapisy CareFlow na nowy termin wizyty i PRZELICZA harmonogram zadań.
 *
 * @returns liczba przeliczonych zapisów + ewentualni niejednoznaczni kandydaci
 *          (zera również przy błędzie — nigdy nie rzuca)
 */
export async function rescheduleCareflowForAppointment(params: {
    appointmentId?: string;
    prodentisId?: string;
    oldDate?: string;
    newDate: string;
    actor: string;
}): Promise<CareflowLifecycleResult> {
    try {
        const newDate = new Date(params.newDate);
        if (Number.isNaN(newDate.getTime())) {
            console.error('[CareFlowLifecycle] reschedule: nieprawidłowa nowa data', params.newDate);
            return { count: 0, ambiguousEnrollmentIds: [] };
        }
        const newDateIso = newDate.toISOString();

        const { enrollments, ambiguous } = await findOpenEnrollments({
            appointmentId: params.appointmentId,
            prodentisId: params.prodentisId,
            appointmentDate: params.oldDate,
        });
        if (ambiguous.length > 0) {
            await reportAmbiguousMatch('Przełożenie wizyty', ambiguous, {
                appointmentId: params.appointmentId,
                appointmentDate: params.oldDate,
            });
            return { count: 0, ambiguousEnrollmentIds: ambiguous.map((e) => e.id) };
        }
        if (enrollments.length === 0) return { count: 0, ambiguousEnrollmentIds: [] };

        let updated = 0;
        for (const enrollment of enrollments) {
            try {
                if (await rescheduleEnrollment(enrollment, newDateIso, params.actor, params.appointmentId)) updated++;
            } catch (err) {
                // Jeden zapis nie może zablokować pozostałych.
                console.error(`[CareFlowLifecycle] reschedule zapisu ${enrollment.id} nie powiódł się:`, err);
            }
        }

        console.log(`[CareFlowLifecycle] Przełożenie wizyty przeliczyło ${updated} zapis(ów) CareFlow`);
        return { count: updated, ambiguousEnrollmentIds: [] };
    } catch (err) {
        console.error('[CareFlowLifecycle] rescheduleCareflowForAppointment error:', err);
        return { count: 0, ambiguousEnrollmentIds: [] };
    }
}

/** Podmiana danych osobowych w zapisie po usunięciu konta. */
/** Cisza nocna — te same godziny co w cronie przypomnień. */
const QUIET_START = 22;
const QUIET_END = 7;

/**
 * Powiadomienie dla pacjenta o URUCHOMIENIU protokołu opieki.
 *
 * Dotąd pacjent nie dostawał NIC w momencie zapisania — pierwszy sygnał przychodził
 * dopiero z cronem, gdy nadchodził termin pierwszego kroku (a przy protokole zapisanym
 * z wyprzedzeniem mogło to być nazajutrz). Tymczasem to właśnie moment zapisu jest
 * chwilą, w której pacjent powinien zajrzeć do planu: są tam zalecenia PRZED zabiegiem.
 *
 * Zasady (te same, co w cronie przypomnień):
 * - treść bez nazwy leku i bez dawki — na ekranie blokady ma być tylko sygnał, że plan
 *   czeka w aplikacji; szczegóły pacjent widzi po odblokowaniu,
 * - wyciszenie `careflow_reminders` obowiązuje; przy BŁĘDZIE odczytu preferencji
 *   milczymy (fail-closed) — lepiej nie wysłać niż wysłać wbrew sprzeciwowi,
 * - cisza nocna 22–7: nie budzimy pacjenta informacją, która może poczekać do rana,
 * - brak żywego tokenu = brak wysyłki. ŚWIADOMIE bez fallbacku SMS: to informacja
 *   organizacyjna, nie przypomnienie o dawce, a SMS kosztuje i bywa nachalny.
 *
 * Funkcja NIGDY nie rzuca — zapis pacjenta do protokołu nie może paść przez powiadomienie.
 */
export async function notifyPatientProtocolStarted(params: {
    enrollmentId: string;
    /** Prodentis ID — tym kluczem są kluczowane tokeny apki mobilnej. */
    patientId: string;
    /** patients.id — tym kluczem są kluczowane tokeny web-push. Bywa NULL (pacjent bez konta). */
    patientDbId?: string | null;
    now?: Date;
}): Promise<{ sent: boolean; reason?: string }> {
    try {
        const now = params.now ?? new Date();
        const hour = warsawHour(now);
        if (hour >= QUIET_START || hour < QUIET_END) {
            return { sent: false, reason: 'quiet_hours' };
        }

        // Preferencje i język pacjenta czytamy jednym zapytaniem.
        const { data: patient, error: patientErr } = await supabase
            .from('patients')
            .select('id, locale, notification_preferences')
            .eq('prodentis_id', params.patientId)
            .maybeSingle();

        if (patientErr) {
            console.error('[CareFlow] notify: blad odczytu pacjenta — milczymy (fail-closed)');
            return { sent: false, reason: 'prefs_error' };
        }
        if (!patient) return { sent: false, reason: 'no_account' };

        const prefs = (patient.notification_preferences ?? {}) as Record<string, unknown>;
        if (prefs.careflow_reminders === false) return { sent: false, reason: 'muted' };

        // Żywy kanał: apka mobilna (Expo, klucz = prodentisId) albo web-push (FCM, klucz = patients.id).
        const dbId = params.patientDbId ?? (patient.id as string | undefined) ?? null;
        const [expo, fcm] = await Promise.all([
            supabase.from('patient_push_tokens').select('id').eq('patient_id', params.patientId).limit(1),
            dbId
                ? supabase.from('fcm_tokens').select('id').eq('user_id', dbId).eq('user_type', 'patient').limit(1)
                : Promise.resolve({ data: [], error: null } as { data: unknown[]; error: null }),
        ]);
        if (expo.error || fcm.error) {
            console.error('[CareFlow] notify: blad odczytu tokenow — milczymy (fail-closed)');
            return { sent: false, reason: 'tokens_error' };
        }
        const hasChannel = (expo.data?.length ?? 0) > 0 || (fcm.data?.length ?? 0) > 0;
        if (!hasChannel) return { sent: false, reason: 'no_token' };

        const locale = typeof patient.locale === 'string' && patient.locale ? patient.locale : 'pl';
        const { title, body } = getPushTranslation('careflow_enrolled', locale);

        const result = await pushToPatientAll(dbId ?? params.patientId, {
            title,
            body,
            // Ścieżka BEZ sekretu (access_token trafiłby do push_notifications_log).
            url: '/strefa-pacjenta/dashboard',
            // Apka routuje po type i otwiera KONKRETNY plan.
            data: { type: 'careflow', enrollmentId: params.enrollmentId },
        });

        console.log(
            `[CareFlow] notify protocol started (zapis ${params.enrollmentId.slice(0, 8)}): sent=${result.sent}`
        );
        return { sent: result.sent > 0, reason: result.sent > 0 ? undefined : 'delivery_failed' };
    } catch (err) {
        console.error('[CareFlow] notify: nieoczekiwany blad (nieblokujacy):', err);
        return { sent: false, reason: 'error' };
    }
}

const ANON_NAME = '[usunięte konto]';
const ANON_VALUE = '[usunięte]';

/** Klucze `details`, które z definicji trzymają PII (bez `doctor_name`/`template_name`). */
const PII_KEYS = new Set([
    'patient_name',
    'patientname',
    'patient_phone',
    'patientphone',
    'phone',
    'telefon',
    'recipient',
    'sms_to',
    'to',
]);

/**
 * Czy błąd oznacza „nie ma takiej kolumny"?
 *
 * Postgres zwraca 42703, a PostgREST (>= v12) odrzuca nieznaną kolumnę z ładunku
 * jeszcze przed bazą, kodem PGRST204. Sprawdzamy oba plus treść komunikatu, bo od
 * tej odpowiedzi zależy, czy anonimizacja RODO w ogóle się wykona.
 */
function isMissingColumnError(error: { code?: string | null; message?: string | null } | null, column: string): boolean {
    if (!error) return false;
    if (error.code === '42703' || error.code === 'PGRST204') return true;
    const message = String(error.message ?? '');
    return message.includes(column) && /column|schema cache/i.test(message);
}

/** Numer bywa zapisany z separatorami/+48 — dopuszczamy je między cyframi. */
function phonePattern(phone: string): RegExp | null {
    const digits = phone.replace(/\D/g, '').slice(-9);
    if (digits.length < 9) return null;
    return new RegExp(`(\\+?48[\\s.\\-]?)?${digits.split('').join('[\\s.\\-()]*')}`, 'g');
}

function scrubText(value: string, names: string[], phonePatterns: RegExp[]): string {
    let out = value;
    for (const pattern of phonePatterns) out = out.replace(pattern, ANON_VALUE);
    for (const name of names) {
        // escape metaznaków — imię i nazwisko wchodzą do regexpa
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        out = out.replace(new RegExp(escaped, 'gi'), ANON_NAME);
    }
    return out;
}

/** Rekurencyjne czyszczenie `details` z nazwiska i telefonu (klucz + treść wartości). */
function scrubDetails(value: unknown, names: string[], phonePatterns: RegExp[], depth = 0): unknown {
    if (depth > 5 || value === null || value === undefined) return value;
    if (typeof value === 'string') return scrubText(value, names, phonePatterns);
    if (Array.isArray(value)) return value.map((item) => scrubDetails(item, names, phonePatterns, depth + 1));
    if (typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
            out[key] = PII_KEYS.has(key.toLowerCase())
                ? (val === null || val === undefined ? val : ANON_VALUE)
                : scrubDetails(val, names, phonePatterns, depth + 1);
        }
        return out;
    }
    return value;
}

/**
 * Anonimizuje CareFlow po usunięciu konta pacjenta (RODO art. 17).
 *
 * Kasujemy WYŁĄCZNIE dane identyfikujące: imię i nazwisko, telefon, powiązanie
 * z kontem — plus unieważniamy bezhasłowy link pacjenta (rotacja `access_token`
 * i natychmiastowe wygaśnięcie), bo inaczej stary SMS dawałby dostęp do protokołu
 * bezterminowo. Zapisy, zadania i treści kliniczne zostają — dokumentacja medyczna
 * podlega 20-letniej retencji (art. 17 ust. 3 lit. b RODO + ustawa o prawach
 * pacjenta art. 29 ust. 1), więc `patient_id` (ID kartoteki) też zostaje.
 *
 * @returns liczniki zmienionych wierszy (zera również przy błędzie — nigdy nie rzuca)
 */
export async function anonymizeCareflowForPatient(params: {
    patientDbId?: string | null;
    prodentisId?: string | null;
    patientName?: string | null;
    patientPhone?: string | null;
}): Promise<{ enrollments: number; auditEntries: number }> {
    const empty = { enrollments: 0, auditEntries: 0 };
    try {
        const filters: string[] = [];
        if (params.prodentisId && SAFE_ID.test(params.prodentisId)) filters.push(`patient_id.eq.${params.prodentisId}`);
        if (params.patientDbId && SAFE_ID.test(params.patientDbId)) filters.push(`patient_db_id.eq.${params.patientDbId}`);
        if (filters.length === 0) return empty;

        const { data: enrollments, error } = await supabase
            .from('care_enrollments')
            .select('id, patient_name, patient_phone')
            .or(filters.join(','));
        if (error) throw error;
        if (!enrollments || enrollments.length === 0) return empty;

        const ids = enrollments.map((e) => e.id);

        // Zestaw danych do wyczyszczenia: z konta ORAZ z samych zapisów (kartoteka
        // Prodentisa bywa zapisana inaczej niż konto w portalu).
        const names = [
            params.patientName,
            ...enrollments.map((e) => e.patient_name as string | null),
        ]
            .map((n) => (n ?? '').trim())
            .filter((n) => n.length >= 3 && n !== ANON_NAME);
        const phonePatterns = [
            params.patientPhone,
            ...enrollments.map((e) => e.patient_phone as string | null),
        ]
            .map((p) => (p ? phonePattern(p) : null))
            .filter((p): p is RegExp => p !== null);

        // Unieważnienie starego linku z SMS-a: bez tego każdy, kto ma dawną wiadomość,
        // dalej otwiera protokół, leki i kod recepty po „usunięciu konta". `access_token`
        // jest NOT NULL UNIQUE, więc zamiast kasować podstawiamy świeży, nikomu nieznany
        // (per wiersz — jedna wartość dla wszystkich złamałaby UNIQUE) i od razu wygaszamy.
        const revokedAt = new Date().toISOString();
        const anonymizedIds: string[] = [];
        // `access_token_expires_at` dokłada dopiero migracja 181. Gdyby kod wyprzedził
        // migrację, bezwarunkowy zapis tej kolumny wywracałby KAŻDY wiersz (42703 / PGRST204)
        // i „usunięcie konta" zostawiałoby nazwisko, telefon i ŻYWY link z SMS-a. Sama
        // rotacja tokenu i skasowanie danych osobowych są ważniejsze niż data wygaśnięcia,
        // więc po takim błędzie ponawiamy zapis bez tego pola.
        let expiryColumnMissing = false;
        for (const id of ids) {
            const personalData = { patient_name: ANON_NAME, patient_phone: null, patient_db_id: null };
            let updateError = (
                await supabase
                    .from('care_enrollments')
                    .update(
                        expiryColumnMissing
                            ? { ...personalData, access_token: crypto.randomUUID() }
                            : { ...personalData, access_token: crypto.randomUUID(), access_token_expires_at: revokedAt }
                    )
                    .eq('id', id)
            ).error;

            if (updateError && !expiryColumnMissing && isMissingColumnError(updateError, 'access_token_expires_at')) {
                expiryColumnMissing = true;
                console.error(
                    '[CareFlowLifecycle] 🚨 Brak kolumny access_token_expires_at — migracja 181 NIE jest wgrana. ' +
                        'Anonimizuję bez daty wygaśnięcia (token i tak rotuję, stary link z SMS-a przestaje działać).'
                );
                updateError = (
                    await supabase
                        .from('care_enrollments')
                        .update({ ...personalData, access_token: crypto.randomUUID() })
                        .eq('id', id)
                ).error;
            }

            if (updateError) {
                // Jeden nieudany wiersz nie może zostawić pozostałych z nazwiskiem i żywym linkiem.
                console.error('[CareFlowLifecycle] Anonimizacja zapisu nie powiodła się:', updateError);
                continue;
            }
            anonymizedIds.push(id);
        }

        // Audyt: telefon i nazwisko siedzą w `details` (np. sms_fallback_sent, enrolled).
        let auditEntries = 0;
        const { data: auditRows, error: auditReadError } = await supabase
            .from('care_audit_log')
            .select('id, details')
            .in('enrollment_id', ids);
        if (auditReadError) throw auditReadError;

        for (const row of auditRows ?? []) {
            const scrubbed = scrubDetails(row.details, names, phonePatterns);
            if (JSON.stringify(scrubbed) === JSON.stringify(row.details)) continue;
            const { error: auditUpdateError } = await supabase
                .from('care_audit_log')
                .update({ details: scrubbed })
                .eq('id', row.id);
            if (auditUpdateError) {
                console.error('[CareFlowLifecycle] Audit scrub failed:', auditUpdateError);
                continue;
            }
            auditEntries++;
        }

        // Ślad samej anonimizacji (bez PII) — inaczej nie widać, czemu zapis stracił dane.
        if (anonymizedIds.length > 0) {
            const { error: trailError } = await supabase.from('care_audit_log').insert(
                anonymizedIds.map((id) => ({
                    enrollment_id: id,
                    action: 'anonymized_by_account_delete',
                    actor: 'patient',
                    details: {
                        reason: 'account_deleted',
                        audit_entries_scrubbed: auditEntries,
                        access_token_rotated: true,
                        // Bez migracji 181 daty wygaśnięcia NIE ma gdzie zapisać — nie udajemy,
                        // że jest; link i tak jest martwy, bo token został wymieniony.
                        access_token_revoked_at: expiryColumnMissing ? null : revokedAt,
                        ...(expiryColumnMissing ? { access_token_expiry_not_persisted: true } : {}),
                    },
                }))
            );
            if (trailError) console.error('[CareFlowLifecycle] Audit insert failed (anonymize):', trailError);
        }

        console.log(`[CareFlowLifecycle] Zanonimizowano ${anonymizedIds.length}/${ids.length} zapis(ów) CareFlow i ${auditEntries} wpis(ów) audytu`);
        return { enrollments: anonymizedIds.length, auditEntries };
    } catch (err) {
        console.error('[CareFlowLifecycle] anonymizeCareflowForPatient error:', err);
        return empty;
    }
}
