import { isDemoMode } from '@/lib/demoMode';
import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { pushToPatientAll } from '@/lib/pushService';
import { recordPushPath } from '@/lib/pushHealth';
import { sendSMS, toGSM7 } from '@/lib/smsService';

export const dynamic = 'force-dynamic';
/**
 * 30 s było policzone dla przebiegu bez ruchu. Jedna iteracja wysyłkowa to ~5 round-tripów
 * do bazy i do bramek push (~0,4-0,8 s), więc już kilkadziesiąt wysyłek przekraczało budżet
 * i platforma UBIJAŁA funkcję w połowie pętli. Dwa skutki: auto-domykanie zapisów (koniec
 * handlera) nie wykonywało się nigdy przy przeciążonym przebiegu, a przerwanie między
 * wysyłką a zapisem licznika zostawiało bazę bez wiedzy o wysłanym pushu.
 * 120 s = wartość używana w tym repo przez pozostałe crony wysyłkowe (sms-auto-send,
 * post-visit-sms, appointment-reminders) i mieszcząca się w limicie planu (repo używa
 * już 300 s w video-process). Cron chodzi co 5 min, więc kolejny przebieg startuje
 * dopiero po 300 s — przebiegi się nie nakładają.
 */
export const maxDuration = 120;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mikrostomart.pl';

/**
 * Klient serwisowy przekazywany do funkcji pomocniczych — wzorzec z `src/lib/timeTracking/*`.
 * UWAGA: musi to być gołe `SupabaseClient`, a NIE `ReturnType<typeof createClient>` —
 * to drugie degeneruje typ schematu i każdy payload `.update()/.insert()` rozjeżdża się
 * do `never`.
 */
type SupabaseLike = SupabaseClient;

/** Odpowiedź niesie dane pacjenta — nigdy z cache. */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

/** Ile zadań bierzemy na jeden przebieg (mieści się w `maxDuration`). */
const TASK_LIMIT = 200;
/**
 * Twardy budżet pętli wysyłki. Po jego przekroczeniu przerywamy wysyłkę i oddajemy resztę
 * czasu housekeepingowi: auto-domykanie zapisów MUSI wykonać się w KAŻDYM przebiegu,
 * inaczej zbiór aktywnych zapisów rośnie w nieskończoność i sufit skanu staje się
 * nieosiągalny (pętla dodatnia). Zadania, które nie zdążyły, wychodzą za 5 minut —
 * zostają w oknie GRACE_HOURS.
 */
const SEND_BUDGET_MS = 85_000;
/**
 * Dolna granica okna wysyłki (godziny). Zadanie starsze niż tyle nie jest już
 * przypomnieniem, tylko zaległością — i, co groźniejsze, w nieskończoność zajmowało
 * miejsce w oknie `TASK_LIMIT`. Pacjent, który nie odhaczy kroku, zostawia zadanie
 * otwarte NA ZAWSZE: po ~65 takich zapisów całe 200 wierszy (sortowanych rosnąco po
 * `scheduled_at`) zajmowały martwe zadania sprzed miesięcy, a dzisiejsza dawka
 * antybiotyku nie mieściła się w oknie i nie wychodziła NIGDY — przy `success: true`
 * i `pushSent: 0`. Dolna granica + `expireStaleTasks` domykają ten łańcuch.
 */
const GRACE_HOURS = 12;
/** Ile zaległych zadań domykamy w jednym przebiegu (housekeeping nie może zjeść budżetu 30 s). */
const EXPIRE_LIMIT = 500;
/** Ile aktywnych zapisów sprawdzamy pod kątem auto-domknięcia. */
const ENROLLMENT_LIMIT = 500;
/** Paczka id w zapytaniach .in() — długie listy uuid rozdymają URL zapytania. */
const ID_CHUNK = 60;
/** Strona przy skanie zadań (limit wierszy PostgREST). */
const TASK_PAGE = 1000;
/** Bezpiecznik stronicowania skanu zadań — po przekroczeniu nie domykamy nic. */
const TASK_MAX_PAGES = 12;
/** Odstęp przypomnień, gdy zadanie nie ma własnego (domyślna kadencja: 45 min). */
const DEFAULT_PUSH_INTERVAL_MINUTES = 45;

/**
 * Treść pusha jest NEUTRALNA (RODO art. 9): na ekranie blokady — i w
 * push_notifications_log — nie może wylądować nazwa leku, dawka ani tytuł zadania.
 * Payload niesie wyłącznie identyfikatory; treść zadania apka dociąga z API po
 * odblokowaniu.
 */
const PUSH_TITLE = 'Mikrostomart';
const PUSH_BODY = 'Masz przypomnienie w planie opieki. Otwórz aplikację.';
/**
 * Cel kliknięcia w push. Bezterminowy `access_token` NIE może tu trafić: pushService
 * loguje `url` do push_notifications_log, który personel czyta bez filtra po pacjencie.
 * Ta sama ścieżka co w cronie przypomnień o wizycie. Pełny link z tokenem zostaje
 * wyłącznie w SMS-ie (jedyny kanał pacjenta bez apki).
 */
const PUSH_LANDING_PATH = '/strefa-pacjenta/dashboard';

