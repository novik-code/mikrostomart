import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — list all conversations
export async function GET(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await hasRole(user.id, 'admin');
    const isEmployee = await hasRole(user.id, 'employee');
    if (!isAdmin && !isEmployee) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const statusFilter = request.nextUrl.searchParams.get('status') || 'open';

        const { data: conversations, error } = await supabase
            .from('chat_conversations')
            .select(`
                id,
                patient_id,
                patient_name,
                status,
                last_message_at,
                unread_by_admin,
                created_at
            `)
            .eq('status', statusFilter)
            .order('last_message_at', { ascending: false });

        if (error) throw error;

        // Get last message preview for each conversation
        const conversationsWithPreview = await Promise.all(
            (conversations || []).map(async (conv) => {
                const { data: lastMsg } = await supabase
                    .from('chat_messages')
                    .select('content, sender_role, created_at')
                    .eq('conversation_id', conv.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                const { count } = await supabase
                    .from('chat_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('conversation_id', conv.id)
                    .eq('sender_role', 'patient')
                    .eq('read', false);

                return {
                    ...conv,
                    lastMessage: lastMsg?.content?.substring(0, 80) || '',
                    lastMessageRole: lastMsg?.sender_role || '',
                    lastMessageAt: lastMsg?.created_at || conv.last_message_at,
                    unreadCount: count || 0,
                };
            })
        );

        return NextResponse.json({ conversations: conversationsWithPreview });
    } catch (error) {
        console.error('[AdminChat] List error:', error);
        return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 });
    }
}

// PATCH — close/reopen a conversation
export async function PATCH(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await hasRole(user.id, 'admin');
    const isEmployee = await hasRole(user.id, 'employee');
    if (!isAdmin && !isEmployee) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { conversationId, status } = await request.json();

    if (!conversationId || !status || !['open', 'closed'].includes(status)) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    try {
        const { error } = await supabase
            .from('chat_conversations')
            .update({ status })
            .eq('id', conversationId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[AdminChat] Patch error:', error);
        return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
    }
}
