import { NextRequest } from 'next/server';

import { logAudit } from '@/lib/auditLog';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import { signAttachment, SIGNED_URL_TTL_SECONDS } from '@/lib/chatAttachments';
import {
    errorJson,
    getActiveMembership,
    getConversation,
    jsonNoStore,
    notFoundJson,
    staffMessagingDb as db,
    UUID_RE,
    visibilityFloorIso,
} from '@/lib/staffMessaging';

/**
 * GET /api/employee/messaging/attachments/[id]?thumb=1
 * Wybija signed URL o krótkim TTL do JEDNEGO załącznika i odnotowuje to w audycie.
 *
 * 🔑 DLACZEGO OSOBNA TRASA, A NIE URL W LIŚCIE WIADOMOŚCI: link wygenerowany przy pobraniu
 * wątku (a) to N wywołań Storage API na stronę, (b) wypala 5-minutowy TTL w trakcie
 * przewijania historii, przez co obrazki „gasną", i — najważniejsze — (c) zapisywałby
 * w audycie, że ktoś POBRAŁ LISTĘ, a nie że OTWORZYŁ zdjęcie. Ślad musi mówić prawdę o tym,
 * kto realnie obejrzał plik.
 *
 * 🔑 Ta trasa dostaje samo id pliku, więc musi sprawdzić WSZYSTKO sama — bramka z trasy
 * wiadomości nie działa tu automatycznie.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;
    const isAdmin = auth.roles.includes('admin');

    try {
        const { id } = await params;
        if (!UUID_RE.test(id)) return notFoundJson();

        const { data: att, error } = await db
            .from('chat_attachments')
            .select('id, staff_message_id, chat_message_id, storage_path, thumb_path, origin')
            .eq('id', id)
            .maybeSingle();
        if (error) {
            console.error('[messaging/attachments/[id]] odczyt nieudany:', error);
            return errorJson('Nie udało się pobrać załącznika', 500, 'db_error');
        }
        if (!att) return notFoundJson();

        // ── TOR PACJENTA (czat pacjent↔recepcja) ──────────────────────────────
        // Ta sama trasa obsługuje oba tory, bo po obu stronach stoi ten sam strażnik
        // (employee/admin) i ten sam wymóg audytu. Rozdzielenie na dwie trasy dałoby
        // dwie ścieżki do tych samych bajtów — a to dokładnie ta klasa błędu, przez którą
        // powstał publiczny bucket `task-images`.
        if (att.chat_message_id) {
            const { data: pmsg } = await db
                .from('chat_messages')
                .select('id, conversation_id')
                .eq('id', att.chat_message_id)
                .maybeSingle();
            if (!pmsg) return notFoundJson();

            const { data: conv } = await db
                .from('chat_conversations')
                .select('id, patient_name')
                .eq('id', pmsg.conversation_id)
                .maybeSingle();
            if (!conv) return notFoundJson();

            const wantsThumbP = new URL(req.url).searchParams.get('thumb') === '1';
            const pathP = wantsThumbP && att.thumb_path ? att.thumb_path : att.storage_path;
            const urlP = await signAttachment(pathP);
            if (!urlP) return errorJson('Nie udało się pobrać załącznika', 500, 'storage_error');

            if (!wantsThumbP) {
                // Załącznik pacjenta to dane o zdrowiu — w śladzie ląduje nazwisko,
                // bo to jest właśnie ten dostęp, który podlega rozliczeniu.
                void logAudit({
                    userId,
                    userEmail: auth.user.email || '',
                    action: 'view_chat_attachment',
                    resourceType: 'chat_attachment',
                    resourceId: att.id,
                    patientName: conv.patient_name || undefined,
                    metadata: {
                        origin: att.origin,
                        is_health_data: true,
                        conversation_id: pmsg.conversation_id,
                        ttl_seconds: SIGNED_URL_TTL_SECONDS,
                    },
                    request: req,
                });
            }
            return jsonNoStore({ url: urlP, expiresIn: SIGNED_URL_TTL_SECONDS });
        }

        // ── TOR PERSONELU ─────────────────────────────────────────────────────
        if (!att.staff_message_id) return notFoundJson();

        const { data: msg, error: msgErr } = await db
            .from('staff_messages')
            .select('id, conversation_id, created_at, deleted_at')
            .eq('id', att.staff_message_id)
            .maybeSingle();
        if (msgErr) {
            console.error('[messaging/attachments/[id]] odczyt wiadomości nieudany:', msgErr);
            return errorJson('Nie udało się pobrać załącznika', 500, 'db_error');
        }
        if (!msg) return notFoundJson();

        // Soft-delete wiadomości NIE kaskaduje na załączniki. Bez tego warunku „usunięta
        // wiadomość" nadal wydawałaby zdjęcie — czyli obietnica złożona zespołowi byłaby fikcją.
        if (msg.deleted_at) return errorJson('Wiadomość została usunięta', 404, 'message_deleted');

        const conversation = await getConversation(msg.conversation_id);
        if (!conversation) return notFoundJson();
        const membership = await getActiveMembership(msg.conversation_id, userId);
        if (!membership) return notFoundJson();

        // Próg retencji obowiązuje TAKŻE tutaj — inaczej zwykły pracownik wyciągnąłby po id
        // załącznik z wiadomości sprzed lat, której sam wątek już mu nie pokazuje.
        const floor = visibilityFloorIso(conversation.kind, isAdmin);
        if (floor && msg.created_at < floor) return notFoundJson();

        const wantsThumb = new URL(req.url).searchParams.get('thumb') === '1';
        const path = wantsThumb && att.thumb_path ? att.thumb_path : att.storage_path;
        const url = await signAttachment(path);
        if (!url) return errorJson('Nie udało się pobrać załącznika', 500, 'storage_error');

        // Miniatury nie audytujemy jako „obejrzenia" — leci ich tyle, ile jest dymków na ekranie,
        // a zalanie audytu utopiłoby wpisy o realnym otwarciu pliku.
        if (!wantsThumb) {
            void logAudit({
                userId,
                userEmail: auth.user.email || '',
                action: 'view_chat_attachment',
                resourceType: 'chat_attachment',
                resourceId: att.id,
                metadata: {
                    origin: att.origin,
                    conversation_id: msg.conversation_id,
                    ttl_seconds: SIGNED_URL_TTL_SECONDS,
                },
                request: req,
            });
        }

        return jsonNoStore({ url, expiresIn: SIGNED_URL_TTL_SECONDS });
    } catch (err) {
        console.error('[messaging/attachments/[id]] błąd:', err);
        return errorJson('Nie udało się pobrać załącznika', 500, 'server_error');
    }
}