/**
 * Okno ciszy dla WYSYŁKI przypomnień (godziny warszawskie): milczymy od północy do 07:00.
 *
 * 🔑 TO NIE JEST TO SAMO CO `smartSnap` W PLANIŚCIE, mimo podobnej nazwy i podobnych liczb:
 *  · `smartSnap` (careflowSchedule.ts, domyślnie 22–07) przesuwa TERMIN kroku, żeby nie
 *    wypadł w nocy. Dotyczy wyłącznie kroków z `smart_snap = true`; kroki lekowe mają
 *    `false`, bo ich termin jest kliniczny i nie wolno go ruszać.
 *  · Ten strażnik decyduje, KIEDY WOLNO WYSŁAĆ powiadomienie o kroku, którego termin
 *    już ustalono.
 *
 * ⚠️ Było zaszyte `>= 22`, przez co **dawka o 23:00 nigdy nie dostałaby przypomnienia** —
 * a w siatce dawkowania 07/15/23 to dawka nasycająca dla każdego zabiegu między 08:00
 * a 14:00. Zadanie by istniało, pacjent nie zobaczyłby nic. Pacjent bierze tę dawkę
 * świadomie przed snem, więc powiadomienie o 23:00 jest zamierzone; śpimy dopiero po północy.
 */
const PUSH_QUIET_START = 24; // 24 = nie wyciszamy wieczorem wcale (warunek `hour >= 24` nigdy nie zachodzi)
const PUSH_QUIET_END = 7;

interface EnrollmentRef {
    id: string;
    /** PRODENTIS ID — tym samym kluczem są kluczowane patient_push_tokens. */
    patient_id: string;
    /** patients.id — tym kluczem są kluczowane fcm_tokens. */
    patient_db_id: string | null;
    patient_phone: string | null;
    status: string;
    access_token: string;
}

interface PendingTask {
    id: string;
    title: string | null;
    push_sent_count: number | null;
    push_last_sent_at: string | null;
    push_max_count: number | null;
    push_interval_minutes: number | null;
    sms_sent: boolean | null;
    enrollment_id: string;
    /**
     * WYŁĄCZNIE do bramki „krok cichy" (patrz pętla wysyłki). Treść kliniczna:
     * nie trafia do pusha, do SMS-a ani do żadnego logu.
     */
    medication_name: string | null;
    push_message: string | null;
    care_enrollments: EnrollmentRef | null;
}

/** Zaległe zadanie do domknięcia (`expireStaleTasks`). */
interface StaleTaskRef {
    id: string;
    enrollment_id: string;
}

/** Stan zadania przy skanie auto-domykania (`autoCompleteEnrollments`). */
interface TaskStateRow {
    enrollment_id: string;
    completed_at: string | null;
    skipped_at: string | null;
}

/**
 * Wiersz kartoteki potrzebny do odczytu wyciszeń (`loadCareflowMutes`).
 * `notification_preferences` to kolumna JSON — brak klucza znaczy „przypomnienia włączone".
 */
interface PatientPrefRow {
    id?: string | null;
    prodentis_id?: string | number | null;
    notification_preferences?: { careflow_reminders?: boolean } | null;
}

/**
 * CareFlow Push + SMS Fallback Cron
 * Runs every 5 minutes (5-22 UTC) via Vercel Cron.
 *
 * Logic:
 * 1. Find tasks in OKNIE `now - GRACE_HOURS .. now`, not completed/skipped (status 'active'
 *    — 'proposed' to propozycja bez zadań, jeszcze niezaakceptowana przez lekarza).
 *    Dolna granica jest krytyczna: bez niej martwe zadania sprzed miesięcy zatykały
 *    okno `TASK_LIMIT` i dzisiejsze przypomnienia nie wychodziły w ogóle.
 * 2. Pomiń pacjentów, którzy wyciszyli CareFlow (bez przełączania ich na SMS)
 * 3. push_max_count = 0 → krok CICHY, ale TYLKO gdy nie niesie leku ani treści
 *    przypomnienia; limit wyczerpany → koniec przypomnień, też bez SMS-a.
 *    Poza tym: odstęp od ostatniego pusha.
 * 4. Push na OBA żywe kanały (apka mobilna Expo + web-push FCM)
 * 5. SMS to fallback KANAŁU, nie wyczerpanego limitu: idzie wyłącznie gdy pacjent nie ma
 *    ŻADNEGO żywego tokenu push albo gdy wysyłka nie dotarła nigdzie (raz na zadanie)
 * 6. Domknij zaległości, które wypadły poniżej okna (`skipped_at`, audyt 'task_expired')
 * 7. Auto-complete enrollments when all tasks done
 */
