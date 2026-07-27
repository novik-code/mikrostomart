import { NextRequest } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { checkRateLimit } from '@/lib/rateLimit';
import {
    AUDIT,
    CONVERSATION_RATE_LIMIT,
    DM_LIST_AUDIT_WINDOW_MS,
    auditConversationAccess,
    decideDmListAudit,
    describeConversations,
    ensureMembership,
    errorJson,
    getActiveMembership,
    getOrCreateDmConversation,
    getOrCreateGroupConversation,
    isActiveStaffUser,
    isRealUserId,
    jsonNoStore,
    notFoundJson,
    retentionCutoffIso,
    staffMessagingDb as db,
    type MemberRow,
} from '@/lib/staffMessaging';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employee/messaging/conversations
 *
 * Lista wątków zalogowanego pracownika — wyłącznie te, których JEST członkiem
 * (`left_at IS NULL`). Zwraca komplet danych potrzebnych liście w apce: podgląd
 * ostatniej wiadomości, licznik nieprzeczytanych i nazwę rozmówcy, bez dopytywania.
 *
 * Przy okazji domyka kanał zespołu: jeśli jeszcze nie istnieje — powstaje, a wołający
 * dostaje członkostwo. To jest ten „pierwszy wejście" z D1: nowa osoba dołącza sama,
 * bez czynności administracyjnej. Drugi punkt dołączania jest w POST /messages
 * (ogłoszenie admina), żeby ktoś, kto nigdy nie otworzył zakładki czatu, też dostał push.
 */
export async function GET(req: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const userId = auth.user.id;
    const isAdmin = auth.roles.includes('admin');

    try {
        const group = await getOrCreateGroupConversation(userId);

        const { data: memberData, error: memberErr } = await db
            .from('staff_conversation_members')
            .select('conversation_id, user_id, role, last_read_at, muted, joined_at, left_at')
            .eq('user_id', userId)
            .is('left_at', null);

        if (memberErr) {
            console.error('[Messaging] memberships error:', memberErr.message);
            return errorJson('Nie udało się pobrać rozmów', 500, 'db_error');
        }

        const memberships = (memberData ?? []) as MemberRow[];
        const ids = memberships.map((m) => m.conversation_id);

        // Dołączenie do kanału zespołu przy pierwszym wejściu. Wiersz z ustawionym
        // `left_at` NIE jest wskrzeszany — świadome usunięcie z kanału zostaje.
        if (group && !ids.includes(group.conversation.id)) {
            const joined = await ensureMembership(group.conversation.id, userId);
            if (joined) ids.push(group.conversation.id);
        }

        const conversations = await describeConversations(ids, userId, isAdmin);

        // D5: podgląd ostatniej wiadomości DM to już dostęp do treści. Apka odpytuje listę
        // cyklicznie, więc wpis per odpytanie zasypałby audyt — ale dławienie musi być
        // UCZCIWE: okno to 60 s (uzasadnienie przy DM_LIST_AUDIT_WINDOW_MS), a wpis niesie
        // liczbę odczytów zdławionych od poprzedniego wpisu. `null` = licznik niedostępny,
        // czyli liczba nieznana — i to też ma być widać, zamiast udawanego zera.
        const dmWithPreview = conversations.filter((c) => c.kind === 'dm' && c.lastMessagePreview);
        if (dmWithPreview.length > 0) {
            const audit = await decideDmListAudit(userId);
            if (audit.log) {
                auditConversationAccess({
                    userId,
                    userEmail: auth.user.email || '',
                    action: AUDIT.dmListViewed,
                    conversationId: dmWithPreview[0].id,
                    metadata: {
                        dmConversationIds: dmWithPreview.map((c) => c.id),
                        throttleWindowSeconds: DM_LIST_AUDIT_WINDOW_MS / 1000,
                        suppressedReads: audit.suppressedReads,
                        suppressedReadsKnown: audit.suppressedReads !== null,
                    },
                    request: req,
                });
            }
        }

        return jsonNoStore({
            conversations,
            groupConversationId: group?.conversation.id ?? null,
            retentionCutoffAt: retentionCutoffIso(),
            /** Admin widzi w kanale zespołu pełne archiwum (D4). */
            archiveVisible: isAdmin,
        });
    } catch (err) {
        console.error('[Messaging] GET conversations error:', err);
        return errorJson('Nie udało się pobrać rozmów', 500, 'server_error');
    }
}

/**
 * POST /api/employee/messaging/conversations
 *
 * Body:
 *   { "recipientUserId": "<uuid>" }  → get-or-create rozmowy prywatnej (DM),
 *   { "kind": "group" }              → zwraca (a przy pierwszym razie zakłada) kanał zespołu.
 *
 * Idempotentne: powtórzone wywołanie dla tej samej pary zwraca TEN SAM wątek
 * (`created: false`), bo `dm_key` jest kanoniczny i unikalny.
 */
