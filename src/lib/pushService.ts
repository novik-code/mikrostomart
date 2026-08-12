/**
 * Push Notification Service — Firebase Cloud Messaging (FCM)
 *
 * Replaces the old web-push VAPID system. All push notifications go through FCM.
 * This is the single source of truth for sending pushes.
 */
import { getMessaging } from './firebase';
import { createClient } from '@supabase/supabase-js';
import { getNeutralPushBody, getPushTranslation, PushNotificationType } from './pushTranslations';
import { sendExpoPushToPatient, sendExpoPushToStaffMany } from './expoPush';
import { assigneeUserIds } from './taskAssignees';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Types ────────────────────────────────────────────────────

export interface PushPayload {
    title: string;
    body: string;
    url?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    /** Metadane wyłącznie dla kanału Expo (apka mobilna). FCM ignoruje — jego kształt wiadomości bez zmian. */
    data?: Record<string, unknown>;
    /**
     * Wariant treści NA EKRAN BLOKADY. Gdy ustawiony, to ON jest dostarczany, a `title`
     * i `body` idą wyłącznie do HISTORII („Alerty").
     *
     * 🔑 Rozdzielenie jest sednem neutralizacji: baner widzi każdy, kto stoi obok
     * telefonu (także pacjent w poczekalni), a historia jest za logowaniem i personel
     * ma prawo widzieć w niej nazwiska. Neutralizacja OBU zabrałaby informację bez
     * żadnego zysku dla prywatności.
     */
    neutral?: { title?: string; body: string };
}

/**
 * Payload danych dla Expo: `url` zostaje dla wstecznej zgodności (deep-link),
 * `payload.data` dopełnia/nadpisuje.
 */
/**
 * Treść, która realnie ląduje na ekranie. `neutral` wygrywa, gdy jest — patrz
 * `PushPayload.neutral`. Jedno miejsce, żeby kanał Expo i kanał FCM nie rozjechały się
 * co do tego, co widać bez odblokowania telefonu.
 */
export function deliveredContent(payload: PushPayload): { title: string; body: string } {
    return {
        title: payload.neutral?.title ?? payload.title,
        body: payload.neutral?.body ?? payload.body,
    };
}

function buildExpoData(payload: PushPayload): Record<string, unknown> {
    return {
        ...(payload.url ? { url: payload.url } : {}),
        ...(payload.data ?? {}),
    };
}

export type PushGroup = 'patients' | 'doctors' | 'hygienists' | 'reception' | 'assistant' | 'admin';

// ─── Powiadomienia czatu wewnętrznego: znacznik i wykluczenie z historii ─────

/** `payload.data.type` powiadomienia czatu zespołu (staffMessaging.notifyNewMessage). */
export const STAFF_CHAT_PUSH_TYPE = 'staff_chat_message';
/** `tag` powiadomienia czatu: `staff-chat-<conversationId>`. */
export const STAFF_CHAT_TAG_PREFIX = 'staff-chat-';
/** Deep-link czatu zespołu (DEEP_LINK_PREFIX w staffMessaging.ts). */
export const STAFF_CHAT_URL_PREFIX = '/czat-zespolu';

/**
 * Czy to powiadomienie czatu wewnętrznego zespołu?
 *
 * Rozpoznajemy po TRZECH niezależnych znacznikach, bo pierwszy (`data.type`) istnieje
 * tylko w locie, a do bazy zapisują się `tag` i `url` — ta sama funkcja odsiewa więc
 * zarówno wysyłkę, jak i wiersze, które trafiły do historii przed tą zmianą.
 */
export function isStaffChatPush(payload: {
    url?: string | null;
    tag?: string | null;
    data?: Record<string, unknown> | null;
}): boolean {
    if (payload?.data?.type === STAFF_CHAT_PUSH_TYPE) return true;
    if ((payload?.tag ?? '').startsWith(STAFF_CHAT_TAG_PREFIX)) return true;
    const url = payload?.url ?? '';
    return url === STAFF_CHAT_URL_PREFIX || url.startsWith(`${STAFF_CHAT_URL_PREFIX}/`);
}

// ─── Log Push (AWAITED — fixes empty alerts tab) ─────────────

type HistoryPayload = {
    title: string;
    body: string;
    url?: string | null;
    tag?: string | null;
    data?: Record<string, unknown>;
};

/**
 * Zakładka „Alerty" to WSPÓLNY feed zdarzeń gabinetu (wnioski urlopowe, anulowania
 * czasu pracy, rezerwacje) — każdy pracownik czyta go w całości, patrz
 * GET /api/employee/push/history.
 *
 * Dlatego powiadomienia czatu wewnętrznego NIE MOGĄ tam wpaść: tytuł powiadomienia
 * o wiadomości prywatnej zawiera nazwisko nadawcy, a to ujawniłoby CAŁEMU zespołowi
 * (i adminowi, który do DM wglądu mieć nie może — D5), kto z kim koresponduje.
 * Wybraliśmy niezapisywanie zamiast filtrowania przy odczycie: wpis, którego w tabeli
 * nie ma, nie wycieknie żadną inną trasą, kopią zapasową ani zapytaniem SQL.
 * Feed nic nie traci — „masz nową wiadomość" i tak dubluje ekran czatu.
 */
/** `tag` powiadomienia o zadaniu PRYWATNYM: `task-private-<id>` (assistantActions). */
export const PRIVATE_TASK_TAG_PREFIX = 'task-private-';

function skipHistory(payload: HistoryPayload): boolean {
    if (isStaffChatPush(payload)) return true;

    // 🔴 ZADANIE PRYWATNE NIE MOŻE TRAFIĆ DO WSPÓLNEGO FEEDU.
    // Historia („Alerty") jest CELOWO wspólna dla całego gabinetu — `push/history`
    // filtruje wyłącznie po `user_type IN ('employee','admin')`, bez warunku na `user_id`.
    // Tytuł zadania oznaczonego jako prywatne (np. dyktowanego asystentowi) zobaczyłby
    // więc cały zespół i admin, czyli funkcja „prywatne" przestałaby cokolwiek znaczyć.
    //
    // Dotąd wiersz nie powstawał PRZYPADKIEM: `assistantActions` wołał martwy moduł
    // `webpush`, który loguje dopiero PO udanej wysyłce, a `push_subscriptions` jest
    // pusta od migracji 104. Przepięcie na żywy prymityw odsłoniłoby te tytuły —
    // dlatego wykluczenie wchodzi PRZED przepięciem, nie po nim.
    return (payload?.tag ?? '').startsWith(PRIVATE_TASK_TAG_PREFIX);
}