export async function GET(req: Request) {
    if (isDemoMode) {
        return NextResponse.json({ skipped: 'demo mode' }, { headers: NO_STORE });
    }

    console.log('🏥 [CareFlow Push] Starting cron...');

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return new NextResponse('Unauthorized', { status: 401, headers: NO_STORE });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let pushSent = 0;
    let smsSent = 0;
    let skipped = 0;
    let muted = 0;
    let autoCompleted = 0;
    /** Zadania domknięte jako zaległe (wypadły poniżej okna wysyłki). */
    let expired = 0;
    /** Ile razy reguła „krok z lekiem nie milczy" wymusiła jedno przypomnienie. */
    let silentOverrides = 0;
    /** Ile zadań realnie weszło do przebiegu (== TASK_LIMIT znaczy: okno urwane). */
    let tasksFetched = 0;
    /** Okno wysyłki urwane limitem TASK_LIMIT — część wymagalnych zadań nie weszła do przebiegu. */
    let windowTruncated = false;
    /** Pętla wysyłki przerwana budżetem czasu; ile zadań przeszło na kolejny przebieg. */
    let budgetExceeded = false;
    let deferred = 0;
    /** Skan zadań przy auto-domykaniu uderzył w sufit stron — nic nie domknięto. */
    let autoCompleteScanTruncated = false;
    /** Lista aktywnych zapisów urwana limitem — część zapisów nie była sprawdzana. */
    let autoCompleteEnrollmentsTruncated = false;

    const startedAt = Date.now();

    try {
        const now = new Date();
        // Use Warsaw timezone for quiet hours check (not UTC server time)
        const warsawHourStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Warsaw', hour12: false, hour: 'numeric' }).format(now);
        const currentHourWarsaw = parseInt(warsawHourStr);

        // Quiet hours guard — patrz PUSH_QUIET_START / PUSH_QUIET_END.
        if (currentHourWarsaw >= PUSH_QUIET_START || currentHourWarsaw < PUSH_QUIET_END) {
            console.log(`🏥 [CareFlow Push] Quiet hours (Warsaw: ${currentHourWarsaw}:00) — skipping all`);
            return NextResponse.json({ success: true, skipped: 'quiet_hours' }, { headers: NO_STORE });
        }

        // Okno wysyłki: [now - GRACE_HOURS, now]. Górna granica = „już wypadło",
        // dolna = „to już nie jest przypomnienie" (i nie ma prawa blokować okna).
        const windowStart = new Date(now.getTime() - GRACE_HOURS * 60 * 60 * 1000);

        // ─── Domknięcie zaległości PRZED wysyłką ───
        // Kolejność jest celowa: to jedyny kod, który leczy zapchany system, więc nie
        // może stać za pętlą wysyłki — przy przepełnionym przebiegu (maxDuration 30 s)
        // nigdy by się nie wykonał i backlog zostałby na zawsze. Sweep jest ograniczony
        // (EXPIRE_LIMIT), a przypomnienie, które przez niego nie zmieści się w tym
        // przebiegu, wyjdzie za 5 minut — zadanie zostaje w oknie GRACE_HOURS.
        try {
            expired = await expireStaleTasks(supabase, now, windowStart);
        } catch (expErr) {
            console.error('🏥 [CareFlow Push] Expire stale tasks error:', expErr);
        }

        // Find pending tasks in oknie, not completed, not skipped.
        // Wybieramy tylko kolumny potrzebne do wysyłki i do bramek — treść kliniczna
        // (title, medication_name, push_message) NIE wychodzi w pushu; title dodatkowo
        // idzie w SMS-a i do audytu, medication_name/push_message zostają w pamięci.
        const { data: pendingTasks, error } = await supabase
            .from('care_tasks')
            .select(`
                id, title,
                push_sent_count, push_last_sent_at, push_max_count, push_interval_minutes,
                sms_sent, enrollment_id, medication_name, push_message,
                care_enrollments!inner(id, patient_id, patient_db_id, patient_phone, status, access_token)
            `)
            .is('completed_at', null)
            .is('skipped_at', null)
            .gte('scheduled_at', windowStart.toISOString())
            .lte('scheduled_at', now.toISOString())
            // 'active' celowo wyklucza 'proposed' (propozycja auto-kwalifikacji — zero zadań)
            .eq('care_enrollments.status', 'active')
            // MALEJĄCO, i to jest decyzja kliniczna, nie kosmetyczna. Sortowanie rosnące
            // brało 200 NAJSTARSZYCH zadań okna: przy ~300 żywych zapisach w oknie 12 h mieści
            // się ~500 zadań, więc cały limit zjadały pozycje z wyczerpanym już limitem
            // przypomnień, a dawka wymagalna TERAZ nie wchodziła do przebiegu NIGDY —
            // przy `success: true` i zerowym sygnale. Malejąco: najświeższe wymagalne dawki
            // są obsłużone zawsze, a zaległości z dołu okna domyka `expireStaleTasks`
            // (jawnie, z wpisem audytowym), zamiast po cichu blokować dzisiejsze leki.
            .order('scheduled_at', { ascending: false })
            .limit(TASK_LIMIT);

        if (error) {
            console.error('🏥 [CareFlow Push] Query error:', error);
            throw new Error('care_tasks query failed');
        }

        const tasks = (pendingTasks ?? []) as unknown as PendingTask[];
        tasksFetched = tasks.length;
        console.log(`🏥 [CareFlow Push] Found ${tasks.length} pending tasks`);

        // Okno urwane limitem = część wymagalnych przypomnień NIE weszła do tego przebiegu.
        // Bez tego sygnału awaria była całkowicie niewidoczna (cron raportował sukces).
        windowTruncated = tasks.length >= TASK_LIMIT;
        if (windowTruncated) {
            console.error(
                `🏥 [CareFlow Push] ❌ WINDOW TRUNCATED: pobrano ${tasks.length} zadań = TASK_LIMIT (${TASK_LIMIT}). ` +
                `Część zadań wymagalnych w oknie ${GRACE_HOURS} h NIE weszła do tego przebiegu. ` +
                `Wymaga reakcji: podnieś TASK_LIMIT lub skróć GRACE_HOURS.`
            );
        }

        // Zbiorczo, poza pętlą: kto ma żywy token i kto wyciszył CareFlow (zamiast N+1)
        const prodentisIds = uniq(tasks.map(t => t.care_enrollments?.patient_id));
        const patientDbIds = uniq(tasks.map(t => t.care_enrollments?.patient_db_id));

        const [expoOwners, fcmOwners, mutedPatients] = await Promise.all([
            loadExpoTokenOwners(supabase, prodentisIds),
            loadFcmTokenOwners(supabase, patientDbIds),
            loadCareflowMutes(supabase, prodentisIds, patientDbIds),
        ]);

        let processed = 0;

        for (const task of tasks) {
            // TWARDY BUDŻET CZASU. Pętla jest sekwencyjna (~5 round-tripów na wysyłkę),
            // więc przeciążony przebieg potrafił przekroczyć `maxDuration` i zostać ubity
            // w środku — a wtedy auto-domykanie zapisów za pętlą nie wykonywało się nigdy.
            // Przerywamy sami, z zapasem, żeby housekeeping ZAWSZE zdążył.
            if (Date.now() - startedAt > SEND_BUDGET_MS) {
                budgetExceeded = true;
                deferred = tasks.length - processed;
                console.error(
                    `🏥 [CareFlow Push] ❌ SEND BUDGET EXCEEDED po ${Math.round((Date.now() - startedAt) / 1000)} s — ` +
                    `${deferred} zadań przełożonych na kolejny przebieg (za 5 min, wciąż w oknie ${GRACE_HOURS} h).`
                );
                break;
            }
            processed++;

            const enrollment = task.care_enrollments;
            if (!enrollment) { skipped++; continue; }

            // Fail-closed: nie wiemy, kto wyciszył CareFlow. Wysyłka „w ciemno" mogłaby
            // trafić pacjenta po opt-oucie, a gałąź SMS niesie tytuł zadania (treść kliniczną).
            if (mutedPatients.degraded) { skipped++; continue; }

            // Wyciszenie CareFlow ucisza WSZYSTKIE kanały. Opt-out z pusha nie może
            // przełączyć pacjenta na SMS-a — pomijamy całe zadanie.
            const isMuted = mutedPatients.byProdentisId.has(enrollment.patient_id)
                || (!!enrollment.patient_db_id && mutedPatients.byDbId.has(enrollment.patient_db_id));
            if (isMuted) {
                muted++;
                continue;
            }

            // Krok CICHY = krok, który nie ma pacjentowi NIC do przekazania o tej godzinie:
            // 0 przypomnień, żadnego leku i żadnej napisanej treści przypomnienia.
            // Zadanie z lekiem (medication_name) albo z gotowym push_message, a mimo to
            // z limitem 0, to sprzeczna konfiguracja protokołu — dostaje DOKŁADNIE JEDNO
            // przypomnienie, zamiast milczeć. Powód wprost z produkcji: seedowy krok
            // „-1 h: weź antybiotyk + lek przeciwbólowy, przyjedź na zabieg"
            // (110_careflow_system.sql:158) ma reminder_max_count = 0, więc pacjent nie
            // dostawał ŻADNEGO sygnału o dawce przedzabiegowej. Ten sam krok ma
            // medication_index = NULL (→ medication_name NULL), dlatego bramka oparta
            // wyłącznie o medication_name by go NIE objęła — stąd drugi sygnał.
            const carriesInstruction = !!task.medication_name?.trim() || !!task.push_message?.trim();
            const effectiveMaxCount = task.push_max_count === 0 && carriesInstruction ? 1 : task.push_max_count;

            if (effectiveMaxCount === 0) { skipped++; continue; }

            // Limit przypomnień wyczerpany. SMS jest fallbackiem KANAŁU, nie limitu,
            // więc tu również milczymy.
            if (effectiveMaxCount != null && (task.push_sent_count ?? 0) >= effectiveMaxCount) {
                skipped++;
                continue;
            }

            // Osobna metryka: widać w odpowiedzi crona, że reguła realnie się uruchamia
            // (a nie że „jakoś działa"). Bez identyfikatora leku — to sam licznik.
            if (effectiveMaxCount !== task.push_max_count) silentOverrides++;

            // Odstęp od ostatniego pusha (brak własnego → domyślna kadencja)
            if (task.push_last_sent_at) {
                const intervalMinutes = task.push_interval_minutes ?? DEFAULT_PUSH_INTERVAL_MINUTES;
                const nextAllowed = new Date(new Date(task.push_last_sent_at).getTime() + intervalMinutes * 60 * 1000);
                if (now < nextAllowed) continue;
            }

            // Dwa ŻYWE źródła tokenów: apka mobilna (Expo, klucz = prodentisId)
            // i web-push (FCM, klucz = patients.id). Dawna bramka pytała martwą
            // tabelę push_subscriptions → push nigdy nie wychodził.
            const hasExpo = expoOwners.owners.has(enrollment.patient_id);
            const hasFcm = !!enrollment.patient_db_id && fcmOwners.owners.has(enrollment.patient_db_id);

            // SMS wyłącznie gdy pacjent nie ma żadnego żywego kanału push albo gdy
            // wysyłka nie dotarła nigdzie (martwe tokeny).
            let needsSms = false;

            if (!hasExpo && !hasFcm) {
                // „Nie wiem" ≠ „brak kanału": przy błędzie odczytu tokenów pauzujemy
                // zadanie o jeden przebieg, zamiast eskalować do SMS-a wbrew wyborowi pacjenta.
                if (expoOwners.degraded || fcmOwners.degraded) { skipped++; continue; }
                needsSms = true;
            } else {
                // patient_db_id trafia w oba kanały (FCM po user_id, Expo po prodentisId
                // rozwiązanym z tabeli patients); prodentisId zostaje dla pacjenta bez konta web.
                const pushTargetId = enrollment.patient_db_id ?? enrollment.patient_id;

                // ZAKLEPANIE PRZED WYSYŁKĄ — kolejność odwrócona celowo.
                // Wcześniej najpierw szedł push, a licznik zapisywał się po nim: ubicie funkcji
                // (albo błąd zapisu) między jednym a drugim oznaczało, że pacjent DOSTAŁ
                // powiadomienie, a baza o tym nie wiedziała — bramka odstępu przepuszczała i za
                // 5 minut leciało to samo przypomnienie o dawce leku, w kółko. Przy lekach
                // „wysłane dwa razy" jest gorsze niż „wysłane raz mniej", więc najpierw zapis.
                if (!(await claimTaskForSend(supabase, task, now))) { skipped++; continue; }

                const result = await pushToPatientAll(pushTargetId, {
                    title: PUSH_TITLE,
                    body: PUSH_BODY,
                    // Ścieżka BEZ sekretu — access_token trafiłby przez logPush do
                    // push_notifications_log, czytanego przez cały personel.
                    url: PUSH_LANDING_PATH,
                    // Wyłącznie identyfikatory — apka routuje po type/enrollmentId
                    // i sama dociąga treść zadania po odblokowaniu.
                    data: {
                        type: 'careflow',
                        enrollmentId: enrollment.id,
                        taskId: task.id,
                    },
                });

                void recordPushPath('careflow_task', { sent: result.sent, failed: result.failed });

                if (result.sent > 0) {
                    pushSent++;
                    const nextCount = (task.push_sent_count ?? 0) + 1;
                    console.log(`   ✅ Push sent (task ${task.id}): fcm=${result.fcm.sent} expo=${result.expo.sent}`);

                    const { error: trackErr } = await supabase
                        .from('care_tasks')
                        .update({
                            push_sent_count: nextCount,
                            push_last_sent_at: now.toISOString(),
                        })
                        .eq('id', task.id);

                    if (trackErr) {
                        console.error(`   ❌ Push tracking update failed (task ${task.id}):`, trackErr.message);
                    }

                    const { error: auditErr } = await supabase.from('care_audit_log').insert({
                        enrollment_id: task.enrollment_id,
                        task_id: task.id,
                        action: 'push_sent',
                        actor: 'system',
                        details: { push_count: nextCount, title: task.title, fcm: result.fcm.sent, expo: result.expo.sent },
                    });

                    if (auditErr) {
                        console.error(`   ❌ Audit insert failed (task ${task.id}):`, auditErr.message);
                    }
                } else {
                    needsSms = true;
                }
            }

            if (needsSms) {
                // SMS-fallback: jedyny kanał dla pacjenta bez apki, raz na zadanie.
                if (!task.sms_sent && enrollment.patient_phone) {
                    const ok = await sendSmsFallback(supabase, task, enrollment, now);
                    if (ok) smsSent++; else skipped++;
                } else {
                    skipped++;
                }
            }
        }

        // ─── Auto-complete enrollments where all tasks are done ───
        // (po sweepie z początku przebiegu: dopiero domknięte zaległości pozwalają
        // zapisowi w ogóle się zamknąć — wymaga ZERA otwartych zadań)
        try {
            const acResult = await autoCompleteEnrollments(supabase, now);
            autoCompleted = acResult.completed;
            autoCompleteScanTruncated = acResult.scanTruncated;
            autoCompleteEnrollmentsTruncated = acResult.enrollmentsTruncated;
        } catch (acErr) {
            console.error('🏥 [CareFlow Push] Auto-complete error:', acErr);
        }

        console.log(`🏥 [CareFlow Push] Done: push=${pushSent}, sms=${smsSent}, skipped=${skipped}, muted=${muted}, expired=${expired}, silent-overrides=${silentOverrides}, auto-completed=${autoCompleted}`);
        return NextResponse.json(
            {
                success: true,
                pushSent, smsSent, skipped, muted, expired, silentOverrides, autoCompleted,
                // ── Sygnały „przebieg NIE objął wszystkiego" ──────────────────────────
                // Bez nich każdy z tych przypadków wyglądał w monitoringu jak zdrowy
                // przebieg (`success: true`), choć część wymagalnych dawek nie wyszła.
                // Monitoring ma alarmować na `windowTruncated`/`budgetExceeded`.
                tasksFetched,
                taskLimit: TASK_LIMIT,
                windowTruncated,
                budgetExceeded,
                deferred,
                autoCompleteScanTruncated,
                autoCompleteEnrollmentsTruncated,
            },
            { headers: NO_STORE }
        );
    } catch (err) {
        console.error('🏥 [CareFlow Push] Error:', err);
        return NextResponse.json(
            { success: false, error: 'CareFlow push cron failed' },
            { status: 500, headers: NO_STORE }
        );
    }
}

