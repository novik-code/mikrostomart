/**
 * Czat wewnętrzny zespołu (mig 183) — wspólna logika tras `/api/employee/messaging/*`.
 *
 * Interfejs wyłącznie w aplikacji mobilnej personelu (D8). Web nie dostaje ekranów.
 * Rozłączne z czatem pacjent↔recepcja (`chat_conversations` / `chat_messages`) — tamten
 * tor działa bez zmian.
 *
 * SZYFROWANIE (D5): `staff_messages.content` oraz `staff_conversations.last_message_preview`
 * trzymają SZYFROGRAM (AES-256-GCM, klucz SERWEROWY z `ENCRYPTION_KEY`). To NIE jest
 * end-to-end — serwer odszyfrowuje treść, żeby ją wyświetlić — i nie wolno tego tak
 * nazywać ani w kodzie, ani w UI. Zapis jest FAIL-CLOSED: gdy klucza brak, wysyłka jest
 * odrzucana, bo zapisany jawny tekst byłby przy odczycie nie do odróżnienia od szyfrogramu
 * i zostałby w bazie na zawsze.
 *
 * RETENCJA (D4) — egzekwowana PRZY ODCZYCIE, tutaj (`visibilityFloorIso`):
 *   · kanał grupowy: zwykły pracownik widzi 12 ostatnich miesięcy, ADMIN widzi wszystko
 *     (to jest owo „archiwum widoczne wyłącznie dla admina"),
 *   · DM: nikt nie widzi starszych niż 12 miesięcy; twarde kasowanie robi cron retencyjny.
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
    encryptStringToBase64,
    tryDecryptString,
    isEncryptionConfigured,
} from '@/lib/fieldEncryption';
import { logAudit } from '@/lib/auditLog';
import { checkRateLimit } from '@/lib/rateLimit';
import { pushToStaffMembers, loadStaffActivity } from '@/lib/pushService';
import { getStaffChatPush } from '@/lib/pushTranslations';
import { STAFF_CHAT_CHANNEL } from '@/lib/expoPush';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Stałe kontraktu ──────────────────────────────────────────────────────────

/** Limit długości treści. Istniejący czat pacjenta nie ma żadnego — nie powielamy tego. */
export const MAX_CONTENT_LENGTH = 4000;
/** Podgląd na liście wątków (jawny tekst przed zaszyfrowaniem). */
export const PREVIEW_MAX_LENGTH = 80;
export const RETENTION_MONTHS = 12;
/** Wysyłka: 30 wiadomości na minutę na użytkownika. */
export const SEND_RATE_LIMIT = { max: 30, windowMs: 60_000 };
/** Zakładanie/otwieranie wątków: 20 na minutę (get-or-create jest idempotentny). */
export const CONVERSATION_RATE_LIMIT = { max: 20, windowMs: 60_000 };

export const GROUP_TITLE = 'Zespół Mikrostomart';

/** Deep-link apki. `czat` jest zajęty przez czat pacjent↔recepcja. */
export const DEEP_LINK_PREFIX = '/czat-zespolu';

export const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
};

/** Klientowi nigdy surowy błąd Postgresa — tylko komunikat po polsku + kod. */
export function jsonNoStore(body: unknown, status = 200): NextResponse {
    return NextResponse.json(body as Record<string, unknown>, { status, headers: NO_STORE_HEADERS });
}

export function errorJson(message: string, status: number, code?: string): NextResponse {
    return jsonNoStore(code ? { error: message, code } : { error: message }, status);
}

/**
 * Brak członkostwa = 404, nigdy 403 — 403 potwierdzałby, że wątek o tym id istnieje.
 * Ten sam kształt zwracamy dla nieistniejącego id.
 */
export function notFoundJson(): NextResponse {
    return errorJson('Nie znaleziono rozmowy', 404, 'conversation_not_found');
}

// ─── Typy ─────────────────────────────────────────────────────────────────────

export type ConversationKind = 'dm' | 'group';

export interface ConversationRow {
    id: string;
    kind: ConversationKind;
    title: string | null;
    dm_key: string | null;
    created_by: string;
    status: string;
    last_message_at: string;
    last_message_preview: string | null;
    last_message_sender_id: string | null;
    created_at: string;
}

export interface MemberRow {
    conversation_id: string;
    user_id: string;
    role: string;
    last_read_at: string | null;
    muted: boolean;
    joined_at: string;
    left_at: string | null;
}

export interface MessageRow {
    id: string;
    conversation_id: string;
    sender_user_id: string;
    sender_name_snapshot: string;
    kind: 'text' | 'system';
    content: string;
    ref_task_id: string | null;
    ref_patient_prodentis_id: string | null;
    ref_appointment_id: string | null;
    ref_appointment_at: string | null;
    client_msg_id: string | null;
    has_attachments: boolean;
    created_at: string;
    edited_at: string | null;
    deleted_at: string | null;
    deleted_by: string | null;
}

export interface ConversationDto {
    id: string;
    kind: ConversationKind;
    title: string | null;
    status: string;
    /** Nazwa do wyświetlenia: DM → rozmówca, grupa → tytuł kanału. */
    displayName: string;
    counterpartUserId: string | null;
    memberCount: number;
    lastMessageAt: string;
    lastMessagePreview: string;
    lastMessageSenderId: string | null;
    lastMessageSenderName: string | null;
    lastMessageFromMe: boolean;
    unreadCount: number;
    muted: boolean;
    lastReadAt: string | null;
    /** Najstarsza widoczna dla TEGO odbiorcy wiadomość (D4). null = bez ograniczenia (admin w grupie). */
    visibleFromAt: string | null;
    createdAt: string;
}

