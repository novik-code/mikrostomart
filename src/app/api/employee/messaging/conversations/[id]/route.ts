import { NextRequest } from 'next/server';
import { requireEmployeeOrAdmin } from '@/lib/authGuards';
import {
    AUDIT,
    auditConversationAccess,
    describeConversations,
    errorJson,
    getActiveMembership,
    getConversation,
    jsonNoStore,
    notFoundJson,
    resolveStaffNames,
    staffMessagingDb as db,
    UUID_RE,
    visibilityFloorIso,
    type MemberRow,
} from '@/lib/staffMessaging';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employee/messaging/conversations/[id]
 *
 * Szczegóły wątku + skład osobowy. Wołający MUSI być aktywnym członkiem — inaczej 404
 * (nie 403: 403 potwierdzałby, że wątek o tym id istnieje).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireEmployeeOrAdmin();
    if (!auth.ok) return auth.response;

    const userId = auth.user.id;
    const isAdmin = auth.roles.includes('admin');

    try {
        const { id } = await params;
        // Id spoza formatu UUID poszłoby do Postgresa jako 22P02 — odsiewamy tak samo
        // jak cudzy wątek, czyli 404.
        if (!UUID_RE.test(id)) return notFoundJson();

        const membership = await getActiveMembership(id, userId);
        if (!membership) return notFoundJson();

        const conversation = await getConversation(id);
        if (!conversation) return notFoundJson();

        const [dto] = await describeConversations([id], userId, isAdmin);
        if (!dto) return notFoundJson();

        const { data: memberData, error: memberErr } = await db
            .from('staff_conversation_members')
            .select('conversation_id, user_id, role, last_read_at, muted, joined_at, left_at')
            .eq('conversation_id', id);
        if (memberErr) {
            console.error('[Messaging] members error:', memberErr.message);
            return errorJson('Nie udało się pobrać rozmowy', 500, 'db_error');
        }

        const members = (memberData ?? []) as MemberRow[];
        const names = await resolveStaffNames(members.map((m) => m.user_id));

        // D5: otwarcie wątku DM to programowy dostęp do prywatnej korespondencji —
        // zostawia ślad (kto, który wątek), NIGDY treść.
        if (conversation.kind === 'dm') {
            auditConversationAccess({
                userId,
                userEmail: auth.user.email || '',
                action: AUDIT.dmOpened,
                conversationId: id,
                metadata: { counterpartUserId: dto.counterpartUserId },
                request: req,
            });
        }

        return jsonNoStore({
            conversation: dto,
            members: members.map((m) => ({
                userId: m.user_id,
                name: names.get(m.user_id) ?? 'Pracownik',
                role: m.role,
                isMe: m.user_id === userId,
                joinedAt: m.joined_at,
                leftAt: m.left_at,
                lastReadAt: m.last_read_at,
                // `muted` to prywatna preferencja — wystawiamy wyłącznie własną.
                muted: m.user_id === userId ? m.muted : null,
            })),
            /** D4: od tej daty wątek jest widoczny dla TEGO odbiorcy. null = pełne archiwum. */
            visibleFromAt: visibilityFloorIso(conversation.kind, isAdmin),
        });
    } catch (err) {
        console.error('[Messaging] GET conversation error:', err);
        return errorJson('Nie udało się pobrać rozmowy', 500, 'server_error');
    }
}