/** Unikalne, niepuste id z listy. */
function uniq(values: (string | null | undefined)[]): string[] {
    return [...new Set(values.filter((v): v is string => !!v))];
}

/** Dzieli listę id na paczki — długa lista uuid w .in() rozdęłaby URL zapytania. */
function chunkIds(ids: string[], size: number): string[][] {
    const out: string[][] = [];
    for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
    return out;
}

/**
 * Pacjenci z żywym tokenem aplikacji mobilnej.
 * patient_push_tokens.patient_id = prodentisId, czyli dokładnie care_enrollments.patient_id
 * (żaden dodatkowy lookup nie jest potrzebny).
 * `degraded` = zapytanie padło, więc pusty zbiór NIE znaczy „nikt nie ma tokenu".
 */
async function loadExpoTokenOwners(
    supabase: SupabaseLike,
    prodentisIds: string[]
): Promise<{ owners: Set<string>; degraded: boolean }> {
    const owners = new Set<string>();
    let degraded = false;
    for (const part of chunkIds(prodentisIds, ID_CHUNK)) {
        const { data, error } = await supabase
            .from('patient_push_tokens')
            .select('patient_id')
            .in('patient_id', part);

        if (error) {
            console.error('🏥 [CareFlow Push] patient_push_tokens query error:', error.message);
            degraded = true;
            continue;
        }
        for (const row of data ?? []) owners.add(String(row.patient_id));
    }
    return { owners, degraded };
}

