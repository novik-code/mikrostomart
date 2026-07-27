import { NextRequest } from 'next/server';

import { logAudit } from '@/lib/auditLog';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import {
    countAttachments,
    mapAttachmentRow,
    MAX_ATTACHMENTS_PER_MESSAGE,
    normalizeImage,
    readUploadedFile,
    removeAttachmentFiles,
    storeAttachment,
    detectImageMime,
    ATTACHMENT_COLUMNS,
} from '@/lib/chatAttachments';
import { checkRateLimit } from '@/lib/rateLimit';
import {
    errorJson,
    getActiveMembership,
    getConversation,
    jsonNoStore,
    notFoundJson,
    staffMessagingDb as db,
    UUID_RE,
} from '@/lib/staffMessaging';

/**
 * POST /api/employee/messaging/attachments
 * Załącznik do wiadomości czatu ZESPOŁOWEGO. Multipart: `file` + `messageId`.
 *
 * 🔑 KOLEJNOŚĆ JEST WYMUSZONA PRZEZ BAZĘ: `chat_att_one_owner_check` wymaga, żeby wiersz
 * miał dokładnie jednego właściciela, więc wiadomość musi istnieć PRZED plikiem.
 * Klient wysyła więc najpierw wiadomość (`hasAttachments: true`), potem pliki.
 *
 * 🔒 Plik przechodzi przez sniff magic bytes → `sharp` (strip EXIF/GPS) → prywatny bucket.
 * Deklarowany MIME z żądania nie ma tu żadnego znaczenia.
 */
export const dynamic = 'force-dynamic';
// sharp to binarka libvips — na edge nie wystartuje, a błąd zobaczysz dopiero na Vercelu.
export const runtime = 'nodejs';

/** Osobny od limitu wiadomości — inaczej jedna osoba wrzuci 30 plików na minutę. */
const ATTACH_RATE_LIMIT = { max: 12, windowMs: 60_000 };

export async function POST(req: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;
    const isAdmin = auth.roles.includes('admin');

    try {
        const limit = await checkRateLimit(
            `staffmsg-attach:${userId}`,
            ATTACH_RATE_LIMIT.max,
            ATTACH_RATE_LIMIT.windowMs,
        );
        if (!limit.allowed) {
            return errorJson('Zbyt wiele załączników. Odczekaj chwilę.', 429, 'rate_limited');
        }

        let form: FormData;
        try {
            form = await req.formData();
        } catch {
            return errorJson('Nieprawidłowe dane wejściowe', 400, 'invalid_body');
        }

        const messageId = String(form.get('messageId') ?? '');
        if (!UUID_RE.test(messageId)) return notFoundJson();

        // ── Autoryzacja: wiadomość → wątek → moje AKTYWNE członkostwo ──────────
        const { data: msg, error: msgErr } = await db
            .from('staff_messages')
            .select('id, conversation_id, sender_user_id, deleted_at')
            .eq('id', messageId)
            .maybeSingle();
        if (msgErr) {
            console.error('[messaging/attachments] odczyt wiadomości nieudany:', msgErr);
            return errorJson('Nie udało się wysłać załącznika', 500, 'db_error');
        }
        if (!msg) return notFoundJson();

        // Załącznik dokłada się WYŁĄCZNIE do własnej wiadomości. Bez tego każdy uczestnik
        // wątku mógłby dopiąć zdjęcie do cudzej wypowiedzi i podpisać ją nie swoim nazwiskiem.
        if (msg.sender_user_id !== userId) return notFoundJson();
        if (msg.deleted_at) return errorJson('Wiadomość została usunięta', 404, 'message_deleted');

        const conversation = await getConversation(msg.conversation_id);
        if (!conversation) return notFoundJson();
        const membership = await getActiveMembership(msg.conversation_id, userId);
        if (!membership) return notFoundJson();

        const existing = await countAttachments('staff_message_id', messageId);
        if (existing === null) return errorJson('Nie udało się wysłać załącznika', 500, 'db_error');
        if (existing >= MAX_ATTACHMENTS_PER_MESSAGE) {
            return errorJson(
                `Do jednej wiadomości można dołączyć maksymalnie ${MAX_ATTACHMENTS_PER_MESSAGE} plików`,
                400,
                'too_many_attachments',
            );
        }

        // ── Plik: rozmiar → magic bytes → normalizacja ────────────────────────
        const raw = await readUploadedFile(form);
        if (!raw) return errorJson('Nieprawidłowy plik (limit 10 MB)', 413, 'file_too_large');

        const detected = detectImageMime(raw);
        if (!detected) {
            console.warn('[messaging/attachments] odrzucony plik, niewykryty format obrazu');
            return errorJson('Nieprawidłowy typ pliku. Dozwolone: JPG, PNG, WebP.', 400, 'invalid_file_type');
        }

        const image = await normalizeImage(raw);
        if (!image) {
            return errorJson('Nie udało się przetworzyć obrazu', 400, 'image_failed');
        }

        const stored = await storeAttachment(msg.conversation_id, image);
        if (!stored) return errorJson('Nie udało się wysłać załącznika', 500, 'storage_error');

        const { data: row, error: insErr } = await db
            .from('chat_attachments')
            .insert({
                staff_message_id: messageId,
                storage_path: stored.storagePath,
                thumb_path: stored.thumbPath,
                mime: 'image/jpeg',
                size_bytes: stored.sizeBytes,
                width: stored.width,
                height: stored.height,
                origin: 'staff',
                uploaded_by_user_id: userId,
                // Tor personelu: domyślnie NIE oznaczamy jako dane o zdrowiu (decyzja właściciela).
                is_health_data: false,
            })
            .select(ATTACHMENT_COLUMNS)
            .single();

        if (insErr || !row) {
            console.error('[messaging/attachments] zapis wiersza nieudany:', insErr);
            // Bez tego zostaje osierocony obiekt, którego nie skasuje ani kaskada, ani cron.
            await removeAttachmentFiles([stored.storagePath, stored.thumbPath]);
            return errorJson('Nie udało się wysłać załącznika', 500, 'db_error');
        }

        // Flaga na wiadomości jest DEKLARACJĄ klienta ustawianą przed uploadem — domykamy ją
        // faktem, żeby wiadomość, której upload padł, nie została z wiecznym „[załącznik]".
        await db.from('staff_messages').update({ has_attachments: true }).eq('id', messageId);

        void logAudit({
            userId,
            userEmail: auth.user.email || '',
            action: 'staff_chat_attachment_uploaded',
            resourceType: 'chat_attachment',
            resourceId: row.id,
            metadata: {
                conversation_id: msg.conversation_id,
                message_id: messageId,
                size_bytes: stored.sizeBytes,
                is_admin: isAdmin,
            },
            request: req,
        });

        return jsonNoStore({ attachment: mapAttachmentRow(row) }, 201);
    } catch (err) {
        console.error('[messaging/attachments] błąd:', err);
        return errorJson('Nie udało się wysłać załącznika', 500, 'server_error');
    }
}
