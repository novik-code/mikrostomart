import { NextRequest } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import {
    UUID_RE,
    errorJson,
    getActiveMembership,
    jsonNoStore,
    notFoundJson,
    staffMessagingDb as db,
} from '@/lib/staffMessaging';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/employee/messaging/mute
 * Body: { conversationId, muted: boolean }
 *
 * Wyciszenie POJEDYNCZEGO wątku przez tę osobę. Wycisza WYŁĄCZNIE push — wątek zostaje
 * na liście, licznik nieprzeczytanych dalej rośnie. Nie ma nic wspólnego z globalnym
 * `employee_notification_preferences.muted_keys`.
 */
export async function PATCH(req: NextRequest) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const userId = auth.user.id;

    let body: Record<string, unknown>;
    try {
        body = (await req.json()) as Record<string, unknown>;
    } catch {
        return errorJson('Nieprawidłowe dane wejściowe', 400, 'invalid_body');
    }

    try {
        const conversationId = typeof body.conversationId === 'string' ? body.conversationId : '';
        if (!UUID_RE.test(conversationId)) return notFoundJson();
        if (typeof body.muted !== 'boolean') {
            return errorJson('Pole "muted" musi być wartością logiczną', 400, 'muted_invalid');
        }

        const membership = await getActiveMembership(conversationId, userId);
        if (!membership) return notFoundJson();

        const { error } = await db
            .from('staff_conversation_members')
            .update({ muted: body.muted })
            .eq('conversation_id', conversationId)
            .eq('user_id', userId);

        if (error) {
            console.error('[Messaging] mute update error:', error.message);
            return errorJson('Nie udało się zmienić ustawienia', 500, 'db_error');
        }

        return jsonNoStore({ success: true, conversationId, muted: body.muted });
    } catch (err) {
        console.error('[Messaging] PATCH mute error:', err);
        return errorJson('Nie udało się zmienić ustawienia', 500, 'server_error');
    }
}