/** Pacjenci z żywym tokenem web-push (fcm_tokens.user_id = patients.id). */
async function loadFcmTokenOwners(
    supabase: SupabaseLike,
    patientDbIds: string[]
): Promise<{ owners: Set<string>; degraded: boolean }> {
    const owners = new Set<string>();
    let degraded = false;
    for (const part of chunkIds(patientDbIds, ID_CHUNK)) {
        const { data, error } = await supabase
            .from('fcm_tokens')
            .select('user_id')
            .eq('user_type', 'patient')
            .in('user_id', part);

        if (error) {
            console.error('🏥 [CareFlow Push] fcm_tokens query error:', error.message);
            degraded = true;
            continue;
        }
        for (const row of data ?? []) owners.add(String(row.user_id));
    }
    return { owners, degraded };
}

/**
 * Zaklepuje zadanie PRZED wysyłką: warunkowy zapis znacznika ostatniej próby.
 * Warunek na POPRZEDNIEJ wartości działa jak porównaj-i-zamień — dwa równoległe
 * przebiegi crona nie wyślą tego samego przypomnienia dwa razy (drugi nie
 * zaktualizuje żadnego wiersza i dostanie false).
 * Zwraca false także przy błędzie zapisu: wtedy pomijamy zadanie w tym cyklu, bo
 * przy lekach „wysłane raz mniej" jest bezpieczniejsze niż „wysłane dwa razy".
 */
