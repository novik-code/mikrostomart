import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { sendTelegramNotification } from '@/lib/telegram';
import { broadcastPush } from '@/lib/webpush';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST — patient sends a message
export async function POST(request: NextRequest) {
    const payload = verifyToken(request.headers.get('Authorization'));
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await request.json();
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    try {
        // Get patient id from Supabase
        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        if (!patient) {
            return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }

        // Get patient name from Prodentis API
        let patientName = 'Pacjent';
        try {
            const prodentisUrl = process.env.PRODENTIS_API_URL || 'http://localhost:3000';
            const detailsRes = await fetch(`${prodentisUrl}/api/patient/${payload.prodentisId}/details`);
            if (detailsRes.ok) {
                const details = await detailsRes.json();
                patientName = `${details.firstName || ''} ${details.lastName || ''}`.trim() || 'Pacjent';
            }
        } catch (e) {
            console.error('[Chat] Failed to fetch patient name from Prodentis:', e);
        }

        // Find or create open conversation
        let { data: conversation } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('patient_id', patient.id)
            .eq('status', 'open')
            .single();

        let isNewConversation = false;

        if (!conversation) {
            const { data: newConv, error: convError } = await supabase
                .from('chat_conversations')
                .insert({
                    patient_id: patient.id,
                    patient_name: patientName,
                })
                .select('id')
                .single();

            if (convError) throw convError;
            conversation = newConv;
            isNewConversation = true;
        }

        // Insert message
        const { data: message, error: msgError } = await supabase
            .from('chat_messages')
            .insert({
                conversation_id: conversation!.id,
                sender_role: 'patient',
                sender_name: patientName,
                content: content.trim(),
            })
            .select()
            .single();

        if (msgError) throw msgError;

        // Update conversation timestamps and unread flag
        await supabase
            .from('chat_conversations')
            .update({
                last_message_at: new Date().toISOString(),
                unread_by_admin: true,
            })
            .eq('id', conversation!.id);

        // Telegram notification for new conversations or messages
        const prefix = isNewConversation ? '🆕 NOWA ROZMOWA CZAT' : '💬 NOWA WIADOMOŚĆ CZAT';
        const telegramMsg = `${prefix}\n\n👤 Pacjent: ${patientName}\n✉️ ${content.trim().substring(0, 200)}`;
        sendTelegramNotification(telegramMsg, 'messages').catch(console.error);

        // Push notification to all admin/employee subscribers
        broadcastPush(
            'admin',
            'chat_patient_to_admin',
            { name: patientName, message: content.trim().substring(0, 100) },
            '/admin'
        ).catch(console.error);
        broadcastPush(
            'employee',
            'chat_patient_to_admin',
            { name: patientName, message: content.trim().substring(0, 100) },
            '/admin'
        ).catch(console.error);

        return NextResponse.json({ message });
    } catch (error) {
        console.error('[Chat] Send error:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}

// GET — patient loads conversation messages
export async function GET(request: NextRequest) {
    const payload = verifyToken(request.headers.get('Authorization'));
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get patient
        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        if (!patient) {
            return NextResponse.json({ messages: [], conversationId: null });
        }

        // Find open conversation
        const { data: conversation } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('patient_id', patient.id)
            .eq('status', 'open')
            .single();

        if (!conversation) {
            return NextResponse.json({ messages: [], conversationId: null });
        }

        // Mark messages from reception as read
        await supabase
            .from('chat_messages')
            .update({ read: true })
            .eq('conversation_id', conversation.id)
            .eq('sender_role', 'reception')
            .eq('read', false);

        // Mark conversation as read by patient
        await supabase
            .from('chat_conversations')
            .update({ unread_by_patient: false })
            .eq('id', conversation.id);

        // Fetch messages
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return NextResponse.json({
            messages: messages || [],
            conversationId: conversation.id,
        });
    } catch (error) {
        console.error('[Chat] Load error:', error);
        return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
    }
}
