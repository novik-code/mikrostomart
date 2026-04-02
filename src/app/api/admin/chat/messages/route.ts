import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { sendTranslatedPushToUser } from '@/lib/pushService';
import { sendChatReplyEmail } from '@/lib/emailService';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — load messages for a conversation
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

    const conversationId = request.nextUrl.searchParams.get('conversationId');
    if (!conversationId) {
        return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    try {
        // Mark patient messages as read
        await supabase
            .from('chat_messages')
            .update({ read: true })
            .eq('conversation_id', conversationId)
            .eq('sender_role', 'patient')
            .eq('read', false);

        // Mark conversation as read by admin
        await supabase
            .from('chat_conversations')
            .update({ unread_by_admin: false })
            .eq('id', conversationId);

        // Fetch messages
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ messages: messages || [] });
    } catch (error) {
        console.error('[AdminChat] Messages error:', error);
        return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
    }
}

// POST — reception sends a reply
export async function POST(request: NextRequest) {
    const user = await verifyAdmin();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await hasRole(user.id, 'admin');
    const isEmployee = await hasRole(user.id, 'employee');
    if (!isAdmin && !isEmployee) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { conversationId, content } = await request.json();

    if (!conversationId || !content || typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json({ error: 'conversationId and content are required' }, { status: 400 });
    }

    try {
        // Get sender name from user email
        const senderName = user.email?.split('@')[0] || 'Recepcja';

        // Insert message
        const { data: message, error: msgError } = await supabase
            .from('chat_messages')
            .insert({
                conversation_id: conversationId,
                sender_role: 'reception',
                sender_name: senderName,
                content: content.trim(),
            })
            .select()
            .single();

        if (msgError) throw msgError;

        // Update conversation
        await supabase
            .from('chat_conversations')
            .update({
                last_message_at: new Date().toISOString(),
                unread_by_admin: false,
                unread_by_patient: true,
            })
            .eq('id', conversationId);

        // Push notification to patient
        const { data: conv } = await supabase
            .from('chat_conversations')
            .select('patient_id')
            .eq('id', conversationId)
            .single();

        if (conv?.patient_id) {
            sendTranslatedPushToUser(
                conv.patient_id,
                'patient',
                'chat_admin_to_patient',
                { message: content.trim().substring(0, 100) },
                '/strefa-pacjenta/wiadomosci'
            ).catch(console.error);

            // Email notification to patient (fire-and-forget)
            (async () => {
                try {
                    const { data: patientRec } = await supabase
                        .from('patients')
                        .select('prodentis_id')
                        .eq('id', conv.patient_id)
                        .single();

                    if (!patientRec?.prodentis_id) return;

                    const PRODENTIS_API = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
                    const detRes = await fetch(`${PRODENTIS_API}/api/patient/${patientRec.prodentis_id}/details`, {
                        signal: AbortSignal.timeout(5000),
                    });
                    if (detRes.ok) {
                        const det = await detRes.json();
                        const email = det.email;
                        const name = `${det.firstName || ''} ${det.lastName || ''}`.trim() || 'Pacjent';
                        if (email) {
                            await sendChatReplyEmail(email, name, content.trim());
                        }
                    }
                } catch { /* non-critical */ }
            })();
        }

        return NextResponse.json({ message });
    } catch (error) {
        console.error('[AdminChat] Send error:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}