async function claimTaskForSend(
    supabase: SupabaseLike,
    task: { id: string; push_last_sent_at: string | null },
    now: Date
): Promise<boolean> {
    const base = supabase
        .from('care_tasks')
        .update({ push_last_sent_at: now.toISOString() })
        .eq('id', task.id);

    const guarded = task.push_last_sent_at
        ? base.eq('push_last_sent_at', task.push_last_sent_at)
        : base.is('push_last_sent_at', null);

    const { data, error } = await guarded.select('id');

    if (error) {
        console.error(`   ❌ Claim failed (task ${task.id}):`, error.message);
        return false;
    }
    return (data?.length ?? 0) > 0;
}

/**
 * Pacjenci, którzy wyciszyli przypomnienia CareFlow
 * (patients.notification_preferences.careflow_reminders === false).
 * Brak klucza = przypomnienia WŁĄCZONE. Zwracamy dwa zbiory, bo zapis wskazuje
 * pacjenta prodentisId, a nie zawsze ma wypełnione patient_db_id.
 * `degraded` = zapytanie padło; wołający musi wtedy milczeć (fail-closed), bo pusty
 * zbiór wyglądałby jak „nikt nie wyciszył".
 */
async function loadCareflowMutes(
    supabase: SupabaseLike,
    prodentisIds: string[],
    patientDbIds: string[]
): Promise<{ byProdentisId: Set<string>; byDbId: Set<string>; degraded: boolean }> {
    const byProdentisId = new Set<string>();
    const byDbId = new Set<string>();
    let degraded = false;

    const collect = (rows: PatientPrefRow[]) => {
        for (const row of rows) {
            if (row?.notification_preferences?.careflow_reminders === false) {
                if (row.prodentis_id) byProdentisId.add(String(row.prodentis_id));
                if (row.id) byDbId.add(String(row.id));
            }
        }
    };

    for (const part of chunkIds(prodentisIds, ID_CHUNK)) {
        const { data, error } = await supabase
            .from('patients')
            .select('id, prodentis_id, notification_preferences')
            .in('prodentis_id', part);

        if (error) {
            console.error('🏥 [CareFlow Push] patients prefs query error (prodentis_id):', error.message);
            degraded = true;
            continue;
        }
        collect(data ?? []);
    }

    for (const part of chunkIds(patientDbIds, ID_CHUNK)) {
        const { data, error } = await supabase
            .from('patients')
            .select('id, prodentis_id, notification_preferences')
            .in('id', part);

        if (error) {
            console.error('🏥 [CareFlow Push] patients prefs query error (id):', error.message);
            degraded = true;
            continue;
        }
        collect(data ?? []);
    }

    return { byProdentisId, byDbId, degraded };
}

