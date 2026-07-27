import { NextRequest } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { checkRateLimit } from '@/lib/rateLimit';
import { loadAttachmentsByMessage } from '@/lib/chatAttachments';
import {
    AUDIT,
    AUDIT_RESOURCE_MESSAGE,
    MAX_CONTENT_LENGTH,
    MESSAGE_COLUMNS,
    SEND_RATE_LIMIT,
    UUID_RE,
    auditConversationAccess,
    buildPreviewPlain,
    encryptMessageText,
    ensureMembership,
    errorJson,
    getActiveMembership,
    getConversation,
    isActiveStaffUser,
    isAppointmentAt,
    isAppointmentId,
    isEncryptionConfigured,
    isProdentisId,
    jsonNoStore,
    mapMessageRow,
    notFoundJson,
    notifyNewMessage,
    resolveStaffNames,
    staffMessagingDb as db,
    syncGroupMembers,
    touchConversationPreview,
    visibilityFloorIso,
    type MessageRow,
} from '@/lib/staffMessaging';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/** Pola, których w wiadomości NIE WOLNO przyjąć — D3 zabrania trzymania nazwiska pacjenta. */
const FORBIDDEN_PATIENT_FIELDS = [
    'refPatientName',
    'patientName',
    'patient_name',
    'refPatientFullName',
];

function parseIsoParam(value: string | null): string | null {
    if (!value) return null;
    const ts = Date.parse(value);
    if (Number.isNaN(ts)) return null;
    return new Date(ts).toISOString();
}

/**
 * GET /api/employee/messaging/messages?conversationId=<uuid>&limit=50&before=<iso>&after=<iso>
 *
 * Wiadomości wątku, ZAWSZE rosnąco po czasie (najstarsza pierwsza).
 *   · `before` — starsza strona (doładowanie historii w górę),
 *   · `after`  — wyłącznie nowsze niż podany moment (dociąganie po push-u).
 *
 * RETENCJA D4 przy odczycie: DM oraz kanał zespołu dla zwykłego pracownika są ucięte
 * do 12 miesięcy; ADMIN dostaje w kanale zespołu pełne archiwum. Odcięcie działa też
 * na `before` — starszej historii nie da się wydobyć paginacją.
 */
export async function GET(req: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const userId = auth.user.id;
    const isAdmin = auth.roles.includes('admin');

    try {
        const url = new URL(req.url);
        const conversationId = url.searchParams.get('conversationId') || '';
        if (!UUID_RE.test(conversationId)) return notFoundJson();

        const membership = await getActiveMembership(conversationId, userId);
        if (!membership) return notFoundJson();

        const conversation = await getConversation(conversationId);
        if (!conversation) return notFoundJson();

        const rawLimit = Number(url.searchParams.get('limit') || DEFAULT_LIMIT);
        const limit = Number.isFinite(rawLimit)
            ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_LIMIT)
            : DEFAULT_LIMIT;
        const before = parseIsoParam(url.searchParams.get('before'));
        const after = parseIsoParam(url.searchParams.get('after'));
        const floor = visibilityFloorIso(conversation.kind, isAdmin);

        let query = db
            .from('staff_messages')
            .select(MESSAGE_COLUMNS)
            .eq('conversation_id', conversationId);

        if (floor) query = query.gte('created_at', floor);
        if (before) query = query.lt('created_at', before);
        if (after) query = query.gt('created_at', after);

        // Bez `after` bierzemy NAJNOWSZE `limit` sztuk (malejąco) i odwracamy — inaczej
        // pierwsze wejście do wątku pokazywałoby najstarsze wiadomości sprzed roku.
        const ascending = !!after;
        const { data, error } = await query.order('created_at', { ascending }).limit(limit);
        if (error) {
            console.error('[Messaging] messages select error:', error.message);
            return errorJson('Nie udało się pobrać wiadomości', 500, 'db_error');
        }

        const rows = ((data ?? []) as unknown as MessageRow[]).slice();
        if (!ascending) rows.reverse();

        // Jedno zapytanie po załączniki CAŁEJ strony — nie N+1 po wiadomości.
        const attachments = await loadAttachmentsByMessage(
            'staff_message_id',
            rows.map((r) => r.id),
        );
        const messages = rows.map((row) => mapMessageRow(row, userId, attachments.get(row.id) ?? []));

        // D5: każdy odczyt treści DM zostawia ślad. Pusta odpowiedź (odpytywanie w pętli
        // bez nowych wiadomości) śladu nie generuje — inaczej audyt zapchałby się szumem.
        if (conversation.kind === 'dm' && messages.length > 0) {
            auditConversationAccess({
                userId,
                userEmail: auth.user.email || '',
                action: AUDIT.dmMessagesRead,
                conversationId,
                metadata: { messageCount: messages.length, polling: !!after },
                request: req,
            });
        }

        return jsonNoStore({
            conversationId,
            messages,
            /**
             * Pełna strona = jest więcej W KIERUNKU zapytania: starsze przy `before`
             * (i przy pierwszym wejściu), nowsze przy `after`.
             */
            hasMore: rows.length === limit,
            oldestCreatedAt: messages[0]?.createdAt ?? null,
            newestCreatedAt: messages[messages.length - 1]?.createdAt ?? null,
            visibleFromAt: floor,
        });
    } catch (err) {
        console.error('[Messaging] GET messages error:', err);
        return errorJson('Nie udało się pobrać wiadomości', 500, 'server_error');
    }
}