export interface MessageDto {
    id: string;
    conversationId: string;
    senderUserId: string;
    senderName: string;
    fromMe: boolean;
    kind: 'text' | 'system';
    content: string;
    /** true = szyfrogram jest, ale odszyfrowanie się nie udało (brak/zmiana klucza). */
    contentUnavailable: boolean;
    refTaskId: string | null;
    refPatientProdentisId: string | null;
    refAppointmentId: string | null;
    refAppointmentAt: string | null;
    clientMsgId: string | null;
    hasAttachments: boolean;
    createdAt: string;
    editedAt: string | null;
    isDeleted: boolean;
}

const CONVERSATION_COLUMNS =
    'id, kind, title, dm_key, created_by, status, last_message_at, last_message_preview, last_message_sender_id, created_at';

export const MESSAGE_COLUMNS =
    'id, conversation_id, sender_user_id, sender_name_snapshot, kind, content, ref_task_id, ' +
    'ref_patient_prodentis_id, ref_appointment_id, ref_appointment_at, client_msg_id, ' +
    'has_attachments, created_at, edited_at, deleted_at, deleted_by';

// ─── Walidatory ───────────────────────────────────────────────────────────────

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRODENTIS_ID_RE = /^[0-9]{6,12}$/;
const APPOINTMENT_AT_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/;

/**
 * Identyfikator wizyty z Prodentisa. W repo jest to ciąg NIEPRZEZROCZYSTY (`id` z
 * `/api/appointments/by-date`, patrz `src/app/api/employee/schedule/route.ts` i
 * `src/lib/pms/prodentis-adapter.ts`), który trasy grafiku wstawiają WPROST do ścieżki
 * URL-a PMS-u (`/api/schedule/appointment/${appointmentId}/color`) — czyli z natury
 * jest alfanumeryczny, bez spacji i bez polskich znaków.
 *
 * D3: to było JEDYNE pole referencyjne wiadomości bez wzorca — a że zapisujemy je bez
 * szyfrowania, dało się nim przemycić do bazy nazwisko i telefon pacjenta. Wzorzec
 * odrzuca spację, przecinek, znaki diakrytyczne i sam ciąg liter; wymagana jest też co
 * najmniej jedna cyfra — każdy realny identyfikator wizyty ją ma, a „Kowalski" nie.
 * (Gdyby PMS kiedyś oddał identyfikator bez cyfry, to jest ta jedna linia do poluzowania.)
 * Sam ciąg cyfr przejdzie zawsze — numeru telefonu od identyfikatora nie odróżni żaden
 * wzorzec; przed tym broni zakaz z FORBIDDEN_PATIENT_FIELDS i limit długości.
 *
 * CHECK w schemacie (mig 183, dokłada go inny agent) ma być tą samą parą warunków:
 *   ref_appointment_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$' AND ref_appointment_id ~ '[0-9]'
 */