export async function POST(req: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const userId = auth.user.id;
    const isAdmin = auth.roles.includes('admin');

    const limit = await checkRateLimit(
        `staffmsg-conv:${userId}`,
        CONVERSATION_RATE_LIMIT.max,
        CONVERSATION_RATE_LIMIT.windowMs
    );
    if (!limit.allowed) {
        return errorJson('Zbyt wiele prób. Spróbuj za chwilę.', 429, 'rate_limited');
    }

    let body: Record<string, unknown>;
    try {
        body = (await req.json()) as Record<string, unknown>;
    } catch {
        return errorJson('Nieprawidłowe dane wejściowe', 400, 'invalid_body');
    }

    try {
        const kind = typeof body.kind === 'string' ? body.kind : undefined;
        const recipientUserId = body.recipientUserId;

        // ── Kanał zespołu ────────────────────────────────────────────────────
        if (kind === 'group' || (!recipientUserId && kind !== 'dm')) {
            const group = await getOrCreateGroupConversation(userId);
            if (!group) return errorJson('Nie udało się otworzyć kanału zespołu', 500, 'db_error');
            // Wynik dołączenia MUSI być sprawdzony: `ensureMembership` świadomie NIE
            // wskrzesza wiersza z ustawionym `left_at` (usunięcie z kanału / odejście
            // pracownika), więc `null` = brak prawa do wątku. Bez tego sprawdzenia osoba
            // z zamkniętym członkostwem dostawała 200 z odszyfrowanym podglądem treści.
            const membership = await ensureMembership(group.conversation.id, userId);
            if (!membership) return notFoundJson();
            const [dto] = await describeConversations([group.conversation.id], userId, isAdmin);
            if (group.created) {
                auditConversationAccess({
                    userId,
                    userEmail: auth.user.email || '',
                    action: AUDIT.conversationCreated,
                    conversationId: group.conversation.id,
                    metadata: { kind: 'group' },
                    request: req,
                });
            }
            return jsonNoStore({ conversation: dto ?? null, created: group.created }, group.created ? 201 : 200);
        }

        // ── DM ───────────────────────────────────────────────────────────────
        if (typeof recipientUserId !== 'string' || recipientUserId.length === 0) {
            return errorJson('Brak identyfikatora odbiorcy', 400, 'recipient_required');
        }
        if (recipientUserId.startsWith('emp-')) {
            // `/api/employee/staff` zwraca `emp-<id>` dla pracownika BEZ konta w aplikacji.
            return errorJson(
                'Ten pracownik nie ma konta w aplikacji — nie można rozpocząć rozmowy.',
                400,
                'recipient_has_no_account'
            );
        }
        if (!isRealUserId(recipientUserId)) {
            return errorJson('Nieprawidłowy identyfikator odbiorcy', 400, 'recipient_invalid');
        }
        if (recipientUserId.toLowerCase() === userId.toLowerCase()) {
            return errorJson('Nie można rozpocząć rozmowy z samym sobą', 400, 'recipient_self');
        }
        if (!(await isActiveStaffUser(recipientUserId))) {
            return errorJson(
                'Odbiorca nie jest aktywnym pracownikiem z kontem',
                400,
                'recipient_not_staff'
            );
        }

        const dm = await getOrCreateDmConversation(userId, recipientUserId);
        if (!dm) return errorJson('Nie udało się otworzyć rozmowy', 500, 'db_error');

        // To samo co w gałęzi kanału: `getOrCreateDmConversation` dopina członkostwa,
        // ale wiersza z `left_at` nie wskrzesza — a bez sprawdzenia wynik tego dopięcia
        // strona wypisana z wątku (np. po odejściu z zespołu) dostawałaby 200 z podglądem
        // treści i licznikiem. Czytamy stan, nie wymuszamy go: 404 jak w reszcie modułu.
        const membership = await getActiveMembership(dm.conversation.id, userId);
        if (!membership) return notFoundJson();

        const [dto] = await describeConversations([dm.conversation.id], userId, isAdmin);

        if (dm.created) {
            auditConversationAccess({
                userId,
                userEmail: auth.user.email || '',
                action: AUDIT.conversationCreated,
                conversationId: dm.conversation.id,
                metadata: { kind: 'dm', recipientUserId },
                request: req,
            });
        }

        return jsonNoStore({ conversation: dto ?? null, created: dm.created }, dm.created ? 201 : 200);
    } catch (err) {
        console.error('[Messaging] POST conversations error:', err);
        return errorJson('Nie udało się otworzyć rozmowy', 500, 'server_error');
    }
}
