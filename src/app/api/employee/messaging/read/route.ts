import { NextRequest } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import {
    UUID_RE,
    countUnread,
    errorJson,
    getActiveMembership,
    getConversation,
    jsonNoStore,
    notFoundJson,
    staffMessagingDb as db,
} from '@/lib/staffMessaging';

export const dynamic = 'force-dynamic';

/**
 * POST /api/employee/messaging/read
 * Body: { conversationId, readAt? }
 *
 * Ustawia `last_read_at` TEJ osoby (znacznik jest per-członek, nie globalny bool jak
 * w czacie pacjenta — tam otwarcie wątku przez jedną osobę z recepcji kasowało licznik
 * całemu zespołowi).
 *
 * `readAt` z przyszłości jest przycinane do „teraz" — inaczej urządzenie z rozjechanym
 * zegarem wyzerowałoby licznik także dla wiadomości, które dopiero przyjdą.
 */
export async function POST(req: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const userId = auth.user.id;
    const isAdmin = auth.roles.includes('admin');

    let body: Record<string, unknown>;
    try {
        body = (await req.json()) as Record<string, unknown>;
    } catch {
        return errorJson('Nieprawidłowe dane wejściowe', 400, 'invalid_body');
    }

    try {
        const conversationId = typeof body.conversationId === 'string' ? body.conversationId : '';
        if (!UUID_RE.test(conversationId)) return notFoundJson();

        const membership = await getActiveMembership(conversationId, userId);
        if (!membership) return notFoundJson();

        const conversation = await getConversation(conversationId);
        if (!conversation) return notFoundJson();

        const now = Date.now();
        let readAtIso = new Date(now).toISOString();
        if (typeof body.readAt === 'string') {
            const ts = Date.parse(body.readAt);
            if (!Number.isNaN(ts)) readAtIso = new Date(Math.min(ts, now)).toISOString();
        }

        // Cofnięcie znacznika w tył (spóźniony request z tła apki) zrobiłoby z
        // przeczytanych wiadomości ponownie nieprzeczytane.
        const previous = membership.last_read_at ? Date.parse(membership.last_read_at) : 0;
        if (previous && Date.parse(readAtIso) < previous) {
            readAtIso = membership.last_read_at as string;
        } else {
            const { error } = await db
                .from('staff_conversation_members')
                .update({ last_read_at: readAtIso })
                .eq('conversation_id', conversationId)
                .eq('user_id', userId);
            if (error) {
                console.error('[Messaging] read update error:', error.message);
                return errorJson('Nie udało się oznaczyć jako przeczytane', 500, 'db_error');
            }
        }

        const unreadCount = await countUnread(
            conversationId,
            userId,
            readAtIso,
            conversation.kind,
            isAdmin
        );

        return jsonNoStore({ success: true, conversationId, lastReadAt: readAtIso, unreadCount });
    } catch (err) {
        console.error('[Messaging] POST read error:', err);
        return errorJson('Nie udało się oznaczyć jako przeczytane', 500, 'server_error');
    }
}