/**
 * Domyka zadania, które wypadły poniżej okna wysyłki (`scheduled_at < now - GRACE_HOURS`)
 * i wciąż są otwarte — pacjent ich nie odhaczył, a nic w systemie ich nie zamykało.
 *
 * Bez tego kroku zadanie zostawało otwarte NA ZAWSZE: blokowało auto-domknięcie zapisu
 * (wymaga zera otwartych zadań), zapis zostawał 'active', a jego martwe zadania wracały
 * do zapytania przy każdym przebiegu, aż zajęły całe okno `TASK_LIMIT`.
 *
 * Domknięcie to `skipped_at`, NIE `completed_at`: krok nie został wykonany i raport
 * zgodności ma to pokazać. Każde domknięcie ma wpis w `care_audit_log` ('task_expired')
 * — bez treści klinicznej, sam powód i granica okna.
 */
async function expireStaleTasks(supabase: SupabaseLike, now: Date, windowStart: Date): Promise<number> {
    // Najpierw odczyt id + enrollment_id: PostgREST nie da limitu na samym UPDATE,
    // a enrollment_id jest i tak potrzebny do wpisu audytowego.
    const { data: staleRows, error: staleErr } = await supabase
        .from('care_tasks')
        .select('id, enrollment_id, care_enrollments!inner(status)')
        .is('completed_at', null)
        .is('skipped_at', null)
        .lt('scheduled_at', windowStart.toISOString())
        // tylko zapisy żywe — anulowanych/ukończonych nie ruszamy
        .eq('care_enrollments.status', 'active')
        .order('scheduled_at', { ascending: true })
        .limit(EXPIRE_LIMIT);

    if (staleErr) {
        console.error('🏥 [CareFlow Push] Expire: query error:', staleErr.message);
        return 0;
    }

    const stale = (staleRows ?? []) as StaleTaskRef[];
    if (stale.length === 0) return 0;

    let expired = 0;
    for (const batch of chunkIds(stale.map(r => r.id), ID_CHUNK)) {
        const { data: updated, error: updateErr } = await supabase
            .from('care_tasks')
            .update({ skipped_at: now.toISOString() })
            .in('id', batch)
            // Pacjent mógł odhaczyć krok między odczytem a zapisem — nie nadpisujemy
            // ani potwierdzenia, ani wcześniejszego pominięcia.
            .is('completed_at', null)
            .is('skipped_at', null)
            .select('id, enrollment_id');

        if (updateErr) {
            console.error('🏥 [CareFlow Push] Expire: update error:', updateErr.message);
            continue;
        }

        const closed = (updated ?? []) as StaleTaskRef[];
        if (closed.length === 0) continue;

        const { error: auditErr } = await supabase.from('care_audit_log').insert(
            closed.map(row => ({
                enrollment_id: row.enrollment_id,
                task_id: row.id,
                action: 'task_expired',
                actor: 'system',
                details: {
                    reason: `Termin minął ponad ${GRACE_HOURS} h temu — przypomnienie straciło sens, krok zamknięty jako niewykonany`,
                    grace_hours: GRACE_HOURS,
                    window_start: windowStart.toISOString(),
                },
            }))
        );

        if (auditErr) {
            console.error('🏥 [CareFlow Push] Expire: audit insert error:', auditErr.message);
        }

        expired += closed.length;
    }

    if (expired > 0) console.log(`   🧹 Expired stale tasks: ${expired}`);
    return expired;
}

/**
 * Domyka zapisy, w których wszystkie zadania są wykonane lub pominięte.
 * Zbiorczo (dawniej N+1: osobne zapytanie na każdy aktywny zapis) — jeden
 * stronicowany skan zadań aktywnych zapisów daje oba potrzebne zbiory:
 * „ma jakiekolwiek zadanie" i „ma zadanie otwarte".
 *
 * Zwraca też oba sygnały urwania (limit listy zapisów, sufit stron skanu). Bez nich
 * „0 domkniętych" znaczyło jednocześnie „nie było czego domykać" i „zabrakło danych,
 * więc na wszelki wypadek nic nie ruszyłem" — nie do odróżnienia w monitoringu.
 */