/**
 * POST /api/employee/messaging/messages
 *
 * Body: { conversationId, content?, clientMsgId?, refPatientProdentisId?, refTaskId?,
 *         refAppointmentId?, refAppointmentAt?, hasAttachments? }
 *
 * Zapis jest FAIL-CLOSED wobec szyfrowania (D5): bez `ENCRYPTION_KEY` wysyłka jest
 * odrzucana, bo jawny tekst w bazie byłby przy odczycie nie do odróżnienia od szyfrogramu.
 * Powtórka z tym samym `clientMsgId` zwraca istniejącą wiadomość zamiast duplikatu.
 */
export async function POST(req: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const userId = auth.user.id;
    const isAdmin = auth.roles.includes('admin');

    const limit = await checkRateLimit(
        `staffmsg-send:${userId}`,
        SEND_RATE_LIMIT.max,
        SEND_RATE_LIMIT.windowMs
    );
    if (!limit.allowed) {
        return errorJson('Zbyt wiele wiadomości. Odczekaj chwilę.', 429, 'rate_limited');
    }

    let body: Record<string, unknown>;
    try {
        body = (await req.json()) as Record<string, unknown>;
    } catch {
        return errorJson('Nieprawidłowe dane wejściowe', 400, 'invalid_body');
    }

    try {
        const conversationId = typeof body.conversationId === 'string' ? body.conversationId : '';
        if (!UUID_RE.test(conversationId)) return notFoundJson();

        const conversation = await getConversation(conversationId);
        if (!conversation) return notFoundJson();

        // Dostęp: członkostwo sprawdzane po stronie serwera także przy WYSYŁCE.
        let membership = await getActiveMembership(conversationId, userId);
        if (!membership && conversation.kind === 'group') {
            // D1: kanał zespołu obejmuje każdego aktywnego pracownika z kontem —
            // dołączenie przy pierwszej wysyłce, bez czynności administracyjnej.
            if (await isActiveStaffUser(userId)) {
                membership = await ensureMembership(conversationId, userId);
            }
        }
        if (!membership) return notFoundJson();

        for (const field of FORBIDDEN_PATIENT_FIELDS) {
            if (body[field] !== undefined) {
                return errorJson(
                    'Nazwiska pacjenta nie zapisujemy w wiadomości — użyj wyłącznie identyfikatora Prodentisa.',
                    400,
                    'patient_name_not_allowed'
                );
            }
        }

        const hasAttachments = body.hasAttachments === true;
        const rawContent = typeof body.content === 'string' ? body.content : '';
        const content = rawContent.trim();

        if (content.length === 0 && !hasAttachments) {
            return errorJson('Wiadomość jest pusta', 400, 'content_required');
        }
        if (content.length > MAX_CONTENT_LENGTH) {
            return errorJson(
                `Wiadomość jest za długa (limit ${MAX_CONTENT_LENGTH} znaków)`,
                400,
                'content_too_long'
            );
        }

        // D3: wzmianka o pacjencie = WYŁĄCZNIE identyfikator Prodentisa (ciąg cyfr).
        // CHECK w bazie odrzuca UUID, ale własny 400 jest czytelniejszy niż 23514.
        let refPatientProdentisId: string | null = null;
        if (body.refPatientProdentisId !== undefined && body.refPatientProdentisId !== null) {
            if (!isProdentisId(body.refPatientProdentisId)) {
                return errorJson('Nieprawidłowy identyfikator pacjenta', 400, 'patient_ref_invalid');
            }
            refPatientProdentisId = body.refPatientProdentisId;
        }

        let refTaskId: string | null = null;
        if (body.refTaskId !== undefined && body.refTaskId !== null) {
            if (typeof body.refTaskId !== 'string' || !UUID_RE.test(body.refTaskId)) {
                return errorJson('Nieprawidłowy identyfikator zadania', 400, 'task_ref_invalid');
            }
            refTaskId = body.refTaskId;
        }

        let refAppointmentAt: string | null = null;
        if (body.refAppointmentAt !== undefined && body.refAppointmentAt !== null) {
            // Format 'YYYY-MM-DDTHH:MM' (czas ścienny gabinetu). toISOString() ma sekundy i 'Z'.
            if (!isAppointmentAt(body.refAppointmentAt)) {
                return errorJson('Nieprawidłowy termin wizyty', 400, 'appointment_at_invalid');
            }
            refAppointmentAt = body.refAppointmentAt;
        }

        // D3: `ref_appointment_id` zapisujemy JAWNYM tekstem (to identyfikator techniczny,
        // nie treść), więc jako jedyna referencja bez szyfrowania musi mieć wzorzec —
        // inaczej byłaby najprostszą furtką na wpisanie do bazy nazwiska i telefonu
        // pacjenta. Wzorzec i uzasadnienie: `isAppointmentId` w src/lib/staffMessaging.ts.
        let refAppointmentId: string | null = null;
        if (body.refAppointmentId !== undefined && body.refAppointmentId !== null) {
            const candidate =
                typeof body.refAppointmentId === 'string' ? body.refAppointmentId.trim() : null;
            // Pusty string traktujemy jak brak wartości (apka czyści pole), nie jak błąd.
            if (candidate !== '') {
                if (!isAppointmentId(candidate)) {
                    return errorJson(
                        'Nieprawidłowy identyfikator wizyty',
                        400,
                        'appointment_ref_invalid'
                    );
                }
                refAppointmentId = candidate;
            }
        }

        const clientMsgId =
            typeof body.clientMsgId === 'string' && body.clientMsgId.trim()
                ? body.clientMsgId.trim().slice(0, 100)
                : null;

        // Idempotencja: apka ponawia wysyłkę po zerwaniu sieci.
        if (clientMsgId) {
            const { data: dupe } = await db
                .from('staff_messages')
                .select(MESSAGE_COLUMNS)
                .eq('conversation_id', conversationId)
                .eq('sender_user_id', userId)
                .eq('client_msg_id', clientMsgId)
                .maybeSingle();
            if (dupe) {
                // 🔑 Powtórka po zerwanej sieci MUSI oddać wiadomość z załącznikami. Inaczej
                // apka pokaże pusty dymek mimo wgranego pliku i człowiek wgra zdjęcie DRUGI RAZ.
                const dupeRow = dupe as unknown as MessageRow;
                const dupeAtt = await loadAttachmentsByMessage('staff_message_id', [dupeRow.id]);
                return jsonNoStore({
                    message: mapMessageRow(dupeRow, userId, dupeAtt.get(dupeRow.id) ?? []),
                    deduplicated: true,
                    pushed: false,
                });
            }
        }

        if (!isEncryptionConfigured()) {
            console.error('[Messaging] ENCRYPTION_KEY missing — odmawiam zapisu wiadomości');
            return errorJson(
                'Czat jest chwilowo niedostępny (konfiguracja serwera).',
                503,
                'encryption_unavailable'
            );
        }

        // Ogłoszenie admina musi dotrzeć także do osoby, która nigdy nie otworzyła
        // zakładki czatu (token push-a rejestruje moduł zadań) — stąd domknięcie składu
        // PRZED zapisem: dopisani dostają `last_read_at = teraz`, więc ta wiadomość
        // policzy im się jako nieprzeczytana, a historia sprzed dołączenia — nie.
        if (conversation.kind === 'group' && isAdmin) {
            await syncGroupMembers(conversationId);
        }

        const names = await resolveStaffNames([userId]);
        const senderName = names.get(userId) ?? auth.user.email ?? 'Pracownik';
        const nowIso = new Date().toISOString();

        const { data: inserted, error: insertErr } = await db
            .from('staff_messages')
            .insert({
                conversation_id: conversationId,
                sender_user_id: userId,
                sender_name_snapshot: senderName,
                kind: 'text',
                content: encryptMessageText(content),
                ref_task_id: refTaskId,
                ref_patient_prodentis_id: refPatientProdentisId,
                ref_appointment_id: refAppointmentId,
                ref_appointment_at: refAppointmentAt,
                client_msg_id: clientMsgId,
                has_attachments: hasAttachments,
                created_at: nowIso,
            })
            .select(MESSAGE_COLUMNS)
            .single();

        if (insertErr) {
            // Wyścig dwóch ponowień z tym samym `clientMsgId` — indeks unikalny łapie,
            // trasa oddaje wiadomość, która wygrała, zamiast błędu.
            if (insertErr.code === '23505' && clientMsgId) {
                const { data: raced } = await db
                    .from('staff_messages')
                    .select(MESSAGE_COLUMNS)
                    .eq('conversation_id', conversationId)
                    .eq('sender_user_id', userId)
                    .eq('client_msg_id', clientMsgId)
                    .maybeSingle();
                if (raced) {
                    const racedRow = raced as unknown as MessageRow;
                    const racedAtt = await loadAttachmentsByMessage('staff_message_id', [racedRow.id]);
                    return jsonNoStore({
                        message: mapMessageRow(racedRow, userId, racedAtt.get(racedRow.id) ?? []),
                        deduplicated: true,
                        pushed: false,
                    });
                }
            }
            console.error('[Messaging] message insert error:', insertErr.message);
            return errorJson('Nie udało się wysłać wiadomości', 500, 'db_error');
        }

        const row = inserted as unknown as MessageRow;
        await touchConversationPreview(
            conversationId,
            buildPreviewPlain(content, hasAttachments),
            userId,
            row.created_at
        );

        auditConversationAccess({
            userId,
            userEmail: auth.user.email || '',
            action: AUDIT.messageSent,
            conversationId,
            metadata: {
                messageId: row.id,
                conversationKind: conversation.kind,
                hasPatientReference: !!refPatientProdentisId,
                hasAttachments,
            },
            request: req,
        });

        // D3: powiązanie wiadomości z pacjentem to przetwarzanie danych pacjenta —
        // osobny wpis, po identyfikatorze Prodentisa, BEZ nazwiska i BEZ treści.
        if (refPatientProdentisId) {
            void logAudit({
                userId,
                userEmail: auth.user.email || '',
                action: AUDIT.patientReference,
                resourceType: AUDIT_RESOURCE_MESSAGE,
                resourceId: row.id,
                metadata: {
                    conversationId,
                    conversationKind: conversation.kind,
                    prodentisId: refPatientProdentisId,
                },
                request: req,
            });
        }

        // Push nigdy nie wywraca zapisu — notifyNewMessage łyka własne błędy.
        const push = await notifyNewMessage({
            conversationId,
            kind: conversation.kind,
            messageId: row.id,
            senderUserId: userId,
            senderName,
            senderIsAdmin: isAdmin,
            messageKind: 'text',
        });

        return jsonNoStore(
            {
                // Świeży zapis: pliki dopiero polecą (baza wymaga kolejności wiadomość→plik),
                // więc pusta tablica jest tu stanem POPRAWNYM, nie brakiem.
                message: mapMessageRow(row, userId, []),
                deduplicated: false,
                pushed: push.pushed,
                /** D1: w kanale zespołu push wychodzi wyłącznie od admina. */
                pushRecipients: push.recipients,
            },
            201
        );
    } catch (err) {
        console.error('[Messaging] POST message error:', err);
        return errorJson('Nie udało się wysłać wiadomości', 500, 'server_error');
    }
}