async function logPush(
    userId: string,
    userType: string,
    payload: HistoryPayload
): Promise<void> {
    if (skipHistory(payload)) return;
    try {
        const { error } = await supabase.from('push_notifications_log').insert({
            user_id: userId,
            user_type: userType,
            // 🔑 HISTORIA DOSTAJE PEŁNĄ TREŚĆ, nie zneutralizowaną. Feed „Alerty" jest za
            // logowaniem, a personel ma prawo widzieć w nim nazwiska — neutralizacja tutaj
            // zabrałaby informację BEZ żadnego zysku dla prywatności.
            title: payload.title,
            body: payload.body,
            url: payload.url ?? null,
            tag: payload.tag ?? null,
        });
        if (error) {
            console.error('[Push] Log insert error:', error.message);
        }
    } catch (err) {
        console.error('[Push] Log exception:', err instanceof Error ? err.message : err);
    }
}

/** Wariant zbiorczy logu — jeden INSERT zamiast N round-tripów (kanał zespołu = kilkanaście osób). */
async function logPushMany(
    userIds: string[],
    userType: string,
    payload: HistoryPayload
): Promise<void> {
    if (userIds.length === 0) return;
    if (skipHistory(payload)) return;
    try {
        const { error } = await supabase.from('push_notifications_log').insert(
            userIds.map(uid => ({
                user_id: uid,
                user_type: userType,
                // 🔑 HISTORIA DOSTAJE PEŁNĄ TREŚĆ, nie zneutralizowaną. Feed „Alerty" jest za
                // logowaniem, a personel ma prawo widzieć w nim nazwiska — neutralizacja tutaj
                // zabrałaby informację BEZ żadnego zysku dla prywatności.
                title: payload.title,
                body: payload.body,
                url: payload.url ?? null,
                tag: payload.tag ?? null,
            }))
        );
        if (error) {
            console.error('[Push] Log bulk insert error:', error.message);
        }
    } catch (err) {
        console.error('[Push] Log bulk exception:', err instanceof Error ? err.message : err);
    }
}

// ─── Bramka aktywności pracownika ────────────────────────────

/** Paczka id w zapytaniach `.in()` — długa lista UUID rozdyma URL PostgREST. */
const ID_CHUNK = 60;

function chunkIds(ids: string[]): string[][] {
    const out: string[][] = [];
    for (let i = 0; i < ids.length; i += ID_CHUNK) out.push(ids.slice(i, i + ID_CHUNK));
    return out;
}

interface EmployeeActivityRow {
    user_id: string | null;
    email: string | null;
    is_active: boolean | null;
}

/**
 * Rozstrzygnięcie „czy ta osoba jest aktywnym pracownikiem" — JEDNO dla całego kodu.
 * Odpytaj przez loadStaffActivity() i pytaj indeks, zamiast pisać własny warunek na
 * `employees.is_active`.
 */
export interface StaffActivityIndex {
    /** Czy do tej osoby wolno pisać / wysyłać powiadomienia. Nieznana = aktywna. */
    isActive(userId?: string | null, email?: string | null): boolean;
    /** Gotowa deny-lista: id JAWNIE nieaktywnych, małymi literami. */
    inactiveUserIds: Set<string>;
    /** false = zapytanie padło i pracujemy fail-open (wszyscy uznani za aktywnych). */
    resolved: boolean;
}

/**
 * Reguły — celowo w jednym miejscu, bo dotąd każda warstwa rozstrzygała inaczej:
 * katalog czatu (`/api/employee/messaging/directory`) czytał NULL jako AKTYWNY,
 * bramka wysyłki DM (`listActiveStaffUserIds` w staffMessaging.ts) jako NIEAKTYWNY,
 * a deny-lista push jako AKTYWNY. Osoba z NULL widniała więc w katalogu jako dostępna,
 * a próba napisania do niej kończyła się błędem.
 *
 *  1. `is_active = NULL` → AKTYWNY. NULL to brak decyzji (stary wiersz sprzed kolumny),
 *     a nie zwolnienie; kolumna ma domyślnie `true`, offboarding wpisuje jawne `false`.
 *  2. Brak wiersza w `employees` → AKTYWNY. Tak wygląda samo konto administratora
 *     i konta założone przed kartoteką; allow-lista uciszyłaby pracujące osoby.
 *  3. DUPLIKATY: osoba jest nieaktywna dopiero wtedy, gdy KAŻDY jej wiersz mówi `false`.
 *     Kartoteka ma zdublowane wpisy (patrz `sprzatanie_employees_2026-05-08.txt`,
 *     gdzie duplikaty dezaktywowano), a poprzednia deny-lista brała `is_active = false`
 *     z DOWOLNEGO wiersza — jeden zapomniany duplikat odcinał pracownika od wszystkich
 *     powiadomień, także o przypisanych zadaniach, bez błędu i bez logu.
 *  4. Dopasowanie po `user_id`, a gdy kartoteka nie ma wpiętego konta — po e-mailu
 *     (tak wiąże je `/api/employee/staff`). Wiersz po `user_id` ma pierwszeństwo.
 *  5. Błąd zapytania → fail-open. Awaria bazy nie może uciszyć całej kliniki, a treść
 *     pusha personelu jest neutralna (patrz komentarz w pushTranslations.ts).
 *
 * Po co w ogóle odsiew: `/api/admin/employees/deactivate` kasuje rolę `employee` i
 * porzucone `push_subscriptions`, ale NIE rusza `fcm_tokens`, `staff_push_tokens` ani
 * roli `admin` — bez tego zwolniona osoba dostawałaby powiadomienia dalej.
 */