async function autoCompleteEnrollments(
    supabase: SupabaseLike,
    now: Date
): Promise<{ completed: number; scanTruncated: boolean; enrollmentsTruncated: boolean }> {
    const { data: activeRows, error: activeErr } = await supabase
        .from('care_enrollments')
        .select('id')
        .eq('status', 'active')
        .order('enrolled_at', { ascending: true })
        .limit(ENROLLMENT_LIMIT);

    if (activeErr) {
        console.error('🏥 [CareFlow Push] Auto-complete: enrollments query error:', activeErr.message);
        return { completed: 0, scanTruncated: false, enrollmentsTruncated: false };
    }

    const activeIds: string[] = ((activeRows ?? []) as { id: string }[]).map((r) => r.id);
    const enrollmentsTruncated = activeIds.length >= ENROLLMENT_LIMIT;
    if (enrollmentsTruncated) {
        console.error(
            `🏥 [CareFlow Push] ❌ ENROLLMENT LIST TRUNCATED: ${activeIds.length} = ENROLLMENT_LIMIT (${ENROLLMENT_LIMIT}). ` +
            `Część aktywnych zapisów nie była w tym przebiegu sprawdzana pod kątem domknięcia.`
        );
    }
    if (activeIds.length === 0) return { completed: 0, scanTruncated: false, enrollmentsTruncated };

    const withAnyTask = new Set<string>();
    const withOpenTask = new Set<string>();

    for (let page = 0; page < TASK_MAX_PAGES; page++) {
        const from = page * TASK_PAGE;
        const { data: rows, error: tasksErr } = await supabase
            .from('care_tasks')
            .select('enrollment_id, completed_at, skipped_at, care_enrollments!inner(status)')
            .eq('care_enrollments.status', 'active')
            .order('id', { ascending: true })
            .range(from, from + TASK_PAGE - 1);

        if (tasksErr) {
            console.error('🏥 [CareFlow Push] Auto-complete: tasks query error:', tasksErr.message);
            return { completed: 0, scanTruncated: false, enrollmentsTruncated };
        }

        for (const row of (rows ?? []) as TaskStateRow[]) {
            withAnyTask.add(row.enrollment_id);
            if (!row.completed_at && !row.skipped_at) withOpenTask.add(row.enrollment_id);
        }

        if (!rows || rows.length < TASK_PAGE) break;

        if (page === TASK_MAX_PAGES - 1) {
            // Niepełny obraz zadań → nie domykamy niczego w tym przebiegu
            console.error('🏥 [CareFlow Push] ❌ Auto-complete: task scan page limit hit — skipping');
            return { completed: 0, scanTruncated: true, enrollmentsTruncated };
        }
    }

    // GUARD: zapis BEZ ŻADNEGO zadania nie jest ukończony (osierocony / świeżo
    // zaakceptowana propozycja). Domknięcie dałoby raport zgodności 0% eksportowany
    // do kartoteki Prodentisa.
    const completable = activeIds.filter(id => withAnyTask.has(id) && !withOpenTask.has(id));
    if (completable.length === 0) return { completed: 0, scanTruncated: false, enrollmentsTruncated };

    let completed = 0;
    for (const batch of chunkIds(completable, ID_CHUNK)) {
        const { error: updateErr } = await supabase
            .from('care_enrollments')
            .update({ status: 'completed', completed_at: now.toISOString() })
            .in('id', batch)
            .eq('status', 'active');

        if (updateErr) {
            console.error('🏥 [CareFlow Push] Auto-complete: update error:', updateErr.message);
            continue;
        }

        const { error: auditErr } = await supabase.from('care_audit_log').insert(
            batch.map(id => ({
                enrollment_id: id,
                action: 'auto_completed',
                actor: 'system',
                details: { reason: 'All tasks completed or skipped' },
            }))
        );

        if (auditErr) {
            console.error('🏥 [CareFlow Push] Auto-complete: audit insert error:', auditErr.message);
        }

        completed += batch.length;
        console.log(`   ✅ Auto-completed enrollments: ${batch.join(', ')}`);
    }

    return { completed, scanTruncated: false, enrollmentsTruncated };
}

/**
 * Send SMS fallback for a CareFlow task.
 * Only sends ONCE per task (marks sms_sent=true).
 * Message: task title + link to patient landing page — SMS zostaje jedynym kanałem
 * dla pacjenta bez apki, więc jego treść pozostaje bez zmian.
 * Zwraca true, gdy operator przyjął wiadomość.
 */
async function sendSmsFallback(
    supabase: SupabaseLike,
    task: PendingTask,
    enrollment: EnrollmentRef,
    now: Date
): Promise<boolean> {
    const landingUrl = `${SITE_URL}/opieka/${enrollment.access_token}`;
    const phone = enrollment.patient_phone?.replace(/\s+/g, '').replace(/^\+/, '');

    if (!phone || !/^48\d{9}$/.test(phone)) {
        console.log(`   ⏭ SMS skip (task ${task.id}): invalid phone format`);
        return false;
    }

    // Build SMS message (GSM-7 safe, max 160 chars)
    const taskTitle = toGSM7(task.title || 'CareFlow');
    const rawMessage = `CareFlow: ${taskTitle}. Sprawdz: ${landingUrl}`;
    // toGSM7 truncates to 160 chars
    const smsMessage = toGSM7(rawMessage);

    try {
        const result = await sendSMS({ to: phone, message: smsMessage });

        if (!result.success) {
            console.error(`   ❌ SMS failed (task ${task.id}): ${result.error}`);
            return false;
        }

        console.log(`   📱 SMS sent (task ${task.id})`);

        // Mark task as SMS sent (so we don't resend)
        const { error: trackErr } = await supabase
            .from('care_tasks')
            .update({
                sms_sent: true,
                push_sent_count: (task.push_sent_count ?? 0) + 1,
                push_last_sent_at: now.toISOString(),
            })
            .eq('id', task.id);

        if (trackErr) {
            console.error(`   ❌ SMS tracking update failed (task ${task.id}):`, trackErr.message);
        }

        // Audit log
        const { error: auditErr } = await supabase.from('care_audit_log').insert({
            enrollment_id: task.enrollment_id,
            task_id: task.id,
            action: 'sms_fallback_sent',
            actor: 'system',
            details: {
                phone,
                title: task.title,
                message_id: result.messageId,
            },
        });

        if (auditErr) {
            console.error(`   ❌ SMS audit insert failed (task ${task.id}):`, auditErr.message);
        }

        return true;
    } catch (smsErr) {
        console.error(`   ❌ SMS error (task ${task.id}):`, smsErr);
        return false;
    }
}