const APPOINTMENT_ID_RE = /^(?=.*[0-9])[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/**
 * `/api/employee/staff` zwraca id DWOJAKIE: prawdziwe UUID kont oraz sztuczne
 * `emp-<id>` dla pracownika BEZ konta (wzorzec odsiewania: src/lib/taskAssignees.ts).
 * Wpuszczenie `emp-*` dałoby wiadomość bez odbiorcy, a log powiadomień SKŁAMAŁBY,
 * że wysłano.
 */
export function isRealUserId(value: unknown): value is string {
    return typeof value === 'string' && UUID_RE.test(value);
}

export function isProdentisId(value: unknown): value is string {
    return typeof value === 'string' && PRODENTIS_ID_RE.test(value);
}

export function isAppointmentAt(value: unknown): value is string {
    return typeof value === 'string' && APPOINTMENT_AT_RE.test(value);
}

export function isAppointmentId(value: unknown): value is string {
    return typeof value === 'string' && APPOINTMENT_ID_RE.test(value);
}

/**
 * Kanoniczny `dm_key`: dwa UUID-y MAŁYMI literami, rozdzielone ':', mniejszy pierwszy.
 * Bez sortowania ta sama para założyłaby dwa wątki i każda ze stron widziałaby
 * połowę ustaleń; baza pilnuje tego CHECK-iem, więc zły format = 23514.
 */
export function buildDmKey(a: string, b: string): string {
    const left = a.toLowerCase();
    const right = b.toLowerCase();
    return [left, right].sort().join(':');
}

/** Najstarsza data widoczna dla odbiorcy (D4). null = pełne archiwum (admin w grupie). */
export function visibilityFloorIso(kind: ConversationKind, isAdmin: boolean): string | null {
    if (kind === 'group' && isAdmin) return null;
    return retentionCutoffIso();
}

export function retentionCutoffIso(now: Date = new Date()): string {
    const cutoff = new Date(now.getTime());
    cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
    return cutoff.toISOString();
}

// ─── Szyfrowanie treści ───────────────────────────────────────────────────────

export class EncryptionUnavailableError extends Error {
    constructor() {
        super('ENCRYPTION_KEY missing — staff messaging write refused');
        this.name = 'EncryptionUnavailableError';
    }
}

export { isEncryptionConfigured };

/**
 * Pusty string to UMOWNA wartość „wiadomość bez tekstu" (sam załącznik) — NIE szyfrogram
 * pustego stringa. Dzięki temu odczyt nie musi zgadywać, czy deszyfracja padła.
 */
export function encryptMessageText(plain: string): string {
    if (plain === '') return '';
    if (!isEncryptionConfigured()) throw new EncryptionUnavailableError();
    return encryptStringToBase64(plain);
}

export function decryptMessageText(stored: string | null | undefined): {
    text: string;
    unavailable: boolean;
} {
    if (!stored) return { text: '', unavailable: false };
    const plain = tryDecryptString(stored);
    if (plain === null) return { text: '', unavailable: true };
    return { text: plain, unavailable: false };
}

/** Jawny podgląd przed zaszyfrowaniem. Pusty = wiadomość bez tekstu. */
export function buildPreviewPlain(content: string, hasAttachments: boolean): string {
    const trimmed = content.trim();
    if (trimmed) {
        return trimmed.length > PREVIEW_MAX_LENGTH
            ? `${trimmed.slice(0, PREVIEW_MAX_LENGTH - 1)}…`
            : trimmed;
    }
    return hasAttachments ? '[załącznik]' : '';
}

// ─── Personel: aktywne konta i nazwy ──────────────────────────────────────────

interface RoleRow { user_id: string; email: string | null }
/** Etykieta zastępująca nazwisko pracownika, który odszedł z zespołu. */
const FORMER_EMPLOYEE_NAME = 'Były pracownik';

interface EmployeeRow { user_id: string | null; email: string | null; name: string | null; is_active?: boolean }

/**
 * Aktywny personel Z KONTEM. Źródłem prawdy o koncie jest `user_roles`
 * (employee|admin); `employees.is_active = false` (offboarding) wyklucza.
 * Konto z rolą, ale bez kartoteki w `employees`, zostaje wpuszczone — tak wygląda
 * np. samo konto administratora.
 */
export async function listActiveStaffUserIds(): Promise<string[]> {
    const { data: roleData, error: roleErr } = await supabase
        .from('user_roles')
        .select('user_id, email')
        .in('role', ['employee', 'admin']);
    if (roleErr) {
        console.error('[StaffMessaging] user_roles error:', roleErr.message);
        return [];
    }
    // JEDEN sposób rozstrzygania „aktywny pracownik" dla całego repo (pushService).
    // Wcześniej ta funkcja traktowała NULL jako NIEAKTYWNY, a warstwa push jako AKTYWNY —
    // przy nullowalnej kolumnie dawało to katalog pokazujący osobę jako dostępną i wysyłkę
    // odbijającą ją błędem. Indeks jest też odporny na zdublowane wiersze pracownika.
    const activity = await loadStaffActivity();

    const out = new Set<string>();
    for (const row of (roleData ?? []) as RoleRow[]) {
        if (!isRealUserId(row.user_id)) continue;
        if (!activity.isActive(row.user_id, row.email ?? null)) continue;
        out.add(row.user_id);
    }
    return Array.from(out);
}

export async function isActiveStaffUser(userId: string): Promise<boolean> {
    const ids = await listActiveStaffUserIds();
    // Porównanie bez względu na wielkość liter: Postgres oddaje UUID małymi, ale apka
    // może przysłać id przepisane wielkimi i wtedy „nie jest pracownikiem" byłoby kłamstwem.
    const needle = userId.toLowerCase();
    return ids.some((id) => id.toLowerCase() === needle);
}

/** user_id → nazwa do wyświetlenia. Fallback: e-mail, a na końcu neutralne „Pracownik". */
export async function resolveStaffNames(userIds: string[]): Promise<Map<string, string>> {
    const ids = Array.from(new Set(userIds.filter(isRealUserId)));
    const names = new Map<string, string>();
    if (ids.length === 0) return names;

    const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id, email')
        .in('user_id', ids);
    const emailByUser = new Map<string, string>();
    for (const row of (roleData ?? []) as RoleRow[]) {
        if (row.email && !emailByUser.has(row.user_id)) emailByUser.set(row.user_id, row.email);
    }

    const { data: empByUser } = await supabase
        .from('employees')
        .select('user_id, email, name')
        .in('user_id', ids);
    for (const row of (empByUser ?? []) as EmployeeRow[]) {
        if (row.user_id && row.name) names.set(row.user_id, row.name);
    }

    // Część kartotek ma wypełniony wyłącznie e-mail (konto założone później niż wpis).
    const missingEmails = ids
        .filter((id) => !names.has(id))
        .map((id) => emailByUser.get(id))
        .filter((e): e is string => !!e);
    if (missingEmails.length > 0) {
        const { data: empByEmail } = await supabase
            .from('employees')
            .select('user_id, email, name')
            .in('email', missingEmails);
        const nameByEmail = new Map<string, string>();
        for (const row of (empByEmail ?? []) as EmployeeRow[]) {
            if (row.email && row.name) nameByEmail.set(row.email.toLowerCase(), row.name);
        }
        for (const id of ids) {
            if (names.has(id)) continue;
            const email = emailByUser.get(id);
            const byEmail = email ? nameByEmail.get(email.toLowerCase()) : undefined;
            if (byEmail) names.set(id, byEmail);
        }
    }

    for (const id of ids) {
        if (!names.has(id)) names.set(id, emailByUser.get(id) ?? 'Pracownik');
    }

    // ANONIMIZACJA ODCHODZĄCEGO (decyzja właściciela). Dezaktywacja czyści zapisany
    // snapshot nazwiska w wiadomościach, ale nagłówek rozmowy i skład wątku biorą nazwę
    // ŻYWO z kartoteki — bez tego kroku druga strona dalej widziałaby pełne nazwisko
    // osoby, która odeszła z zespołu. Rozmowy zostają (to jej historia ustaleń),
    // nazwisko znika.
    const activity = await loadStaffActivity();
    if (activity.resolved) {
        for (const id of ids) {
            if (!activity.isActive(id, emailByUser.get(id) ?? null)) {
                names.set(id, FORMER_EMPLOYEE_NAME);
            }
        }
    }
    return names;
}

// ─── Wątki: odczyt, get-or-create, członkostwa ────────────────────────────────

export async function getConversation(conversationId: string): Promise<ConversationRow | null> {
    const { data, error } = await supabase
        .from('staff_conversations')
        .select(CONVERSATION_COLUMNS)
        .eq('id', conversationId)
        .maybeSingle();
    if (error) {
        console.error('[StaffMessaging] getConversation error:', error.message);
        return null;
    }
    return (data as ConversationRow | null) ?? null;
}

/** Członkostwo AKTYWNE (left_at IS NULL). Brak = wołający nie ma prawa do wątku. */
export async function getActiveMembership(
    conversationId: string,
    userId: string
): Promise<MemberRow | null> {
    const { data, error } = await supabase
        .from('staff_conversation_members')
        .select('conversation_id, user_id, role, last_read_at, muted, joined_at, left_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .is('left_at', null)
        .maybeSingle();
    if (error) {
        console.error('[StaffMessaging] membership error:', error.message);
        return null;
    }
    return (data as MemberRow | null) ?? null;
}

/**
 * Dopisuje członkostwo, jeśli go nie ma (ON CONFLICT DO NOTHING).
 * `last_read_at = teraz` dla dołączających automatycznie — inaczej nowa osoba
 * zobaczyłaby licznik „200 nieprzeczytanych" z historii sprzed swojego zatrudnienia.
 * Wiersz z ustawionym `left_at` (świadome usunięcie / offboarding) NIE jest wskrzeszany.
 */
export async function ensureMembership(
    conversationId: string,
    userId: string,
    opts: { markRead?: boolean } = {}
): Promise<MemberRow | null> {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
        .from('staff_conversation_members')
        .upsert(
            {
                conversation_id: conversationId,
                user_id: userId,
                role: 'member',
                last_read_at: opts.markRead === false ? null : nowIso,
                joined_at: nowIso,
            },
            { onConflict: 'conversation_id,user_id', ignoreDuplicates: true }
        );
    if (error) {
        console.error('[StaffMessaging] ensureMembership error:', error.message);
    }
    return getActiveMembership(conversationId, userId);
}

/**
 * Kanał zespołu ma wszystkich aktywnych pracowników z kontem.
 * Wołane przy utworzeniu kanału ORAZ przed ogłoszeniem admina — inaczej osoba,
 * która nigdy nie otworzyła zakładki czatu, nie dostałaby push-a z ogłoszeniem,
 * mimo że ma zarejestrowany token (rejestruje go moduł zadań).
 */
export async function syncGroupMembers(conversationId: string): Promise<number> {
    const userIds = await listActiveStaffUserIds();
    if (userIds.length === 0) return 0;
    const nowIso = new Date().toISOString();
    const rows = userIds.map((uid) => ({
        conversation_id: conversationId,
        user_id: uid,
        role: 'member',
        last_read_at: nowIso,
        joined_at: nowIso,
    }));
    const { error } = await supabase
        .from('staff_conversation_members')
        .upsert(rows, { onConflict: 'conversation_id,user_id', ignoreDuplicates: true });
    if (error) {
        console.error('[StaffMessaging] syncGroupMembers error:', error.message);
        return 0;
    }
    return rows.length;
}

/**
 * Kanał zespołu jest DOKŁADNIE JEDEN (unikalny indeks częściowy na `kind`).
 * Drugi INSERT dostaje 23505 — wtedy przechodzimy na SELECT, zamiast oddawać błąd.
 */
export async function getOrCreateGroupConversation(
    creatorUserId: string
): Promise<{ conversation: ConversationRow; created: boolean } | null> {
    const { data: existing, error: selErr } = await supabase
        .from('staff_conversations')
        .select(CONVERSATION_COLUMNS)
        .eq('kind', 'group')
        .limit(1)
        .maybeSingle();
    if (selErr) {
        console.error('[StaffMessaging] group select error:', selErr.message);
        return null;
    }
    if (existing) return { conversation: existing as ConversationRow, created: false };

    const { data: created, error: insErr } = await supabase
        .from('staff_conversations')
        .insert({
            kind: 'group',
            title: GROUP_TITLE,
            created_by: creatorUserId,
            status: 'open',
        })
        .select(CONVERSATION_COLUMNS)
        .single();

    if (insErr) {
        if (insErr.code === '23505') {
            const { data: raced } = await supabase
                .from('staff_conversations')
                .select(CONVERSATION_COLUMNS)
                .eq('kind', 'group')
                .limit(1)
                .maybeSingle();
            if (raced) return { conversation: raced as ConversationRow, created: false };
        }
        console.error('[StaffMessaging] group insert error:', insErr.message);
        return null;
    }

    const conversation = created as ConversationRow;
    await syncGroupMembers(conversation.id);
    return { conversation, created: true };
}

/** Get-or-create DM po `dm_key` — idempotentne niezależnie od tego, kto zaczyna. */
export async function getOrCreateDmConversation(
    currentUserId: string,
    recipientUserId: string
): Promise<{ conversation: ConversationRow; created: boolean } | null> {
    const dmKey = buildDmKey(currentUserId, recipientUserId);

    const { data: existing, error: selErr } = await supabase
        .from('staff_conversations')
        .select(CONVERSATION_COLUMNS)
        .eq('kind', 'dm')
        .eq('dm_key', dmKey)
        .maybeSingle();
    if (selErr) {
        console.error('[StaffMessaging] dm select error:', selErr.message);
        return null;
    }
    if (existing) {
        // Wątek mógł powstać, zanim któraś ze stron dostała członkostwo (np. po ręcznym
        // usunięciu wiersza) — dopięcie jest darmowe, bo to INSERT ... DO NOTHING.
        await ensureMembership(existing.id as string, currentUserId);
        await ensureMembership(existing.id as string, recipientUserId, { markRead: false });
        return { conversation: existing as ConversationRow, created: false };
    }

    const { data: created, error: insErr } = await supabase
        .from('staff_conversations')
        .insert({
            kind: 'dm',
            dm_key: dmKey,
            title: null,
            created_by: currentUserId,
            status: 'open',
        })
        .select(CONVERSATION_COLUMNS)
        .single();

    if (insErr) {
        if (insErr.code === '23505') {
            const { data: raced } = await supabase
                .from('staff_conversations')
                .select(CONVERSATION_COLUMNS)
                .eq('kind', 'dm')
                .eq('dm_key', dmKey)
                .maybeSingle();
            if (raced) {
                await ensureMembership(raced.id as string, currentUserId);
                await ensureMembership(raced.id as string, recipientUserId, { markRead: false });
                return { conversation: raced as ConversationRow, created: false };
            }
        }
        console.error('[StaffMessaging] dm insert error:', insErr.message);
        return null;
    }

    const conversation = created as ConversationRow;
    await ensureMembership(conversation.id, currentUserId);
    // Odbiorca celowo BEZ `last_read_at` — pierwsza wiadomość ma mu się policzyć jako nowa.
    await ensureMembership(conversation.id, recipientUserId, { markRead: false });
    return { conversation, created: true };
}

// ─── Liczniki i opisy wątków ──────────────────────────────────────────────────

export async function countUnread(
    conversationId: string,
    userId: string,
    lastReadAt: string | null,
    kind: ConversationKind,
    isAdmin: boolean
): Promise<number> {
    let query = supabase
        .from('staff_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .neq('sender_user_id', userId)
        .is('deleted_at', null);

    if (lastReadAt) query = query.gt('created_at', lastReadAt);
    const floor = visibilityFloorIso(kind, isAdmin);
    if (floor) query = query.gte('created_at', floor);

    const { count, error } = await query;
    if (error) {
        console.error('[StaffMessaging] countUnread error:', error.message);
        return 0;
    }
    return count ?? 0;
}

/**
 * Pełny opis wątków dla listy w apce — podgląd ostatniej wiadomości, licznik
 * nieprzeczytanych i nazwa rozmówcy w JEDNYM przebiegu, żeby apka nie dopytywała.
 *
 * BRAMKA CZŁONKOSTWA (tutaj, nie u wołającego): wynik niesie ODSZYFROWANY podgląd
 * ostatniej wiadomości i licznik nieprzeczytanych, więc wątek, w którym `viewerUserId`
 * nie ma AKTYWNEGO członkostwa (`left_at IS NULL`), wypada z odpowiedzi — nawet gdy
 * trasa poda jego id. Bez tego wystarczyłaby jedna trasa, która nie sprawdzi
 * członkostwa (albo sprawdzi je przed zamknięciem wiersza przy odejściu pracownika),
 * żeby podgląd cudzej korespondencji wyciekł razem z licznikiem CAŁEGO wątku:
 * `countUnread` bez `last_read_at` liczy wszystko, co mieści się w oknie retencji.
 */
export async function describeConversations(
    conversationIds: string[],
    viewerUserId: string,
    isAdmin: boolean
): Promise<ConversationDto[]> {
    const ids = Array.from(new Set(conversationIds));
    if (ids.length === 0) return [];

    const { data: convData, error: convErr } = await supabase
        .from('staff_conversations')
        .select(CONVERSATION_COLUMNS)
        .in('id', ids)
        .order('last_message_at', { ascending: false });
    if (convErr) {
        console.error('[StaffMessaging] describeConversations error:', convErr.message);
        return [];
    }
    const requested = (convData ?? []) as ConversationRow[];
    if (requested.length === 0) return [];

    const { data: memberData, error: memberErr } = await supabase
        .from('staff_conversation_members')
        .select('conversation_id, user_id, role, last_read_at, muted, joined_at, left_at')
        .in('conversation_id', ids);
    if (memberErr) {
        // Błąd odczytu składu = brak dowodu na członkostwo. Fail-closed: pusta lista,
        // bo alternatywą byłoby wydanie podglądów bez sprawdzenia bramki.
        console.error('[StaffMessaging] describeConversations members error:', memberErr.message);
        return [];
    }
    const members = (memberData ?? []) as MemberRow[];

    // Postgres oddaje UUID małymi literami, apka może przysłać id przepisane wielkimi —
    // porównujemy bez względu na wielkość liter, żeby bramka nie odcięła właściciela wątku.
    const viewerKey = viewerUserId.toLowerCase();
    const isViewer = (uid: string) => uid.toLowerCase() === viewerKey;

    const mine = new Map<string, MemberRow>();
    const byConversation = new Map<string, MemberRow[]>();
    for (const m of members) {
        if (isViewer(m.user_id) && !m.left_at) mine.set(m.conversation_id, m);
        const list = byConversation.get(m.conversation_id) ?? [];
        list.push(m);
        byConversation.set(m.conversation_id, list);
    }

    const conversations = requested.filter((conv) => mine.has(conv.id));
    if (conversations.length === 0) return [];

    const nameTargets: string[] = [];
    for (const conv of conversations) {
        if (conv.last_message_sender_id) nameTargets.push(conv.last_message_sender_id);
        if (conv.kind === 'dm') {
            for (const m of byConversation.get(conv.id) ?? []) {
                if (!isViewer(m.user_id)) nameTargets.push(m.user_id);
            }
        }
    }
    const names = await resolveStaffNames(nameTargets);

    const unreadCounts = await Promise.all(
        conversations.map((conv) =>
            countUnread(conv.id, viewerUserId, mine.get(conv.id)?.last_read_at ?? null, conv.kind, isAdmin)
        )
    );

    return conversations.map((conv, idx) => {
        // Niepuste z definicji — filtr wyżej przepuścił wyłącznie wątki z aktywnym
        // członkostwem wołającego.
        const membership = mine.get(conv.id) ?? null;
        const all = byConversation.get(conv.id) ?? [];
        const counterpart = conv.kind === 'dm'
            ? all.find((m) => !isViewer(m.user_id)) ?? null
            : null;
        const preview = decryptMessageText(conv.last_message_preview);
        // D4: gdy sama ostatnia wiadomość wypadła już poza okno widoczności, podgląd też
        // musi zniknąć — inaczej lista pokazywałaby treść, której wątek już nie wyda.
        const floorForConv = visibilityFloorIso(conv.kind, isAdmin);
        const previewVisible =
            !floorForConv || Date.parse(conv.last_message_at) >= Date.parse(floorForConv);

        return {
            id: conv.id,
            kind: conv.kind,
            title: conv.title,
            status: conv.status,
            displayName: conv.kind === 'dm'
                ? (counterpart ? names.get(counterpart.user_id) ?? 'Pracownik' : 'Rozmowa prywatna')
                : conv.title ?? GROUP_TITLE,
            counterpartUserId: counterpart?.user_id ?? null,
            memberCount: all.filter((m) => !m.left_at).length,
            lastMessageAt: conv.last_message_at,
            lastMessagePreview: previewVisible ? preview.text : '',
            lastMessageSenderId: conv.last_message_sender_id,
            lastMessageSenderName: conv.last_message_sender_id
                ? names.get(conv.last_message_sender_id) ?? null
                : null,
            lastMessageFromMe: !!conv.last_message_sender_id && isViewer(conv.last_message_sender_id),
            unreadCount: unreadCounts[idx],
            muted: membership?.muted ?? false,
            lastReadAt: membership?.last_read_at ?? null,
            visibleFromAt: floorForConv,
            createdAt: conv.created_at,
        };
    });
}

export function mapMessageRow(row: MessageRow, viewerUserId: string): MessageDto {
    const isDeleted = !!row.deleted_at;
    const decrypted = isDeleted ? { text: '', unavailable: false } : decryptMessageText(row.content);
    return {
        id: row.id,
        conversationId: row.conversation_id,
        senderUserId: row.sender_user_id,
        senderName: row.sender_name_snapshot,
        fromMe: row.sender_user_id === viewerUserId,
        kind: row.kind,
        content: decrypted.text,
        contentUnavailable: decrypted.unavailable,
        refTaskId: row.ref_task_id,
        refPatientProdentisId: row.ref_patient_prodentis_id,
        refAppointmentId: row.ref_appointment_id,
        refAppointmentAt: row.ref_appointment_at,
        clientMsgId: row.client_msg_id,
        hasAttachments: row.has_attachments,
        createdAt: row.created_at,
        editedAt: row.edited_at,
        isDeleted,
    };
}

/**
 * Denormalizowany podgląd na liście wątków. `lte` chroni przed cofnięciem podglądu,
 * gdy dwie wiadomości zapiszą się niemal równocześnie i wolniejsza dobiegnie ostatnia.
 */
export async function touchConversationPreview(
    conversationId: string,
    previewPlain: string,
    senderUserId: string,
    createdAtIso: string
): Promise<void> {
    let encryptedPreview: string | null = null;
    try {
        encryptedPreview = previewPlain ? encryptMessageText(previewPlain) : null;
    } catch (err) {
        // Podgląd jest wygodą, nie treścią — brak podglądu jest lepszy niż wywrócenie
        // zapisanej już wiadomości. Jawnego tekstu tu NIE zapisujemy w żadnym wypadku.
        console.error('[StaffMessaging] preview encrypt failed:', err);
        encryptedPreview = null;
    }
    const { error } = await supabase
        .from('staff_conversations')
        .update({
            last_message_at: createdAtIso,
            last_message_preview: encryptedPreview,
            last_message_sender_id: senderUserId,
        })
        .eq('id', conversationId)
        .lte('last_message_at', createdAtIso);
    if (error) {
        console.error('[StaffMessaging] touchConversationPreview error:', error.message);
    }
}

// ─── Powiadomienia ────────────────────────────────────────────────────────────

/** Aktywni odbiorcy wątku bez autora i bez tych, którzy wyciszyli wątek. */
export async function pushRecipients(
    conversationId: string,
    senderUserId: string
): Promise<string[]> {
    const { data, error } = await supabase
        .from('staff_conversation_members')
        .select('user_id, muted, left_at')
        .eq('conversation_id', conversationId)
        .is('left_at', null)
        .eq('muted', false);
    if (error) {
        console.error('[StaffMessaging] pushRecipients error:', error.message);
        return [];
    }
    return (data as Array<{ user_id: string }>)
        .map((r) => r.user_id)
        .filter((uid) => uid !== senderUserId && isRealUserId(uid));
}

/**
 * D1: w kanale zespołu push wychodzi WYŁĄCZNIE od admina — ogłoszenie z automatycznym
 * push-em do kilkunastu osób przy swobodnym dostępie zamienia się w hałas, ludzie
 * wyciszają kanał i prawdziwe ogłoszenia przestają docierać. Wiadomość zwykłego
 * pracownika ląduje w kanale cicho (licznik nieprzeczytanych).
 * D2: w DM push leci zawsze.
 */
export function shouldPush(kind: ConversationKind, senderIsAdmin: boolean, messageKind: 'text' | 'system'): boolean {
    if (messageKind === 'system') return false;
    if (kind === 'dm') return true;
    return senderIsAdmin;
}

/**
 * Wysyłka jest NIEBLOKUJĄCA — błąd powiadomienia nie może wywrócić zapisanej wiadomości.
 * Treść push-a bierzemy z `getStaffChatPush` (pushTranslations) i NIGDY nie budujemy jej
 * tutaj: powiadomienie wisi na zablokowanym ekranie i ląduje w `push_notifications_log`,
 * więc treść wiadomości ani wzmianka o pacjencie nie mogą do niego trafić.
 */
export async function notifyNewMessage(params: {
    conversationId: string;
    kind: ConversationKind;
    messageId: string;
    senderUserId: string;
    senderName: string;
    senderIsAdmin: boolean;
    messageKind: 'text' | 'system';
}): Promise<{ pushed: boolean; recipients: number }> {
    try {
        if (!shouldPush(params.kind, params.senderIsAdmin, params.messageKind)) {
            return { pushed: false, recipients: 0 };
        }
        // Odsiew po stronie wątku (wyciszenie, opuszczenie, autor); `pushToStaffMembers`
        // dokłada własny odsiew kont nieaktywnych i `emp-*`.
        const recipients = await pushRecipients(params.conversationId, params.senderUserId);
        if (recipients.length === 0) return { pushed: false, recipients: 0 };

        // Locale apki personelu nie jest dziś nigdzie trzymane — 'pl' jak w pushTranslatedToUser.
        const { title, body } = getStaffChatPush(
            params.kind === 'dm' ? 'dm' : 'channel',
            'pl',
            params.kind === 'dm' ? params.senderName : null
        );

        const url = `${DEEP_LINK_PREFIX}/${params.conversationId}`;
        const tag = `staff-chat-${params.conversationId}`;
        const result = await pushToStaffMembers(
            recipients,
            {
                title,
                body,
                url,
                tag,
                data: {
                    type: 'staff_chat_message',
                    conversationId: params.conversationId,
                    conversationKind: params.kind,
                    messageId: params.messageId,
                    url,
                },
            },
            {
                excludeUserId: params.senderUserId,
                androidChannelId: STAFF_CHAT_CHANNEL,
                priority: 'high',
                // Seria wiadomości z jednego wątku zwija się w jedno powiadomienie.
                collapseId: tag,
            }
        );
        return { pushed: result.sent > 0, recipients: result.recipients.length };
    } catch (err) {
        console.error('[StaffMessaging] notifyNewMessage error:', err);
        return { pushed: false, recipients: 0 };
    }
}

// ─── Audyt (D5) ───────────────────────────────────────────────────────────────

export const AUDIT = {
    conversationCreated: 'staff_chat_conversation_created',
    dmOpened: 'staff_chat_dm_opened',
    dmMessagesRead: 'staff_chat_dm_messages_read',
    dmListViewed: 'staff_chat_dm_list_viewed',
    messageSent: 'staff_chat_message_sent',
    patientReference: 'staff_chat_patient_reference',
} as const;

export const AUDIT_RESOURCE_CONVERSATION = 'staff_conversation';
export const AUDIT_RESOURCE_MESSAGE = 'staff_message';

/**
 * Ślad w audycie NIGDY nie zawiera treści wiadomości ani nazwiska pacjenta —
 * wyłącznie kto, kiedy, który wątek (i identyfikator Prodentisa przy wzmiance,
 * bo to właśnie ten fakt podlega rozliczeniu).
 */
export function auditConversationAccess(params: {
    userId: string;
    userEmail: string;
    action: string;
    conversationId: string;
    metadata?: Record<string, unknown>;
    request?: Request;
}): void {
    void logAudit({
        userId: params.userId,
        userEmail: params.userEmail,
        action: params.action,
        resourceType: AUDIT_RESOURCE_CONVERSATION,
        resourceId: params.conversationId,
        metadata: params.metadata ?? {},
        request: params.request,
    });
}

// ─── Audyt odczytu listy DM: dławienie z uczciwym licznikiem ──────────────────

/**
 * Okno dławienia wpisu audytowego dla listy wątków. Lista niesie ODSZYFROWANY podgląd
 * ostatniej wiadomości DM, więc jej pobranie jest dostępem do treści prywatnej
 * korespondencji i podlega obietnicy „każdy programowy dostęp zostawia ślad" (D5).
 *
 * DLACZEGO 60 SEKUND (było 15 minut): apka odpytuje listę cyklicznie, więc kwadrans
 * dławienia zwijał kilkadziesiąt realnych odczytów w JEDEN wpis — z takiego śladu nie
 * dało się odtworzyć, ile razy ktoś naprawdę oglądał podglądy cudzych rozmów, a przy
 * sporze „ile razy zaglądałeś" audyt mówiłby mniej, niż wynosi prawda. Minuta to
 * najkrótsze okno, przy którym `employee_audit_log` nadal się nie zapycha: górna
 * granica to 60 wpisów na godzinę na osobę FAKTYCZNIE korzystającą z czatu (rząd
 * 1-2 tysięcy wpisów dziennie dla całego zespołu), zamiast jednego wpisu na odczyt
 * (kilkanaście tysięcy). Uczciwość dokłada `suppressedReads`: każdy wpis niesie liczbę
 * odczytów, które od poprzedniego wpisu NIE dostały własnego śladu, więc suma
 * `1 + suppressedReads` po wpisach odtwarza pełną liczbę odczytów listy.
 */
export const DM_LIST_AUDIT_WINDOW_MS = 60_000;

/**
 * Ile okien wstecz szukamy poprzedniego odczytu, żeby policzyć pominięte. Wiersz
 * licznika żyje dokładnie tyle (TTL podawany `checkRateLimit`) — CELOWO dłużej niż samo
 * okno, bo licznik okna N czytamy dopiero przy pierwszym odczycie okna N+1 (albo
 * późniejszego, gdy ktoś na chwilę odłożył telefon).
 */
const DM_LIST_AUDIT_LOOKBACK_WINDOWS = 60;
const DM_LIST_AUDIT_COUNTER_TTL_MS = DM_LIST_AUDIT_WINDOW_MS * DM_LIST_AUDIT_LOOKBACK_WINDOWS;
const DM_LIST_AUDIT_KEY_PREFIX = 'staffmsg-dmlist-audit';

export interface DmListAuditDecision {
    /** true = TEN odczyt ma zostawić wpis w audycie. */
    log: boolean;
    /**
     * Odczyty listy DM od poprzedniego wpisu, które zostały zdławione (bez własnego
     * wpisu). `null` = licznika nie dało się odczytać, czyli liczba jest NIEZNANA —
     * i tak musi to być widać w metadanych, bo „0" byłoby tu kłamstwem.
     */
    suppressedReads: number | null;
}

/**
 * Numer okna wchodzi do KLUCZA licznika: pierwszy odczyt w oknie dostaje `count = 1`
 * (przechodzi bramkę i loguje), kolejne są dławione, ale licznik dalej rośnie i zostaje
 * w bazie — stamtąd następny wpis bierze liczbę pominiętych odczytów.
 */
function dmListAuditKey(userId: string, windowIndex: number): string {
    return `${DM_LIST_AUDIT_KEY_PREFIX}:${userId}:${windowIndex}`;
}

/**
 * Ile odczytów zostało zdławionych od poprzedniego wpisu. Bierzemy NAJŚWIEŻSZE
 * wcześniejsze okno, w którym w ogóle był odczyt: jego pierwszy odczyt dostał własny
 * wpis, reszta (`count - 1`) była dławiona. Starsze okna rozliczyły się własnymi
 * wpisami, więc nic nie liczymy podwójnie.
 */
async function countSuppressedDmListReads(
    userId: string,
    windowIndex: number
): Promise<number | null> {
    const keys: string[] = [];
    for (let back = 1; back <= DM_LIST_AUDIT_LOOKBACK_WINDOWS; back++) {
        keys.push(dmListAuditKey(userId, windowIndex - back));
    }
    // Licznik trzyma `rate_limit_entries` (klucz = PK, więc to punktowe trafienia w indeks).
    // Czytamy go WYŁĄCZNIE do audytu i wyłącznie na ścieżce zapisu wpisu (max raz na okno).
    const { data, error } = await supabase
        .from('rate_limit_entries')
        .select('key, count')
        .in('key', keys);
    if (error) {
        console.error('[StaffMessaging] dm list audit counter error:', error.message);
        return null;
    }

    const rows = (data ?? []) as Array<{ key: string; count: number | null }>;
    let newestWindow = -1;
    let newestCount = 0;
    for (const row of rows) {
        const parsed = Number(row.key.slice(row.key.lastIndexOf(':') + 1));
        if (!Number.isFinite(parsed) || parsed <= newestWindow) continue;
        newestWindow = parsed;
        newestCount = Number(row.count) || 0;
    }
    // Brak wierszy = w tych oknach nie było odczytów (a nie: „nie wiemy") — TTL licznika
    // pokrywa cały zakres wstecz, więc wiersz może zniknąć dopiero wtedy, gdy sam wypada
    // z zakresu. Odczyty starsze niż godzina bezczynności zostają rozliczone własnymi
    // wpisami, nie tym licznikiem.
    return Math.max(0, newestCount - 1);
}

/**
 * Decyzja: logować ten odczyt listy DM czy nie, i ile odczytów zdławiono od ostatniego
 * wpisu. Wołane WYŁĄCZNIE wtedy, gdy odpowiedź faktycznie niesie podgląd treści DM —
 * pusta lista nie jest dostępem do treści i wpisu nie generuje.
 */
export async function decideDmListAudit(
    userId: string,
    now: Date = new Date()
): Promise<DmListAuditDecision> {
    const windowIndex = Math.floor(now.getTime() / DM_LIST_AUDIT_WINDOW_MS);
    const gate = await checkRateLimit(
        dmListAuditKey(userId, windowIndex),
        1,
        DM_LIST_AUDIT_COUNTER_TTL_MS
    );
    if (!gate.allowed) return { log: false, suppressedReads: 0 };

    return { log: true, suppressedReads: await countSuppressedDmListReads(userId, windowIndex) };
}

export { supabase as staffMessagingDb };