function buildStaffActivityIndex(rows: EmployeeActivityRow[], resolved: boolean): StaffActivityIndex {
    const byUser = new Map<string, boolean>();
    const byEmail = new Map<string, boolean>();

    for (const row of rows) {
        const active = row.is_active !== false; // reguła 1: NULL = aktywny
        const userKey = row.user_id ? row.user_id.trim().toLowerCase() : '';
        // reguła 3: sklejamy wiersze przez OR — wystarczy JEDEN aktywny.
        if (userKey) byUser.set(userKey, (byUser.get(userKey) ?? false) || active);
        const emailKey = row.email ? row.email.trim().toLowerCase() : '';
        if (emailKey) byEmail.set(emailKey, (byEmail.get(emailKey) ?? false) || active);
    }

    const inactiveUserIds = new Set<string>();
    for (const [userKey, active] of byUser) {
        if (!active) inactiveUserIds.add(userKey);
    }

    return {
        resolved,
        inactiveUserIds,
        isActive(userId?: string | null, email?: string | null): boolean {
            // Porównanie bez względu na wielkość liter: Postgres oddaje UUID małymi,
            // ale apka potrafi przysłać id przepisane wielkimi.
            const userKey = userId ? userId.trim().toLowerCase() : '';
            if (userKey && byUser.has(userKey)) return byUser.get(userKey)!;
            const emailKey = email ? email.trim().toLowerCase() : '';
            if (emailKey && byEmail.has(emailKey)) return byEmail.get(emailKey)!;
            return true; // reguła 2
        },
    };
}

/** Wczytuje kartotekę i zwraca indeks aktywności (zasady — patrz buildStaffActivityIndex). */
export async function loadStaffActivity(): Promise<StaffActivityIndex> {
    try {
        const { data, error } = await supabase
            .from('employees')
            .select('user_id, email, is_active');
        if (error) {
            console.error('[Push] loadStaffActivity error (fail-open):', error.message);
            return buildStaffActivityIndex([], false);
        }
        return buildStaffActivityIndex((data || []) as EmployeeActivityRow[], true);
    } catch (err) {
        console.error('[Push] loadStaffActivity exception (fail-open):', err instanceof Error ? err.message : err);
        return buildStaffActivityIndex([], false);
    }
}

/**
 * Odsiew nieaktywnych z listy odbiorców. Odcięcie ZAWSZE zostawia ślad w logu —
 * cicha utrata powiadomienia (np. przez zdublowany wiersz kartoteki) była wcześniej
 * nie do odróżnienia od „nikt nie miał urządzenia".
 */
function filterActive(userIds: string[], activity: StaffActivityIndex, label: string): string[] {
    const kept: string[] = [];
    const dropped: string[] = [];
    for (const id of userIds) {
        if (activity.isActive(id)) kept.push(id);
        else dropped.push(id);
    }
    if (dropped.length > 0) {
        console.warn(`[Push] ${label}: pominięto ${dropped.length} nieaktywnych odbiorców: ${dropped.join(', ')}`);
    }
    return kept;
}

// ─── Core: Send to FCM tokens ────────────────────────────────

/**
 * Send a push notification to a list of FCM tokens.
 * Handles batch sending (up to 500 per call) and stale token cleanup.
 */
async function sendToTokens(
    tokens: string[],
    payload: PushPayload
): Promise<{ sent: number; failed: number }> {
    if (tokens.length === 0) return { sent: 0, failed: 0 };

    const messaging = getMessaging();
    const delivered = deliveredContent(payload);
    let sent = 0;
    let failed = 0;
    const staleTokens: string[] = [];

    // FCM supports up to 500 tokens per multicast
    const batchSize = 500;
    for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);

        try {
            // 🔒 Log BEZ treści: `body` niesie nazwisko pacjenta i wolny tekst, a logi
            // Vercela żyją poza audytem, poza retencją i poza eksportem RODO.
            console.log(`[Push] Sending batch (${batch.length} tokens): title="${delivered.title}"`);
            const response = await messaging.sendEachForMulticast({
                tokens: batch,
                // DATA-ONLY message — no top-level 'notification' key.
                // Why: FCM auto-display (with notification key) creates notifications
                // WITHOUT our custom data.url, breaking click navigation. Also,
                // our SW's onBackgroundMessage skips showNotification() when
                // notification key exists, making background push invisible in PWA.
                //
                // With data-only: SW's onBackgroundMessage ALWAYS fires and calls
                // showNotification() with proper data.url for notificationclick.
                // For foreground: onMessage in firebaseClient.ts handles display.
                data: {
                    // Wariant neutralny, gdy jest — patrz `PushPayload.neutral`.
                    title: delivered.title || 'Mikrostomart',
                    body: delivered.body || '',
                    url: payload.url || '/',
                    tag: payload.tag || 'notification',
                    icon: payload.icon || '/icon-192x192.png',
                    requireInteraction: String(payload.requireInteraction || false),
                },
            });

            response.responses.forEach((res, idx) => {
                if (res.success) {
                    sent++;
                } else {
                    failed++;
                    // Clean up invalid tokens
                    const errorCode = res.error?.code;
                    if (
                        errorCode === 'messaging/registration-token-not-registered' ||
                        errorCode === 'messaging/invalid-registration-token'
                    ) {
                        staleTokens.push(batch[idx]);
                    }
                }
            });
        } catch (err) {
            console.error('[Push] Batch send error:', err instanceof Error ? err.message : err);
            failed += batch.length;
        }
    }

    // Clean up stale tokens
    if (staleTokens.length > 0) {
        console.log(`[Push] Cleaning ${staleTokens.length} stale tokens`);
        await supabase.from('fcm_tokens').delete().in('fcm_token', staleTokens);
    }

    return { sent, failed };
}

// ─── Resolve target users per group (regardless of FCM tokens) ──

export async function resolveGroupUsers(group: PushGroup): Promise<{ user_id: string; user_type: string }[]> {
    if (group === 'patients') {
        // Patients don't have an employees row — resolve from user_roles
        const { data } = await supabase
            .from('user_roles').select('user_id')
            .eq('role', 'patient');
        return (data || []).map(r => ({ user_id: r.user_id, user_type: 'patient' }));
    }
    if (group === 'admin') {
        const { data } = await supabase
            .from('user_roles').select('user_id, email')
            .eq('role', 'admin');
        // Rola `admin` PRZEŻYWA dezaktywację (deactivate kasuje wyłącznie rolę `employee`),
        // a to zapytanie — inaczej niż podgrupy pracownicze niżej — nie dotyka `employees`.
        // Bez tego odsiewu zwolniony admin dostawał powiadomienia dalej. `email` bierzemy
        // po to, żeby trafić też w kartotekę bez wpiętego `user_id` (reguła 4 indeksu).
        const activity = await loadStaffActivity();
        return (data || [])
            .filter(r => r.user_id && activity.isActive(r.user_id, r.email))
            .map(r => ({ user_id: r.user_id, user_type: 'admin' }));
    }
    // Employee sub-groups
    const groupMap: Record<string, string> = {
        doctors: 'doctor', hygienists: 'hygienist',
        reception: 'reception', assistant: 'assistant',
    };
    const dbGroup = groupMap[group];
    if (!dbGroup) return [];
    const { data: employees } = await supabase
        .from('employees').select('user_id')
        .eq('is_active', true)
        .contains('push_groups', [dbGroup]);
    return (employees || []).filter(e => e.user_id).map(e => ({ user_id: e.user_id, user_type: 'employee' }));
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Send push notification to a specific user (all their devices).
 * Always logs to history, even if user has no FCM tokens.
 */
export async function pushToUser(
    userId: string,
    userType: 'patient' | 'employee' | 'admin',
    payload: PushPayload
): Promise<{ sent: number; failed: number }> {
    // Always log to history regardless of delivery
    await logPush(userId, userType, payload);

    // Pacjent: dodatkowo push do aplikacji mobilnej (Expo Push — patient_push_tokens,
    // mig 173). Fire-and-forget: brak tabeli/tokenów nie może wywrócić web-pusha.
    if (userType === 'patient') {
        sendExpoPushToPatient(userId, {
            ...deliveredContent(payload),
            data: buildExpoData(payload),
        }).catch(err => console.error('[Push] Expo push error:', err));
    } else {
        // Personel: dodatkowo push do aplikacji mobilnej (Expo — staff_push_tokens, mig 179).
        // Fire-and-forget: brak tabeli/tokenów nie może wywrócić web-pusha.
        sendExpoPushToStaffMany([userId], {
            ...deliveredContent(payload),
            data: buildExpoData(payload),
        }).catch(err => console.error('[Push] Expo staff push error:', err));
    }

    const { data: tokenRows } = await supabase
        .from('fcm_tokens')
        .select('fcm_token')
        .eq('user_id', userId)
        .eq('user_type', userType);

    const tokens = (tokenRows || []).map(r => r.fcm_token);
    if (tokens.length === 0) return { sent: 0, failed: 0 };

    return sendToTokens(tokens, payload);
}

/**
 * Push do pacjenta na OBA kanały, z policzalnym wynikiem (CareFlow).
 *
 * Różnica wobec pushToUser: kanał Expo (apka mobilna) jest AWAITOWANY i wliczany
 * do sent/failed. pushToUser liczy wyłącznie FCM, więc pacjent mający samą apkę
 * (token Expo, zero FCM) dostawał sent:0 — wołający uznawał push za nieudany
 * i eskalował do SMS-a. Tu sent = fcm.sent + expo.sent.
 *
 * Awaria jednego kanału nie przerywa drugiego — funkcja nigdy nie rzuca.
 * logPush() wykonuje się DOKŁADNIE RAZ (jak w pushToUser).
 */
export async function pushToPatientAll(
    userId: string,
    payload: PushPayload,
    /**
     * Nazwa ścieżki dla rejestru zdrowia (`push_path_health` / `push_receipts.path_key`).
     *
     * 🔴 PO CO: `deliver()` w expoPush przyjmuje `pathKey` i zapisuje go do `push_receipts`
     * od migracji 186 — ale ŻADEN z trzech wrapperów go nie przekazywał, więc kolumna była
     * ZAWSZE NULL. Gdy Expo zwracało `DeviceNotRegistered` albo `MessageTooBig`, ekran
     * „Diagnostyka powiadomień" nie potrafił przypisać niedostarczenia do żadnej ścieżki —
     * cały mechanizm rozliczania widział wyłącznie worek „nieprzypisane".
     */
    pathKey?: string
): Promise<{ fcm: { sent: number; failed: number }; expo: { sent: number; failed: number }; sent: number; failed: number }> {
    // Historia niezależnie od dostarczenia — jeden wpis na wywołanie
    await logPush(userId, 'patient', payload);

    const [fcmRes, expoRes] = await Promise.all([
        (async () => {
            let tokens: string[] = [];
            try {
                const { data: tokenRows } = await supabase
                    .from('fcm_tokens')
                    .select('fcm_token')
                    .eq('user_id', userId)
                    .eq('user_type', 'patient');

                tokens = (tokenRows || []).map(r => r.fcm_token);
                if (tokens.length === 0) return { sent: 0, failed: 0 };

                return await sendToTokens(tokens, payload);
            } catch (err) {
                console.error('[Push] pushToPatientAll FCM error:', err instanceof Error ? err.message : err);
                return { sent: 0, failed: tokens.length };
            }
        })(),
        (async () => {
            try {
                return await sendExpoPushToPatient(userId, {
                    ...deliveredContent(payload),
                    data: buildExpoData(payload),
                }, pathKey);
            } catch (err) {
                console.error('[Push] pushToPatientAll Expo error:', err instanceof Error ? err.message : err);
                return { sent: 0, failed: 0 };
            }
        })(),
    ]);

    const sent = fcmRes.sent + expoRes.sent;
    const failed = fcmRes.failed + expoRes.failed;
    console.log(`[Push] pushToPatientAll ${userId}: fcm=${fcmRes.sent}/${fcmRes.failed} expo=${expoRes.sent}/${expoRes.failed} → sent=${sent} failed=${failed}`);

    return { fcm: fcmRes, expo: expoRes, sent, failed };
}

/**
 * Send translated push notification to a user based on the notification type.
 */
export async function pushTranslatedToUser(
    userId: string,
    userType: 'patient' | 'employee' | 'admin',
    notificationType: PushNotificationType,
    params: Record<string, string> = {},
    url?: string
): Promise<{ sent: number; failed: number }> {
    // FCM tokens don't store locale — use 'pl' as default for now
    const { title, body } = getPushTranslation(notificationType, 'pl', params);
    return pushToUser(userId, userType, { title, body, url });
}

/**
 * Send push notification to specific users by user_id array.
 */
export async function pushToUsers(
    userIds: string[],
    payload: PushPayload
): Promise<{ sent: number; failed: number }> {
    if (!userIds || userIds.length === 0) return { sent: 0, failed: 0 };

    // Bramka aktywności: zwolniony pracownik nie może dostawać powiadomień ANI wpisów
    // w historii alertów (dezaktywacja odbiera mu też dostęp do strefy — push i tak
    // trafiałby w próżnię, a wpis w logu sugerowałby, że ktoś go czyta).
    const activity = await loadStaffActivity();
    const targets = filterActive(userIds, activity, 'pushToUsers');
    if (targets.length === 0) return { sent: 0, failed: 0 };

    // Historia dla WSZYSTKICH odbiorców, niezależnie od tokenów — jednym zapisem
    // wsadowym zamiast pętli `await` (przy kilkunastu osobach to kilkanaście rund
    // do bazy w funkcji, która i tak ma budżet czasu crona).
    await logPushMany(targets, 'employee', payload);

    // 🔴 KANAŁ APLIKACJI JEST AWAITOWANY I WLICZANY DO WYNIKU.
    // Wcześniej leciał fire-and-forget, a `sent` liczyło się WYŁĄCZNIE z `fcm_tokens`.
    // Skutek na produkcji: pracownik mający tylko aplikację (typowy przypadek — web-push
    // w przeglądarce ma mało kto) dostawał powiadomienie na telefon, a panel raportował
    // „Wysłano: 0". Operator uznawał wysyłkę za nieudaną i powtarzał ją, więc odbiorca
    // dostawał duplikat. Ten sam błąd naprawiono już w `pushToPatientAll` — tu został.
    const [expoRes, fcmRes] = await Promise.all([
        sendExpoPushToStaffMany(targets, {
            // Wariant neutralny, gdy jest — historia wyżej dostała pełną treść.
            ...deliveredContent(payload),
            data: buildExpoData(payload),
        }).catch(err => {
            console.error('[Push] Expo staff push error:', err);
            return { sent: 0, failed: 0 };
        }),
        (async () => {
            // 🪤 `.in()` MUSI być chunkowane: długa lista UUID rozdyma URL PostgREST
            // ponad limit, `data` wraca `null`, supabase-js nie rzuca — i funkcja
            // raportuje sukces przy zerowej wysyłce. `chunkIds` istnieje w tym module
            // od dawna, tylko nie było tu użyte.
            const tokens: string[] = [];
            for (const part of chunkIds(targets)) {
                const { data, error } = await supabase
                    .from('fcm_tokens')
                    .select('fcm_token, user_id, user_type')
                    .in('user_id', part);
                if (error) {
                    console.error('[Push] pushToUsers: odczyt fcm_tokens padł:', error.message);
                    continue;
                }
                for (const r of data || []) tokens.push(r.fcm_token);
            }
            if (tokens.length === 0) return { sent: 0, failed: 0 };
            return sendToTokens(tokens, payload);
        })(),
    ]);

    const result = {
        sent: fcmRes.sent + expoRes.sent,
        failed: fcmRes.failed + expoRes.failed,
    };
    console.log(
        `[Push] pushToUsers: ${targets.length} users → fcm=${fcmRes.sent}/${fcmRes.failed} `
        + `expo=${expoRes.sent}/${expoRes.failed} → sent=${result.sent} failed=${result.failed}`
    );
    return result;
}

export interface PushToStaffOptions {
    /** Autor wiadomości — nie dostaje powiadomienia o własnym wpisie. */
    excludeUserId?: string;
    /** Domyślnie true. `false` tylko dla powiadomień, które MUSZĄ dojść mimo dezaktywacji. */
    skipInactive?: boolean;
    /** Kanał powiadomień Androida (patrz STAFF_CHAT_CHANNEL w expoPush.ts). */
    androidChannelId?: string;
    priority?: 'default' | 'normal' | 'high';
    /**
     * Zwijanie serii powiadomień z jednego wątku w jedno (Expo collapseId).
     * Domyślnie `payload.tag` — wołający i tak nadaje tag per rozmowa.
     */
    collapseId?: string;
}

export interface PushToStaffResult {
    fcm: { sent: number; failed: number };
    expo: { sent: number; failed: number };
    sent: number;
    failed: number;
    /** Realni odbiorcy po odsiewie — wołający ma czym uzasadnić „wysłano do N osób". */
    recipients: string[];
}

function emptyStaffResult(): PushToStaffResult {
    return { fcm: { sent: 0, failed: 0 }, expo: { sent: 0, failed: 0 }, sent: 0, failed: 0, recipients: [] };
}

/**
 * Push do WSKAZANYCH pracowników (czat wewnętrzny zespołu), z policzalnym wynikiem.
 *
 * Różnica wobec pushToUsers: kanał Expo (apka personelu) jest AWAITOWANY i wliczany do
 * sent/failed — pracownik mający samą apkę (token Expo, zero FCM) dawał tam `sent: 0`,
 * czyli wołający nie odróżniał „nikt nie ma urządzenia" od „wysyłka padła”.
 * Awaria jednego kanału nie przerywa drugiego; funkcja nigdy nie rzuca.
 *
 * ODSIEW ODBIORCÓW (dwa niezależne powody):
 *  1. `emp-<id>` z /api/employee/staff to pracownik BEZ konta — nie ma czym odebrać pusha,
 *     a wpis w `push_notifications_log` KŁAMAŁBY, że powiadomienie wyszło (wzorzec i regex
 *     z lib/taskAssignees.ts; kolumny UUID w mig 183 odbiłyby to zresztą błędem 22P02),
 *  2. kartoteka mówi, że osoba jest nieaktywna — rozstrzyga wyłącznie loadStaffActivity()
 *     (NULL, brak wiersza i zdublowany wiersz `false` obok aktywnego = AKTYWNY; każde
 *     odcięcie ląduje w logu, żeby cicho zgubione powiadomienie dało się wyśledzić).
 * logPush wykonuje się WYŁĄCZNIE dla odbiorców, którzy przeszli oba filtry, i NIGDY dla
 * powiadomień czatu wewnętrznego (skipHistory() — uzasadnienie przy tej funkcji).
 *
 * Treść `payload` musi być NEUTRALNA (bez treści wiadomości i bez nazwiska pacjenta) —
 * buduj ją przez getStaffChatPush() z pushTranslations.ts, tam jest uzasadnienie.
 */
export async function pushToStaffMembers(
    userIds: string[],
    payload: PushPayload,
    opts: PushToStaffOptions = {}
): Promise<PushToStaffResult> {
    // Deduplikacja + odsiew nie-UUID w jednym miejscu (ten sam filtr co przy zadaniach).
    let recipients = assigneeUserIds((userIds || []).map(id => ({ id })));
    if (opts.excludeUserId) recipients = recipients.filter(id => id !== opts.excludeUserId);
    if (recipients.length === 0) return emptyStaffResult();

    if (opts.skipInactive !== false) {
        const activity = await loadStaffActivity();
        recipients = filterActive(recipients, activity, 'pushToStaffMembers');
        if (recipients.length === 0) return emptyStaffResult();
    }

    // Historia niezależnie od dostarczenia — jeden wpis na odbiorcę, jak w pushToUsers.
    // Powiadomienia czatu wewnętrznego logPushMany odrzuca (skipHistory) i to jest
    // JEDYNY powód, dla którego wspólny feed „Alertów" może zostać wspólny.
    await logPushMany(recipients, 'employee', payload);

    const collapseId = opts.collapseId ?? payload.tag;

    const [fcmRes, expoRes] = await Promise.all([
        (async () => {
            try {
                const rows: Array<{ fcm_token: string }> = [];
                for (const part of chunkIds(recipients)) {
                    const { data } = await supabase
                        .from('fcm_tokens')
                        .select('fcm_token')
                        .in('user_id', part)
                        // Bez tego warunku wiadomość personelu poszłaby na token zarejestrowany
                        // jako pacjencki, gdyby ktoś miał konto w obu rolach.
                        .in('user_type', ['employee', 'admin']);
                    rows.push(...(data || []));
                }
                const tokens = Array.from(new Set(rows.map(r => r.fcm_token).filter(Boolean)));
                if (tokens.length === 0) return { sent: 0, failed: 0 };
                return await sendToTokens(tokens, payload);
            } catch (err) {
                console.error('[Push] pushToStaffMembers FCM error:', err instanceof Error ? err.message : err);
                return { sent: 0, failed: 0 };
            }
        })(),
        (async () => {
            try {
                let sent = 0, failed = 0;
                for (const part of chunkIds(recipients)) {
                    const res = await sendExpoPushToStaffMany(part, {
                        ...deliveredContent(payload),
                        data: buildExpoData(payload),
                        ...(opts.androidChannelId ? { channelId: opts.androidChannelId } : {}),
                        ...(opts.priority ? { priority: opts.priority } : {}),
                        ...(collapseId ? { collapseId } : {}),
                    });
                    sent += res.sent;
                    failed += res.failed;
                }
                return { sent, failed };
            } catch (err) {
                console.error('[Push] pushToStaffMembers Expo error:', err instanceof Error ? err.message : err);
                return { sent: 0, failed: 0 };
            }
        })(),
    ]);

    const sent = fcmRes.sent + expoRes.sent;
    const failed = fcmRes.failed + expoRes.failed;
    console.log(`[Push] pushToStaffMembers: ${recipients.length} recipients fcm=${fcmRes.sent}/${fcmRes.failed} expo=${expoRes.sent}/${expoRes.failed} → sent=${sent} failed=${failed}`);

    return { fcm: fcmRes, expo: expoRes, sent, failed, recipients };
}

/**
 * Send push notification to ALL subscribed employees.
 * Optionally exclude a specific user.
 */
export async function pushToAllEmployees(
    payload: PushPayload,
    excludeUserId?: string
): Promise<{ sent: number; failed: number }> {
    // Log for ALL active employees (regardless of FCM tokens)
    const { data: allEmps } = await supabase
        .from('employees').select('user_id')
        .eq('is_active', true);
    for (const emp of allEmps || []) {
        if (emp.user_id && emp.user_id !== excludeUserId) {
            await logPush(emp.user_id, 'employee', payload);
        }
    }

    // Send push only to those with FCM tokens
    let query = supabase
        .from('fcm_tokens')
        .select('fcm_token, user_id, user_type')
        .in('user_type', ['employee', 'admin']);

    if (excludeUserId) {
        query = query.neq('user_id', excludeUserId);
    }

    const { data: tokenRows } = await query;
    // Log wyżej filtruje po `is_active`, ale zapytanie o tokeny FCM już nie — zwolniony
    // pracownik dostawał więc pusha, tyle że bez wpisu w historii (log kłamał w drugą stronę).
    const activity = await loadStaffActivity();
    const tokens = (tokenRows || [])
        .filter(r => activity.isActive(r.user_id))
        .map(r => r.fcm_token);
    return sendToTokens(tokens, payload);
}

/**
 * Send push notification to specific employee groups.
 *
 * 🔑 KANAŁ APLIKACJI MOBILNEJ — opt-in przez `alsoApp` (ten sam wzorzec co w
 * `broadcastPush`). Ta funkcja historycznie czyta WYŁĄCZNIE `fcm_tokens`, czyli
 * web-push przeglądarki. Tokeny aplikacji żyją w `staff_push_tokens` (mig 179),
 * więc powiadomienie nigdy nie docierało na telefon — a `logPush` wykonuje się
 * niezależnie od dostarczenia, przez co pojawiało się w historii Alertów
 * i WYGLĄDAŁO na wysłane. Objaw zmierzony na wnioskach urlopowych.
 *
 * Flaga zamiast zmiany domyślnej: `pushToGroups` woła kilkanaście miejsc
 * (rezerwacje, odwołania, zamówienia). Włączenie ich wszystkich naraz zalałoby
 * zespół banerami i jest osobną, świadomą decyzją.
 */
export async function pushToGroups(
    groups: PushGroup[],
    payload: PushPayload,
    opts: { alsoApp?: boolean } = {}
): Promise<{ sent: number; failed: number; byGroup: Record<string, { sent: number; failed: number }> }> {
    let totalSent = 0;
    let totalFailed = 0;
    const byGroup: Record<string, { sent: number; failed: number }> = {};
    const sentTokens = new Set<string>();
    const loggedUsers = new Set<string>();
    /** Odbiorcy kanału Expo — zbierani PONAD grupami i deduplikowani po user_id.
     *  Jedna osoba bywa i w `admin`, i w `reception`; wysyłka w pętli dałaby jej
     *  dwa identyczne banery na telefonie. */
    const appTargets = new Set<string>();

    for (const group of groups) {
        // 1. Resolve ALL target users (for history logging)
        const allUsers = await resolveGroupUsers(group);
        for (const u of allUsers) {
            // Kanał Expo obsługuje wyłącznie personel — pacjenci mają własną tabelę
            // tokenów (`patient_push_tokens`) i własny prymityw wysyłki.
            if (u.user_type !== 'patient') appTargets.add(u.user_id);
            if (!loggedUsers.has(u.user_id)) {
                loggedUsers.add(u.user_id);
                await logPush(u.user_id, u.user_type, payload);
            }
        }

        // 2. Find FCM tokens for delivery
        const userIds = allUsers.map(u => u.user_id);
        let tokenRows: Array<{ fcm_token: string; user_id: string | null; user_type: string | null }> = [];
        if (userIds.length > 0) {
            const { data } = await supabase
                .from('fcm_tokens').select('fcm_token, user_id, user_type')
                .in('user_id', userIds);
            tokenRows = data || [];
        }

        // Dedup across groups
        const uniqueTokens = tokenRows.filter(r => {
            if (sentTokens.has(r.fcm_token)) return false;
            sentTokens.add(r.fcm_token);
            return true;
        });

        const tokens = uniqueTokens.map(r => r.fcm_token);
        const result = await sendToTokens(tokens, payload);
        byGroup[group] = result;
        totalSent += result.sent;
        totalFailed += result.failed;
    }

    // Wysyłka na kanał aplikacji — RAZ, poza pętlą grup, na zdeduplikowanej liście.
    // `void` + `.catch`, bo awaria Expo nie może wywrócić web-pusha ani wołającej trasy
    // (ten sam kontrakt fire-and-forget co w `broadcastPush` i `pushToUser`).
    if (opts.alsoApp && appTargets.size > 0) {
        void sendExpoPushToStaffMany([...appTargets], {
            ...deliveredContent(payload),
            data: { ...(payload.data ?? {}), ...(payload.url ? { url: payload.url } : {}) },
        }).catch(err => console.error('[Push] pushToGroups Expo error:', err));
    }

    return { sent: totalSent, failed: totalFailed, byGroup };
}

/**
 * Config-driven push: reads push_notification_config,
 * respects enabled flag and muted preferences.
 */
export async function pushByConfig(
    configKey: string,
    payload: PushPayload,
    excludeUserId?: string
): Promise<{ sent: number; failed: number }> {
    // 1. Fetch config
    const { data: config } = await supabase
        .from('push_notification_config')
        .select('enabled, groups, recipient_types')
        .eq('key', configKey)
        .single();

    if (!config || !config.enabled) {
        console.log(`[Push] pushByConfig: key="${configKey}" not found or disabled — skipped`);
        return { sent: 0, failed: 0 };
    }

    const groups: PushGroup[] = (config.groups || []) as PushGroup[];
    if (groups.length === 0) {
        console.log(`[Push] pushByConfig: key="${configKey}" has no groups — skipped`);
        return { sent: 0, failed: 0 };
    }

    // 2. Fetch muted preferences
    const { data: mutedPrefs } = await supabase
        .from('employee_notification_preferences')
        .select('user_id')
        .contains('muted_keys', [configKey]);
    const mutedUserIds = new Set((mutedPrefs || []).map(p => p.user_id));

    // 3. Resolve ALL target users and log for history
    const loggedUsers = new Set<string>();
    const allTargetUserIds: string[] = [];

    for (const group of groups) {
        const allUsers = await resolveGroupUsers(group);
        for (const u of allUsers) {
            if (excludeUserId && u.user_id === excludeUserId) continue;
            if (mutedUserIds.has(u.user_id)) continue;
            if (!loggedUsers.has(u.user_id)) {
                loggedUsers.add(u.user_id);
                allTargetUserIds.push(u.user_id);
                await logPush(u.user_id, u.user_type, payload);
            }
        }
    }

    // 4. Find FCM tokens for delivery
    if (allTargetUserIds.length === 0) {
        console.log(`[Push] pushByConfig: key="${configKey}" no target users after filtering`);
        return { sent: 0, failed: 0 };
    }

    const { data: tokenRows } = await supabase
        .from('fcm_tokens').select('fcm_token, user_id, user_type')
        .in('user_id', allTargetUserIds);

    const tokens = (tokenRows || []).map(r => r.fcm_token);
    const result = await sendToTokens(tokens, payload);

    console.log(`[Push] pushByConfig: key="${configKey}" groups=[${groups.join(',')}] logged=${loggedUsers.size} → sent=${result.sent} failed=${result.failed}`);
    return result;
}

// ─── Legacy compatibility aliases ────────────────────────────
// These map old function names to new ones for callers that haven't been updated yet.

export const sendPushToUser = pushToUser;
export const sendTranslatedPushToUser = pushTranslatedToUser;
export const sendPushToAllEmployees = pushToAllEmployees;
export const sendPushToGroups = pushToGroups;
export const sendPushByConfig = pushByConfig;
export const sendPushToSpecificUsers = pushToUsers;
export const broadcastPush = async (
    userType: 'patient' | 'employee' | 'admin',
    notificationType: PushNotificationType,
    params: Record<string, string> = {},
    url?: string,
    opts: {
        alsoApp?: boolean;
        muteKey?: string;
        /**
         * Identyfikatory celu dla apki (`data.type`, `conversationId`, …).
         *
         * 🔑 TRANSPORT MUSI ISTNIEĆ ZANIM ZNEUTRALIZUJEMY TREŚĆ. Neutralizacja zdejmuje
         * szczegół z banera; bez tego pola nie ma go dokąd przenieść, więc informacja
         * nie „chowa się pod odblokowanie", tylko ZNIKA. Stąd kolejność:
         * transport → deep-link → neutralizacja.
         *
         * ⚠️ Same identyfikatory, NIGDY treść ani nazwisko — `data` jedzie przez Expo,
         * APNs i FCM, a tam ma trafiać wyłącznie to, co bezużyteczne bez zalogowania.
         */
        data?: Record<string, unknown>;
        /** Znacznik zwijania powiadomień tej samej sprawy (np. `patient-chat-<id>`). */
        tag?: string;
    } = {}
): Promise<{ sent: number; failed: number }> => {
    const { title, body } = getPushTranslation(notificationType, 'pl', params);
    /**
     * Neutralizacja treści na ekranie blokady (decyzja właściciela: wariant A — wszędzie).
     *
     * 🔑 Bramka na `userType !== 'patient'` jest istotą rzeczy: pacjent dostaje własne dane
     * na własny telefon i zabranie mu ich zamienia powiadomienie w zagadkę. Neutralizujemy
     * to, co ląduje na ekranach CAŁEGO ZESPOŁU — tam obok telefonu stoi ktoś jeszcze.
     *
     * `getNeutralPushBody` zwraca `null` dla typów, które nie są skierowane do personelu,
     * więc druga warstwa zabezpieczenia siedzi w samej liście typów.
     */
    const neutralBody = userType === 'patient' ? null : getNeutralPushBody(notificationType, 'pl');
    const payload: PushPayload = {
        title,
        body,
        url,
        data: opts.data,
        tag: opts.tag,
        ...(neutralBody ? { neutral: { body: neutralBody } } : {}),
    };

    /**
     * Odbiorcy do historii — CZYTANI ZE STRONICOWANIEM.
     *
     * 🪤 PostgREST tnie odpowiedź do `db-max-rows` (domyślnie 1000) i nie mówi o tym
     * ani słowem. Przy większej liczbie kont funkcja widziała tylko pierwszą tysiączkę,
     * wysyłała do podzbioru i raportowała sukces. Dotyczy zwłaszcza `userType='patient'`
     * (powiadomienie o nowym wpisie na blogu idzie do WSZYSTKICH pacjentów).
     *
     * Zapis historii idzie wsadowo (`logPushMany`) zamiast pętli `await logPush` —
     * przy tysiącu odbiorców pętla to tysiąc rund do bazy w jednym żądaniu.
     */
    const appTargets: string[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
        const q = userType === 'employee'
            ? supabase.from('employees').select('user_id').eq('is_active', true)
            : supabase.from('user_roles').select('user_id').eq('role', userType);

        const { data, error } = await q.range(from, from + PAGE - 1);
        if (error) {
            console.error('[Push] broadcastPush: odczyt odbiorców padł:', error.message);
            break;
        }
        for (const row of data || []) {
            if ((row as { user_id?: string }).user_id) appTargets.push((row as { user_id: string }).user_id);
        }
        if (!data || data.length < PAGE) break;
    }
    await logPushMany(appTargets, userType, payload);

    /**
     * 🔑 KANAŁ APLIKACJI MOBILNEJ — opt-in przez `alsoApp`.
     *
     * `broadcastPush` historycznie wysyła WYŁĄCZNIE web-push FCM, więc powiadomienie
     * nigdy nie docierało na telefon personelu. Objaw zgłoszony z produkcji: wiadomość
     * pacjenta do recepcji NIE generuje żadnego pusha w apce, mimo że pojawia się
     * w historii Alertów (bo `logPush` wykonuje się niezależnie od dostarczenia).
     *
     * Flaga zamiast zmiany domyślnej: tę funkcję woła ~15 typów powiadomień
     * (rezerwacje, odwołania, zamówienia, zadania). Włączenie ich wszystkich naraz
     * zalałoby zespół banerami i jest osobną, świadomą decyzją — a nie skutkiem
     * ubocznym naprawy czatu.
     *
     * 🔑 WYCISZENIA SĄ RESPEKTOWANE na tym kanale (i tylko na nim — patrz niżej).
     * Ekran „Preferencje" w apce zapisuje `employee_notification_preferences.muted_keys`,
     * a klucze konfiguracji używają MYŚLNIKÓW (`appointment-confirmed`), podczas gdy
     * `notificationType` używa PODKREŚLEŃ (`appointment_confirmed`) — stąd konwersja.
     * ⚠️ Gałąź FCM niżej wyciszeń NIE czyta (stan zastany). Skutek: wyciszenie
     * uciszy telefon, ale nie przeglądarkę. Ujednolicenie to osobna decyzja, bo
     * dotknęłoby wszystkich ~15 typów naraz.
     */
    if (opts.alsoApp && userType !== 'patient' && appTargets.length > 0) {
        const muteKey = opts.muteKey ?? String(notificationType).replace(/_/g, '-');
        let targets = appTargets;
        try {
            const { data: muted } = await supabase
                .from('employee_notification_preferences')
                .select('user_id')
                .contains('muted_keys', [muteKey]);
            const mutedIds = new Set((muted || []).map(m => m.user_id));
            targets = appTargets.filter(id => !mutedIds.has(id));
        } catch (err) {
            // Fail-OPEN: awaria odczytu preferencji nie może uciszyć powiadomienia.
            // Odwrotnie niż przy bramkach bezpieczeństwa — tu koszt błędu to jeden
            // baner za dużo, a nie przeoczone zgłoszenie.
            console.error('[Push] odczyt wyciszeń nieudany, wysyłam do wszystkich:', err);
        }

        if (targets.length > 0) {
            void sendExpoPushToStaffMany(targets, {
                ...deliveredContent(payload),
                /**
                 * `url` zostaje dla wstecznej zgodności — binarka 1.2.0 ze sklepów
                 * rozpoznaje część powiadomień właśnie po nim. `opts.data` dopełnia
                 * i ma pierwszeństwo, więc starsza apka działa jak dotąd, a nowsza
                 * trafia prosto w konkretną sprawę.
                 */
                data: { ...(url ? { url } : {}), ...(opts.data ?? {}) },
                // 🪤 Po stronie Expo pole zwijania nazywa się `collapseId`, nie `tag`
                // (`tag` to nazwa z web-pusha). Przekazanie `tag` przeszłoby typy
                // jako nadmiarowa właściwość obiektu literalnego dopiero przy spreadzie
                // i po cichu nic by nie zwijało.
                ...(opts.tag ? { collapseId: opts.tag } : {}),
            }).catch(err => console.error('[Push] broadcastPush Expo error:', err));
        }
    }

    // Send push only to those with FCM tokens.
    // 🪤 Ten sam limit 1000 wierszy co przy odbiorcach wyżej — bez stronicowania
    // funkcja wysyłała do pierwszej tysiączki tokenów i raportowała sukces.
    const tokenRows: { fcm_token: string; user_id: string; user_type: string }[] = [];
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
            .from('fcm_tokens')
            .select('fcm_token, user_id, user_type')
            .eq('user_type', userType)
            .range(from, from + PAGE - 1);
        if (error) {
            console.error('[Push] broadcastPush: odczyt fcm_tokens padł:', error.message);
            break;
        }
        for (const r of data || []) tokenRows.push(r as typeof tokenRows[number]);
        if (!data || data.length < PAGE) break;
    }

    // Ta sama bramka aktywności co w pushToAllEmployees — dotyczy wyłącznie personelu.
    const activity = userType === 'patient' ? null : await loadStaffActivity();
    const tokens = (tokenRows || [])
        .filter(r => !activity || activity.isActive(r.user_id))
        .map(r => r.fcm_token);
    return sendToTokens(tokens, payload);
};
